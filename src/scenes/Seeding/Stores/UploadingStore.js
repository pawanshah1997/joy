import { observable, action, computed } from 'mobx'
import { TorrentInfo } from 'joystream-node'
import { remote } from 'electron'
import TorrentTableRowStore from "../../Common/TorrentTableRowStore";

/**
 * User interface store for uploading scene
 */
class UploadingStore {
  
  static STATE  = {
    InitState: 0,
    
    // Part of flow to add a torrent file for uploading
    // NB: Consider factoring out later?
  
    /**
     * Currently not supported, we just force torrent file flow.
     * Step where user decided if they have raw content or a torrent filed.
     *
     * UserSelectingTorrentFileOrRawContent: 1,
     * ProvideTorrentFileMetadata: 7,
     * GeneratingTorrentFile: 8
     */
    
    TorrentFileWasInvalid: 2,
    TorrentAlreadyAdded: 3,
    UserPickingSavePath: 4,
    AddingTorrent: 5,
    TellUserAboutIncompleteDownload: 6,
    
  }
  
  /**
   * {Map.<TorrentTableRowStore>} Maps info hash to the row store for the corresponding torrent
   * Notice that this is not observable for rendering actual table, see `tableRowStores` below.
   */
  @observable rowStorefromTorrentInfoHash

  /**
   * {UploadingStore.STATE} Current state of scene
   **/
  @observable state

  /**
   * {String} Path to torrent file currently part of start uploading flow,
   * and is only defined when `canStartUpload`
   */
  @observable torrentFilePathSelected

  constructor (uiStore) {

    this._uiStore = uiStore

    this.setRowStorefromTorrentInfoHash(new Map())
    this.setState(UploadingStore.STATE.InitState)
    
    // Torrent file selected in the current start uploading flow,
    // is reset when flow ends
    this._torrentInfoSelected = null
  }
  @action.bound
  addTorrentStore(torrentStore) {
    
    if(this.rowStorefromTorrentInfoHash.has(torrentStore.infoHash))
      throw Error('Torrent store for same torrent already exists.')
    
    let row = new TorrentTableRowStore(torrentStore, this._uiStore.applicationStore, this._uiStore.applicationStore.walletStore, false)
    
    this.rowStorefromTorrentInfoHash.set(torrentStore.infoHash, row)
  }
  
  @action.bound
  removeTorrentStore(infoHash) {
    
    if(!this.rowStorefromTorrentInfoHash.has(infoHash))
      throw Error('No corresponding torrent store exists.')
    
    this.rowStorefromTorrentInfoHash.delete(infoHash)
  }

  @action.bound
  setRowStorefromTorrentInfoHash(rowStorefromTorrentInfoHash) {
    this.rowStorefromTorrentInfoHash = rowStorefromTorrentInfoHash
  }

  @action.bound
  setState (newState) {
    
    // Reset torrentinfo selected as part of flow
    if(newState === UploadingStore.STATE.InitState)
      this._torrentInfoSelected = null
    
    this.state = newState
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
  
    return [...this.rowStorefromTorrentInfoHash.values()]
      .filter((torrentRowStore) => {
        return torrentRowStore.isUploading
      })
  }
  
  @computed get
  totalUploadSpeed () {
    return this.torrentRowStores.reduce(function (accumulator, row) {
      return accumulator + row.torrentStore.uploadSpeed
    }, 0)
  }

  @action.bound
  setTorrentFilePathSelected (torrentFile) {
    this.torrentFilePathSelected = torrentFile
  }
  
  @computed get
  canStartUpload() {
    this.state === UploadingStore.STATE.InitState
  }

  uploadTorrentFile () {
  
    // If the user tries adding when we are not ready,
    // then we just ignore, but UI should avoid this ever
    // happening in practice
    if (!this.canStartUpload)
      throw Error('Can only initiate uploading in InitState.')
  
    this._uploadTorrentFile()
  }
  
