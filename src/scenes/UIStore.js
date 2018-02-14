import {observable, action, computed, reaction, when, autorun} from 'mobx'
import assert from 'assert'
import {shell} from 'electron'

// Core stores
import {
  ApplicationStore,
  TorrentStore,
  PeerStore,
  WalletStore,
  PriceFeedStore} from '../core-stores'

// UI stores
import OnboardingStore from './Onboarding/Stores'
import ApplicationNavigationStore from './Application/Stores'
import DownloadingStore from './Downloading/Stores'
import UploadingStore from './Seeding/Stores'
import CompletedStore from './Completed/Stores'
import WalletSceneStore from './Wallet/Stores'
import Doorbell from './Doorbell'

import Application from '../core/Application'
import {TorrentTableRowStore} from './Common'
import PaymentStore from "../core-stores/Wallet/PaymentStore";


/**
 * Root user interface model
 *
 * Key design rules
 * a) All events coming from the underlying domain model (i.e. core classes),
 * must be handled by a single action which also scopes this object. This single
 * action ensures that _all_ resulting mutations of the MOBX state tree are transactional,
 * avoiding any possible race conditions in how reactions are dispatched, which is
 * very hard to reason about precisely, in particular over time as things change.
 * In practice, there are many - in fact most, events which just need to update a single
 * observable, and thus doing a local context specific event trapping and handling would be enough,
 * but for now we will try to just follow this general rule, to avoid the problem on principle.
 *
 * b) All domain stores implement user space calls by relaying to callbacks that we must provide,
 * which just implement calls to th underlying domain objects. The obvious alternative would
 * be to just provide these objects as dependencies to the domain stores, however that supports
 * the temptation to directly hook into events locally, as we are trying to avoid in a)
 *
 * c) Unlike in b, for user interface stores, they will take domain stores as dependencies,
 * and relay user calls onto these domain stores. This is fine, as the risk identified in b)
 * does not exist in this context - since there are no domain events from domain stores, and
 * since user interface stores will want to observe domain store properties anyway.
 *
 */
class UIStore {
  
  /**
   * Phases for the UI
   *
   * Note: while we could have just used Application.STATE,
   * we really want the freedom to decouple the UI to have its own
   * separate phases, e.g. start showing an active UI scene before
   * the underlying application is fully loaded. However, as is, there
   * is no difference betweene Application.STATE and UIStore.PHASE.
   */
  static PHASE = {
    
    Idle: 0,
    
    // UI is loading, user cannot do anything
    Loading: 1,
    
    // UI is alive and running
    Alive: 2,
    
    // UI is terminating, user cannot do anything
    Terminating: 3
  }
  
  /**
   * {PHASE} Current phase of the UI
   */
  @observable currentPhase
  
  /**
   * {Number} Total number of pieces sold by us as a seller this
   * session
   */
  @observable numberOfPiecesSoldAsSeller
  
  /**
   * {Number} Total revenue so far from spending, does not include
   * tx fees for closing channel (they are deducted).
   */
  @observable totalRevenueFromPieces
  
  /**
   * {Number} The total amount (sats) sent as payments so far,
   * does not include tx fees used to open and close channel.
   */
  @observable totalSpendingOnPieces
  
  /**
   * {ApplicationNavigationStore} Model for application navigator.
   * Is set when `currentPhase` is `PHASE.Alive`.
   */
  applicationNavigationStore
  
  /**
   * @property {DownloadingStore} Model for downloading scene.
   * Is set when `currentPhase` is `PHASE.Alive`.
   */
  downloadingStore
  
  /**
   * @property {UploadingStore} Model for uploading scene.
   *
   */
  uploadingStore
  
  /**
   * @property {CompletedStore} Model for completed scene.
   */
  completedStore
  
  /**
   * @property {DownloadingStore} Model for downloading scene.
   */
  walletSceneStore
  
