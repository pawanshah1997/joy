
import { observable, action } from 'mobx'
import {computed} from "mobx/lib/mobx";


/**
 * Factor out a base which can be reused across all three scenes?
 */

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
  canPlayMedia() {
    return this.torrentStore.playableIndexfiles.length > 0
  }
  
  playMedia(fileIndex = 0) {
    this.torrentStore.play(this.torrentStore.playableIndexfiles[fileIndex])
  }
  
}

export default TorrentTableRowStore