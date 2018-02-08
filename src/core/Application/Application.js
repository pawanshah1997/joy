import assert from "assert"
import {EventEmitter} from "events"
import ApplicationSettings from '../ApplicationSettings/ApplicationSettings'
import Wallet from './core/Wallet'

import getCoins from './faucet'
import mkdirp from 'mkdirp'
import WalletTopUpOptions from "./WalletTopUpOptions"

const FOLDER_NAME = {
  WALLET : 'wallet',
  DEFAULT_SAVE_PATH_BASE : 'torrents',
}

/**
 * How long(in ms) between each poll the joystream-node session for
 * torrent plugin status updates.
 * @type {number}
 */
const POST_TORRENT_UPDATES_INTERVAL = 3000

/**
 * How long (in ms) between each time the pricefeed is polled
 * for the new crypto exchange rate
 * @type {number}
 */
const PRICE_FEED_POLLING_INTERVAL = 60*1000 //

/**
 * Default settings to use for the application settings
 */
const DEFAULT_APPLIATION_SETTINGS = {
  
  useAssistedPeerDiscovery : true,
  
  // 0 means libtorrent picks whatever it wants?
  bittorrentPort : 0,
  
  makeDefaultSavePathFromBaseFolder : (baseFolder) => {
    return path.join(baseFolder, FOLDER_NAME.DEFAULT_SAVE_PATH_BASE)
  },

  buyerTerms : {
    maxPrice: 20,
    maxLock: 5,
    minNumberOfSellers: 1,
    maxContractFeePerKb: 2000
  },

  sellerTerms : {
    minPrice: 20,
    minLock: 1,
    maxNumberOfSellers: 5,
    minContractFeePerKb: 2000,
    settlementFee: 2000
  }
}

/**
 * Application
 *
 * emits resourceStarted
 * emits resourceStopped
 * emits startedResources({Set.<RESOURCES>}) - reports change in set of started resources
 * emits onboardingIsEnabled(enabled {Bool}) - onboarding status was altereds
 * emits state({Application.STATE})
 * emits stopped
 * emits starting
 * emits started
 * emits stopping
 * emits torrentAdded({Torrent})
 * emits torrentRemoved({infoHash})
 */
class Application extends EventEmitter {
  
  /**
   *
   * NB: An important design decision is that we do not consider
   * the application started until _all_ resources have been started.
   * This is because it becomes much more complicated to stop, it is
   * possible that not all resource have started yet, more over, many
   * resources themselves cannot stop until they have been fully started.
   */
  static STATE = {
    STOPPED : 0,
    STARTING : 1,
    STARTED : 2,
    STOPPING : 3,
  }
  
  /**
   * {STATE} State of app
   */
  state
  
  /**
   * Resource types owned by the app
   * RENAME: not resource, loading/ter milestone ?
   */
  static RESOURCE = {

    SETTINGS : 1,
    WALLET : 2,
    
    JOYSTREAM_NODE_SESSION: 9,
    PRICE_FEED : 10,
    STORED_TORRENTS : 11
  }

  static NUMBER_OF_RESOURCE_TYPES = Object.keys(Application.RESOURCE).length
  
  /**
   * {Set.<RESOURCES>} The resources which are currently started
   */
  startedResources
  
  /**
   * {Bool} Whether onboarding is enabled
   */
  onboardingIsEnabled
  
  /**
   * {Array.<String>} List of torrent file paths to use as examples in the onboarding
   */
  onboardingTorrents
  
  /**
   * @property {ElectronConfig} Application settings
   */
  applicationSettings

  /**
   * @property {Wallet}
   */
  wallet

  /**
   * @property {PriceFeed}
   */
  priceFeed
  
  /**
   * {Map<String.Torrent>} Map of torrents currently added
   */
  torrents

