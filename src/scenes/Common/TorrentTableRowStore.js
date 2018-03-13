
import { observable, action } from 'mobx'
import {computed} from 'mobx/lib/mobx'
import {indexesOfPlayableFiles} from './utils'
import {shell} from 'electron'

/**
 * Model for row in downloading table
 */
class TorrentTableRowStore {

  /**
   * {Bool} Whether to display toolbar over this row
   */
  @observable showToolbar

  /**
   * {@link TorrentStore} The underlying torrent for this row
   */
  torrentStore

  constructor(torrentStore, uiStore, showToolbar) {

    this.torrentStore = torrentStore
    this._uiStore = uiStore
    this._applicationStore = this._uiStore.applicationStore
    this.setShowToolbar(showToolbar)
  }

  @action.bound
  setShowToolbar(showToolbar) {
    this.showToolbar = showToolbar
  }

  @action.bound
  mouseEnter() {
    this.setShowToolbar(true)
  }

  @action.bound
  mouseLeave() {
    this.setShowToolbar(false)
  }

  remove() {
    this._applicationStore.removeTorrent(this.torrentStore.infoHash, false, () => {})
  }

  removeAndDeleteData() {
    this._applicationStore.removeTorrent(this.torrentStore.infoHash, true, () => {})
  }

  openFolder() {
    shell.openItem(this.torrentStore.savePath)
  }

  @computed get
  viabilityOfPaidDownloadingTorrent() {
    return this._uiStore.torrentsViabilityOfPaidDownloading.get(this.torrentStore.infoHash)
  }

  @computed get
  playableMediaList() {

    if(this.torrentStore.torrentFiles) {
      return indexesOfPlayableFiles(this.torrentStore.torrentFiles)
    } else {
      return []
    }
  }

  @computed get
  canPlayMedia () {
    return this.playableMediaList.length > 0
  }

  playMedia(/*fileIndex = 0*/) {
    if (this.playableMediaList.length) {
      let firstPlayableFileIndex = this.playableMediaList[0]
      this._uiStore.playMedia(this.torrentStore.infoHash, firstPlayableFileIndex)
    }
  }

  beginPaidUploadWithDefaultTerms() {

    let defaultTerms = this._uiStore.applicationStore.defaultSellerTerms(this.torrentStore.pieceLength)

    this.torrentStore.beginUploading(defaultTerms)
  }

}

export default TorrentTableRowStore
