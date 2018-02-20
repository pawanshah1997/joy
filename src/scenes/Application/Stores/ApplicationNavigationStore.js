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
  
  constructor(uiStore, activeTab, numberCompletedInBackground, fiatUnit, numberOfUnitsPerCoin) {

    this._uiStore = uiStore
    this.setActiveTab(activeTab)
    this.setNumberCompletedInBackground(numberCompletedInBackground)
    this.setFiatUnit(fiatUnit)
    
    this._numberOfUnitsPerCoin = numberOfUnitsPerCoin
  }
  
  @computed get
  walletTabEnabled() {
    return !!this._uiStore.walletSceneStore
  }

  /**
   * {Number} Balance in relevant fiat currency
   */
  @computed get
  balanceInFiat() {
    
    let applicationStore = this._uiStore.applicationStore

    // Make sure both wallet and price feed is set
    if(!applicationStore.walletStore || !applicationStore.priceFeedStore)
      return null

    let balance = applicationStore.walletStore.totalBalance

    return Math.floor((balance * applicationStore.priceFeedStore.cryptoToUsdExchangeRate) / this._numberOfUnitsPerCoin)
  }

  /**
   * {Number} Balance in full BTC units.
   */
  @computed get
  balanceInBTC() {
  
    let applicationStore = this._uiStore.applicationStore
  
    // Make sure wallet is set
    if(!applicationStore.walletStore)
      return null

    let balance = applicationStore.walletStore.totalBalance

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