  /**
   * Constructor
   * Creates a stopped app
   *
   * @param onboardingTorrents {Array.<String>} - names of torrents to be added during onboarding.
   * @param onboardingIsEnabled {Bool} - whether to do onboarding flow If it is running for the first time, then there will be onboarding, regardless
   * of the value of this parameter.
   * @param enableOnboardingIfFirstRun {Bool} - regardless of `onboardingIsEnabled`, if this is true, then onboarding will be shown if
   * the app is running for the first time, as according to the application settings.
   * @param walletTopUpOptions {WalletTopUpOptions}
   */
  constructor (onboardingTorrents, onboardingIsEnabled, enableOnboardingIfFirstRun, walletTopUpOptions) {
    
    super()
    
    this._setState(Application.STATE.STOPPED)
    this.startedResources = new Set()

    //this._extendedLibtorrentSession = null
    this.onboardingTorrents = onboardingTorrents
    this._setOnboardingIsEnabled(onboardingIsEnabled)
    this.applicationSettings = null
    this.wallet = null
    this.priceFeed = null

    
    this._enableOnboardingIfFirstRun = enableOnboardingIfFirstRun
    this._walletTopUpOptions = walletTopUpOptions
    this._torrentDatabase = null
    
    // setInterval reference for polling joystream-node session for
    this._torrentUpdateInterval = null
    this._joystreamNodeSession = null
  }
  
  /**
   * Start application
   * Presumes that the application directory ('appDirectory')
   * already exists.
   *
   * @param config
   * @param appDirectory {String} - the application directory, that is where the root
   * folder where the the file/folder tree of the application lives.
   * @param onStarted {Func} - callback called when start attempt is open
   */

