/**
 * Created by bedeho on 13/06/17.
 */
import File from '../../../utils/File'
var BaseMachine = require('../../BaseMachine')
var Loading = require('./Loading/Loading')
var Active = require('./Active')
var Common = require('./Common')
var DeepInitialState = require('./DeepInitialState')
var electron = require('electron')

const {shell} = require('electron')

var Torrent = new BaseMachine({

    initialState: "WaitingToLoad",

    states: {

        WaitingToLoad :  {

            startLoading : function (client, infoHash, name, savePath, resumeData, metadata, deepInitialState, extensionSettings) {

                // Check that compatibility in deepInitialState and {buyerTerms, sellerTerms},
                // and store terms on client
                if(Common.isDownloading(deepInitialState)) {

                    if(extensionSettings.buyerTerms)
                        client.buyerTerms = extensionSettings.buyerTerms
                    else
                        throw new Error('DownloadIncomplete state requires buyer terms')

                } else if(Common.isUploading(deepInitialState)) {

                    if(extensionSettings.sellerTerms)
                        client.sellerTerms = extensionSettings.sellerTerms
                    else
                        throw new Error('Uploading state requires seller terms')

                }

                // Store state information about loading
                client.infoHash = infoHash
                client.name = name
                client.savePath = savePath
                client.resumeData = resumeData
                client.metadata = metadata
                client.deepInitialState = deepInitialState

                // Go to loading state
                this.transition(client, 'Loading')
            }
        },

        Loading : {

            _child : Loading,

            terminate : function(client) {

                // - We ignore resume data generation, given
                // that we ar still loading.
                // - We also do not need to stop the extension, as
                // it has not yet been started

                this.transition(client, 'Terminated')
            }
        },

        Active : {

            _child : Active,

            terminate: function(client, generateResumeData) {

                // Determine and keep what state to start in when we start next time,
                // and hold on to state to get back to when starting
                client.deepInitialState = deepInitialStateFromActiveState(this.compositeState(client))

                client.generateResumeDataOnTermination = generateResumeData

                client.stopExtension()

                this.transition(client, 'StoppingExtension')
            },

            processPeerPluginStatuses: function (client, statuses) {
                Common.processPeerPluginStatuses(client, statuses)
            },

            uploadStarted: function (client, alert) {
              var peer = client.peers[alert.pid]
              peer.uploadStarted(alert)
            },

            anchorAnnounced: function (client, alert) {
              var peer = client.peers[alert.pid]
              peer.anchorAnnounced(alert)
            },

            lastPaymentReceived: function (client, alert) {

                if (!alert.settlementTx) return

                console.log('Introduce tx broadcasting on torrent machine')

                //client.broadcastRawTransaction(alert.settlementTx)
            },
            play: function (client, fileIndex) {

              var file = new File(client.torrent, fileIndex)

              client.store.setIsPlaying(file)
            },
            close: function (client) {

              let bounds = {
                width: 1024,
                height: 800
              }
              // restore original bounds
              // Should not be hardcoded (TODO)
              electron.ipcRenderer.send('set-bounds', bounds)
              client.store.setIsPlaying(null)
            },
            openFolder: function (client) {
              shell.openItem(client.getSavePath())
            }
        },

        // We want the application to handle events that result from stopping extension
        // such as claiming last payment so we wait for extension to stop
        StoppingExtension: {

            stopExtensionResult: function (client) {

                client.stopLibtorrentTorrent()

                if (client.generateResumeDataOnTermination && client.hasOutstandingResumeData()) {

                    client.generateResumeData()

                    this.transition(client, 'GeneratingResumeData')

                } else {

                    this.transition(client, 'Terminated')
                }
            },

            lastPaymentReceived: function (client, alert) {

                if (!alert.settlementTx) return

                console.log('Introduce tx broadcasting on torrent machine')

                //client.broadcastRawTransaction(alert.settlementTx)
            }
        },

        GeneratingResumeData : {
            resumeDataGenerated : function (client, resumeData) {

                client.resumeData = resumeData

                this.transition(client, 'Terminated')
            },

            resumeDataGenerationFailed: function (client, error_code) {

                client.resumeData = null

                this.transition(client, 'Terminated')
            }
        },

        Terminated : {
            // Event drain, to prevent any further processing of events
            '*' : function (client) {
                console.log("Ignored event on state: Torrent.Terminated")
            }

        }

    }
})

// NB: Do recursive version later, when we figure out how
// do to proper navigation
function deepInitialStateFromActiveState(stateString) {

    var states = stateString.split('.')

    var assertMsg = "unexpected machine structure"

    // states[0] == 'Active'

    if(states[1] == 'DownloadIncomplete') {

        if(states[2] == "Unpaid") {

            if(states[3] == "Started")
                return DeepInitialState.DOWNLOADING.UNPAID.STARTED
            else if(states[3] == "Stopped")
                return DeepInitialState.DOWNLOADING.UNPAID.STOPPED
            else
                assert(false, assertMsg)

        } /**
          else if(states[2] == "Paid") {

            if(states[3] == "Started")
                return DeepInitialState.DOWNLOADING.PAID.STARTED
            else if(states[3] == "Stopped")
                return DeepInitialState.DOWNLOADING.PAID.STOPPED
            else
                assert(false, assertMsg)

        } */
        else
            assert(false, assertMsg)

    } else if(states[1] == "FinishedDownloading") {

        if(states[2] == "Passive")
            return DeepInitialState.PASSIVE
        else if(states[2] == "Uploading") {

            if(states[3] == "Started")
                return DeepInitialState.UPLOADING.STARTED
            else if(states[3] == "Stopped")
                return DeepInitialState.UPLOADING.STOPPED
            else
                assert(false, assertMsg)

        } else
            assert(false, assertMsg)

    } else
        assert(false, assertMsg)

}

module.exports = Torrent
