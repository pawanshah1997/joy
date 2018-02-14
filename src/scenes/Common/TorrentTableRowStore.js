
import { observable, action } from 'mobx'
import {computed} from "mobx/lib/mobx";
import {indexesOfPlayableFiles} from './utils'

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
  
  constructor(torrentStore, applicationStore, uiStore, showToolbar) {
    
    this.torrentStore = torrentStore
    this._applicationStore = applicationStore
    this._uiStore = uiStore
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
  
  @computed get
  playableMediaList() {

    if(this.torrentStore.torrentInfo) {
      return indexesOfPlayableFiles(this.torrentStore.torrentInfo.torrentFiles)
    } else
      return false
  }
  
  playMedia(fileIndex = 0) {
    this.torrentStore.play(this.playableMediaList[fileIndex])
  }
  
}

export default TorrentTableRowStore