/**
 * Created by bedeho on 30/06/17.
 */

var BaseMachine = require('../../../../../BaseMachine')
var Common = require('../../../Common')
var ConnectionInnerState = require('joystream-node').ConnectionInnerState
var commitmentToOutput = require('joystream-node').paymentChannel.commitmentToOutput

var ViabilityOfPaidDownloadInSwarm = require('../../../../ViabilityOfPaidDownloadingSwarm')

var Started = new BaseMachine({

    initialState: "Uninitialized",

    states: {

        Uninitialized: {},

        ReadyForStartPaidDownloadAttempt : {

            _onEnter : function(client) {

              // We reset swarmViability,since
              // we have not been handling `processPeerPluginsStatuses`
              // by calling `computeViabilityOfPaidDownloadInSwarm` in an any other state.
              let defaultViability = new ViabilityOfPaidDownloadInSwarm.NoJoyStreamPeerConnections()

              client._setViabilityOfPaidDownloadInSwarm(defaultViability)

            },

            stop : function(client) {

              Common.stopExtension(client)

              // Stop libtorrent torrent
              client._joystreamNodeTorrent.handle.pause()

              this.go(client, '../Stopped')
            },

            updateBuyerTerms : function (client, buyerTerms) {

              // Not yet implemented

              throw Error('Not yet implemented')
            },

            processBuyerTermsUpdated: function (client, terms) {

              // Not possible, since above not yet implemented

              throw Error('Not yet implemented')
            },

            processSentPayment  : function (client, alert) {
              client._handlePaymentSentAlert(alert)
            },

            processPeerPluginStatuses: function(client, statuses) {

              // Update peer list
              Common.processPeerPluginStatuses(client, statuses)

              // Figure out if there are suitable sellers in sufficient amount
              let viability = computeViabilityOfPaidDownloadInSwarm(statuses, client.buyerTerms.minNumberOfSellers)

              // Hold on to viability for later
              client._setViabilityOfPaidDownloadInSwarm(viability)
            },

            startPaidDownload : function (client, fn) {

              // Check that we can actually start
              if(!(client.viabilityOfPaidDownloadInSwarm instanceof ViabilityOfPaidDownloadInSwarm.Viable)) {
                  return fn(client.viabilityOfPaidDownloadInSwarm , null)
              }

              let peerComparer = function (sellerA, sellerB) {
                  const termsA = sellerA.connection.announcedModeAndTermsFromPeer.seller.terms
                  const termsB = sellerB.connection.announcedModeAndTermsFromPeer.seller.terms
                  return termsA.minPrice - termsB.minPrice
              }

              // Sort suitable sellers using `peerComparer` function
              var sortedSellers = client.viabilityOfPaidDownloadInSwarm.suitableAndJoined.sort(peerComparer)

              // Pick actual sellers to use
              var pickedSellers = sortedSellers.slice(0, client.buyerTerms.minNumberOfSellers)

              // Iterate sellers to
              // 1) Allocate value
              // 2) Find correct contract fee
              // 3) Construct contract output
              var downloadInfoMap = new Map()
              var contractOutputs = []
              var contractFeeRate = 0
              var index = 0

              for (var i in pickedSellers) {

                  var status = pickedSellers[i]

                  var sellerTerms = status.connection.announcedModeAndTermsFromPeer.seller.terms

                  // Pick how much to distribute among the sellers
                  var minimumRevenue = sellerTerms.minPrice * client.torrentInfo.numPieces()

                  // Set value to at least surpass dust
                  var value = Math.max(minimumRevenue, 0)

                  // Update fee estimate
                  if(sellerTerms.minContractFeePerKb > contractFeeRate)
                      contractFeeRate = sellerTerms.minContractFeePerKb

                  // Generate keys for buyer side of contract
                  var buyerContractSk = client._generateContractPrivateKey()
                  var buyerFinalPkHash = client._generatePublicKeyHash()

                  // Add entry for seller in download information map
                  downloadInfoMap.set(status.pid, {
                      index: index,
                      value: value,
                      sellerTerms: sellerTerms,
                      buyerContractSk: Buffer.from(buyerContractSk),
                      buyerFinalPkHash: Buffer.from(buyerFinalPkHash)
                  })

                  // Add contract output for seller
                  contractOutputs[index] = commitmentToOutput({
                      value: value,
                      locktime: sellerTerms.minLock, //in time units (multiples of 512s)
                      payorSk: Buffer.from(buyerContractSk),
                      payeePk: Buffer.from(status.connection.payor.sellerContractPk)
                  })

                  index++
              }

              // Store download information for making actual start downloading
              // request to client later after signing
              client.downloadInfoMap = downloadInfoMap

              // Request construction and financing of the contract transaction
              client._contractGenerator(contractOutputs, contractFeeRate)
                .then((tx) => {
                  client._submitInput('makeSignedContractResult', null, tx)
                })
                .catch((err) => {
                  client._submitInput('makeSignedContractResult', err)
                })

              // Hold on to user callback until lifecycle of call is completed
              client._startPaidDownloadFn = fn

              this.transition(client, 'SigningContract')
            }

        },

        SigningContract : {

            // NB: We don't handle input `processPeerPluginsStatuses`

            makeSignedContractResult(client, err, tx) {

                if(err) {

                    // Tell user about failure
                    client._startPaidDownloadFn(err)

                    // Drop callback
                    delete client._startPaidDownloadFn

                    this.transition(client, 'ReadyForStartPaidDownloadAttempt')

                } else {

                    client._joystreamNodeTorrent.startDownloading(tx, client.downloadInfoMap, (err, res) => {
                      client._submitInput('paidDownloadInitiationCompleted', err, res)
                    })

                    this.transition(client, 'InitiatingPaidDownload')

                }

            }

        },

        InitiatingPaidDownload : {

            // NB: We don't handleSequence peer plugin statuses

            paidDownloadInitiationCompleted : function (client, err, result) {

              // NB: Joystream alert never throw error. Need to be added in extension-cpp
                if (err) {

                    // Tell user about failure
                    client._startPaidDownloadFn(err)

                    this.transition(client, 'ReadyForStartPaidDownloadAttempt')

                } else {

                    // Tell user about success
                    client._startPaidDownloadFn(null)

                    this.go(client, '../../Paid/Started')
                }

                // Drop callback
                delete client._startPaidDownloadFn

            }
        }

    }

})

