import React, { Component } from 'react'
import { Provider, observer } from 'mobx-react'

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'

import Scene from '../../core/Scene'
import State from '../../core/State'

// Components
import NavigationFrame from './components/NavigationFrame'
import ApplicationStatusBar from './components/ApplicationStatusBar'

import {UI_CONSTANTS} from '../../constants'

// Our scenes
import NotStartedScene from '../NotStarted'
import LoadingScene, {LoadingState} from '../Loading'
import TerminatingScene, {TerminatingState} from '../Terminating'
import Downloading from '../Downloading'
import Seeding from '../Seeding'
import Completed from '../Completed'
import Community from '../Community'
import VideoPlayerScene from '../VideoPlayer'
import isDev from 'electron-is-dev'

// import Wallet from '../Wallet'
import { WelcomeScreen, DepartureScreen } from '../OnBoarding'

let MobxReactDevTools = isDev ? require('mobx-react-devtools').default : null

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

@observer
class Application extends Component {
  render () {
    let styles = getStyles(this.props)

    return (
      <MuiThemeProvider>
        <Provider uiConstantsStore={UI_CONSTANTS}>
          <div style={styles.innerRoot}>

            { this.props.uiStore.onBoardingStore
              ? <WelcomeScreen onBoardingStore={this.props.uiStore.onBoardingStore} />
              : null }
            { this.props.uiStore.onBoardingStore
              ? <DepartureScreen onBoardingStore={this.props.uiStore.onBoardingStore} />
              : null }

            <ApplicationStatusBar store={this.props.store} />

            <VideoPlayerScene store={this.props.store} />

            { this.renderActiveState() }

            { isDev
              ? <div><MobxReactDevTools /></div>
              : null}

          </div>
        </Provider>
      </MuiThemeProvider>
    )
  }

  renderActiveScene () {
    let middleSectionColorProps = {
      middleSectionBaseColor: UI_CONSTANTS.primaryColor,
      middleSectionDarkBaseColor: UI_CONSTANTS.darkPrimaryColor,
      middleSectionHighlightColor: UI_CONSTANTS.higlightColor
    }

    switch (this.props.uiStore.scene) {
      case Scene.Downloading:
        return <Downloading
          torrents={this.props.store.torrentsDownloading}
          spending={this.props.store.totalSpent}
          downloadSpeed={this.props.store.totalDownloadSpeed}
          torrentsBeingLoaded={this.props.store.torrentsBeingLoaded}
          store={this.props.store}
          downloadingStore={this.props.uiStore.downloadingStore}
          {...middleSectionColorProps} />

      case Scene.Uploading:
        return <Seeding
          store={this.props.store}
          uiStore={this.props.uiStore}
          {...middleSectionColorProps} />

      case Scene.Completed:
        return <Completed
          store={this.props.store}
          uiStore={this.props.uiStore}
          {...middleSectionColorProps} />

      case Scene.Community:
        return <Community
          store={this.props.store}
          backgroundColor={UI_CONSTANTS.primaryColor} />
    }
  }

  renderActiveState () {
    switch (this.props.store.currentState) {
      case State.NotStarted:
        return <NotStartedScene />

      case State.Loading:
        return (
          <LoadingScene
            show
            loadingState={applicationStateToLoadingState(this.props.store.state)} />
        )

      case State.Started:
        return (
          <NavigationFrame app={this.props.store} uiStore={this.props.uiStore} >
            { this.renderActiveScene() }
          </NavigationFrame>
        )

      case State.ShuttingDown:
        return (
          <TerminatingScene
            show
            terminatingState={applicationStateToTerminatingState(this.props.store.state)}
            terminatingTorrentsProgressValue={getTerminatingTorrentsProgressValue(this.props.store.torrentTerminatingProgress, this.props.store.torrentsToTerminate)} />
        )

      default:
        return null
    }
  }
}

function getTerminatingTorrentsProgressValue (torrentTerminatingProgress, torrentsToTerminate) {
  return 100 * (torrentTerminatingProgress / torrentsToTerminate)
}

function applicationStateToLoadingState (s) {
  let loadingState

  if (s === 'Starting.uninitialized' || s === 'Starting.InitializingResources' || s === 'Starting.NotStarted')
    loadingState = LoadingState.InitializingResources
  else if (s === 'Starting.initializingApplicationDatabase')
    loadingState = LoadingState.OpeningApplicationDatabase
  else if (s === 'Starting.InitialializingSpvNode')
    loadingState = LoadingState.InitializingSPVNode
  else if (s === 'Starting.OpeningWallet')
    loadingState = LoadingState.OpeningWallet
  else if (s === 'Starting.ConnectingToBitcoinP2PNetwork')
    loadingState = LoadingState.ConnectingToBitcoinP2PNetwork
  else if (s.startsWith('Starting.LoadingTorrents'))
    loadingState = LoadingState.LoadingTorrents

  return loadingState
}

function applicationStateToTerminatingState (s) {
  let terminatingState

  if (s === 'Stopping.TerminatingTorrents' || s === 'Stopping.SavingTorrentsToDatabase' || s === 'Stopping.uninitialized')
    terminatingState = TerminatingState.TerminatingTorrents
  else if (s === 'Stopping.DisconnectingFromBitcoinNetwork')
    terminatingState = TerminatingState.DisconnectingFromBitcoinNetwork
  else if (s === 'Stopping.ClosingWallet')
    terminatingState = TerminatingState.ClosingWallet
  else if (s === 'Stopping.StoppingSpvNode')
    terminatingState = TerminatingState.StoppingSpvNode
  else if (s === 'Stopping.ClosingApplicationDatabase')
    terminatingState = TerminatingState.ClosingApplicationDatabase
  else if (s === 'Stopping.ClearingResources')
    terminatingState = TerminatingState.ClearingResources

  return terminatingState
}

export default Application
