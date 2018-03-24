import os from 'os'
import path from 'path'
import mkdirp from 'mkdirp'

// Root path that will contain the wallets, application database and downloaded torrents
// TODO: use a different path for app running in dev mode
const appDirectory = path.join(os.homedir(), '.joystream')

mkdirp.sync(appDirectory)

module.exports = function () {
  return appDirectory
}
