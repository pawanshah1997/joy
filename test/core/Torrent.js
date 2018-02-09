/**
 * Created by bedeho on 04/07/17.
 */

var assert = require('chai').assert
var sinon = require('sinon')
var Mocks = require('./Mocks')

//var ConnectionInnerState = require('joystream-node').ConnectionInnerState
var Torrent = require('../../src/core/Torrent/Statemachine')

/**
 *
 * NB! Within a given describe where a client instance lives, the order of
 * specific tests (it) are important most of the time, so change with care.
 *
 */

describe('Torrent state machine', function () {

    describe('recovers from incomplete download with upload settings' , function () {

        let client = new MockClient()

        let fixture = {
            infoHash: "my_info_hash",
            name: "my_torrent_name",
            savePath: "save_path",
            resumeData: null,
            metadata: "my-metadata",
            deepInitialState: Torrent.DeepInitialState.UPLOADING.STOPPED,
            extensionSettings: {
                sellerTerms : {}
            },
            isFullyDownloaded: false
        }

        let torrent = new Mocks.Torrent(fixture)
        let torrentInfo = new Mocks.TorrentInfo(fixture)

        it('waits for buyer terms', function () {

            handleSequence(Torrent,
                            client,
                            fixtureToStartLoadingInput(fixture, torrentInfo),
                            ['addTorrentResult', null, torrent],
                            ['metadataReady', torrentInfo],
                            fixtureToCheckFinishedInput(fixture),
                            'setLibtorrentInteractionResult')

            assert.equal(Torrent.compositeState(client), 'Loading.WaitingForMissingBuyerTerms')

        })

        it('gets started downloading', function() {

            handleSequence(Torrent,
                            client,
                            'updateBuyerTerms',
                            'toBuyModeResult',
                            'startExtensionResult')

            assert.equal(Torrent.compositeState(client), 'Active.DownloadIncomplete.Unpaid.Started.ReadyForStartPaidDownloadAttempt')

        })

    })

    describe('terminate while loading' , function () {

        let client = new MockClient()

        let fixture = {
            infoHash: "my_info_hash",
            name: "my_torrent_name",
            savePath: "save_path",
            resumeData: null,
            metadata: "my-metadata",
            deepInitialState: Torrent.DeepInitialState.UPLOADING.STOPPED,
            extensionSettings: {
                sellerTerms : {}
            },
            isFullyDownloaded: false,
            generateResumeData : true
        }

        let torrent = new Mocks.Torrent(fixture)
        let torrentInfo = new Mocks.TorrentInfo(fixture)

        it('terminates', function () {

            handleSequence(Torrent, client,
                            fixtureToStartLoadingInput(fixture, torrentInfo),
                            ['addTorrentResult', null, torrent],
                            ['metadataReady', torrentInfo],
                            fixtureToCheckFinishedInput(fixture),
                            fixtureToTerminateInput(fixture))

            assert.equal(Torrent.compositeState(client), 'Terminated')
        })

    })

    describe('Full downloading->passive->uploading lifecycle', function() {

        let client = new MockClient()

        let fixture = {
            infoHash: "my_info_hash",
            name: "my_torrent_name",
            savePath: "save_path",
            resumeData: "resume_data",
            metadata: null,
            deepInitialState: Torrent.DeepInitialState.DOWNLOADING.UNPAID.STOPPED,
            extensionSettings: {
                buyerTerms : {
                    minNumberOfSellers : 1
                }
            },
            updateBuyerTerms : {
                x : 2,
                rr: "hello"
            }

        }

        let torrent = new Mocks.Torrent(fixture)
        let torrentInfo = new Mocks.TorrentInfo(fixture)

        it('waits to be added to session', function () {

            handleSequence(Torrent,
                            client,
                            fixtureToStartLoadingInput(fixture, torrentInfo))

            assert.equal(Torrent.compositeState(client), 'Loading.AddingToSession')

        })

        it('waits for metadata',  function() {

            Torrent.queuedHandle(client, 'addTorrentResult', null, torrent)

            assert.equal(Torrent.compositeState(client),'Loading.WaitingForMetadata')
        })

        it('checks partial download', function() {

            Torrent.queuedHandle(client, 'metadataReady')

            assert.equal(Torrent.compositeState(client), 'Loading.CheckingPartialDownload')
        })

        it('goes to correct inital state: unpaid stopped downloading', function() {

            Torrent.queuedHandle(client, 'checkFinished')

            assert.equal(client.setLibtorrentInteraction.callCount, 1)
            assert.equal(client.toBuyMode.callCount, 1)
            assert.deepEqual(client.toBuyMode.getCall(0).args[0], fixture.extensionSettings.buyerTerms)
            assert.equal(Torrent.compositeState(client), 'Active.DownloadIncomplete.Unpaid.Stopped')

        })

        it('starts', function () {

            client.startLibtorrentTorrent.reset()
            client.startExtension.reset()

            Torrent.queuedHandle(client, 'start')

            assert.equal(client.startLibtorrentTorrent.callCount, 1)
            assert.equal(client.startExtension.callCount, 1)
            assert.equal(Torrent.compositeState(client), 'Active.DownloadIncomplete.Unpaid.Started.ReadyForStartPaidDownloadAttempt')
        })

        it('update buyer terms', function () {

            Torrent.queuedHandle(client, 'updateBuyerTerms', fixture.updateBuyerTerms)

            assert.equal(client.updateBuyerTerms.callCount, 1)
            assert.deepEqual(client.updateBuyerTerms.getCall(0).args[0], fixture.updateBuyerTerms)
            assert.equal(Torrent.compositeState(client), 'Active.DownloadIncomplete.Unpaid.Started.ReadyForStartPaidDownloadAttempt')
        })

        it('ignores premature start paid download attempts' , function () {

            var stupidComparer = function(peerA, peerB) {
                return peerA > peerB
            }

            Torrent.queuedHandle(client, 'startPaidDownload', stupidComparer)
            assert.equal(Torrent.compositeState(client), 'Active.DownloadIncomplete.Unpaid.Started.ReadyForStartPaidDownloadAttempt')

        })

        it('finds suitable sellers', function () {

            /// pump in peerpluigins which brings to 'CanStartPaidDownload'

            let statuses = []
            statuses.push(Mocks.PeerPluginStatus('id-1'))
            statuses.push(Mocks.PeerPluginStatus('id-2'))
            statuses.push(Mocks.PeerPluginStatus('id-3'))

            Torrent.queuedHandle(client, 'processPeerPluginsStatuses', statuses)

            //assert.isOk(client.addPeer.firstCall)

            /// pump in peerplugins which brings back to 'ReadyForStartPaidDownloadAttempt' again

            statuses = []
            statuses.push(Mocks.PeerPluginStatus('id-1' , 0))

            Torrent.queuedHandle(client, 'processPeerPluginsStatuses', statuses)

            // x peers, but none in right state
            // assert.isOk(client.)
        })

        it('can start paid download', function () {

            ///

            // pump in peerplugins which brings to 'CanStartPaidDownload'

            ///

            // startPaidDownload event moves to 'SigningContract'

            ///

            // trigger contractSigned, moves to 'InitiatingPaidDownload'

            ///

            // trigger paidDownloadInitiationCompleted, moves to '../../Paid/Started'

        })

        it('finish download' , function() {

            client.toObserveMode.reset()

            Torrent.queuedHandle(client, 'downloadFinished')

            assert.equal(client.toObserveMode.callCount, 1)
            assert.equal(Torrent.compositeState(client), 'Active.FinishedDownloading.Passive')
        })

    })

    describe('Direct to passive flow', function() {

        let client = new MockClient()

        let fixture = {
            infoHash: "my_info_hash",
            name: "my_torrent_name",
            savePath: "save_path",
            resumeData: "resume_data",
            metadata: null,
            deepInitialState: Torrent.DeepInitialState.PASSIVE,
            extensionSettings: {},
            isFullyDownloaded: true
        }

        let torrent = new Mocks.Torrent(fixture)
        let torrentInfo = new Mocks.TorrentInfo(fixture)

        it('gets to passive', function () {

            handleSequence(Torrent, client,
                fixtureToStartLoadingInput(fixture, torrentInfo),
                ['addTorrentResult', null, torrent],
                ['metadataReady', torrentInfo],
                fixtureToCheckFinishedInput(fixture)
            )

            assert.equal(Torrent.compositeState(client), 'Active.FinishedDownloading.Passive')
        })

        it('then to uploading', function() {

            Torrent.queuedHandle(client, 'goToStartedUploading')

            assert.equal(Torrent.compositeState(client), 'Active.FinishedDownloading.Uploading.Started')
            assert.equal(client.toSellMode.callCount, 1)
        })

        it('then back to passive', function() {

            Torrent.queuedHandle(client, 'goToPassive')



        })

    })

    describe('Direct to uploading flow', function () {

        let client = new MockClient()

        let fixture = {
            infoHash: "my_info_hash",
            name: "my_torrent_name",
            savePath: "save_path",
            resumeData: "resume_data",
            metadata: null,
            deepInitialState: Torrent.DeepInitialState.UPLOADING.STOPPED,
            extensionSettings: {
                sellerTerms : {}
            },
            updateSellerTerms : {
                sellerTerms : {
                    xxx : 1
                }
            },
            isFullyDownloaded: true
        }

        let torrent = new Mocks.Torrent(fixture)
        let torrentInfo = new Mocks.TorrentInfo(fixture)

        it('gets to (stopped) uploading', function () {

            handleSequence(Torrent, client,
                fixtureToStartLoadingInput(fixture, torrentInfo),
                ['addTorrentResult', null, torrent],
                ['metadataReady', torrentInfo],
                fixtureToCheckFinishedInput(fixture)
            )

            assert.equal(Torrent.compositeState(client), 'Active.FinishedDownloading.Uploading.Stopped')
        })

        it('starts', function () {

            Torrent.queuedHandle(client, 'start')

            assert.equal(client.startLibtorrentTorrent.callCount, 1)
            assert.isOk(client.startExtension.callCount, 1)
            assert.equal(Torrent.compositeState(client), 'Active.FinishedDownloading.Uploading.Started')
        })

        it('changes seller terms', function () {

            Torrent.queuedHandle(client, 'updateSellerTerms', fixture.updateSellerTerms.sellerTerms)

            assert.equal(client.updateSellerTerms.callCount, 1)
            assert.deepEqual(client.updateSellerTerms.getCall(0).args[0], fixture.updateSellerTerms.sellerTerms)
            assert.equal(Torrent.compositeState(client), 'Active.FinishedDownloading.Uploading.Started')
        })

        it('starts paid upload' , function () {


            ///

            var statuses = []

            Torrent.queuedHandle(client, 'processPeerPluginStatuses', statuses)


            ///

            // startUploadingFailed

            ///

            // startedPaidUploading


        })

        it('goes back to passive', function () {

            ///

            Torrent.queuedHandle(client, 'goToPassive')

            assert.equal(client.updateSellerTerms.callCount, 1)
            assert.deepEqual(client.updateSellerTerms.getCall(0).args[0], fixture.updateSellerTerms.sellerTerms)
            assert.equal(Torrent.compositeState(client), 'Active.FinishedDownloading.Passive')

            ///

            //

            ///

            //

        })

    })

})

