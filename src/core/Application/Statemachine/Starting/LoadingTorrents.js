const BaseMachine = require('../../../BaseMachine')
const TorrentInfo = require('joystream-node').TorrentInfo

const Common = require('../Common')
const debugApplication = require('debug')('application:starting:loadingTorrents')

var LoadingTorrents = new BaseMachine({
  namespace: 'LoadingTorrents',

  initializeMachine : function (options) {

  },

  states: {

    uninitialized: {

    },

    AddingTorrents: {
      _onEnter: async function (client) {
        debugApplication('Adding Torrents from database !')
        try {
          // Read all torrents from database
          var torrents = await client.services.db.getAll('torrents')
        } catch (err) {

          console.log(err)

          // Commenting this out, since all handlers seem to have been commented out
          //client.processStateMachineInput('completedLoadingTorrents')
          return
        }

        client.processStateMachineInput('gotTorrents', torrents)
      },

      gotTorrents: function (client, savedTorrents) {
        debugApplication('We got the torrents from the database')

        // Create core torrent objects and stores, initialize with loading settings,
        // and prepare torrent add parameters
        savedTorrents.forEach(function (savedTorrent) {

          // Need to convert data from db into a torrentInfo
          savedTorrent.metadata = new TorrentInfo(Buffer.from(savedTorrent.metadata, 'base64'))

          // Add torrent
          Common.addTorrent(client, savedTorrent)

        })

        // After adding all torrents, get started right away, we
        // have skipped waiting for all 'torrentLoaded' inputs from all torrents we loaded
        this.go(client, '../../Started')

      },

      torrentLoaded: function (client) {
        debugApplication('Verify if all the torrents are correctly added')

        var allTorrentsLoaded = true

        client.torrents.forEach(function (torrent, infoHash) {
          if (torrent.currentState().startsWith('Loading.CheckingPartialDownload') ||
              torrent.currentState().startsWith('Loading.WaitingForMissingBuyerTerms')) allTorrentsLoaded = false
        })

        if (allTorrentsLoaded) {
          client.processStateMachineInput('completedLoadingTorrents')
        }
      },

      _reset: 'uninitialized'
    }
  }
})

module.exports = LoadingTorrents
