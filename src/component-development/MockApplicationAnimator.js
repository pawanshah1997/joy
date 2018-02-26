import Application from '../core/Application'
import Wallet from '../core/Wallet'
import {MockApplication, MockWallet} from '../../test/core/Mocks'

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
}

export default MockApplicationAnimator