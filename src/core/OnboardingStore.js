/**
 * Created by bedeho on 04/10/17.
 */

import { observable, action } from 'mobx'
import { EXAMPLE_TORRENTS } from '../constants'

const OnboardingState = {
  WelcomeScreen: 0,
  BalanceExplanation: 1,
  DisabledFeaturesExplanation: 2,
  Silent: 3,
  DepartureScreen: 4
}

/**
 * (MOBX) User interface store for the onboarding
 */
class OnboardingStore {

  /**
   * {OnboardingState} State of onboarding
   */
  @observable state

  /**
   * Constructor
   * @param applicationStore
   * @param shutDownMessageAcceptedCallback {Function}
   * @param state {OnboardingState} State of onboarding flow (optional)
   */
  constructor (applicationStore, shutDownMessageAcceptedCallback, state = OnboardingState.WelcomeScreen) {
    this.state = state
    this.applicationStore = applicationStore

    this._shutDownMessageAcceptedCallback = shutDownMessageAcceptedCallback
  }

  // Note that all state transition actiosn are _silently guarded_ by state,
  // we do not throw, in order to mimick a state machine which simply consumes
  // inputs or not.

  @action.bound
  setState (state) {
    this.state = state
  }

  @action.bound
  skipAddingExampleTorrents () {
    if (this.state === OnboardingState.WelcomeScreen) {
      this.setState(OnboardingState.BalanceExplanation)
    }
  }

  @action.bound
  acceptAddingExampleTorrents () {
    if (this.state === OnboardingState.WelcomeScreen) {
      for (var i = 0; i < EXAMPLE_TORRENTS.length; i++) {
        // Get Torrent file name
        let torrentFileName = EXAMPLE_TORRENTS[i]

        // Add torrent file to sessions throught application store
        this.applicationStore.addTorrentFile(torrentFileName)
      }

      this.setState(OnboardingState.BalanceExplanation)
    }
  }

  @action.bound
  balanceExplanationAccepted () {
    if (this.state === OnboardingState.BalanceExplanation) {
      this.setState(OnboardingState.DisabledFeaturesExplanation)
    }
  }

  @action.bound
  disabledFeaturesExplanationAccepted () {
    if (this.state === OnboardingState.DisabledFeaturesExplanation) {
      this.setState(OnboardingState.Silent)
    }
  }

  @action.bound
  displayShutdownMessage () {
    // Regardless of what state we are in, we always allow shutting down
    this.setState(OnboardingState.DepartureScreen)
  }

  @action.bound
  shutDownMessageAccepted () {
    if (this.state === OnboardingState.DepartureScreen) {
      // Notify application core about user request
      this._shutDownMessageAcceptedCallback()
      this.setState(OnboardingState.Silent)
    }
  }
}

OnboardingStore.State = OnboardingState

export default OnboardingStore
