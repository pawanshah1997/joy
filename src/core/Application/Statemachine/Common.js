/**
 * Created by bedeho on 12/08/17.
 */

//const TorrentState = require('joystream-node').TorrentState
const TorrentInfo = require('joystream-node').TorrentInfo
const assert = require('assert')
const magnet = require('magnet-uri')
const isDev = require('electron-is-dev')
import {remote} from 'electron'
import path from 'path'
const {shell} = require('electron')
const debugApplicationAddTorrent = require('debug')('application:addTorrent')

// Either Common should be exported, or .is* functions should be exported,
// or these values should be here. Calling TorrentCommon is just a temporary fix until this is fixed
// see: https://github.com/JoyStream/joystream-electron/issues/215
const TorrentCommon = require('../../Torrent/Statemachine/Common')

const TorrentStatemachine = require('../../Torrent/Statemachine')

function addTorrent(client, settings) {
    debugApplicationAddTorrent('Adding torrent : ', settings.name)

    const infoHash = settings.infoHash

    let store = client.factories.torrentStore(infoHash, settings.savePath)

    debugApplicationAddTorrent('Torrent store created')

    let coreTorrent = client.factories.torrent(store)

    debugApplicationAddTorrent('Core torrent created')

    // Assign core torrent as action handler
    store.setTorrent(coreTorrent)

    /// Hook into various torrent events

    // When torrent is loaded
    coreTorrent.once('enter-Active.Uninitialized', function (data) {
        client.processStateMachineInput('torrentLoaded')
    })

    // When torrent cannot be added to libtorrent session
    coreTorrent.on('enter-Loading.FailedAdding', function (data) {
      debugApplicationAddTorrent('Failed adding :', data)
        console.log('Catastrophic failure, failed adding torrent.')
        assert(false)
    })

    // When torrent is missing buyer terms
    coreTorrent.on('enter-Loading.WaitingForMissingBuyerTerms', function (data) {
        client.processStateMachineInput('torrentWaitingForMissingBuyerTerms', coreTorrent)
    })

    // When torrent has completed downloading
    coreTorrent.on('enter-Active.FinishedDownloading.Passive', function (data) {
        client.processStateMachineInput('torrentFinishedDownloading', infoHash)
    })

    // settings.metadata has to be a TorrentInfo object
    if (settings.metadata) {
      assert(settings.metadata instanceof TorrentInfo)
    }

    if (settings.resumeData) {
        var resumeData = Buffer.from(settings.resumeData, 'base64')
    }

    debugApplicationAddTorrent('Start loading')

    // TODO: Need to have the settings.url handle here because settings.metadata is actually null.
    coreTorrent.startLoading(infoHash, settings.name, settings.savePath, resumeData, settings.metadata, settings.deepInitialState, settings.extensionSettings)

    client.torrents.set(infoHash, coreTorrent)

    client.store.torrentAdded(store)

    let params = {
        name: settings.name,
        savePath: settings.savePath,
        ti: settings.metadata
    }

    if (settings.url) {
      params.url = settings.url
    }

    // joystream-node decoder doesn't correctly check if resumeData propery is undefined, it only checks
    // if the key on the params object exists so we need to conditionally set it here.
    if (resumeData) params.resumeData = resumeData

    // Whether torrent should be added in (libtorrent) paused mode from the get go
    // We always add it in non-paused mode to make sure torrent completes checking files and
    // finish loading in the state machine
    let addAsPaused = false

    // Automanagement: We never want this, as our state machine should explicitly control
    // pause/resume behaviour torrents for now.
    //
    // Whether libtorrent is responsible for determining whether it should be started or queued.
    // Queuing is a mechanism to automatically pause and resume torrents based on certain criteria.
    // The criteria depends on the overall state the torrent is in (checking, downloading or seeding).
    let autoManaged = false

    // set param flags - auto_managed/paused
    params.flags = {
        paused: addAsPaused,
        auto_managed: autoManaged,

        // make sure our settings override resume data (paused and auto managed flags)
        override_resume_data: true
    }

    client.services.session.addTorrent(params, function (err, torrent) {
        debugApplicationAddTorrent('Torrent %s added', settings.name)

        // Is this needed ?
        //client.processStateMachineInput('torrentAdded', err, torrent, coreTorrent)
        coreTorrent.addTorrentResult(err, torrent)
    })

    // Return core torrent, typically so user can setup their own context
    // specific event handlers
    return coreTorrent
}