  /**
   * @property {OnboardingStore} Model for onboarding flow. Is observable
   * so that triggering onboarding start|stop in the UI is reactive.
   */
  @observable onboardingStore
  
  /**
   * @property {MediaPlayerStore} Model for media player scene. Is observable
   * so that opening and closing of player in UI is reactive.
   */
  @observable mediaPlayerStore
  
  /**
   * {ApplicatonStore} Mobx store for the application.
   */
  applicationStore
  
  /**
   * Constructor
   *
   * @param application {Application}
   */
  constructor(application) {
    
    this.totalRevenueFromPieces = 0
    this.numberOfPiecesSoldAsSeller = 0
    this.totalSpendingOnPieces = 0
    
    // Hold on to application instance
    this._application = application
  
    // Create application store
    this.applicationStore = new ApplicationStore(
      application.state,
      application.startedResources,
      application.onboardingTorrents,
      application.applicationSettings,
      
      // We create WalletStore, PriceFeedStore instances when application starts
      null,
      null,
      
      new Map(),
      
      // Map store user actions onto underlying application

      application.start.bind(application),
      application.stop.bind(application),
      application.addTorrent.bind(application),
      application.removeTorrent.bind(application)
    )
  
    // Hook into key application events, and set our observables based
    // on current values
  
    application.on('state', this._onNewApplicationStateAction)
    this._onNewApplicationStateAction(application.state)
  
    application.on('startedResources', this._updateStartedAppResourcesAction)
    this._updateStartedAppResourcesAction(application.startedResources)
  
    application.on('onboardingIsEnabled', this._updateOnboardingStatusAction)
    this._updateOnboardingStatusAction(application.onboardingIsEnabled)
  
    application.on('torrentAdded', this._onTorrentAddedAction)
    
    // process any currently added torrents
    for(let [infoHash, torrent] in application.torrents)
      this._onTorrentAddedAction(torrent)
  
    application.on('torrentRemoved', this._onTorrentRemovedAction)
  }
  