function MockClient() {

    this.store = new Mocks.TorrentStore()

    this.processStateMachineInput = function (...args) {
      Torrent.queuedHandle(this, ...args)
    }

    this.addTorrent = sinon.spy()
    this.stopExtension = sinon.spy()
    this.startExtension = sinon.spy()
    this.startLibtorrentTorrent = sinon.spy()
    this.generateResumeData = sinon.spy()
    this.setLibtorrentInteraction = sinon.spy()
    this.toObserveMode = sinon.spy()
    this.toSellMode = sinon.spy()
    this.toBuyMode = sinon.spy()
    this.startUploading = sinon.spy()
    this.updateSellerTerms = sinon.spy()
    this.updateBuyerTerms = sinon.spy()
    this.updatePeerPluginStatus = sinon.spy()
    this.getStandardSellerTerms = sinon.spy()
}

// Drop??
MockClient.prototype.resetSpies = function() {

    this.addTorrent.reset()
    this.stopExtension.reset()
    this.startExtension.reset()
    this.startLibtorrentTorrent.reset()
    this.generateResumeData.reset()
    this.setLibtorrentInteraction.reset()
    this.toObserveMode.reset()
    this.toSellMode.reset()
    this.toBuyMode.reset()
    this.startUploading.reset()
    this.updateSellerTerms.reset()
    this.updateBuyerTerms.reset()
    this.updatePeerPluginStatus.reset()
    this.getStandardSellerTerms.reset()
}