  /**
   * Routine which presumed we are already
   * @private
   */
  _uploadTorrentFile() {
    
    /// User selects torrent file
    
    // Display file picker
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
  
    let torrentFileName = filesPicked[0]
    
    /// Read torrent file data
    let torrentFileData
  
    try {
    
      // NB: Later make async to not block, and introduce state+ui
      torrentFileData = fs.readFileSync(torrentFileName)
    
    } catch (e) {
    
      // NB: Add fail dialog UI state for this
    
      console.log('Failed to load torrent file: ' + torrentFileName)
      console.log(e)
      return
    }
    
    // Get torrent file name picked
    let torrentInfo

    try {
      torrentInfo = new TorrentInfo(torrentFileData)
      
    } catch (error) {
      
      this.setState(UploadingStore.STATE.TorrentFileWasInvalid)
      return
    }
    
    // Hold on to torrent_info object
    this._torrentInfoSelected = torrentInfo
    
    this.setState(UploadingStore.STATE.UserPickingSavePath)
  }

  startUpload (savePath) {
  
    if(this.state !== UploadingStore.STATE.UserPickingSavePath)
      throw Error('Can only start when user is picking save path')
    
    assert(this._torrentInfoSelected)
  
    // Get settings
    let settings = getStartingUploadSettings(this._torrentInfoSelected, savePath)
    
    // Update state
    this.setState(UploadingStore.STATE.AddingTorrent)
    
    // Add torrent with given settings
    this._uiStore.applicationStore.addTorrent(settings, (err, torrentStore) => {
      
      assert(this.state === UploadingStore.STATE.AddingTorrent)
    
      if(err) {
      
        // NB: could there be some other issue here? if so, can we reliably decode it
        // requires further inspection, for now we just presume i
      
        this.setState(UploadingStore.STATE.TorrentAlreadyAdded)
      
      } else {
        
        // <-- is this really right? -->
        
        // We were able to add, now we must wait for calls to
        // `torrentFinishedDownloading` or `torrentDownloadIncomplete`
        // to learn about result. We cannot create local reactions on
        // `torrentStore`, as that violates design principle (a), and
        // also MOBX best practices about updating model in reactions.
        
      }
    
    })
  }
  
  torrentFinishedDownloading(infoHash) {
  
    // If we are currently trying to add this torrent
  
    if(this.state === UploadingStore.STATE.AddingTorrent &&
    infoHash === this._torrentInfoSelected.infoHash()) {
  
      // then we are now done
      this.setState(UploadingStore.STATE.InitState)
      
    }
    
  }
  
  torrentDownloadIncomplete(infoHash) {
    
    // If we are currently trying to add this torrent
    if(this.state === UploadingStore.STATE.AddingTorrent &&
      infoHash === this._torrentInfoSelected.infoHash()) {
    
      // then we have to inform the user about the incomplete download
      this.setState(UploadingStore.STATE.TellUserAboutIncompleteDownload)
    
    }
  }

  acceptTorrentFileWasInvalid () {
    
    if(this.state !== UploadingStore.STATE.TorrentFileWasInvalid)
      throw Error('Invalid action when state is not TorrentFileWasInvalid')
    
    this.setState(UploadingStore.STATE.InitState)
  }

  retryPickingTorrentFile () {
  
    if(this.state !== UploadingStore.STATE.TorrentFileWasInvalid)
      throw Error('State must be TorrentFileWasInvalid')
    
    this.setState(UploadingStore.STATE.InitState)

    this.uploadTorrentFile()
  }

  acceptTorrentWasAlreadyAdded () {
  
    if(this.state !== UploadingStore.STATE.TorrentAlreadyAdded)
      throw Error('State must be TorrentAlreadyAdded')
    
    this.setState(UploadingStore.STATE.InitState)
  }

  exitStartUploadingFlow () {
    
    if(this.state === UploadingStore.STATE.InitState)
      throw Error('State cannot be InitState')
    
    this.setState(UploadingStore.STATE.InitState)
  }

  dropDownloadClicked () {
    
    if(this.state !== UploadingStore.STATE.TellUserAboutIncompleteDownload)
      throw Error('State must be TellUserAboutIncompleteDownload')
    
    assert(this._torrentInfoSelected)
  
    this._uiStore.applicationStore.removeTorrent(this._torrentInfoSelected.infoHash, false)
    
    this.setState(UploadingStore.STATE.InitState)
  }

  keepDownloadingClicked () {
    this.setState(UploadingStore.STATE.InitState)
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

export default UploadingStore
