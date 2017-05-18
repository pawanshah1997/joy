import { observable, action, computed, runInAction } from 'mobx'
import {EventEmitter} from 'events'
import bcoin from 'bcoin'
import assert from 'assert'

const constants = require('../constants')

import WalletStore from './walletStore'
import SessionStore from './sessionStore'

class Application extends EventEmitter {
  @observable syncingWallet = false
  @observable loadingTorrents = false

  constructor ({session, savePath, spvnode, db}) {
    super()

    this._session = session
    this._savePath = savePath
    this._spvnode = spvnode
    this._wallet = null
    this._db = db

    // Request regular torrent state updates
    this._intervalTorrentUpdates = setInterval(() => this._session.postTorrentUpdates(), constants.POST_TORRENT_UPDATES_INTERVAL)

    this.walletStore = new WalletStore()

    this.sessionStore = new SessionStore({
      session: this._session,
      savePath: this._savePath,
      db: this._db
    })

    this.stores = {
      applicationStore: this,
      sessionStore: this.sessionStore,
      walletStore: this.walletStore
    }
  }

  buyingTorrent (infoHash, buyerTerms) {
    // check wallet

    assert(this._session.torrents.has(infoHash))

    const torrent = this._session.torrents.get(infoHash)

    torrent.toBuyMode(buyerTerms, (err, result) => {
      if (!err) {
        console.log('Ok')
        // Temporary
        torrent.on('readyToBuyTo', (seller) => {
          let contractSk = this.walletStore.generatePrivateKey()
          let finalPkHash = this.walletStore.address.hash
          let value = 50000

          const callback = (err, result) => {
            if (!err) {
              console.log('Buying to peer !')
            } else {
              console.error(err)
            }
          }

          torrent.startBuying(seller.peerPlugin.status.connection, contractSk, finalPkHash, value, this.walletStore.createAndSend, callback)
        })
      } else {
        console.log(err)
      }
    })

  }

  sellingTorrent (infoHash, sellerTerms) {
    // check wallet

    console.log(infoHash)

    assert(this._session.torrents.has(infoHash))

    const torrent = this._session.torrents.get(infoHash)

    torrent.toSellMode(sellerTerms, (err, result) => {
      if (!err) {
        console.log('Looking for buyers')
        // Temporary
        torrent.on('readyToSellTo', (buyer) => {
          let contractSk = this.walletStore.generatePrivateKey()
          let finalPkHash = this.walletStore.address.hash

          torrent.startSelling(buyer.peerPlugin.status.connection, contractSk, finalPkHash, (err, result) => {
            if (!err) {
              console.log('Selling to peer !')
            } else {
              console.error(err)
            }
          })
        })
      } else {
        console.log(err)
      }
    })
  }

  async _initWallet () {
    // Try to initialize spvnode
    try {
      await this._spvnode.open()
    } catch (e) {
      this.emit('error', e)
      return
    }

    // Try to open the wallet
    try {
      this._wallet = await this._spvnode.plugins.walletdb.get('primary')
    } catch (e) {
      this.emit('error', e)
      return
    }

    // If wallet was successfully initialized update the walletStore
    // and start syncing
    this.walletStore.setWallet(this._wallet)

    // Start synching
    this._syncWallet()
  }

  async start () {
    this._initWallet()

    this.loadingTorrents = true

    try {
      await this._loadTorrentsFromDb()
    } catch (e) {
      this.emit('error', e)
    }

    this.loadingTorrents = false
  }

  async _syncWallet () {
    await this._spvnode.connect()

    this._spvnode.startSync()

    this.syncingWallet = true
  }

  // This should be the action to take when the application needs to be shutdown gracefully
  @action
  stop () {
    // We probably want to keep processing alerts until we exit the application so we shouldn't
    // clear the interval?
    // clearInterval(this._intervalTorrentUpdates)

    this._session.pauseLibtorrent(() => {

    })

    // Wait for torrents to complete generating resume data

    // Close all open payment channels (broadcast settlement contracts)

    // Make sure db is flushed to disk

    // Minimizing tasks at shutdown is preferred

    this._spvnode.close()

    // emit event to indicate that we are done.. maybe some cleanup routine
    // is needed in index.js and call process.exit ?
  }

  async _loadTorrentsFromDb () {
    // Load persisted torrents from database into session store
    let infoHashes = await this._db.getInfoHashes()

    let parameters = await Promise.all(infoHashes.map((infoHash) => {
      return this._db.getTorrentAddParameters(infoHash)
    }))

    let torrents = await Promise.all(parameters.map((params) => {
      if (params == null) return null
      return this.sessionStore.loadTorrent(params)
    }))

    torrents = torrents.filter((torrent) => torrent !== null)

    console.log('Loaded ', torrents.length, ' torrents from db')
  }
}

export default Application