function removeTorrent(client, infoHash, deleteData) {

    var fullPath
    var torrent = client.torrents.get(infoHash)

    if (deleteData) {
        // retrieve path before deleting
        var torrentInfo = torrent._client.getTorrentInfo()
        var name = torrentInfo.name()
        var savePath = torrent._client.getSavePath()
        fullPath = path.join(savePath, name, path.sep)
    }

    torrent.terminate()

    // Remove the torrent from the session
    client.services.session.removeTorrent(infoHash, function () {

    })

    // Remove the torrent from the db
    client.services.db.remove('torrents', infoHash).then(() => {

    })

    // Delete torrent from the client map
    client.torrents.delete(infoHash)

    // Remove the torrent from the applicationStore
    client.store.torrentRemoved(infoHash)

    // If deleteData we want to remove the folder/file
    if (fullPath && deleteData) {
        shell.moveItemToTrash(fullPath)
    }

}

function isMagnetUri (stringToCheck) {
  if (stringToCheck) {
    return stringToCheck.startsWith('magnet')
  }
  return false
}

function hasMagnetUri () {

  let magnetLink = null

  if (isDev) {
    // Get the magnet link if exist
    if (isMagnetUri(remote.process.argv[2])) {
      magnetLink = remote.process.argv[2]
    }
  } else {
    // Get the magnet link if exist
    if (isMagnetUri(remote.process.argv[1])) {
      magnetLink = remote.process.argv[1]
    }
  }

  return magnetLink
}

function showNativeTorrentFilePickerDialog () {

    return remote.dialog.showOpenDialog({
        title : "Pick torrent file",
        filters: [
            {name: 'Torrent file', extensions: ['torrent']},
            {name: 'All Files', extensions: ['*']}
        ],
        properties: ['openFile']}
    )
}

function getSettingsFromMagnetUri (magnetUri, defaultSavePath) {

    let terms = getStandardBuyerTerms()
    var parsed = magnet.decode(magnetUri)

    return {
        infoHash: parsed.infoHash,
        url: magnetUri,
        resumeData : null,
        savePath: defaultSavePath,
        name: parsed.infoHash,
        deepInitialState: TorrentStatemachine.DeepInitialState.DOWNLOADING.UNPAID.STARTED,
        extensionSettings : {
            buyerTerms: terms
        }
    }
}

function getStartingDownloadSettings(torrentInfo, defaultSavePath) {

    // NB: Get from settings data store of some sort
    let terms = getStandardBuyerTerms()

    const infoHash = torrentInfo.infoHash()

    return {
        infoHash : infoHash,
        metadata : torrentInfo,
        resumeData : null,
        name: torrentInfo.name() || infoHash,
        savePath: defaultSavePath,
        deepInitialState: TorrentStatemachine.DeepInitialState.DOWNLOADING.UNPAID.STARTED,
        extensionSettings : {
            buyerTerms: terms
        }
    }
}

function getStartingUploadSettings(torrentInfo, defaultSavePath) {

    // NB: Get from settings data store of some sort
    let terms = getStandardSellerTerms()

    const infoHash = torrentInfo.infoHash()

    return {
        infoHash : infoHash,
        metadata : torrentInfo,
        resumeData : null,
        name: torrentInfo.name() || infoHash,
        savePath: defaultSavePath,
        deepInitialState: TorrentStatemachine.DeepInitialState.UPLOADING.STARTED,
        extensionSettings : {
            sellerTerms: terms
        }
    }
}

function getStandardBuyerTerms() {
    return {
        maxPrice: 20,
        maxLock: 5,
        minNumberOfSellers: 1,
        maxContractFeePerKb: 2000
    }
}

function getStandardSellerTerms() {
    return {
        minPrice: 20,
        minLock: 1,
        maxNumberOfSellers: 5,
        minContractFeePerKb: 2000,
        settlementFee: 2000
    }
}

export {
    getStandardBuyerTerms,
    getStandardSellerTerms,
    addTorrent,
    removeTorrent,
    hasMagnetUri,
    showNativeTorrentFilePickerDialog,
    getSettingsFromMagnetUri,
    getStartingDownloadSettings,
    getStartingUploadSettings
}