  _onNewApplicationStateAction = action((newState) => {
    
    if(newState === Application.STATE.STARTED) {
  
      /**
       * Now that all application resources have been started, we
       * can create new corresponding domain stores, and set on application store.
       */
  
      /**
       * ApplicationSettings
       * Nothing much to do here beyond exposing it, since there is no actual store
       */
      
      let applicationSettings = this._application.applicationSettings
      assert(applicationSettings)
      this.applicationStore.applicationSettings = applicationSettings
  
      /**
       * Create and setup wallet store
       */
      
      let wallet = this._application.wallet
      assert(wallet)
      
      // Create
      this.walletStore = new WalletStore(
        wallet.state,
        wallet.totalBalance,
        wallet.confirmedBalance,
        wallet.receiveAddress,
        wallet.blockTipHeight,
        wallet.synchronizedBlockHeight,
        wallet.paymentStores,
        wallet.pay.bind(wallet)
      )
  
      // Hook into events
      wallet.on('stateChanged', this._onWalletStateChanged)
      wallet.on('totalBalanceChanged', this._onWalletTotalBalanceChanged)
      wallet.on('confirmedBalanceChanged', this._onWalletConfirmedBalanceChanged)
      wallet.on('receiveAddressChanged', this._onWalletReceiveAddressChanged)
      wallet.on('blockTipHeightChanged', this._onWalletBlockTipHeightChanged)
      wallet.on('synchronizedBlockHeightChanged', this._onWalletSynchronizedBlockHeightChanged)
      wallet.on('paymentAdded', this._onWalletPaymentAdded)
      
      // add any payments which are already present
      wallet.paymentsInTransactionWithTXID.forEach((payments, txHash) => {
        
        payments.forEach(this._onWalletPaymentAdded.bind(this))
        
      })
  
      /**
       * Create and setup price feed store
       */
      
      let priceFeed = this._application.priceFeed
      assert(priceFeed)
      
      // Create
      this.priceFeedStore = new PriceFeedStore(priceFeed.cryptoToUsdExchangeRate)
      
      // Hook into events
      this.priceFeed.on('tick', action((cryptoToUsdExchangeRate) => {
    
        priceFeedStore.setCryptoToUsdExchangeRate(cryptoToUsdExchangeRate)
      }))
  
      /**
       * Create major UI stores
       */
  
      // Application header
  
      this.applicationNavigationStore = new ApplicationNavigationStore(ApplicationNavigationStore.TAB.Downloading, 0, 'USD', walletStore, priceFeedStore, bcoin.protocol.consensus.COIN)
      
      // Scene specific stores
      this.uploadingStore = new UploadingStore(this)
      this.downloadingStore = new DownloadingStore(this)
      this.completedStore = new CompletedStore(this)
      
      // add existing torrents to scene stores
      
      this.applicationStore.torrents.forEach((torrentStore, infoHash) => {
        
        this.uploadingStore.addTorrentStore(torrentStore)
        this.downloadingStore.addTorrentStore(torrentStore)
        this.completedStore.addTorrentStore(torrentStore)
        
      })
  
      /**
       * Set wallet scene model
       * For now just set a constant fee rate, in the
       * future we need to rely on a fee estimation feed from some
       * endpoint, or something similar.
       * Estimate picked from: https://live.blockcypher.com/btc-testnet/
       */
      let satsPrkBFee = 0.00239 * bcoin.protocol.consensus.COIN
  
      this.walletSceneStore = new WalletSceneStore(
        walletStore,
        priceFeedStore,
        satsPrkBFee,
        null,
        '',
        launchExternalTxViewer
      )
  
      // Imperatively display doorbell widget
      Doorbell.load()
    }
    else if(newState === Application.STATE.STOPPING) {
      // hide doorbell again
      Doorbell.hide()
    }
    
    this.applicationStore.setState(newState)
    this.setCurrentPhase(appStateToUIStorePhase(newState))
    
  })
  
  _updateStartedAppResourcesAction = action((resources) => {
    
    this.applicationStore.setStartedResources(resource)
    
  })
  
  _updateOnboardingStatusAction = action((isEnabled) => {
    
    let onboardingStore = null
    
    // Create onboarding store if enabled
    if (isEnabled)
      onboardingStore = new OnboardingStore(this, OnboardingStore.STATE.WelcomeScreen)
  
    // Update application store signal about onboarding being enabled
    // and set store
    this.applicationStore.setOnboardingIsEnabled(isEnabled)
    this.applicationStore.setOnboardingStore(onboardingStore)
    
  })
  
