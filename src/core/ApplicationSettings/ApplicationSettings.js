/**
 * Created by bedeho on 05/10/2017.
 */

import ElectronConfig from 'electron-config'
import { ipcRenderer, shell } from 'electron'
import EventEmitter from 'events'

const NUMBER_OF_PRIOR_SESSIONS = 'numberOfPriorSessions'
const DOWNLOAD_FOLDER = 'downloadFolder'
const USE_ASSISTED_PEER_DISCOVERY = 'useAssistedPeerDiscovery'
const BITTORRENT_PORT = 'bittorrentPort'

/**
 * ApplicationSettings.
 *
 * This is really quite a thin layer on top of ElectronConfig, bordering
 * on useless, however, it allowes reading & writing properties through
 * a runtime safe interface, while a simple type in ElectronConfig property
 * access will raise no issue.
 *
 * emits opened
 * emits closed
 */
class ApplicationSettings extends EventEmitter {
  
  static STATE = {
    CLOSED : 0,
    OPENED : 1,
  }
  
  /**
   * @property {STATE} State of settings database
   */
  state
  
  constructor () {
    
    super()
    
    this.state = ApplicationSettings.STATE.CLOSED
    this._electronConfigStore = null
  }
  
  /**
   * Open settings, with given default values for settings.
   *
   * @param numberOfPriorSessions
   * @param downloadFolder
   * @param useAssistedPeerDiscovery
   * @param bittorrentPort
   */
  open(numberOfPriorSessions, downloadFolder, useAssistedPeerDiscovery, bittorrentPort) {
    
    if(this.state !== ApplicationSettings.STATE.CLOSED)
      throw Error('Can only open when closed')
    
    // Open store with default values
    this._electronConfigStore = new ElectronConfig({
      NUMBER_OF_PRIOR_SESSIONS : numberOfPriorSessions,
      DOWNLOAD_FOLDER : downloadFolder,
      USE_ASSISTED_PEER_DISCOVERY : useAssistedPeerDiscovery,
      BITTORRENT_PORT : bittorrentPort
    })
    
    this.state = ApplicationSettings.STATE.OPENED
    this.emit('opened')
  }
  
  close() {
  
    if(this.state !== ApplicationSettings.STATE.OPENED)
      throw Error('Must be opened')
    
    this._electronConfigStore = null
    
    this.state = ApplicationSettings.STATE.CLOSED
    this.emit('closed')
  }
  
  filePath() {
  
    if(this.state !== ApplicationSettings.STATE.OPENED)
      throw Error('Must be opened')
    
    return this._electronConfigStore.path()
  }
  
  numberOfPriorSessions() {
    
    if(this.state !== ApplicationSettings.STATE.OPENED)
      throw Error('Must be opened')
    
    return this._electronConfigStore.get(NUMBER_OF_PRIOR_SESSIONS)
  }
  
  setNumberOfPriorSessions(numberOfPriorSessions) {
  
    if(this.state !== ApplicationSettings.STATE.OPENED)
      throw Error('Must be opened')
    
    this._electronConfigStore.set(NUMBER_OF_PRIOR_SESSIONS, numberOfPriorSessions)
  }
  
  getDownloadFolder () {
    
    if(this.state !== ApplicationSettings.STATE.OPENED)
      throw Error('Must be opened')
    
    return this._electronConfigStore.get(DOWNLOAD_FOLDER)
  }

  setDownloadFolder (downloadFolder) {
    
    if(this.state !== ApplicationSettings.STATE.OPENED)
      throw Error('Must be opened')
    
    this._electronConfigStore.set(DOWNLOAD_FOLDER, downloadFolder)
  }
  
  getUseAssistedPeerDiscovery() {
  
    if(this.state !== ApplicationSettings.STATE.OPENED)
      throw Error('Must be opened')
  
    return this._electronConfigStore.get(USE_ASSISTED_PEER_DISCOVERY)
  }
  
  setUseAssistedPeerDiscovery(useAssistedPeerDiscovery) {
  
    if(this.state !== ApplicationSettings.STATE.OPENED)
      throw Error('Must be opened')
  
    this._electronConfigStore.set(USE_ASSISTED_PEER_DISCOVERY, useAssistedPeerDiscovery)
  }
  
  getBittorrentPort() {
    
    if(this.state !== ApplicationSettings.STATE.OPENED)
      throw Error('Must be opened')
    
    return this._electronConfigStore.get(BITTORRENT_PORT)
  }
  
  setBittorrentPort(bittorrentPort) {
  
    if(this.state !== ApplicationSettings.STATE.OPENED)
      throw Error('Must be opened')
  
    this._electronConfigStore.set(BITTORRENT_PORT, bittorrentPort)
  }
}

export default ApplicationSettings
