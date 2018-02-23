import React, { Component } from 'react'
import { Provider, observer } from 'mobx-react'
import PropTypes from 'prop-types'

// Utils
import MobxReactDevTools from 'mobx-react-devtools'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import assert from 'assert'

// Models
import {UI_CONSTANTS} from '../../constants'
import UIStore from '../UIStore'
import ApplicationNavigationStore from './Stores'

// Components
import ApplicationHeader from './components/ApplicationHeader'
import ApplicationStatusBar from './components/ApplicationStatusBar'

// Our scenes
import IdleScene from '../Idle'
import NotStartedScene from '../NotStarted'
import LoadingScene from '../Loading'
import TerminatingScene from '../Terminating'
import Downloading from '../Downloading'
import Seeding from '../Seeding'
import Completed from '../Completed'
import Community from '../Community'
import VideoPlayerScene from '../VideoPlayer'
import Wallet from '../Wallet'
import { WelcomeScreen, DepartureScreen } from '../OnBoarding'

function getStyles (props) {
  return {
    innerRoot: {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'row'
    }
  }
}

const Application = observer((props) => {
  
  let styles = getStyles(props)

  return (
    <MuiThemeProvider>
      <Provider uiConstantsStore={UI_CONSTANTS} UIStore={props.UIStore}>
        <div style={styles.innerRoot}>
          
          <AppView UIStore={props.UIStore} />
          
          {
              props.displayMobxDevTools
            ?
              <div><MobxReactDevTools /></div>
            :
              null
          }
          
        </div>
      </Provider>
    </MuiThemeProvider>
  )
})

Application.propTypes = {
  UIStore : PropTypes.object.isRequired, // HMR breaks PropTypes.instanceOf(UIStore)
  displayMobxDevTools : PropTypes.bool.isRequired
}

const AppView = observer((props) => {

  let elm = null

  switch (props.UIStore.currentPhase) {
    
    case UIStore.PHASE.Idle:
      elm = <IdleScene />
      break

    case UIStore.PHASE.Alive:
      elm =
        <StartedApp
          UIStore={props.UIStore}
        />
      break
    
    default:
      assert(false)
  }
  
  return (
    elm
  )
 
})

const StartedApp = observer((props) => {
  
  let middleSectionColorProps = {
    middleSectionBaseColor : UI_CONSTANTS.primaryColor,
    middleSectionDarkBaseColor : UI_CONSTANTS.darkPrimaryColor,
    middleSectionHighlightColor :UI_CONSTANTS.higlightColor
  }
  
  let styles = {
    root : {
      height: "100%",
      width: "100%",
    },
    applicationHeaderContainer: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      height: "100%", // quick hack
    }
  }
  
  //
  let elm = null
  
  switch(props.UIStore.applicationNavigationStore.activeTab) {
    
    case ApplicationNavigationStore.TAB.Downloading:
      
      elm =
        <Downloading
          {...middleSectionColorProps}
        />
      break
    
    case ApplicationNavigationStore.TAB.Uploading:
      
      elm =
        <Seeding
          {...middleSectionColorProps}
        />
      break
    
    case ApplicationNavigationStore.TAB.Completed:
      
      elm =
        <Completed
          {...middleSectionColorProps}
        />
      break
    
    case ApplicationNavigationStore.TAB.Wallet:
      
      elm =
        <Wallet
          backgroundColor={UI_CONSTANTS.primaryColor}
          {...middleSectionColorProps}
        />
      break
    
    case ApplicationNavigationStore.TAB.Community:
      
      elm =
        <Community
          backgroundColor={UI_CONSTANTS.primaryColor}
        />
      break
    
    default:
      assert(false)
  }
  
  return (
    <div style={styles.root}>

      { /* Onboarding scenes */ }
      <WelcomeScreen onBoardingStore={props.UIStore.onboardingStore} />
      <DepartureScreen onBoardingStore={props.UIStore.onboardingStore} />
      
      <ApplicationStatusBar startingTorrentCheckingProgressPercentage={props.UIStore.torrentsFullyLoadedPercentage}
                            show=
                              {
                                props.UIStore.torrentsBeingLoaded > 0
                              &&
                                (
                                  props.UIStore.applicationNavigationStore.activeTab === UIStore.TAB.Downloading ||
                                  props.UIStore.applicationNavigationStore.activeTab === UIStore.TAB.Uploading ||
                                  props.UIStore.applicationNavigationStore.activeTab === UIStore.TAB.Completed
                                )
                              }
      />
      
      <VideoPlayerScene activeMediaPlayerStore={props.UIStore.mediaPlayerStore} />
  
      <div style={styles.applicationHeaderContainer}>
        <ApplicationHeader
          UIStore={props.UIStore}
          height={'90px'}
          accentColor={UI_CONSTANTS.primaryColor} />
        {elm}
      </div>
    </div>
  )
  
})

export default Application
