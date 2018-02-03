// Use of pure js bcoin library because electron doesn't compile with openssl
// which is needed.
process.env.BCOIN_NO_NATIVE = '1'

// Disable workers which are not available in electron
require('bcoin').set({ useWorkers: false })
import {ipcRenderer, webFrame} from 'electron'

// babel-polyfill for generator (async/await)
import 'babel-polyfill'

const isDev = require('electron-is-dev')

// React
import React from 'react'
import ReactDOM from 'react-dom'

import Application from './core/Application'
import UiStore from './core/UiStore'

/**
 * Some components use react-tap-event-plugin to listen for touch events because onClick is not
 * fast enough This dependency is temporary and will eventually go away.
 * Until then, be sure to inject this plugin at the start of your app.
 *
 * NB:! Can only be called once per application lifecycle
 */
var injectTapEventPlugin = require('react-tap-event-plugin')
injectTapEventPlugin()

const application = new Application()
const uiStore = new UiStore(application.store)

function render (store, uiStore) {

  // NB: We have to re-require Application every time, or else this won't work
  const ApplicationScene = require('./scenes/Application').default

  if (isDev) {
    const AppContainer = require('react-hot-loader').AppContainer

    ReactDOM.render(
      <AppContainer>
        <ApplicationScene store={store} uiStore={uiStore} />
      </AppContainer>
      ,
      document.getElementById('root')
    )
  } else {

    ReactDOM.render(
      <ApplicationScene store={store} uiStore={uiStore} />,
      document.getElementById('root')
    )
  }
}

if (module.hot) {
  module.hot.accept(render.bind(null, application.store, uiStore))
}

render(application.store, uiStore)

var config = require('./config')

application.start(config)

// ** Hook into close event for window **
// Unlike usual browsers that a message box will be prompted to users, returning
// a non-void value will silently cancel the close.
// It is recommended to use the dialog API to let the user confirm closing the
// application.
// NB: Be aware that when electron.app.quit is called, this callback will
// be triggered yet another time
window.onbeforeunload = function(e) {

  // Tell state machine
  application.onBeforeUnloadMainWindow(e)

  return

  // hotfix for v0.5.4 - disabling departure screen for now

    if (uiStore.onBoardingStore) {
      // Showing onBoarding departure screen if we have the on boarding
      uiStore.onBoardingStore.displayShutdownMessage()
    } else  {
      // Tell state machine
      application.onBeforeUnloadMainWindow(e)
    }

    return
}

// Hook this up to a menu item
function checkForUpdates () {
  ipcRenderer.send('auto-updater-channel', 'init')
}
