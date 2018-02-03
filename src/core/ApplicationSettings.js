/**
 * Created by bedeho on 05/10/2017.
 */
import ElectronConfig from 'electron-config'
import { ipcRenderer, shell } from 'electron'

const FIRST_TIME_RUN_KEY = 'firstTimeRun' // Whether
const LAST_VERSION_OF_APP_RUN_KEY = 'lastVersionOfAppRun'
const DOWNLOAD_FOLDER = 'downloadFolder'

class ApplicationSettings {
  constructor () {
    this._electronConfigStore = new ElectronConfig()

    ipcRenderer.on('openPreferences', this.openInEditor.bind(this))
  }

  isFirstTimeRun () {
    // Read whether its a first time run, if no key is set, we pretend it is
    return process.env.FORCE_ONBOARDING || this._electronConfigStore.get(FIRST_TIME_RUN_KEY, true)
  }

  setIsFirstTimeRun (firstTimeRun) {
    this._electronConfigStore.set(FIRST_TIME_RUN_KEY, firstTimeRun)
  }

  lastVersionOfAppRun () {
    return this._electronConfigStore.get(LAST_VERSION_OF_APP_RUN_KEY)
  }

  setLastVersionOfAppRun (version) {
    this._electronConfigStore.set(LAST_VERSION_OF_APP_RUN_KEY, version)
  }

  getDownloadFolder () {
    return this._electronConfigStore.get(DOWNLOAD_FOLDER)
  }

  setDownloadFolder (downloadFolder) {
    this._electronConfigStore.set(DOWNLOAD_FOLDER, downloadFolder)
  }

  openInEditor () {
    shell.openItem(this._electronConfigStore.path)
  }

}

export default ApplicationSettings
