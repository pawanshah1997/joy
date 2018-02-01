/**
 * Created by bedeho on 13/06/17.
 */

var assert = require('assert')
var BaseMachine = require('../../../BaseMachine')
var LibtorrentInteraction = require('joystream-node').LibtorrentInteraction
var TorrentState = require('joystream-node').TorrentState

var Common = require('./../Common')
var DeepInitialState = require('../DeepInitialState')

var Loading = new BaseMachine({

    initialState: "AddingToSession",

    states: {

        AddingToSession : {

            addTorrentResult: function (client, err, torrent) {

                if (err) {
                    this.transition(client, 'FailedAdding')

                } else {
                    // Hold on to torrent
                    client.torrent = torrent

                    // Hook into torrent events

                    torrent.on('metadata', (metadata) => {
                        client.processStateMachineInput('metadataReady', metadata)
                    })

                    torrent.on('resumedata', (resumeData) => {
                        client.processStateMachineInput('resumeDataGenerated', resumeData)
                    })

                    torrent.on('resumedata_error', function(err) {
                        client.processStateMachineInput('resumeDataGenerationFailed', err)
                    })

                    // Update store when status changes
                    torrent.on('status_update', (status) => {
                        client.store.setStatus(status)

                        // Workaround used in place of finished alert not being reliable due to a bug
                        // in libtorrent
                        if (status.state === TorrentState.finished || status.state === TorrentState.seeding) {
                          client.processStateMachineInput('downloadFinished')
                        }
                    })

                    // This alert is generated when a torrent switches from being a downloader to a seed.
                    // It will only be generated once per torrent.
                    torrent.on('finished', function () {
                        client.processStateMachineInput('downloadFinished')
                    })

                    // This alert is posted when a torrent completes checking. i.e. when it transitions out of
                    // the checking files state into a state where it is ready to start downloading
                    torrent.on('torrentChecked', function () {
                        client.processStateMachineInput('checkFinished')
                    })

                    torrent.on('peerPluginStatusUpdates', function (peerStatuses) {
                      client.processStateMachineInput('processPeerPluginStatuses', peerStatuses)
                    })

                    torrent.on('sellerTermsUpdated', function (alert) {
                      client.processStateMachineInput('processSellerTermsUpdated', alert.terms)
                    })

                    torrent.on('buyerTermsUpdated', function (alert) {
                      client.processStateMachineInput('processBuyerTermsUpdated', alert.terms)
                    })

                    torrent.on('uploadStarted', function (alert) {
                      client.processStateMachineInput('uploadStarted', alert)
                    })

                    torrent.on('anchorAnnounced', function (alert) {
                      client.processStateMachineInput('anchorAnnounced', alert)
                    })

                    torrent.on('lastPaymentReceived', function (alert) {
                        client.processStateMachineInput('lastPaymentReceived', alert)
                    })

                    torrent.on('validPaymentReceived', function (alert) {
                      client.processStateMachineInput('processValidPaymentReceived', alert)
                    })

                    torrent.on('sentPayment', function (alert) {
                      client.processStateMachineInput('processSentPayment', alert)
                    })

                    torrent.on('downloadStarted', function (alert) {
                      client.processStateMachineInput('paidDownloadInitiationCompleted', alert)
                    })

                    torrent.on('allSellersGone', function (alert) {
                      client.processStateMachineInput('allSellersGone', alert)
                    })

                    // DO we have new peers
                    /* torrent.on('dhtGetPeersReply', function (peers) {
                      for (var i in peers) {
                        console.log(peers[i])
                        torrent.connectPeer(peers[i])
                      }
                      console.log(peers)
                    }) */

                    // If we don´t have metadata, wait for it
                    if(client.metadata && client.metadata.isValid()) {
                        this.transition(client, 'CheckingPartialDownload')
                        const torrentInfo = client.torrent.handle.torrentFile()

                        client.store.setMetadata(client.metadata)
                        client.store.setTorrentFiles(torrentInfo.files())
                    } else {
                        this.transition(client, 'WaitingForMetadata')
                    }
                }

            }
        },

        FailedAdding : {

            // This handler is input sink, preventing any further processing by parent. In the future we may add some handling of secondary attempts
            '*' : function(client) {
                //
            }
        },

        WaitingForMetadata : {

            metadataReady : function (client, metadata) {

                // Hold on to metadata, is required when shutting down
                client.metadata = metadata

                const torrentInfo = client.torrent.handle.torrentFile()

                // Update store
                client.store.setMetadata(metadata)
                client.store.setTorrentFiles(torrentInfo.files())

                this.transition(client, 'CheckingPartialDownload')
            }
        },

        CheckingPartialDownload: {

            checkFinished: function (client) {
                // If the saved initial state was stopped pause the torrent now after
                // checking files completes
                if (Common.isStopped(client.deepInitialState)) {
                  client.torrent.handle.pause()
                }

                // By default, extension torrent plugins are constructed with
                // TorrentPlugin::LibtorrentInteraction::None:
                // - No events interrupted, except on_extended events for this plugin.
                // Since we _never_ want libtorrent to seed for us over vanilla BitTorrent
                // protocol, even when we are uploading (we only allow
                // paid seeding in app), we instead want
                // TorrentPlugin::LibtorrentInteraction::BlockDownloading:
                // - Preventing uploading to peers by
                // -- sending (once) CHOCKED message in order to discourage inbound requests.
                // -- cancel on_request() to make libtorrent blind to peer requests.
                client.setLibtorrentInteraction(LibtorrentInteraction.BlockUploading)

                // Determine whether we have a full download

                var s = client.torrent.handle.status()

                if (s.state === TorrentState.seeding) {

                    if(Common.isPassive(client.deepInitialState) || Common.isDownloading(client.deepInitialState)) {

                        // When there is a full download, and the user doesn't want to upload, then
                        // we just go to passive, even if the user really wanted to download.
                        client.toObserveMode()

                        client.deepInitialState = DeepInitialState.PASSIVE

                        client.startExtension()

                    } else { // isUploading

                      console.log(client.sellerTerms)

                        client.toSellMode(client.sellerTerms)

                        if(!Common.isStopped(client.deepInitialState))
                            client.startExtension()
                    }

                    goToDeepInitialState(this, client)

                } else {

                    // We go to buy mode, regardless of what the user wanted (DeepInitialState),
                    // user will need to supply terms on their own.

                    if(Common.isDownloading(client.deepInitialState))  {

                        client.toBuyMode(client.buyerTerms)

                        // When not paused, then start extension, otherwise leave extension un-started
                        if(!Common.isStopped(client.deepInitialState))
                            client.startExtension()

                        goToDeepInitialState(this, client)

                    } else { // isPassive || isUploading

                        // Overrule users wish, force (unpaid+started) downloading
                        client.deepInitialState = DeepInitialState.DOWNLOADING.UNPAID.STARTED

                        this.transition(client, 'WaitingForMissingBuyerTerms')
                    }
                }

            }

        },

        WaitingForMissingBuyerTerms : {

            updateBuyerTerms: function(client, terms) {

                // Hold on to terms
                client.buyerTerms = terms

                client.toBuyMode(terms)

                // When not paused, then start extension, otherwise leave extension un-started
                if(!Common.isStopped(client.deepInitialState))
                    client.startExtension()

                goToDeepInitialState(this, client)
            }
        }
    }
})