function computeViabilityOfPaidDownloadInSwarm(statuses, minimumNumber) {

    // Statuses for:

    // all JoyStream peers
    var joyStreamPeers = []

    // all JoyStream seller mode peers
    var sellerPeers = []

    // all JoyStream (seller mode peers) invited, including
    var invited = []

    // all joined sellers
    var joined = []

    // Classify our peers w.r.t. starting a paid download
    for(var i in statuses) {

        var s = statuses[i]

        // If its a joystream peer
        if(s.connection) {

            // then keep hold on to it
            joyStreamPeers.push(s)

            // If its a seller
            if(s.connection.announcedModeAndTermsFromPeer.seller) {

                // then hold on to it
                sellerPeers.push(s)

                // If seller has been invited
                if(s.connection.innerState === ConnectionInnerState.WaitingForSellerToJoin ||
                    s.connection.innerState === ConnectionInnerState.PreparingContract) {

                    // then hold on to it
                    invited.push(s)

                    // Check if seller actually joined
                    if(s.connection.innerState === ConnectionInnerState.PreparingContract)
                        joined.push(s)
                }
            }

        }

    }

    if(joyStreamPeers.length === 0)
        return new ViabilityOfPaidDownloadInSwarm.NoJoyStreamPeerConnections()
    else if(sellerPeers.length === 0)
        return new ViabilityOfPaidDownloadInSwarm.NoSellersAmongJoyStreamPeers(joyStreamPeers)
    else if(invited.length < minimumNumber)
        return new ViabilityOfPaidDownloadInSwarm.InSufficientNumberOfSellersInvited(invited)
    else if(joined.length < minimumNumber)
        return new ViabilityOfPaidDownloadInSwarm.InSufficientNumberOfSellersHaveJoined(joined, invited)
    else // NB: Later add estimate here using same peer selection logic found in startPaidDownload input above
        return new ViabilityOfPaidDownloadInSwarm.Viable(joined, 0)
}

module.exports = Started
