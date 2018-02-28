import Application from '../core/Application'
import Wallet from '../core/Wallet'
import {MockApplication, MockWallet} from '../../test/core/Mocks'
import MockTorrent from "../../test/core/Mocks/Torrent";

/**
 * Case specific animator of mocked application.
 */
class MockApplicationAnimator {
  
  /**
   * {MockApplication} Mock application being animated
   */
  mockApplication
  
  constructor(withOnboarding) {
    
    this.mockApplication = new MockApplication(
      Application.STATE.STOPPED,
      [],
      withOnboarding,
      {
      
      }
    )
    
  }
  
  startApp() {
    this.mockApplication.setState(Application.STATE.STARTING)
  }
  
  setWallet() {
    
    let mockWallet = new MockWallet(Wallet.STATE.STOPPED)

    this.mockApplication.wallet = mockWallet
    this.mockApplication.emit('resourceStarted', Application.RESOURCE.WALLET)
    
  }
  
  fastForwardWallet(state = Wallet.STATE.STARTED) {
    this.startApp()
    this.setWallet()
    this.mockApplication.wallet.setState(state)
  }
  
  addTorrent(torrent) {
    this.mockApplication.torrents.set(torrent.infoHash, torrent)
    this.mockApplication.emit('torrentAdded', torrent)
  }
  
  /**
  addMockedTorrents(number = 5) {
    
    let torrents = []
  
    for(var i = 0;i  < number;i++) {
  
      let infoHash = 'hash:' + i + this.mockApplication.torrents.length
  
      let mockedTorrent = new MockTorrent()
  
      mockedTorrent.setInfoHash(infoHash)
  
      torrents.push(mockedTorrent)
    }
    
    this._addTorrents(torrents)
  }
   */
  
  addMockedDownloadingTorrents(number = 5) {
  
    let torrents = []
  
    for(var i = 0;i < number;i++) {
      
      let infoHash = 'hash:' + (i + this.mockApplication.torrents.size)
      
      let mockedTorrent = new MockTorrent(infoHash, 'Active.DownloadIncomplete')
      
      torrents.push(mockedTorrent)
    }
  
    this._addTorrents(torrents)
  
  }
  
  _addTorrents(torrents) {
    
    torrents.forEach((torrent) => {
      this.addTorrent(torrent)
    })
  }
}

export default MockApplicationAnimator