  start(config, appDirectory, onStarted = () => {} ) {
    
    // Make sure we can start
    if(this.state !== Application.STATE.STOPPED)
      onStarted('Can only start when stopped')
    
    this._setState(Application.STATE.STARTING)
    
    // Hold on to app directory
    this._appDirectory = appDirectory
    
    /**
     * Wallet
     */
  
    // Make and hold on to path to wallet
    this._walletPath = path.join(this._appDirectory, FOLDER_NAME.WALLET)
    
    // Create the SPV Node
    let spvNode = new bcoin.SPVNode({
      prefix: this._walletPath,
      db: 'leveldb',
      network: config.network
    })
    
    // Create and hold to wallet
    this.wallet = new Wallet(spvNode)
    
    this.wallet.once('started', () => {
  
      assert(this.state === Application.STATE.STARTING)
  
      this._startedResource(Application.RESOURCE.WALLET, onStarted)
    })
    
    this.wallet.on('totalBalanceChanged', this._totalWalletBalanceChanged)
    
    // Start wallet
    this.wallet.start()

    /**
     * Price feed
     */

    // Hold on to price feed
    this.priceFeed = new PriceFeed(undefined, exchangeRateFetcher)
    
    this.priceFeed.on('error', this._onPriceFeedError)
    
    // Start feed (synchronous)
    this.priceFeed.start(PRICE_FEED_POLLING_INTERVAL)
    
    this._startedResource(Application.RESOURCE.PRICE_FEED)
    
    /**
     * Application settings
     */
    
    // Create application settings
    this.applicationSettings = new ApplicationSettings()
    
    // Open settings (is synchronous), with given default values,
    // these are set on the first run
    this.applicationSettings.open(0,
      DEFAULT_APPLIATION_SETTINGS.makeDefaultSavePathFromBaseFolder(appDirectory),
      DEFAULT_APPLIATION_SETTINGS.useAssistedPeerDiscovery,
      DEFAULT_APPLIATION_SETTINGS.bittorrentPort
      )
    
    // Make sure some download folder actually exists, which
    // may not be the case on the first run
    let downloadFolder = this.applicationSettings.getDownloadFolder()

    mkdirp(downloadFolder, null, (err) => {

      if(err)
        console.log('Failed to create download folder: ' + downloadFolder + ' due to ' + err)

    })

    // If onboarding is not enabled, and it is the first session, and
    // it was requested by the user to have onboarding on the first session
    // none the less, then enable onboarding
    if(!this.onboardingIsEnabled &&
      this._enableOnboardingIfFirstRun &&
      !this.applicationSettings.numberOfPriorSessions())
      this._setOnboardingIsEnabled(true)
  
    this._startedResource(Application.RESOURCE.SETTINGS, onStarted)
    
    /**
     * Create Joystream node session
     */
    
    // Construct default session settings
    var sessionSettings = {
      // network port libtorrent session will open a listening socket on
      port: this.applicationSettings.getBittorrentPort(),
      // Assisted Peer Discovery (APD)
      assistedPeerDiscovery: this.applicationSettings.getUseAssistedPeerDiscovery()
    }
  
    // Create & start session
    // We assume that the session has already started after this call
    this._joystreamNodeSession = new JoystreamNodeSession(sessionSettings)
  
    // Setup polling of torrent plugin statuses
    this._torrentUpdateInterval = setInterval(() => {
      
      // Not possible since we cancel timer before stopping
      assert(this.state !== Application.STATE.STOPPED)
      
      this._joystreamNodeSession.postTorrentUpdates()
      
    }, POST_TORRENT_UPDATES_INTERVAL)
    
    // NB: this is the last synchronous step, so we must pass `onStarted` here,
    // in case all asynchronous loading of resources is already done.
    this._startedResource(Application.RESOURCE.JOYSTREAM_NODE_SESSION, onStarted)

    /**
     * Load settings, add and start torrents
     */

    db.open(this._appDirectory)
      .then((torrentDatabase) => {

        // Hold on to torrent database
        this._torrentDatabase = torrentDatabase

        // Should we skip loading any existing torrents
        if(config.skipLoadingExistingTorrents)
          return []
        else // (async) loading of all torrent entries
          return this._torrentDatabase.getAll('torrents')

      }).catch((err) => {

        console.log('Could not open torrent database: ' + err)

      })
      .then((savedTorrents) => {

        let numberOfSavedTorrentsYetToFullyLoad = savedTorrents.length

        if(numberOfSavedTorrentsYetToFullyLoad === 0)
          this._startedResource(Application.RESOURCE.STORED_TORRENTS, onStarted)
        else
          // Add all saved torrents to session with saved settings
          savedTorrents.forEach((savedTorrent) => {

            // Need to convert data from db into a torrentInfo
            // NB: https://github.com/JoyStream/joystream-desktop/issues/668
            savedTorrent.metadata = new TorrentInfo(Buffer.from(savedTorrent.metadata, 'base64'))

            // add to session
            this._joystreamNodeSession.addTorrent(savedTorrent, (err, joystreamNodeTorrent) => {

              assert(!err)

              // Process that torrent was added to session
              let torrent = this._onTorrentAddedToSession(joystreamNodeTorrent)

              // When loaded, check if we are done loading all,
              // if so note this
              torrent.on('loaded', () => {

                numberOfSavedTorrentsYetToFullyLoad--

                if(numberOfSavedTorrentsYetToFullyLoad === 0)
                  this._startedResource(Application.RESOURCE.STORED_TORRENTS, onStarted)

              })

            })

          })

    })

  }
  
