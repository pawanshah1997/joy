
var debug = require('debug')('main-renderer')

var t0 = performance.now()
debug('Starting to load index.js after:' + t0)

import ReactDOM from "react-dom"
import IdleScene from './scenes/Idle'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'

/**
 * Emergency rendering of loader interface!
 * This is done before any other loading is attempted,
 * as the rest of the loading below will depend on loading a while
 * tree of dependencies which is very slow to load.
 */

ReactDOM.render(
  <MuiThemeProvider>
    <IdleScene/>
  </MuiThemeProvider>
  ,
  document.getElementById('root')
)

// babel-polyfill for generator (async/await)
import 'babel-polyfill'

// Configure and Initialize bcoin network settings
// NB: this should be the earliest point where bcoin is imported
import config from './config'

import {ipcRenderer, webFrame, shell, remote} from 'electron'
import os from 'os'
import path from 'path'
import isDev from 'electron-is-dev'
import React from 'react'

import Application from './core/Application'

import { EXAMPLE_TORRENTS } from './constants'

import UIStore from './scenes'
import assert from 'assert'
import mkdirp from 'mkdirp'

/**
 * Some Components use react-tap-event-plugin to listen for touch events because onClick is not
 * fast enough This dependency is temporary and will eventually go away.
 * Until then, be sure to inject this plugin at the start of your application.
 *
 * NB:! Can only be called once per application lifecycle
 */
var injectTapEventPlugin = require('react-tap-event-plugin')
injectTapEventPlugin()

// Create app
const application = new Application(EXAMPLE_TORRENTS, process.env.FORCE_ONBOARDING, true)

// Create model of view, with some reasonable defaults
const rootUIStore = new UIStore(application, process.env.FORCE_TERMS_SCREEN)

/// Hook into major state changes in app

application.on('started', () => {

  // TEMP
  if(!isDev) remote.app.setAsDefaultProtocolClient('magnet')

  const openEvent = remote.getGlobal('queuedOpenEvent')

  if (openEvent) {
    console.log('!!handling queued open event!!')
    application.handleOpenExternalTorrent(openEvent.uri, function (err, torrentName) {
      rootUIStore.openingExternalTorrentResult(err, torrentName)
    })
  }

  // Process command line arguments from main process
  handleCommandLineArgs(remote.process.argv)

  remote.app.on('open-file', function (event, filePath) {
    console.log('open-file event')
    application.handleOpenExternalTorrent(filePath, function (err, torrentName) {
      rootUIStore.openingExternalTorrentResult(err, torrentName)
    })
  })

  remote.app.on('open-url', function (event, url) {
    console.log('open-url event')
    application.handleOpenExternalTorrent(url, function (err, torrentName) {
      rootUIStore.openingExternalTorrentResult(err, torrentName)
    })
  })

  ipcRenderer.on('second-instance', function (event, eventName, argv) {
    console.log('!!seconds instance!!')
    if (eventName === 'argv') {
      handleCommandLineArgs(argv)
    }
  })

  function handleCommandLineArgs (argv) {
    var arg = isDev ? argv[2] : argv[1]

    if (arg) {
      // arg is either a magnetlink or a filepath
      application.handleOpenExternalTorrent(arg, function (err, torrentName) {
        rootUIStore.openingExternalTorrentResult(err, torrentName)
      })
    }
  }

})

application.on('stopped', () => {

  // Tell main process about the application being done
  ipcRenderer.send('main-window-channel', 'user-closed-app')
})

// Setup capture of window closing event
window.onbeforeunload = beforeWindowUnload

// Create renderer which is bound to our resources

let doHotModuleReload = isDev
let displayMobxDevTools = isDev
let loadedRenderer = renderer.bind(null, doHotModuleReload, rootUIStore, document.getElementById('root'), displayMobxDevTools)

// We enable HMR only in development mode
if (doHotModuleReload) {

  if(!module.hot)
    console.log('Could not do HMR, because module.hot is not set')
  else
    module.hot.accept(loadedRenderer)
}

// Start rendering, only possible after start of core app
loadedRenderer()

// Actually start app

// If we are going to force onboarding, something which is mostly done while developing,
// then lets skip loading any existing torrents.
// However, be aware that any added torrents are persisted when shutting down
if(process.env.FORCE_ONBOARDING)
  config.skipLoadingExistingTorrents = true

// Root path that will contain the wallets, application database and downloaded torrents
const appDirectory = path.join(os.homedir(), '.joystream')

mkdirp.sync(appDirectory)

application.start(config, appDirectory)

/**
 * Renderer routine which is invoked repeatedly
 * by react HMR plugin.
 * @private
 */
function renderer(doHMR, rootUIStore, parentDOMNode, displayMobxDevTools) {

  // NB: We have to re-require Application every time, or else this won't work
  const ApplicationScene = require('./scenes/Application').default

  if (doHMR) {
    const AppContainer = require('react-hot-loader').AppContainer

    ReactDOM.render(
      <AppContainer>
        <ApplicationScene UIStore={rootUIStore} displayMobxDevTools={displayMobxDevTools}/>
      </AppContainer>
      ,
      parentDOMNode
    )
  } else {

    ReactDOM.render(
      <ApplicationScene UIStore={rootUIStore} displayMobxDevTools={displayMobxDevTools}/>
      ,
      parentDOMNode
    )
  }

}

/**
 * Handler for window.onBeforeUnload
 * @param e
 */
function beforeWindowUnload(e) {

  /**
   * NB: Notice that when this hooks into window.onbeforeunload,
   * it is called _both_ when user tries to close window, and
   * when main process says application.quit. We must handle both case.
   */

  if(application.state === Application.STATE.STARTING || application.state === Application.STATE.STOPPING) {

    /**
     * We prevent stopping of any kind while starting up, for now, and obviously when stopping!
     * In the future, we may allow user to cancel startup process, but this will require
     * changes to the application state machine to do safely.
     */

    // BLOCK SHUTDOWN
    e.returnValue = false

    debug('Blocking shutdown since application is still starting or stopping.')

  } else if(application.state === Application.STATE.STARTED) {

    rootUIStore.handleCloseApplicationAttempt()

    // BLOCK SHUTDOWN
    e.returnValue = false

    debug('Blocking shutdown and starting application shut down.')

  } else {

    /**
     * We are stopped (same as PHASE.NotStarted), so we will thus allow
     * closing of window, which we do by not doing anything.
     */

    assert(application.state === Application.STATE.STOPPED)

    debug('Allowing renderer|window to close.')
  }

}

// Debug routine?
// Hook this up to a menu item ?
function checkForUpdates () {
  ipcRenderer.send('auto-updater-channel', 'init')
}