  _onTorrentAddedAction = action((torrent) => {
    
    let applicationStore = this.applicationStore

    assert(applicationStore)

    // Create TorrentStore
    let torrentStore = new TorrentStore(
      torrent.infoHash,
      torrent.name,
      torrent.savePath,
      torrent.state,
      torrent.torrentInfo ? torrent.torrentInfo.totalSize : 0, // Total size of torrent
      torrent.progress,
      torrent.downloadedSize,
      torrent.downloadSpeed,
      torrent.uploadSpeed,
      torrent.uploadedTotal,
      torrent.numberOfSeeders,
      torrent.sellerTerms,
      torrent.buyerTerms,
      torrent.start.bind(torrent),
      torrent.stop.bind(torrent),
      torrent.startPaidDownload.bind(torrent),
      torrent.beginUpload.bind(torrent),
      torrent.endUpload.bind(torrent)
    )

    /// Hook into events

    torrent.on('state', action((state) => {
      torrentStore.setState(state)
    }))
    
    torrent.on('viabilityOfPaidDownloadInSwarm', action((viabilityOfPaidDownloadInSwarm) => {
      torrentStore.setViabilityOfPaidDownloadInSwarm(viabilityOfPaidDownloadInSwarm)
    }))
    
    torrent.on('buyerTerms', action((buyerTerms) => {
      torrentStore.setBuyerTerms(buyerTerms)
    }))
    
    torrent.on('sellerTerms', action((sellerTerms) => {
      torrentStore.setSellerTerms(sellerTerms)
    }))
    
    torrent.on('resumeData', action((resumeData) => {
      // Nothing to do
    }))
  
    /**
     * When metadata comes in, we need to set some values on
     * the store
     */
    torrent.on('torrentInfo', action((torrentInfo) => {
      
      torrentStore.setName(torrentInfo.name())
      torrentStore.setTotalSize(torrentInfo.totalSize())
    }))
    
    // When torrent is finished, we have to count towards the navigator
    torrent.once('Active.FinishedDownloading', action(() => {
    
      assert(this.applicationNavigationStore)
      this.applicationNavigationStore.handleTorrentCompleted()
    
      /**
       * Add desktop notifications
       */
    
      // Tell uploading store, which may need to know
      if(this.uploadingStore)
        this.uploadingStore.torrentFinishedDownloading(torrent.infoHash)
      
    }))
    
    // When torrent is found to not be a complete download
    torrent.once('Active.DownloadIncomplete', action(() => {
    
      // Tell uploading store, which may need to know
      if(this.uploadingStore)
        this.uploadingStore.torrentDownloadIncomplete(torrent.infoHash)
    }))
    
    torrent.on('progress', action((progress) => {
      torrentStore.setProgress(progress)
    }))
    
    torrent.on('downloadedSize', action((downloadedSize) => {
      torrentStore.setDownloadedSize(downloadedSize)
    }))
    
    torrent.on('downloadSpeed', action((downloadSpeed) => {
      torrentStore.setDownloadSpeed(downloadSpeed)
    }))
    
    torrent.on('uploadedTotal', action((uploadedTotal) => {
      torrentStore.setUploadedTotal(uploadedTotal)
    }))
    
    torrent.on('uploadSpeed', action((uploadSpeed) => {
      torrentStore.setUploadSpeed(uploadSpeed)
    }))
    
    torrent.on('numberOfSeeders', action((numberOfSeeders) => {
      torrentStore.setNumberOfSeeders(numberOfSeeders)
    }))
    
    torrent.on('paymentSent', action((paymentIncrement, totalNumberOfPayments, totalAmountPaid, pieceIndex) => {
  
      /**
       * A naive mistake here is to miss the fact that a single torrent may involve
       * multiple failed attempts at paying different peers at different times, hence
       * we cannot simply write to the `torrentStore` using `totalAmountPaid`.
       */

      torrentStore.totalSpendingOnPiecesAsBuyer += paymentIncrement
      
      // Global counters
      this.totalSpendingOnPieces += paymentIncrement
    }))
    
    torrent.on('validPaymentReceived', action((paymentIncrement, totalNumberOfPayments, totalAmountPaid) => {
      
      torrentStore.numberOfPiecesSoldAsSeller++
      torrentStore.totalRevenueFromPiecesAsSeller += paymentIncrement
      
      // Global counters
      this.numberOfPiecesSoldAsSeller++
      this.totalRevenueFromPieces += paymentIncrement
    }))
    
    torrent.on('lastPaymentReceived', action((settlementTx) => {
      
      // Raw transaction
      console.log('settlementTx')
      console.log(settlementTx)
      
    }))
  
    torrent.on('failedToMakeSignedContract', action((failedToMakeSignedContract) => {
      console.log('failedToMakeSignedContract: ' + failedToMakeSignedContract)
    }))
    
    /**
     * When a peer is added,
     * we create a peer store which watches the peer and
     * synches its own observables. Also we add
     * store to torrent store
     */
    torrent.on('peerAdded', action((peer) => {

      let pid = peer.pid()

      let peerStore = new PeerStore(
        pid,
        peer.state(),
        peer.peerPluginStatus()
      )

      peer.on('peerPluginStatus', action((peerPluginStatus) => {
        peerStore.setPeerPluginStatus(peerPluginStatus)
      }))

      assert(!torrentStore.peerStores.has(pid))

      torrentStore.peerStores.set(pid, peerStore)

    }))

    /**
     * When peer is removed, drop peer store from the
     * torrent store
     */
    torrent.on('peerRemoved', action((peerId) => {

      assert(torrentStore.has(peerId))

      torrentStore.peerStores.delete(peerId)

    }))
    
    // Add to application store
    applicationStore.onNewTorrentStore(torrentStore)

    // Add to relevant scenes if they currently exist,
    // which they only do when UI is active, not during loading

    if(this.currentPhase === UIStore.PHASE.Alive) {

      assert(this.uploadingStore)
      assert(this.downloadingStore)
      assert(this.completedStore)

      /**
       * Keep in mind that _all_ torrent table scenes
       * know about all stores at all times, even though
       * the torrent may be in an irrelevant state. This avoids
       * having to add/remove through reactions as state changes
       */

      this.uploadingStore.addTorrentStore(torrentStore)
      this.downloadingStore.addTorrentStore(torrentStore)
      this.completedStore.addTorrentStore(torrentStore)
    }
    
  })
  
