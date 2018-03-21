// babel-polyfill for generator (async/await)
import 'babel-polyfill'
import os from 'os'
import path from 'path'
import mkdirp from 'mkdirp'
import db from './db'
import semver from 'semver'

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

    // versions of application prior to v1.0.0 did not store the last ran app version
    // so we will treat them all as version 0.0.0
    const lastRanAppVersion = appSettings.lastRanVersionOfApp() || '0.0.0'

    let migrations = []

    // Only run migrations when installing newer versions
    if(semver.gt(currentAppVersion, lastRanAppVersion)) {
      migrations.push(runTorrentDatabaseMigrations(lastRanAppVersion, currentAppVersion, torrentDbPath))
      migrations.push(runApplicationSettingsMigrations(lastRanAppVersion, currentAppVersion, appSettings))
    } else {
      // Running an older or same version of the app.. don't do any migration
      return resolve()
    }

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
    if (semver.satisfies(lastVersion, '>=0.0.0') &&
        semver.satisfies(lastVersion, '<1.0.1')) {
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
    if (semver.satisfies(lastVersion, '>=0.0.0') &&
        semver.satisfies(lastVersion, '<1.0.1')) {
      // First migration on release of v1.0.0 clears buyer/seller terms so they can be
      // reset to new standard default terms
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
