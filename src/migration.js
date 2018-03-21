// babel-polyfill for generator (async/await)
import 'babel-polyfill'
import os from 'os'
import path from 'path'
import mkdirp from 'mkdirp'
import db from './db'

import Application from './core/Application'
import ApplicationSettings from './core/ApplicationSettings'
import DeepInitialState from './core/Torrent/Statemachine/DeepInitialState'

const debug = require('debug')('application-migration')

function getRunningAppVersion () {
  return require('../package.json').version
}

function run () {
  // NOTE: Should match app directory used by the application (in renderer process)
  const appDirectory = path.join(os.homedir(), '.joystream')
  mkdirp.sync(appDirectory)

  return new Promise(function (resolve, reject) {

    let appSettings = Application.createApplicationSettings()
    let torrentDbPath = Application.torrentDatabasePath(appDirectory)

    const currentAppVersion = getRunningAppVersion()

    appSettings.open()

    const lastRanAppVersion = appSettings.lastRanVersionOfApp()

    let migrations = []

    migrations.push(runTorrentDatabaseMigrations(lastRanAppVersion, currentAppVersion, torrentDbPath))

    migrations.push(runApplicationSettingsMigrations(lastRanAppVersion, currentAppVersion, appSettings))

    Promise.all(migrations)
      .then(function () {
        appSettings.setLastRanVersionOfApp(currentAppVersion)
        appSettings.close()
      })
      .catch(function (err) {
        reject(err)
      })
      .finally(function () {
        resolve()
      })
  })
}

function runApplicationSettingsMigrations (lastVersion, currentVersion, appSettings) {
  return new Promise(function (resolve, reject) {

    if(!lastVersion || lastVersion === '1.0.0') {
      // In initial migration to v1.0.0 we forgot to clear the default buyer/seller terms
      // from the application settings.
      debug('deleteing default terms from application settings')
      appSettings.deleteDefaultTerms()

      debug('resetting bitTorrentPort')
      appSettings.deleteBitTorrentPort()
    }

    resolve()
  })
}

function runTorrentDatabaseMigrations (lastVersion, currentVersion, torrentDbPath) {
  return new Promise(function (resolve, reject) {

    // First migration on release of v0.6.0. Clears buyer/seller terms so they can be
    // reset to new standard default terms
    if(!lastVersion || lastVersion === '1.0.0') {
      debug('Running torrent database migration - clearing saved terms')
      transformTorrentSettings(torrentDbPath, function (torrent) {
        // Torrent statemachine will not expect for there to be any terms set yet
        torrent.deepInitialState = DeepInitialState.PASSIVE

        // Forces new standard terms to be used
        delete torrent.extensionSettings

        return torrent
      })
      .catch(reject)
      .then(resolve)
    } else {
      debug('No torrent database migration tasks to run')
      resolve()
    }
  })
}

// Updates torrent settings in Database
// by applying a transformation function to each torrent
function transformTorrentSettings (torrentDbPath, transform) {
  let torrentsDB

  return db.open(torrentDbPath)
    .then((torrentDatabase) => {
      torrentsDB = torrentDatabase
      return torrentDatabase.getAll('torrents')
    })
    .then(function (torrents) {
      return torrents.map(transform)
    })
    .then(function (torrents) {
      return Promise.all(torrents.map(torrent => torrentsDB.save('torrents', torrent.infoHash, torrent)))
    })
    .then(function () {
      return new Promise(function (resolve, reject) {
        torrentsDB.close((err) => {
          resolve()
        })
      })
    })
}
module.exports.run = run
