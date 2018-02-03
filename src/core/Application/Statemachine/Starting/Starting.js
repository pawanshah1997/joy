/**
 * Created by bedeho on 12/06/17.
 */

const BaseMachine = require('../../../BaseMachine')
const LoadingTorrents = require('./LoadingTorrents')
const constants = require('../../../../constants')
const packageFile = require('../../../../../package.json')

const debugApplication = require('debug')('application:starting')

var Starting = new BaseMachine({
  namespace: 'Starting',
  initializeMachine : function (options) {

  },
  states: {
    uninitialized: {

    },
    InitializingResources: {
      _onEnter: function (client) {
        debugApplication('Starting application: InitializingResources')

        try {
          // Get directories service resource
          client.directories = client.factories.directories(client.config.appDirectory)

          // Ensure we have the directories we need
          client.directories.create()

          let downloadFolder = client.store.applicationSettings.getDownloadFolder()

          // If we don't have a defaultSavePath already registered we add it to electron config
          if (!downloadFolder) {
            client.store.applicationSettings.setDownloadFolder(client.directories.defaultSavePath())
          }

          client.services.spvnode = client.factories.spvnode(
            client.config.network,
            client.config.logLevel,
            client.directories.walletPath())

          client.services.spvnode.on('synced', function (height) {
            client.processStateMachineInput('spvChainFullySynced', height)
          })

          client.services.spvnode.on('syncProgress', function (progress, height) {
            client.processStateMachineInput('syncProgressUpdated', progress, height)
          })

          client.services.spvnode.on('reset', function () {
            client.processStateMachineInput('spvChainReset')
          })

          // default session settings
          var sessionSettings = {
            // network port libtorrent session will open a listening socket on
            port: 0,
            // Assisted Peer Discovery (APD)
            assistedPeerDiscovery: true
          }

          // Configuration overrides default setting
          if ('bitTorrentPort' in client.config) {
            sessionSettings.port = client.config.bitTorrentPort
          }

          // Configuration overrides default setting
          if ('assistedPeerDiscovery' in client.config) {
            sessionSettings.assistedPeerDiscovery = client.config.assistedPeerDiscovery
          }

          client.services.session = client.factories.session(sessionSettings)

          client.services.torrentUpdateInterval = setInterval(() => {
            client.services.session.postTorrentUpdates()
          }, constants.POST_TORRENT_UPDATES_INTERVAL)

          // Setup electron-config store
          // client.applicationSettings = client.factories.applicationSettings()

          // Get a function to call for openning the database store
          client.services.openDatabase = client.factories.db(client.directories.databasePath())

          client.services.testnetFaucet = client.factories.testnetFaucet()

          this.transition(client, 'initializingApplicationDatabase')

        } catch (err) {
          client.reportError(err)
          this.go(client, '../Stopping/ClearingResources')
        }
      },
      _reset: 'uninitialized'
    },

    initializingApplicationDatabase: {
      _onEnter: async function (client) {
        debugApplication('Starting: Initializing application database')
          try {
            client.services.db = await client.services.openDatabase()
          } catch (err) {
            return client.processStateMachineInput('databaseInitializationFailure', err)
          }

          client.processStateMachineInput('databaseInitializationSuccess')
      },
      databaseInitializationSuccess: function (client) {
        debugApplication('Starting: Application database successfully initialized')

        this.transition(client, 'InitialializingSpvNode')
      },
      databaseInitializationFailure: function (client, err) {
        debugApplication('Starting: Application database failed to initialize')

        client.reportError(err)
        this.go(client, '../Stopping/ClosingApplicationDatabase')
      },
      _reset: 'uninitialized'
    },

    InitialializingSpvNode: {
      _onEnter: function (client) {
        debugApplication('Starting: Initialializing SPV node')

        // change to use async/await after http/net fix in bcoin
        client.services.spvnode.open((err) => {
          if (err) {
            client.processStateMachineInput('initialializingSpvNodeFailure', err)
          } else {
            client.processStateMachineInput('initialializingSpvNodeSuccess')
          }
        })
      },
      initialializingSpvNodeSuccess: function (client) {
        debugApplication('Starting: SPV node successfully initialized')

        this.transition(client, 'OpeningWallet')
      },
      initialializingSpvNodeFailure: function (client, err) {
        debugApplication('Starting: SPV node failed to initialize')

        client.reportError(err)
        this.go(client, '../Stopping/StoppingSpvNode')
      },
      _reset: 'uninitialized'
    },

    OpeningWallet: {
      _onEnter: async function (client) {
        debugApplication('Starting: Opening Wallet')

        try {
          client.services.wallet = await client.services.spvnode.getWallet()
        } catch (err) {
          return client.processStateMachineInput('openingWalletFailure', err)
        }

        // Check if wallet is not found do we get null or rejected promise?
        if (client.services.wallet) {
          client.processStateMachineInput('openingWalletSuccess')
        } else {
          client.processStateMachineInput('openingWalletFailure', new Error('primary wallet'))
        }
      },
      openingWalletSuccess: function (client) {
        debugApplication('Starting: Wallet successfully opened')

        this.transition(client, 'ConnectingToBitcoinP2PNetwork')
      },
      openingWalletFailure: function (client, err) {
        debugApplication('Starting: Wallet failed to open')

        client.reportError(err)
        this.go(client, '../Stopping/ClosingWallet')
      },
      _reset: 'uninitialized'
    },

    ConnectingToBitcoinP2PNetwork: {
      _onEnter: async function (client) {
        debugApplication('Starting: Connecting to Bitcoin P2P network')

        try {
          await client.services.spvnode.connect()
        } catch (err) {
          return client.processStateMachineInput('connectingToBitcoinP2PNetworkFailure', err)
        }

        client.processStateMachineInput('connectingToBitcoinP2PNetworkSuccess')
      },
      connectingToBitcoinP2PNetworkSuccess: function (client) {
        debugApplication('Starting: Bitcoin P2P network sucessfully connected')

        // Does this need to happen inside the state machine ?

        // Version migration
        // Need to do that in UiStore...
        // migrate(packageFile.version, client.applicationSettings)


        // Normal start and add torrents
        this.go(client, 'LoadingTorrents/AddingTorrents')

      },
      connectingToBitcoinP2PNetworkFailure: function (client, err) {
        debugApplication('Starting: Bitcoin P2P network failed to connect')

        client.reportError(err)
        this.go(client, '../Stopping/DisconnectingFromBitcoinP2PNetwork')
      },
      _reset: 'uninitialized'
    },


    LoadingTorrents: {
      _child: LoadingTorrents,
      _reset: 'uninitialized',

      /**
      // NO LONGER IN USE, WE DONT WAIT FOR ALL TO BE COMPLETED
      // When all torrent state machines have entered into final loaded state (so they are renderable)
      completedLoadingTorrents: function (client) {
        this.go(client, '../Started')
      }
      */

    }
  }
})

/**
 * Does all the migration work between all valid pairs of versions
 * @param currentVersion
 * @param applicationSettings
 */
function migrate(currentVersion, applicationSettings) {

  // Update the last version of the app that was run
  applicationSettings.setLastVersionOfAppRun(currentVersion)

  // Other magical migration stuff

}

/**
// Tell if we are running a new major version of the application
function isAMajorUpdate () {

    let latestVersionRunned = store.get('latestVersionRunned')
    let currentVersionRunning = pjson.version

    if (isRunningForTheFirstTime) return true
    if (vc.lt(latestVersionRunned, currentVersionRunning)) {

        let v1 = currentVersionRunning.split('.')
        let v2 = latestVersionRunned.split('.')

        if (v1[0] > v2[0] || v1[1] > v2[1]) {
            return true
        }

        return false
    }
}
*/

module.exports = Starting