  _onTorrentRemovedAction = action((infoHash) => {

    let applicationStore = this.applicationStore

    assert(applicationStore)

    // Remove from application store
    applicationStore.onTorrentRemoved(infoHash)

    // Remove from relevant scenes
    this.uploadingStore.removeTorrentStore(infoHash)
    this.downloadingStore.removeTorrentStore(infoHash)
    this.completedStore.removeTorrentStore(infoHash)
  
  })
  
  /**
   * Below we have all the hooks introduced to handle core domain
   * events which require action wrappers to be handled safely in
   * updating our store tree.
   */
  
  /**
   * Hooks for {@link Wallet}
   */
  
  /// Hook up with events
  
  let walletStore = applicationStore.walletStore
  assert(walletStore)

  _onWalletStateChanged = action((newState) => {
    
    walletStore.setState(newState)
  })
  
  _onWalletTotalBalanceChanged = action((totalBalance) => {
    walletStore.setTotalBalance(totalBalance)
  })
  
  _onWalletConfirmedBalanceChanged = action((confirmedBalance) => {
    walletStore.setConfirmedBalance(confirmedBalance)
  })
  
  _onWalletReceiveAddressChanged = action((receiveAddress) => {
    walletStore.setReceiveAddress(receiveAddress)
  })
  
  _onWalletBlockTipHeightChanged = action((height) => {
    walletStore.setBlockTipHeight(height)
  })
  
  _onWalletSynchronizedBlockHeightChanged = action((height) => {
    walletStore.setSynchronizedBlockHeight(height)
  })
  
  _onWalletPaymentAdded = action((payment) => {
    
    // Create payment store
    let paymentStore = new PaymentStore(
      payment.type,
      payment.txId,
      payment.outputIndex,
      payment.seenDate,
      payment.minedDate,
      payment.toAddress,
      payment.amount,
      payment.fee,
      payment.confirmed,
      payment.blockIdOfBlockHoldingTransaction,
      payment.blockHeightOfBlockHoldingTransaction,
      payment.note
    )
    
    /**
     * NB: REVISIT when we work on WalletStore.pay
     * // add to wallet store
     *
     */
    walletStore.paymentStores.push(paymentStore)
  
    /// Hook up events
  
    payment.on('confirmedChanged', action((confirmed) => {
      paymentStore.setConfirmed(confirmed)
    }))
  
    payment.on('blockIdOfBlockHoldingTransactionChanged', action((blockIdOfBlockHoldingTransaction) => {
      paymentStore.setBlockIdOfBlockHoldingTransaction(blockIdOfBlockHoldingTransaction)
    }))
  
    payment.on('blockHeightOfBlockHoldingTransactionChanged', action((blockHeightOfBlockHoldingTransaction) => {
      paymentStore.setBlockHeightOfBlockHoldingTransaction(blockHeightOfBlockHoldingTransaction)
    }))
  
    payment.on('noteChanged', action((note) => {
      paymentStore.setNote(note)
    }))
    
  })

