/**
 * Created by bedeho on 04/10/17.
 */

import { observable, action } from 'mobx'
import {TorrentInfo} from "joystream-node"
import fs from 'fs'

// TEMPORARY
// a) https://github.com/JoyStream/joystream-desktop/issues/652
import Common from '../../../core/Application/Statemachine/Common'

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
  
      // Get the path to use as savepath from settings
      let savePath = this._uiStore.appStore.applicationStore.applicationSettings.getDownloadFolder()
      
      // Get name of torrent files to add as examples
      let exampleTorrentFilenames = this._uiStore.appStore.onboardingTorrents
      
      for (var i = 0; i < exampleTorrentFilenames.length; i++) {
  
        // Get Torrent file name
        let torrentFileName = exampleTorrentFilenames[i]
        
        /// Read torrent file data
        let torrentFileData
        
        try {
          
          // NB: Turn into async read, and add UI state for this
          
          torrentFileData = fs.readFileSync(torrentFileName)
        } catch (e) {
          
          // NB: Add fail dialog UI state for this
          
          console.log('Failed to read torrent file from disk: ' + torrentFileName)
          console.log(e)
          return
        }
        
        /// Parse torrent file from data
        let torrentInfo
        
        try {
          
          // NB: add UI state to indicate blocking progress
          
          torrentInfo = new TorrentInfo(data)
        } catch(e) {
          
          // NB: Add fail dialog state for this
  
          console.log('Failed to parse torrent file from data: ' + torrentFileName)
          console.log(e)
          return
        }
        
        // Create settings for torrent
        let settings = Common.getStartingDownloadSettings(torrentInfo, savePath)
        
        // Add torrent file
        this._uiStore.appStore.applicationStore.addTorrentFile(settings)
        
        // NB: in the future some how hook into _possible_ errors here, but really there
        // shouldnt be any.
      }

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
