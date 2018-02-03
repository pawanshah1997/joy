const {app, BrowserWindow, ipcMain, crashReporter, Menu} = require('electron')
const path = require('path')
const url = require('url')
const isDev = require('electron-is-dev')
const updater = require('./updater')
const protocol = require('./protocol')

import { createTemplate } from './menu'
import {enableLiveReload} from 'electron-compile'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win = null

// This method makes your application a Single Instance Application -
// instead of allowing multiple instances of your app to run,
// this will ensure that only a single instance of your app is running
var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {

    // Someone tried to run a second instance, we should focus our window.
    if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
    }
});

if (shouldQuit) {
    app.quit()
} else {

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', createWindow)

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (win === null) {
            createWindow()
        }
    })
}

// Listen to broadcast channel from main window
ipcMain.on('main-window-channel', (event, arg) => {

    if(arg === 'user-closed-app') {

        // Exit application
        updater.quit()
        app.quit()
    }

})

// Listen if we need to modify window size to fit video or going back to
// application size
ipcMain.on('set-bounds', (event, arg) => {

    // verify if window exist and if we are not already in fullscreen
    if (win && !win.isFullScreen()) {

      // Set the new window size
      win.setContentSize(arg.width, arg.height, true) // animate on Mac
  }
})

// Listen if we need to block the save power feature to avooid the screen going
// black in the middle of a video.
ipcMain.on('power-save-blocker', (event, arg) => {
    const {enable, disable} = require('./power-save-blocker')

    if (arg.enable) {
      // Enable blocker
      enable()
    } else {
      // Disable blocker
      disable()
    }
})

function createWindow () {

    // Not really usefull for now :)
    protocol.init()

    if (isDev) {

        console.log('2xenableLiveReload')

        // Enable live reloading : Needs to happen prior to `new BrowserWindow`
        // https://github.com/electron/electron-compile/blob/master/README.md
        enableLiveReload({strategy: 'react-hmr'})
        enableLiveReload({strategy: 'react-hmr'})
    }

  // Create the browser window.
  win = new BrowserWindow({
      width: 1200,
      height: 800,
      minHeight: 700,
      minWidth: 1200,
      frame: true,
      backgroundColor: '#1C262B', // same as rgb(28, 38, 43)
      show : true
  })

  var template = createTemplate(win)

  // Set Menu application from menu.js
  // Need to be created after win has been initialized
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  /**
  // Delay actually showing window until we are ready to show
  // https://github.com/electron/electron/blob/master/docs/api/browser-window.md#showing-window-gracefully
  win.once('ready-to-show', () => {
    win.show()
  })
  */

  if (isDev) {

    // Add Devtron to chrome dev tool
    // https://electron.atom.io/devtron/
    require('devtron').install()

    // Open the DevTools.
    win.webContents.openDevTools()

  } else {
    // Maximize window
    win.maximize()

    // Handle squirrel event. Avoid calling for updates when install
    if(require('electron-squirrel-startup')) {
      app.quit()
      // Hack because app.quit() is not immediate
      process.exit(0)
    }
    // Check for updates
    win.webContents.once("did-frame-finish-load", function (event) {
      updater.init()
    })

    if (process.env.OPEN_DEVTOOLS) {
      // Open the DevTools.
      win.webContents.openDevTools()
    }
  }



  // Load file for the app
  var filename_to_load = process.env.COMPONENT_DEVELOPMENT_MODE ? 'component-development/index.html' : 'index.html'

  win.loadURL(url.format({
    pathname: path.join(__dirname, filename_to_load),
    protocol: 'file:',
    slashes: true
  }))

  crashReporter.start({
    productName: "JoyStream",
    companyName: "joystream",
    submitURL: "https://joystream.sp.backtrace.io:6098/post?format=minidump&token=55e469c9e2258e7fd1b47a8ebd4bdc4ddc16b7521b18d3c34941fe186f660ca8",
    uploadToServer: true
  })

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

/**
 * Component development app code
 */

let separateUpdateWindow = null

// Listen for async message from renderer process
ipcMain.on('component-development', (event, arg) => {

    if(arg === 'open-updater-window') {

        // Create the updater browser window.
        separateUpdateWindow = new BrowserWindow({
            width: 466,
            height: 353,
            fullscreen: false,
            resizable: false,
            frame: false,
            show: true
        })

        separateUpdateWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'component-development/Updater/window.html'),
            protocol: 'file:',
            slashes: true
        }))

    }

});