  @action.bound
  setCurrentPhase(currentPhase) {
    this.currentPhase = currentPhase
  }
  
  stop() {
    
    /**
     * If onboarding is enabled, then display shutdown message - if its not already
     * showing, and block the shutdown for now
     */
    if (this._applicationStore.onboardingIsEnabled) {
      
      /**
       *  Only call for shutdown message if its not already showing, it is after all
       *  posible for the user to click the window close button on the shutdown message one or more times,
       * which we block, we _require_ that the button is pressed
       */
      
      assert(this.onboardingStore !== null)
      
      if (this.onboardingStore.state !== OnboardingStore.STATE.DepartureScreen) {
        this.onboardingStore.displayShutdownMessage()
      } else {
        console.log('Ignoring user attempt to close window while on departure screen of onboarding, UI scene button must be used.')
      }
      
    }
    /**
     * Otherwise we are initiating stop, so block window closing for the moment,
     * the main process will later trigger a second close request when we are in
     * `NotStarted` by calling electron.app.quit in response to IPC from
     * this renderes process about successful stopping, which which we don't block.
     */
    else {
      this._applicationStore.stop()
    }
    
  }
  
  openFolder(path) {
    shell.openItem(path)
  }
  
  @action.bound
  setRevenue(revenue) {
    this.revenue = revenue
  }
  
  @action.bound
  setOnboardingStore(onboardingStore) {
    this.onboardingStore = onboardingStore
  }
  
  @action.bound
  setMediaPlayerStore(mediaPlayerStore) {
    this.mediaPlayerStore = mediaPlayerStore
  }
  
  @computed get torrentsBeingLoaded() {
    return this._applicationStore.applicationStore.torrents.filter(function (torrent) {
      return torrent.isLoading
    })
  }
  
  @computed get torrentsFullyLoadedPercentage() {
    return 100 * (1 - (this.torrentsBeingLoaded.length / this._applicationStore.applicationStore.torrents.length))
  }
  
  @computed get startingTorrentCheckingProgressPercentage() {
    // Compute total size
    let totalSize = this._applicationStore.applicationStore.torrents.reduce(function (accumulator, torrent) {
      return accumulator + torrent.totalSize
    }, 0)
    
    // Computed total checked size
    let totalCheckedSize = this._applicationStore.applicationStore.torrents.reduce(function (accumulator, torrent) {
      let checkedSize = torrent.totalSize * (torrent.isLoading ? torrent.progress / 100 : 1)
      return accumulator + checkedSize
    }, 0)
    
    return totalCheckedSize / totalSize * 100
  }
  
  @computed get torrentsBeingTerminated() {
    return this._applicationStore.applicationStore.torrents.filter(function (torrent) {
      return torrent.isTerminating
    })
  }
  
  @computed get terminatingTorrentsProgressPercentage() {
    return this.torrentsBeingTerminated * 100 / this._applicationStore.applicationStore.torrents.length
  }
  
  @action.bound
  setTorrentTerminatingProgress(progress) {
    this.torrentTerminatingProgress = progress
  }
  
  openTelegramChannel() {
  
  }
  
  openRedditCommunity() {
  
  }
  
  openSlackSignupPagee() {
  
  }
}

function launchExternalTxViewer(txId, outputIndex) {
  
  console.log('Opening payment carried by output ' + outputIndex + ' in tx ' + txId)
  
  shell.openExternal(constants.BLOCKEXPLORER_QUERY_STRING_BASE + txId)
}

