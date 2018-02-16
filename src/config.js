//import Config from 'electron-config'
//const config = new Config()
//const isDev = require('electron-is-dev') // use different configs in dev mode?

import os from 'os'
import path from 'path'

// Application config for application state machine
var config = {
  // Bitcoin Network
  network: 'testnet',
  // Enable SecondaryDHT (joystream assisted peer discovery)
  assistedPeerDiscovery: true,
  // Libtorrent listening port
  bitTorrentPort: 0,
  // currently only used by bcoin logger
  //logLevel: 'info',
}

// Environment variables override configuration settings
var bitTorrentPort = parseInt(process.env.LIBTORRENT_PORT)
if(Number.isInteger(bitTorrentPort)) {
  config.bitTorrentPort = bitTorrentPort
}

// Environment variables override configuration settings
var APD = process.env.ASSISTED_PEER_DISCOVERY
if (APD !== '') {
  if (APD === 'yes' || APD === 'true' || APD === '1') {
    config.assistedPeerDiscovery = true
  } else if (APD === 'no' || APD === 'false' || APD === '0') {
    config.assistedPeerDiscovery = false
  }
}

module.exports = config
