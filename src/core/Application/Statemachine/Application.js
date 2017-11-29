/**
 * Created by bedeho on 11/06/17.
 */

const BaseMachine = require('../../BaseMachine')
const Starting = require('./Starting/Starting')
const Started = require('./Started/Started')
const Stopping = require('./Stopping/Stopping')
const TorrentInfo = require('joystream-node').TorrentInfo
const Common = require('./Common')
const Doorbell = require('../../Doorbell')
const exampleTorrents = require('../../../constants').EXAMPLE_TORRENTS
const fs = require('fs')
const magnet = require('magnet-uri')
const debugApplication = require('debug')('application')

var ApplicationStateMachine = new BaseMachine({
  namespace: 'Application',
  initialState: 'NotStarted',
  initializeMachine: function (options) {

  },

  states: {
    NotStarted: {
      start: function (client, config) {
        debugApplication('Not started')
        client.config = config
        client.services = {}
        client.torrents = new Map()

        this.go(client, 'Starting/InitializingResources')
      }
    },

    Starting: {
      _child: Starting,

      /**
       * We prevent stopping of any kind while starting up, for now.
       * In the future, allow user to cancel startup process / client.abortStarting = true
       * in each state of the starting machine before transitioning to next step it can
       * check this bool
       */

      // Block any window unloading
      onBeforeUnloadMainWindow: function(client, event) {
          blockMainWindowUnload(event)
      },

      spvChainFullySynced: function (client, height) {
        client.store.setSpvChainSynced(true)
        client.store.setSpvChainHeight(height)
      },

      syncProgressUpdated: function (client, progress, height) {
        client.store.setSpvChainSyncProgress(progress)
        client.store.setSpvChainHeight(height)
      },

      spvChainReset: function (client) {
        client.store.setSpvChainSynced(false)
      }
    },

    Started: {
      _child: Started,

      _onEnter: function (client) {
        debugApplication('The application has started')
        // listen for changes in wallet balance
        client.services.wallet.on('balance', (balance) => {
          client.processStateMachineInput('walletBalanceUpdated', balance)
        })

        client.getWalletBalance(function (balance) {
          client.processStateMachineInput('walletBalanceUpdated', balance)
        })

        Doorbell.load()

        // Do we have queued torrent that need to be loaded ?
        let magnetUri = Common.hasMagnetUri()
        if (magnetUri) {
          debugApplication('We are adding a magnet uri !')
          client.processStateMachineInput('startDownloadWithTorrentFileFromMagnetUri', magnetUri)
        }
      },

      stop: function (client) {

        // Hide prior to shut down
        Doorbell.hide()

        this.go(client, 'Stopping/TerminatingTorrents')
      },

      onBeforeUnloadMainWindow: function(client, event) {

          beginStopping(this, client, event)
      },

      torrentWaitingForMissingBuyerTerms: function (client, torrent) {

          // Standard buyer terms
          // NB: Get from settings data store of some sort
          let terms = Common.getStandardBuyerTerms()

          // change name
          torrent.updateBuyerTerms(terms)
      },

      walletBalanceUpdated: function (client, balance) {
        // Update UI
        client.store.setUnconfirmedBalance(balance.unconfirmed)
        client.store.setConfirmedBalance(balance.confirmed)

        // Automatically request testnet coins
        if (balance.unconfirmed < 25000) {
          client.topUpWalletFromFaucet(function (err) {
            if (err) {
              console.log('Faucet:', err)
            } else {
              console.log('Faucet: Request accepted')
            }
          })
        }
      },

      removeTorrent: function (client, infoHash, deleteData) {
        Common.removeTorrent(client, infoHash, deleteData)
      },

      spvChainFullySynced: function (client, height) {
        client.store.setSpvChainSynced(true)
        client.store.setSpvChainHeight(height)
      },

      syncProgressUpdated: function (client, progress, height) {
        client.store.setSpvChainSyncProgress(progress)
        client.store.setSpvChainHeight(height)
      },

      spvChainReset: function (client) {
        client.store.setSpvChainSynced(false)
      },

      addExampleTorrents: function (client) {

          for (var i = 0; i < exampleTorrents.length; i++) {

              // Load torrent file
              let torrentFileName = exampleTorrents[i]

              let torrentInfo

              try {
                  const data = fs.readFileSync(torrentFileName)
                  torrentInfo = new TorrentInfo(data)
              } catch (e) {
                  console.log('Failed to load torrent file: ' + torrentFileName)
                  console.log(e)
                  continue
              }

              let settings = Common.getStartingDownloadSettings(torrentInfo, client.directories.defaultSavePath())

              // and start adding torrent
              Common.addTorrent(client, settings)
          }

      },

      startDownloadWithTorrentFileFromMagnetUri: function (client, magnetUri) {

        debugApplication('Adding torrent with magnet URI!')

        var parsed = magnet.decode(magnetUri)

        // Make sure torrent is not already added
        if(client.torrents.has(parsed.infoHash)) {
          console.log('TorrentAlreadyAdded')
          debugApplication('Torrent already added!')
          return
        }

        let settings = Common.getSettingsFromMagnetUri(magnetUri, client.directories.defaultSavePath())

        debugApplication('Settings with magnet URI successfully initialized. Readdy to add the torrent.')

        Common.addTorrent(client, settings)

      }

    },

    Stopping: {
      _child: Stopping,

      onBeforeUnloadMainWindow: function(client, event) {

        // We are already stopping, so block this close request.
        event.returnValue = false

      }
    }
  }
})

function beginStopping(machine, client, event) {

    blockMainWindowUnload(event)

    // When onboarding is enabled,
    if(client.onboardingStore) {

      // we display shutdown message
      client.onboardingStore.displayShutdownMessage()

    } else // Directly initiate stopping
        machine.handle(client, 'stop')

}

function blockMainWindowUnload(event) {

    // We are initiating stop, so block window closing for the moment,
    // the main process will later trigger a second close request when we are in
    // `NotStarted` by calling electron.app.quit in response to IPC from
    // this renderes process about sucessful stopping, which which we don't block.
    event.returnValue = false
}

module.exports = ApplicationStateMachine