function fixtureToStartLoadingInput(fix, torrentInfo) {

    return [
        'startLoading',
        fix.infoHash,
        fix.name,
        fix.savePath,
        fix.resumeData,
        torrentInfo,
        fix.deepInitialState,
        fix.extensionSettings
    ]

}

function fixtureToCheckFinishedInput(fix) {

    if(fix.isFullyDownloaded === undefined)
        throw new Error('isFullyDownloaded undefined')

    return [
        'checkFinished',
        fix.isFullyDownloaded
    ]
}

function fixtureToTerminateInput(fix) {

    if(fix.generateResumeData === undefined)
        throw new Error('generateResumeData undefined')

    return [
        'terminate',
        fix.generateResumeData
    ]
}

/// Move this onto Basemachine later?

function handleSequence(machine, client) {

    // arguments[2,...] : String, for subroutine, array with params, for function call

    for(var i = 2;i < arguments.length;i++)
        SubmitEventToBasemachine(machine, client, arguments[i])
}

function SubmitEventToBasemachine(machine, client, input) {

    if(typeof input === 'string')
        machine.queuedHandle(client, input)
    else if(input instanceof Array) // === 'array'
        machine.queuedHandle.apply(machine, [client].concat(input))
    else
        throw new Error('Bad event type passed')
}