  /**
   * Stops app
   *
   * @param onStop {Func} - called with result of stop attempt
   */
  stop(onStopped = () => {}) {

    if(this.state !== Application.STATE.STARTED)
      onStopped('Can only stop when started')

    this._setState(Application.STATE.STOPPING)

    /**
     * Terminate and remove torrents, and store settings
     */

    if(torrents.size === 0)
      onTorrentsTerminatedStoredAndRemoved()
    else
      this.torrents.forEach((infoHash, torrent) => {

        torrent.once('Terminated', () => {

          assert(this.state === Application.STATE.STOPPING)

          // store this somewhere
          let encodedTorrentSettings = encodedTorrentSettings(torrent)

          this._torrentDatabase.save('torrents', infoHash, encodedTorrentSettings)
            .then(() => {})
            .catch(() => {
              console.log('Failed to save torrent to torrent storage: ' + encodedTorrentSettings)
            })

          // remove from map
          this.torrents.delete(infoHash)

          // if this was the last one, then we are done
          // terminating torrents!
          if(this.torrents.size === 0)
            onTorrentsTerminatedStoredAndRemoved()

        })

        torrent.terminate()

      })

    function onTorrentsTerminatedStoredAndRemoved() {

      this._torrentDatabase.close((err) => {

        assert(!err)

        this._stoppedResource(Application.RESOURCE.STORED_TORRENTS, onStopped)
      })

      // kall funksjon her?
    }

    /**
     * Stop Joystream node session
     *
     *
     * How to make sure we only start this
     * until _all_ torrents are terminated!!!
     *
     *
     */

    // TODO: update joystream-node session (to clearInterval)
    this._joystreamNodeSession.pauseLibtorrent((err) => {
      this._stoppedResource(Application.RESOURCE.JOYSTREAM_NODE_SESSION, onStopped)
      clearInterval(this._torrentUpdateInterval)
      this._torrentUpdateInterval = null
    })

    // Puase???

    /**
     * Application settings
     */


    // Count session
    let numberOfPriorSessions = this.applicationSettings.numberOfPriorSessions()

    if(!numberOfPriorSessions || numberOfPriorSessions == 0)
      this.applicationSettings.setNumberOfPriorSessions(1)
    else
      this.applicationSettings.setNumberOfPriorSessions(numberOfPriorSessions + 1)

    this.applicationSettings.close()
  
    this._stoppedResource(Application.RESOURCE.SETTINGS)

    /**
     * Price feed
     */

    this.priceFeed.stop()

    this._stoppedResource(Application.RESOURCE.PRICE_FEED)

    /**
     * Stop wallet
     */
    this.wallet.once('stopped', () => {
  
      assert(this.state === Application.STATE.STOPPING)
  
      this._stoppedResource(Application.RESOURCE.WALLET, onStopped)
    })

    this.wallet.stop()
  
    /**
     * Cancel timers,
     */


  
  }

  /**
   * Add torrent with given settings
   *
   *
   * @param settings {Object} - document ???
   * @param fun {Func}  - Callback, returns {@link Torrent} on success, error string otherwise
   */
  addTorrent(settings, onAdded) {

    /**
     * There is a lot of weird copying and decoding going on here
     * which I don't want to break, but which should be fixed,
     * see:
     */

    if (this.state !== Application.STATE.STARTED) {
      onAdded('Can add torrent when started')
      return
    }

    const infoHash = settings.infoHash

    if (this.torrents.has(infoHash)) {
      onAdded('Torrent already added')
      return
    }

    // settings.metadata has to be a TorrentInfo object
    if (settings.metadata && !settings.metadata instanceof TorrentInfo) {
      onAdded('Invalid metadata passed, must be TorrentInfo instance')
      return
    }

    // Create parameters for adding to session
    let params = {
      name: settings.name,
      savePath: settings.savePath,
      ti: settings.metadata
    }

    // joystream-node decoder doesn't correctly check if resumeData propery is undefined, it only checks
    // if the key on the params object exists so we need to conditionally set it here.
    if (settings.resumeData)
      params.resumeData = Buffer.from(settings.resumeData, 'base64')

    if (settings.url)
      params.url = settings.url

    // set param flags - auto_managed/paused
    params.flags = {

      // Whether torrent should be added in (libtorrent) paused mode from the get go
      // We always add it in non-paused mode to make sure torrent completes checking files and
      // finish loading in the state machine
      paused: false,

      // Automanagement: We never want this, as our state machine should explicitly control
      // pause/resume behaviour torrents for now.
      //
      // Whether libtorrent is responsible for determining whether it should be started or queued.
      // Queuing is a mechanism to automatically pause and resume torrents based on certain criteria.
      // The criteria depends on the overall state the torrent is in (checking, downloading or seeding).
      auto_managed: false,

      // make sure our settings override resume data (paused and auto managed flags)
      override_resume_data: true
    }

    // Try to add torrent to session
    this._joystreamNodeSession.addTorrent(params, function (err, newJoystreamNodeTorrent) {

      if(err)
        onAdded(err)
      else {

        // Process being added to session
        let torrent = this._onTorrentAddedToSession(settings, newJoystreamNodeTorrent)

        // and finally tell user
        onAdded(undefined, torrent)

      }

    })
    
  }