function appStateToUIStorePhase(state) {
  
  let phase
  
  switch (state) {
    
    case Application.STATE.STOPPED:
      phase = UIStore.PHASE.Idle
      break
    
    case Application.STATE.STARTING:
      phase = UIStore.PHASE.Loading
      break
    
    case Application.STATE.STARTED:
      phase = UIStore.PHASE.Alive
      break
    
    case Application.STATE.STOPPING:
      phase = UIStore.PHASE.Terminating
      break
    
    default:
      
      assert(false)
    //throw Error('Invalid state passed, and recall that STOPPED is not accepted')
    
  }
  
  return phase
}

/**
function peerCountsFromPluginStatuses(peerPluginStatuses) {

  // Counters
  let buyers = 0
  let sellers = 0
  let observers = 0
  let normals = 0

  // Iterate peers and determine type
  for(var i in peers) {

    // Get status
    var s = peers[i]._client.status

    if(s.peerBitSwaprBEPSupportStatus !== BEPSupportStatus.supported) {
      normals++
    } else if(s.connection) {

      var announced = s.connection.announcedModeAndTermsFromPeer

      if(announced.buyer)
        buyers++
      else if(announced.seller)
        sellers++
      else if(announced.observer)
        observers++
    }

  }

  return {
    buyers,
    sellers,
    observers,
    normals
  }

}
*/

/**
 startDownloadWithTorrentFileFromMagnetUri: function (client, magnetUri) {

  debugApplication('Adding torrent with magnet URI!')

  var parsed = magnet.decode(magnetUri)

  // Make sure torrent is not already added
  if(client.torrents.has(parsed.infoHash)) {
    console.log('TorrentAlreadyAdded')
    debugApplication('Torrent already added!')
    return
  }

  let savePath = client.store.applicationSettings.getDownloadFolder()

  let settings = Common.getSettingsFromMagnetUri(magnetUri, savePath)

  debugApplication('Settings with magnet URI successfully initialized. Readdy to add the torrent.')

  Common.addTorrent(client, settings)
}
 
 function getSettingsFromMagnetUri (magnetUri, defaultSavePath) {

    let terms = getStandardBuyerTerms()
    var parsed = magnet.decode(magnetUri)

    return {
        infoHash: parsed.infoHash,
        url: magnetUri,
        resumeData : null,
        savePath: defaultSavePath,
        name: parsed.infoHash,
        deepInitialState: TorrentStatemachine.DeepInitialState.DOWNLOADING.UNPAID.STARTED,
        extensionSettings : {
            buyerTerms: terms
        }
    }
}
 */

/**
 
 function startMediaPlayer(client, fileIndex, completed) {

    // Hide feedback in player
    Doorbell.hide()

    console.log('startMediaPlayer')

    // Create store for player
    let mediaSourceType = completed ? MediaPlayerStore.MEDIA_SOURCE_TYPE.DISK : MediaPlayerStore.MEDIA_SOURCE_TYPE.STREAMING_TORRENT
    const loadedSecondsRequiredForPlayback = 10
    let autoPlay = true

    let store = new MediaPlayerStore(mediaSourceType,
                                    client.store,
                                    file,
                                    loadedSecondsRequiredForPlayback,
                                    autoPlay,
                                    mediaPlayerWindowSizeFetcher,
                                    mediaPlayerWindowSizeUpdater,
                                    powerSavingBlocker,
                                    showDoorbellWidget)
}
 
 var electron = require('electron')
 
 function mediaPlayerWindowSizeFetcher() {
    return { width : window.innerWidth, height : window.innerHeight}
}
 
 function mediaPlayerWindowSizeUpdater(bounds) {
    electron.ipcRenderer.send('set-bounds', bounds)
}
 
 function powerSavingBlocker(enable) {
    electron.ipcRenderer.send('power-save-blocker', {enable: enable})
}
 
 function showDoorbellWidget() {
    Doorbell.show()
}
 
 */

export default UIStore
