import {computed} from 'mobx'
import {action, observable} from "mobx/lib/mobx";

class CompletedStore {
  
  /**
   * {Map.<TorrentTableRowStore>} Maps info hash to the row store for the corresponding torrent
   * Notice that this is not observable for rendering actual table, see `tableRowStores` below.
   */
  @observable rowStorefromTorrentInfoHash
  
  constructor(rowStorefromTorrentInfoHash) {
    this.setRowStorefromTorrentInfoHash(rowStorefromTorrentInfoHash)
  }
  
  @action.bound
  setRowStorefromTorrentInfoHash(rowStorefromTorrentInfoHash) {
    this.rowStorefromTorrentInfoHash = rowStorefromTorrentInfoHash
  }
  
  /**
   * Returns array of row stores, in the order they should be listed in the table.
   * @returns Array.<TorrentTableRowStore>
   */
  @computed get
  torrentRowStores () {
    
    /**
     * In the future we could compute different sorting based on whatever
     * the user has requested, e.g. by a particular column value.
     * For now we just do naive insertion order into `rowStorefromTorrentInfoHash` map.
     */
    
    return this.rowStorefromTorrentInfoHash.values()
  }
}

export default CompletedStore