  _onTorrentAddedToSession(settings, joystreamNodeTorrent) {

    const infoHash = settings.infoHash

    // Create new torrent
    let torrent = new Torrent(
      settings,

      //privateKeyGenerator
      () => {
        return bcoin.ec.generatePrivateKey()
      },

      //publicKeyHashGenerator
      () => {

        assert(this.wallet.state === Wallet.STATE.STARTED)

        return this.wallet.getAddress().getHash()
      },

      //contractGenerator
      (contractOutputs, contractFeeRate) => {

        assert(this.wallet.state === Wallet.STATE.STARTED)

        let outputs = []

        for (let i in contractOutputs) {
          outputs.push(bcoin.output.fromRaw(contractOutputs[i]))
        }

        return this.wallet.send({
          sort: false,
          outputs: outputs,
          rate: contractFeeRate
        }).then((transaction) => {
          console.log('Contract TX:', transaction.toRaw().toString('hex'))
          console.log('Contract TX ID:', transaction.txid())
          return transaction.toRaw()
        })
      },

      // broadcastRawTransaction
      (tx) => {

        assert(this.wallet.state === Wallet.STATE.STARTED)

        this.wallet.broadcast(tx)
      }
    )

      // When torrent is missing buyer terms
      torrent.on('Loading.WaitingForMissingBuyerTerms', function (data) {

        // NB: Replace by querying application settings later!
        let terms = DEFAULT_APPLIATION_SETTINGS.buyerTerms

        // change name
        torrent.provideMissingBuyerTerms(terms)

      })

      // Add to torrents map

      // where it obviously should not already be
      assert(!this.torrents.has(infoHash))

      this.torrents.set(infoHash, torrent)

      // Tell torrent about result
      torrent._addedToSession(t)

      // Emit signal
      this.emit('torrentAdded', torrent)

     return torrent
  }

  /**
   * Remove torrent identified by given hash.
   *
   * @param infoHash {String} - torrent hash identifier
   * @param deleteData {Bool} - whether to delete real data
   * @param onRemoved {Function} - callback
   */
  removeTorrent(infoHash, deleteData, onRemoved) {
  
    if(this.state !== Application.STATE.STARTED) {
      onRemoved('Can only remove torrent when started')
      return
    }

    const infoHash = settings.infoHash

    let torrent = this.torrents.get(infoHash)

    if(!torrent) {
      onRemoved('No torrent added corresponding to given hash')
      return
    }

    // Stop torrent
    torrent.terminate()

    /**
     * Remove the torrent from the session
     *
     * Notice that we take it for granted that this will work, and
     * we don't need to wait for some resource to come back, like in the
     * addTorrent scenario
     */
    this._joystreamNodeSession.removeTorrent(infoHash, (err) => {

      assert(!err)

    })

    // Remove the torrent from the db
    this._torrentDatabase.remove('torrents', infoHash)
      .then(() => {})
      .catch(() => { console.log('Removing torrent from database failed.')})

    // Delete torrent from the this map
    this.torrents.delete(infoHash)

    // If deleteData we want to remove the folder/file
    if (deleteData) {
      fullPath = path.join(torrent.savePath, torrent.name, path.sep)
      shell.moveItemToTrash(fullPath)
    }

    // Tell user about success
    onRemoved(undefined, true)
    
  }
  
