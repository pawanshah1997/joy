import {action, observable, computed} from 'mobx'

import assert from 'assert'

class ApplicationNavigationStore {
  
  /**
   * Scenes under the navigation bar, only relevant when app is in state Application.STATE.STARTED
   */
  static TAB = {
    Downloading: 0,
    Uploading: 1,
    Completed: 2,
    Wallet: 3,
    Community: 4
  }
  
  /**
   * {TAB} Currently active scene when in started phase.
   + */
  @observable activeTab

  /**
   * {Number}
   */
  @observable numberCompletedInBackground
  
  /**
   * {String} Unit for fiat, e.g. 'USD'
   */
  @observable fiatUnit
  
  constructor(activeTab, numberCompletedInBackground, fiatUnit, walletStore, priceFeedStore, numberOfUnitsPerCoin) {

    this.setActiveTab(activeTab)
    this.setNumberCompletedInBackground(numberCompletedInBackground)
    this.setFiatUnit(fiatUnit)

    this._walletStore = walletStore
    this._priceFeedStore = priceFeedStore
    this._numberOfUnitsPerCoin = numberOfUnitsPerCoin
  }

  /**
   * {Number} Balance in relevant fiat currency
   */
  @computed get
  balanceInFiat() {

    if(!this._walletStore || !this._priceFeedStore)
      return null

    let balance = this._walletStore.totalBalance

    return Math.floor((balance * this._priceFeedStore.cryptoToUsdExchangeRate) / this._numberOfUnitsPerCoin)
  }

  /**
   * {Number} Balance in full BTC units.
   */
  @computed get
  balanceInBTC() {

    if(!this._walletStore || !this._priceFeedStore)
      return null

    let balance = this._walletStore.totalBalance

    return balance / this._numberOfUnitsPerCoin
  }
  
  @action.bound
  setActiveTab(activeSceneWhenStarted) {
    
    // Scene specific preprocessing
    
    switch(activeSceneWhenStarted) {
      
      case ApplicationNavigationStore.TAB.Downloading :
        break
      case ApplicationNavigationStore.TAB.Uploading:
        break
      case ApplicationNavigationStore.TAB.Completed:
        
        // When we navigate to the completed scene,
        // we reset the background notification counter.
        this.setNumberCompletedInBackground(0)
        break
      case ApplicationNavigationStore.TAB.Wallet:
        break
      case ApplicationNavigationStore.TAB.Community:
        break
      default:
        assert(false) // Invalid scene passed
    }
    
    this.activeTab = activeSceneWhenStarted
  }
  
  @action.bound
  setNumberCompletedInBackground(numberCompletedInBackground) {
    this.numberCompletedInBackground = numberCompletedInBackground
  }
  
  @action.bound
  setFiatUnit(fiatUnit) {
    this.fiatUnit = fiatUnit
  }
  
  @action.bound
  handleTorrentCompleted() {
  
    // If the completion occurred while we were not on the completed scene, then increment counter
    if(this.activeTab !== ApplicationNavigationStore.TAB.Completed)
      this.setNumberCompletedInBackground(this.numberCompletedInBackground + 1)
  }
  
  
}

export default ApplicationNavigationStore