import { observable, action } from 'mobx'
import { TorrentInfo } from 'joystream-node'
import { remote } from 'electron'

const DownloadingState = {
  InitState: 0,
  TorrentFileWasInvalid: 1,
  TorrentAlreadyAdded: 2
}

class DownloadingStore {

  /**
   * {Number} Current state of the downloading flow
   **/
  @observable state

  constructor (applicationStore, state = DownloadingState.InitState) {
    this.applicationStore = applicationStore
    this.state = state
  }

  @action.bound
  setState (newState) {
    this.state = newState
  }

  acceptTorrentFileWasInvalid () {
    this.setState(DownloadingState.InitState)
  }

  retryPickingTorrentFile () {
    this.setState(DownloadingState.InitState)

    this.startDownloadWithTorrentFileFromFilePicker()
  }

  acceptTorrentWasAlreadyAdded () {
    this.setState(DownloadingState.InitState)
  }

  startDownloadWithTorrentFileFromFilePicker () {
    // Allow user to pick a torrent file
    var filesPicked = remote.dialog.showOpenDialog({
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

    this.addTorrent(filesPicked[0])
  }

  startDownloadWithTorrentFileFromDragAndDrop (files) {
    // If the user did no pick any files, then we are done
    if (!files || files.length === 0) {
      return
    }

    // Try to start download based on torrent file name
    this.addTorrent(files[0].path)
  }

  addTorrent (torrentFile) {
    // Get torrent file name picked
    let torrentInfo

    try {
      torrentInfo = new TorrentInfo(torrentFile)
    } catch (e) {
      this.setState(DownloadingState.TorrentFileWasInvalid)
      return
    }

    // Make sure torrent is not already added
    if (this.applicationStore.hasTorrent(torrentInfo.infoHash())) {
      this.setState(DownloadingState.TorrentAlreadyAdded)
      return
    }

    this.applicationStore.addTorrentFile(torrentFile)
  }

}

DownloadingStore.State = DownloadingState

export default DownloadingStore