  _startedResource = (resource, onStarted) => {

    assert(this.state === Application.STATE.STARTING)
    assert(!this.startedResources.has(resource))

    // add to set of started resources
    this.startedResources.add(resource)

    // If all resources have started, then we are done!
    if(this.startedResources.size === Application.NUMBER_OF_RESOURCE_TYPES) {
      
      this._setState(Application.STATE.STARTED)
      
      // Make callback to user
      onStarted(undefined, true)
    }

    // tell the world
    this.emit('resourceStarted', resource)
    this.emit('startedResources', this.startedResources)
  }

  _stoppedResource = (resource, onStopped) => {

    assert(this.state === Application.STATE.STOPPING)
    assert(this.startedResources.has(resource))

    // remove to set of started resources
    this.startedResources.delete(resource)

    // what about the fact that we never take wallet out?!
    // how can we be symmetric here in that case?

    // If all resources have stopped, then we are done!
    if(this.startedResources.size === 0) {
      this._setState(Application.STATE.STOPPED)
      
      // Make user callback
      onStopped(undefined, true)
    }

    // tell the world
    this.emit('resourceStopped', resource)
    this.emit('startedResources', this.startedResources)
  }

  _setState(state) {
    this.state = state
    this.emit('state', state)
    this.emit(stateToString(state))
  }

  _setOnboardingIsEnabled(onboardingIsEnabled) {
    this.onboardingIsEnabled = onboardingIsEnabled
    this.emit('onboardingIsEnabled', onboardingIsEnabled)
  }
  
  _totalWalletBalanceChanged = (balance) => {
  
    console.log('totalBalanceChanged: ' + balance)
    
    if(this.state === Application.STATE.STARTED) {
  
      // Beg faucet for funds if we are supposed to
      if (this._walletTopUpOptions.doTopUp && this._walletTopUpOptions.walletBalanceLowerBound > balance) {
        
        let addressString = this._wallet.receiveAddress.toString()
    
        console.log('Faucet: Requesting some testnet coins to address: ' + addressString)
    
        getCoins(addressString, function (err) {
      
          if (err) {
            console.log('Faucet:', err)
          } else {
            console.log('Faucet: Request accepted')
          }

        })
    
      }
      
    }
    
  }
  
  _onPriceFeedError = (err) => {
    
    console.log('priceFeed [error]:')
    console.log('Could not fetch exchange rate, likely due to no internet, or broken endpoint.')
    console.log(err)
  }
  
}

function stateToString(state) {

  let str

  switch(state) {
    case Application.STATE.STOPPED:
      str = 'stopped'
      break

    case Application.STATE.STARTING:
      str = 'starting'
      break

    case Application.STATE.STARTED:
      str = 'started'
      break

    case Application.STATE.STOPPING:
      str = 'stopping'
      break

    default:
      assert(false)
  }

  return str

}

async function exchangeRateFetcher() {
  
  let v = await coinmarketcap.tickerByAsset('bitcoin')
  
  return v.price_usd
  
}

function encodedTorrentSettings(torrent) {

  let encoded = {
    infoHash: torrent.infoHash,
    name: torrent.name,
    savePath: torrent.savePath,
    deepInitialState:  torrent.deepInitialState(),
    metadata: torrent.torrentInfo.toBencodedEntry().toString('base64'),
    extensionSettings: {
      buyerTerms: torrent.buyerTerms,
      sellerTerms: torrent.sellerTerms
    }
  }

  // It is possible that resume data generation has failed and resumeData could be null
  if (torrent.resumeData) {
    encoded.resumeData = torrent.resumeData.toString('base64')
  }

  return torrent

}



export default Application