function goToDeepInitialState(machine, client) {

    let deepInitialState = client.deepInitialState

    // Path to active substate we need to transition to
    var path = relativePathFromDeepInitialState(client.deepInitialState)

    // Transition to active state
    machine.go(client, path)

    // Drop temporary storage of inital state we want to load to
    delete client.deepInitialState

    machine.emit('loaded', client, deepInitialState)
}

function relativePathFromDeepInitialState(s) {

    switch (s) {
        case DeepInitialState.DOWNLOADING.UNPAID.STARTED:
            return '../Active/DownloadIncomplete/Unpaid/Started/ReadyForStartPaidDownloadAttempt'
        case DeepInitialState.DOWNLOADING.UNPAID.STOPPED:
            return '../Active/DownloadIncomplete/Unpaid/Stopped'
        /**
        case DeepInitialState.DOWNLOADING.PAID.STARTED:
            return '../Active/DownloadIncomplete/Paid/Started'
        case DeepInitialState.DOWNLOADING.PAID.STOPPED:
            return '../Active/DownloadIncomplete/Paid/Stopped'
        */
        case DeepInitialState.PASSIVE:
            return '../Active/FinishedDownloading/Passive'
        case DeepInitialState.UPLOADING.STARTED:
            return '../Active/FinishedDownloading/Uploading/Started'
        case DeepInitialState.UPLOADING.STOPPED:
            return '../Active/FinishedDownloading/Uploading/Stopped'
    }

    assert(false)
}

module.exports = Loading
