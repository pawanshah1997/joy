import { observable, action } from 'mobx'
import { TorrentInfo } from 'joystream-node'
import { remote } from 'electron'
import TorrentStatemachine from './Torrent/Statemachine'

const UploadingState = {
  InitState: 0,
  UserSelectingTorrentFileOrRawContent: 1,
  TorrentFileWasInvalid: 2,
  TorrentAlreadyAdded: 3,
  UserPickingSavePath: 4,
  LoadingTorrentForUploading: 5,
  TellUserAboutIncompleteDownload: 6,
  ProvideTorrentFileMetadata: 7,
  GeneratingTorrentFile: 8
}

class UploadingStore {

  /**
   * {Number} Current state of the uploading flow
   **/
  @observable state

  /**
   * {String} Path to torrent file currently part of start uploading flow
   */
  @observable torrentFilePathSelected

  constructor (applicationStore, state = UploadingState.InitState) {
    this.applicationStore = applicationStore
    this.state = state

    this.applicationStore.on('loadingTorrentForUploading', () => {
      this.setState(UploadingState.LoadingTorrentForUploading)
    })

    this.applicationStore.on('loadedSuccessfully', () => {
      this.setState(UploadingState.InitState)
    })

    this.applicationStore.on('failedStartUploadDueToIncompleteDownload', () => {
      this.setState(UploadingState.TellUserAboutIncompleteDownload)
    })

    // Temporary state
    this.torrentInfoToBeUploaded = null
  }

  @action.bound
  setState (newState) {
    this.state = newState
  }

  @action.bound
  settorrentFilePathSelected (torrentFile) {
    this.torrentFilePathSelected = torrentFile
  }

  uploadTorrentFile () {
    let filesPicked = remote.dialog.showOpenDialog({
      title: 'Pick torrent file',
      filters: [
        {name: 'Torrent file', extensions: ['torrent']},
        {name: 'All Files', extensions: ['*']}
      ],
      properties: ['openFile']}
    )
    // If the user did no pick any files, then we are done
    if (!filesPicked || filesPicked.length === 0) {
      return
    }

    // Get torrent file name picked
    let torrentInfo

    try {
      torrentInfo = new TorrentInfo(filesPicked[0])
    } catch (error) {
      this.setState(UploadingState.TorrentFileWasInvalid)
      return
    }

    // Make sure torrent is not already added
    if (this.applicationStore.hasTorrent(torrentInfo.infoHash())) {
      this.setState(UploadingState.TorrentAlreadyAdded)
      return
    }

    this.torrentInfoToBeUploaded = torrentInfo

    this.settorrentFilePathSelected(filesPicked[0])

    this.setState(UploadingState.UserPickingSavePath)
  }

  startUpload (defaultSavePath) {
    let terms = {
      minPrice: 20,
      minLock: 1,
      maxNumberOfSellers: 5,
      minContractFeePerKb: 2000,
      settlementFee: 2000
    }

    const infoHash = this.torrentInfoToBeUploaded.infoHash()

    let settings = {
      infoHash: infoHash,
      metadata: this.torrentInfoToBeUploaded,
      resumeData: null,
      name: this.torrentInfoToBeUploaded.name() || infoHash,
      savePath: defaultSavePath,
      deepInitialState: TorrentStatemachine.DeepInitialState.UPLOADING.STARTED,
      extensionSettings: {
        sellerTerms: terms
      }
    }

    this.torrentWithBadSavePathDuringStartUploadFlow = settings

    this.applicationStore.addTorrent(settings)

    // We need a promise here
  }

  acceptTorrentFileWasInvalid () {
    this.setState(UploadingState.InitState)
  }

  retryPickingTorrentFile () {
    this.setState(UploadingState.InitState)

    this.uploadTorrentFile()
  }

  acceptTorrentWasAlreadyAdded () {
    this.setState(UploadingState.InitState)
  }

  exitStartUploadingFlow () {
    this.setState(UploadingState.InitState)
  }

  dropDownloadClicked () {
    this.applicationStore.removeTorrent(this.torrentWithBadSavePathDuringStartUploadFlow.infoHash, false)
    this.setState(UploadingState.InitState)
  }

  keepDownloadingClicked () {
    this.setState(UploadingState.InitState)
  }

}

UploadingStore.State = UploadingState

export default UploadingStore
