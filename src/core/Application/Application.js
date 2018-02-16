import assert from "assert"
import {EventEmitter} from "events"
import ApplicationSettings from '../ApplicationSettings'
import PriceFeed from '../PriceFeed'
import Wallet from '../Wallet'
import Torrent from '../Torrent'
import DeepInitialState from '../Torrent/Statemachine/DeepInitialState'
import getCoins from './faucet'
import mkdirp from 'mkdirp'
import WalletTopUpOptions from "./WalletTopUpOptions"
import fs from 'fs'
import path from 'path'
import bcoin from 'bcoin'
import { TorrentInfo, Session } from 'joystream-node'
import db from '../../db'

var debug = require('debug')('application')
import {shell} from 'electron'

const FOLDER_NAME = {
  WALLET: 'wallet',
  DEFAULT_SAVE_PATH_BASE: 'download',
  TORRENT_DB: 'data'
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
    SETTINGS : 0,
    WALLET : 1,
    JOYSTREAM_NODE_SESSION: 2,
    PRICE_FEED : 3,
    STORED_TORRENTS : 4
  }

  static get NUMBER_OF_RESOURCE_TYPES() { return Object.keys(Application.RESOURCE).length }

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
    this.torrents = new Map()


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
   * @param config.network {String} - Bitcoin network (tesnet|mainnet)
   * @param config.assistedPeerDiscovery {Bool} - enable SecondaryDHT (joystream assisted peer discovery)
   * @param config.bitTorrentPort {Number} - libtorrent listening port (0 means libtorrent picks)
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

    let spvOptions = {
      prefix: this._walletPath,
      db: 'leveldb',
      network: config.network
    }

    // Add a logger if log level is specified
    if(config.logLevel)
      spvOptions.logger = new bcoin.logger({ level: config.logLevel })

    // Create the SPV Node
    let spvNode = bcoin.spvnode(spvOptions)

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
    this.priceFeed = new PriceFeed(null, exchangeRateFetcher)

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
    this.applicationSettings.open(
      0,
      DEFAULT_APPLIATION_SETTINGS.makeDefaultSavePathFromBaseFolder(appDirectory),
      DEFAULT_APPLIATION_SETTINGS.useAssistedPeerDiscovery,
      DEFAULT_APPLIATION_SETTINGS.bittorrentPort,
      DEFAULT_APPLIATION_SETTINGS.buyerTerms,
      DEFAULT_APPLIATION_SETTINGS.sellerTerms
      )

    // Make sure some download folder actually exists, which
    // may not be the case on the first run
    let downloadFolder = this.applicationSettings.downloadFolder()
    
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
      port: this.applicationSettings.bittorrentPort(),
      // Assisted Peer Discovery (APD)
      assistedPeerDiscovery: this.applicationSettings.useAssistedPeerDiscovery()
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

    // Torrent database folder
    const torrentDatabaseFolder = path.join(this._appDirectory, FOLDER_NAME.TORRENT_DB)

    db.open(torrentDatabaseFolder)
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
              let torrent = this._onTorrentAddedToSession(savedTorrent, joystreamNodeTorrent)

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
    
    if(this.torrents.size === 0)
      onTorrentsTerminatedStoredAndRemoved.bind(this)()
    else {
      // Add terminated handler for each torrent
      this.torrents.forEach((torrent, infoHash) => {
        
        // If torrent is already stopping, then we
        if(
          torrent.state.startsWith('StoppingExtension') ||
          torrent.state.startsWith('GeneratingResumeData')
        ) {
          
          // then we just ignore it
          
        } else {
  
          torrent.once('Terminated', () => {
    
            assert(this.state === Application.STATE.STOPPING)
    
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
    
            // store this somewhere
            let encodedTorrentSettings = encodeTorrentSettings(torrent)
    
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
              onTorrentsTerminatedStoredAndRemoved.bind(this)()
    
          })
          
          // otherwise, if its loading
          if(torrent.state.startsWith('Loading')) {
    
            // then we first wait for it to finish loading
            // before asking it to terminate
            torrent.once('loaded', () => {
              torrent._terminate()
            })
    
          } else {
            
            // otherwise if its not just loading,
            // then its active - which is the most frequent scenario,
            // and we can ask it it terminate immediately
            
            assert(torrent.state.startsWith('Active'))
  
            torrent._terminate()
          }
          
        }
        
      })

    }

    function onTorrentsTerminatedStoredAndRemoved() {
      
      this._torrentDatabase.close((err) => {

        assert(!err)

        this._stoppedResource(Application.RESOURCE.STORED_TORRENTS, onStopped)
      })

      /**
       * Stop Joystream node session
       */

      this._joystreamNodeSession.pauseLibtorrent((err) => {
        assert(!err)

        clearInterval(this._torrentUpdateInterval)
        this._joystreamNodeSession = null
        this._torrentUpdateInterval = null

        this._stoppedResource(Application.RESOURCE.JOYSTREAM_NODE_SESSION, onStopped)
      })

    }

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

    // Validate magnet link is correctly encoded ?
    if (settings.url) {
      // onAdded('Invalid magnet link url')
    }

    // Create parameters for adding to session
    let params = {
      name: settings.name,
      savePath: settings.savePath,
    }

    // Add torrents paramaters should only have one of ti, url or infoHash
    if (settings.url) {
      params.url = settings.url
    } else if (settings.metadata) {
      params.ti = settings.metadata
    } else {
      params.infoHash = infoHash
    }

    // joystream-node decoder doesn't correctly check if resumeData propery is undefined, it only checks
    // if the key on the params object exists so we need to conditionally set it here.
    if (settings.resumeData)
      params.resumeData = Buffer.from(settings.resumeData, 'base64')

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
    this._joystreamNodeSession.addTorrent(params, (err, newJoystreamNodeTorrent) => {

      if(err)
        onAdded(err)
      else {

        // Process being added to session
        let torrent = this._onTorrentAddedToSession(settings, newJoystreamNodeTorrent)

        // and finally tell user
        onAdded(null, torrent)

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
    torrent.on('Loading.WaitingForMissingBuyerTerms', (data) => {

      // NB: Replace by querying application settings later!
      let terms = this.applicationSettings.buyerTerms()

      // change name
      torrent.provideMissingBuyerTerms(terms)

    })

    // Add to torrents map

    // where it obviously should not already be
    assert(!this.torrents.has(infoHash))

    this.torrents.set(infoHash, torrent)
    
    // Tell torrent about result
    torrent._addedToSession(joystreamNodeTorrent)

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

    let torrent = this.torrents.get(infoHash)

    if(!torrent) {
      onRemoved('No torrent added corresponding to given hash')
      return
    }
    
    // Make sure torrent is not in the process or being
    // added or removed
    if(!torrent.state.startsWith('Active')) {
      onRemoved('Can only remove torrent when its active, not while its being added or removed.')
      return
    }
    
    torrent.once('Terminated', () => {
      
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
  
      // Delete torrent from the this map,
      this.torrents.delete(infoHash)
      
      // If deleteData we want to remove the folder/file
      if (deleteData) {
        let fullPath = path.join(torrent.savePath, torrent.name, path.sep)
        shell.moveItemToTrash(fullPath)
      }
  
      // Emit event
      this.emit('torrentRemoved', infoHash)
  
      // Tell user about success
      onRemoved(null, true)
      
    })
    
    // Stop torrent
    torrent._terminate()
    
  }

  _startedResource = (resource, onStarted) => {

    assert(this.state === Application.STATE.STARTING)
    assert(!this.startedResources.has(resource))

    // add to set of started resources
    this.startedResources.add(resource)
    
    // tell the world
    this.emit('resourceStarted', resource)
    this.emit('startedResources', this.startedResources)
  
    // If all resources have started, then we are done!
    if(this.startedResources.size === Application.NUMBER_OF_RESOURCE_TYPES) {
    
      this._setState(Application.STATE.STARTED)
    
      // Make callback to user
      onStarted(null, true)
    }
  }

  _stoppedResource = (resource, onStopped) => {

    assert(this.state === Application.STATE.STOPPING)
    assert(this.startedResources.has(resource))

    // remove to set of started resources
    this.startedResources.delete(resource)

    // what about the fact that we never take wallet out?!
    // how can we be symmetric here in that case?
    
    // tell the world
    this.emit('resourceStopped', resource)
    this.emit('startedResources', this.startedResources)
  
    // If all resources have stopped, then we are done!
    if(this.startedResources.size === 0) {
      this._setState(Application.STATE.STOPPED)
    
      // Make user callback
      onStopped(null, true)
    }
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
    console.error(err)
  }

  addExampleTorrents () {
    assert(this.state === Application.STATE.STARTED)

    this.onboardingTorrents.forEach((torrentFileName) => {

        fs.readFile(torrentFileName, (err, data) => {
          if (err) return console.error('Failed to read example torrent:', torrentFileName, err.message)

          let torrentInfo

          try {
            torrentInfo = new TorrentInfo(data)
          } catch (e) {
            console.error('Failed to parse example torrent file from data:', torrentFileName)
            return
          }

          let settings = createStartingDownloadSettings(torrentInfo,
                                                        this.applicationSettings.downloadFolder(),
                                                        DEFAULT_APPLIATION_SETTINGS.buyerTerms)

          this.addTorrent(settings, () => {

          })
        })
    })
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
// TODO: move this to be a method on the Torrent class and introduce a
// corresponding decoder method. These are routines for converting to and from
// an object that can be serialized/deserialized into the torrents database
function encodeTorrentSettings(torrent) {

  let encoded = {
    infoHash: torrent.infoHash,
    name: torrent.name,
    savePath: torrent.savePath,
    deepInitialState: torrent.deepInitialState(),
    extensionSettings: {
      buyerTerms: torrent.buyerTerms,
      sellerTerms: torrent.sellerTerms
    }
  }

  // Only encode metadata if it is available and valid
  if (torrent.metadata && torrent.metadata.isValid()) {
    encoded.metadata = torrent.metadata.toBencodedEntry().toString('base64')
  }

  // It is possible that resume data generation has failed and resumeData could be null
  if (torrent.resumeData) {
    encoded.resumeData = torrent.resumeData.toString('base64')
  }

  return encoded

}

// TODO: Move this into Torrent class as a static member method
function createStartingDownloadSettings(torrentInfo, savePath, buyerTerms) {
  const infoHash = torrentInfo.infoHash()

  return {
    infoHash : infoHash,
    metadata : torrentInfo,
    resumeData : null,
    name: torrentInfo.name() || infoHash,
    savePath: savePath,
    deepInitialState: DeepInitialState.DOWNLOADING.UNPAID.STARTED,
    extensionSettings : {
      buyerTerms: buyerTerms
    }
  }
}


export default Application
