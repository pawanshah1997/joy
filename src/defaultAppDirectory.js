import os from 'os'
import path from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'
import isDev from 'electron-is-dev'

// Root path that will contain the wallets, application database and downloaded torrents

const appDirectory = path.join(os.homedir(), isDev ? '.joystream_development' : '.joystream')

mkdirp.sync(appDirectory)

// When native code (outside electron) needs resources that are packaged in the app .asar
// file we copy it to the resources/ dir under the users' .joystream directory
fs.createReadStream(path.join(__dirname, 'assets', 'appicon', 'icon.png'))
  .pipe(fs.createWriteStream(path.join(appDirectory, 'icon.png')))


module.exports = function () {
  return appDirectory
}
