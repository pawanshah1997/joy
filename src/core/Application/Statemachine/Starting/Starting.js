/**
 * Created by bedeho on 12/06/17.
 */

const BaseMachine = require('../../../BaseMachine')
const LoadingTorrents = require('./LoadingTorrents')
const constants = require('../../../../constants')

var Starting = new BaseMachine({
  namespace: 'Starting',
  initializeMachine : function (options) {

  },
  states: {
    uninitialized: {

    },
    InitializingResources: {
      _onEnter: function (client) {
        try {
          // Get directories service resource
          client.directories = client.factories.directories(client.config.appDirectory)

          // Ensure we have the directories we need
          client.directories.create()

          client.services.spvnode = client.factories.spvnode(
            client.config.network,
            client.config.logLevel,
            client.directories.walletPath())

          client.services.session = client.factories.session({
            port: client.config.bitTorrentPort || process.env.LIBTORRENT_PORT
          })

          client.services.torrentUpdateInterval = setInterval(() => {
            client.services.session.postTorrentUpdates()
          }, constants.POST_TORRENT_UPDATES_INTERVAL)

          // Get a function to call for openning the database store
          client.services.openDatabase = client.factories.db(client.directories.databasePath(), {
            // 'table' names to use
            'torrents': 'torrents',
            'resume_data': 'resume_data',
            'torrent_plugin_settings': 'torrent_plugin_settings'
          })

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
          try {
            client.services.db = await client.services.openDatabase()
          } catch (err) {
            return this.queuedHandle(client, 'databaseInitializationFailure', err)
          }

          this.queuedHandle(client, 'databaseInitializationSuccess')
      },
      databaseInitializationSuccess: function (client) {
        this.transition(client, 'InitialializingSpvNode')
      },
      databaseInitializationFailure: function (client, err) {
        client.reportError(err)
        this.go(client, '../Stopping/ClosingApplicationDatabase')
      },
      _reset: 'uninitialized'
    },

    InitialializingSpvNode: {
      _onEnter: function (client) {
        // change to use async/await after http/net fix in bcoin
        client.services.spvnode.open((err) => {
          if (err) {
            this.queuedHandle(client, 'initialializingSpvNodeFailure', err)
          } else {
            this.queuedHandle(client, 'initialializingSpvNodeSuccess')
          }
        })
      },
      initialializingSpvNodeSuccess: function (client) {
        this.transition(client, 'OpeningWallet')
      },
      initialializingSpvNodeFailure: function (client, err) {
        client.reportError(err)
        this.go(client, '../Stopping/StoppingSpvNode')
      },
      _reset: 'uninitialized'
    },

    OpeningWallet: {
      _onEnter: async function (client) {
        try {
          client.services.wallet = await client.services.spvnode.getWallet()
        } catch (err) {
          return this.queuedHandle(client, 'openingWalletFailure', err)
        }

        // Check if wallet is not found do we get null or rejected promise?
        if (client.services.wallet) {
          this.queuedHandle(client, 'openingWalletSuccess')
        } else {
          this.queuedHandle(client, 'openingWalletFailure', new Error('primary wallet'))
        }
      },
      openingWalletSuccess: function (client) {
        this.transition(client, 'ConnectingToBitcoinP2PNetwork')
      },
      openingWalletFailure: function (client, err) {
        client.reportError(err)
        this.go(client, '../Stopping/ClosingWallet')
      },
      _reset: 'uninitialized'
    },

    ConnectingToBitcoinP2PNetwork: {
      _onEnter: async function (client) {
        try {
          await client.services.spvnode.connect()
        } catch (err) {
          return this.queuedHandle(client, 'connectingToBitcoinP2PNetworkFailure', err)
        }

        this.queuedHandle(client, 'connectingToBitcoinP2PNetworkSuccess')
      },
      connectingToBitcoinP2PNetworkSuccess: function (client) {
        this.go(client, 'LoadingTorrents/GettingInfoHashes')
      },
      connectingToBitcoinP2PNetworkFailure: function (client, err) {
        client.reportError(err)
        this.go(client, '../Stopping/DisconnectingFromBitcoinP2PNetwork')
      },
      _reset: 'uninitialized'
    },

    LoadingTorrents: {
      _child: LoadingTorrents,
      _reset: 'uninitialized',
      // When all torrent state machines have entered into final loaded state (so they are renderable)
      completedLoadingTorrents: function (client) {
        this.go(client, '../Started')
      }
    }
  }
})

module.exports = Starting