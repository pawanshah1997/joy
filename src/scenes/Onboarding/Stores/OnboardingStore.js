/**
 * Created by bedeho on 04/10/17.
 */

import { observable, action } from 'mobx'
import {TorrentInfo} from "joystream-node"
import fs from 'fs'

/**
 * (MOBX) User interface store for the onboarding
 */
class OnboardingStore {

  static STATE = {
    WelcomeScreen: 0,
    BalanceExplanation: 1,
    DisabledFeaturesExplanation: 2,
    Silent: 3,
    DepartureScreen: 4
  }

  /**
   * {OnboardingState} State of onboarding
   */
  @observable state
  
  constructor (uiStore, state) {
    this._uiStore = uiStore
    this.state = state
  }
  
  @action.bound
  setState (state) {
    this.state = state
  }

  @action.bound
  skipAddingExampleTorrents () {
    if (this.state === OnboardingStore.STATE.WelcomeScreen) {
      this.setState(OnboardingStore.STATE.BalanceExplanation)
    }
  }

  @action.bound
  acceptAddingExampleTorrents () {

    if (this.state === OnboardingStore.STATE.WelcomeScreen) {

      this._uiStore.addExampleTorrents()

      this.setState(OnboardingStore.STATE.BalanceExplanation)
    }
  }

  @action.bound
  balanceExplanationAccepted () {
    if (this.state === OnboardingStore.STATE.BalanceExplanation) {
      this.setState(OnboardingStore.STATE.DisabledFeaturesExplanation)
    }
  }

  @action.bound
  disabledFeaturesExplanationAccepted () {
    if (this.state === OnboardingStore.STATE.DisabledFeaturesExplanation) {
      this.setState(OnboardingStore.STATE.Silent)
    }
  }

  @action.bound
  displayShutdownMessage () {
    // Regardless of what state we are in, we always allow shutting down
    this.setState(OnboardingStore.STATE.DepartureScreen)
  }

  @action.bound
  shutDownMessageAccepted () {
    if (this.state === OnboardingStore.STATE.DepartureScreen) {
      this.setState(OnboardingStore.STATE.Silent)
      this._uiStore.appStore.stop()
    }
  }
}

export default OnboardingStore
