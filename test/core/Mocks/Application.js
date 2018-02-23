import EventEmitter from 'events'
import sinon from 'sinon'

class MockApplication extends EventEmitter {
  
  /**
   * {Application.STATE} State of app
   */
  state
  
  /**
   * {Set.<Application.RESOURCES>} The resources which are currently started
   */
  startedResources
  
  /**
   * {Bool} Whether onboarding is enabled
   */
  onboardingIsEnabled
  
  /**
   * {Array.<String>} List of torrent file paths to use as examples in the onboarding
   */
  onboardingTorrents
  
  /**
   * @property {ElectronConfig} Application settings
   */
  applicationSettings
  
  /**
   * @property {Wallet}
   */
  wallet
  
  /**
   * @property {PriceFeed}
   */
  priceFeed
  
  /**
   * {Map<String.Torrent>} Map of torrents currently added
   */
  torrents
  
  constructor(state, onboardingTorrents, onboardingIsEnabled) {
    super()
    
    this.state = state
    this.startedResources = new Set()
    
    this.onboardingTorrents = onboardingTorrents
    this.onboardingIsEnabled = onboardingIsEnabled
    this.torrents = new Map()
  }
  
  /**
   * Public routines
   */
  
  start = sinon.spy()
  stop = sinon.spy()
  addTorrent = sinon.spy()
  removeTorrent = sinon.spy()
  addExampleTorrents = sinon.spy()
  
  resetAllSpies() {
    start.reset()
    stop.reset()
    addTorrent.reset()
    removeTorrent.reset()
    addExampleTorrents.reset()
  }
}

export default MockApplication