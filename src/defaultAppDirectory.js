import os from 'os'
import path from 'path'
import mkdirp from 'mkdirp'
import isDev from 'electron-is-dev'

// Root path that will contain the wallets, application database and downloaded torrents

const appDirectory = path.join(os.homedir(), isDev ? '.joystream_development' : '.joystream')

mkdirp.sync(appDirectory)

module.exports = function () {
  return appDirectory
}
