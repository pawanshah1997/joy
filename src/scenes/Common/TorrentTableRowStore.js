
import { observable, action } from 'mobx'
import {computed} from "mobx/lib/mobx";
import {indexesOfPlayableFiles, computeViabilityOfPaidDownloadingTorrent} from './utils'
import Wallet from '../../core/Wallet'

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
    this._walletStore = this._applicationStore.walletStore
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
    this._applicationStore.remove(this.torrentStore.infoHash, false)
  }

  removeAndDeleteData() {
    this._applicationStore.remove(this.torrentStore.infoHash, true)
  }

  openFolder() {
    shell.openItem(this.torrentStore.savePath)
  }

  /**
   *
   * NB: Possible hack note
   *
   * Its not clear that this should live here, because it will need to be
   * computed different places in the UI stores hierarchy, which violates the "single
   * source of truth" principle. On the other hand, we have no torrent level
   * representation which would otherwise hold this. The `TorrentStore` has to
   * match the `Torrent`, hence we would need ot add this to that class, but that also seems wrong
   * A brighter mind should review this.
   *
   */

  @computed get
  viabilityOfPaidDownloadingTorrent() {

    let balance = 0
    let walletStarted = false

    if (this._walletStore) {
      balance = this._walletStore.totalBalance
      walletStarted = this._walletStore.state === Wallet.STATE.STARTED
    }

    return computeViabilityOfPaidDownloadingTorrent(this.torrentStore.state, walletStarted, balance, this.torrentStore.viabilityOfPaidDownloadInSwarm)
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

}

export default TorrentTableRowStore
