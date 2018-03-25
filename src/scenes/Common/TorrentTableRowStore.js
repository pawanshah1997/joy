
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

  /**
   * {Bool} Wether we are in the process of removing the torrent
   */
  @observable beingRemoved

  @observable deletingData

  constructor(torrentStore, uiStore, showToolbar) {

    this.torrentStore = torrentStore
    this._uiStore = uiStore
    this._applicationStore = this._uiStore.applicationStore
    this.setShowToolbar(showToolbar)
    this.setBeingRemoved(false)
    this.setDeletingData(false)
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

  @action.bound
  setBeingRemoved (beingRemoved) {
    this.beingRemoved = beingRemoved
  }

  @action.bound
  setDeletingData (deleting) {
    this.deletingData = deleting
  }

  remove () {
    this.setBeingRemoved(true)
    this._applicationStore.removeTorrent(this.torrentStore.infoHash, false, () => {})
  }

  removeAndDeleteData () {
    this.setBeingRemoved(true)
    this.setDeletingData(true)
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
    if (this.beingRemoved) return false
    return this.playableMediaList.length > 0
  }

  playMedia(/*fileIndex = 0*/) {
    if (this.playableMediaList.length) {
      let firstPlayableFileIndex = this.playableMediaList[0]
      this._uiStore.playMedia(this.torrentStore.infoHash, firstPlayableFileIndex)
    }
  }

  beginPaidUploadWithDefaultTerms() {
    if (this.beingRemoved) return

    let defaultTerms = this._uiStore._application.defaultSellerTerms(this.torrentStore.pieceLength, this.torrentStore.numberOfPieces)

    this.torrentStore.beginUploading(defaultTerms)
  }

}

export default TorrentTableRowStore
