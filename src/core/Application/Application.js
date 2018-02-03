// Application core

const Directories = require('./directories')
const SPVNode = require('./spvnode')
const Session = require('joystream-node').Session
const faucet = require('./faucet')

const TorrentsStorage = require('../../db').default
const Torrent = require('../Torrent/Torrent').default
const TorrentStore = require('../Torrent/TorrentStore').default
const DeepInitialState = require('../Torrent/Statemachine/Common').DeepInitialState
const Scene = require('../Scene')

const EventEmitter = require('events').EventEmitter
const Statemachine = require('./Statemachine')
const ApplicationStore = require('./ApplicationStore').default

const Common = require('./Statemachine/Common')

const bcoin = require('bcoin')
const assert = require('assert')
const process = require('process')

import UiStore from '../UiStore'
const isDev = require('electron-is-dev')

class Application extends EventEmitter {

  constructor () {
    super()


    // Properly initilize later!
    this.store = new ApplicationStore("", [], 0, 0, 0, 0,
    // handlers
    {
      removeTorrent: this.removeTorrent.bind(this),
      addTorrentFile: this.addTorrentFile.bind(this),
      addTorrent: this.addTorrent.bind(this),
      stop: this.stop.bind(this),
      
      startDownloadWithTorrentFileFromFilePicker: this.startDownloadWithTorrentFileFromFilePicker.bind(this),
      startDownloadWithTorrentFileFromDragAndDrop: this.startDownloadWithTorrentFileFromDragAndDrop.bind(this),

      acceptTorrentWasAlreadyAdded: this.acceptTorrentWasAlreadyAdded.bind(this),
      acceptTorrentFileWasInvalid: this.acceptTorrentFileWasInvalid.bind(this),
      retryPickingTorrentFile: this.retryPickingTorrentFile.bind(this),

      /// Uploading scene
      hasTorrentFile: this.hasTorrentFile.bind(this),
      hasRawContent: this.hasRawContent.bind(this),

    })

    var client = new ApplicationStatemachineClient(this.store)

    Statemachine.on('transition', (data) => {
      if(data.client !== client)
        return

      this.store.setState(Statemachine.compositeState(client))

      this.emit('transition', data)

      this.emit('enter-' + data.toState, data)
    })

    this._process = function (...args) {
      Statemachine.queuedHandle(client, ...args)
    }

    // expose client in dev mode to help in debugging
    if (isDev) {
      this._client = client
    }

    this.currentState = function () {
      return Statemachine.compositeState(client)
    }

    // trigger initial state of machine
    this.currentState()
  }

  start (config) {
    this._process('start', config)
  }

  stop () {
    this._process('stop')
  }

  // NB: This event really should not be queued in practice,
  // as the caller will be the `window.onbeforeunload` event, which
  // requires setting the event.returnValue to learn statemachines
  // needs for canceling the close request. Luckily, the event queue
  // is _guaranteed_ to be empty every time a call is made from the node
  // event loop, e.g. for this event.
  onBeforeUnloadMainWindow(event) {
    this._process('onBeforeUnloadMainWindow', event)
  }

  removeTorrent (infoHash, deleteData) {
     this._process('removeTorrent', infoHash, deleteData)
  }

  addTorrentFile (torrentFileName) {
      this._process('addTorrentFile', torrentFileName)
  }

  addTorrent (settings) {
      this._process('addTorrent', settings)
  }

  startDownloadWithTorrentFileFromFilePicker() {
    this._process('startDownloadWithTorrentFileFromFilePicker')
  }

  startDownloadWithTorrentFileFromDragAndDrop(files) {
    this._process('startDownloadWithTorrentFileFromDragAndDrop', files)
  }

  acceptTorrentWasAlreadyAdded() {
    this._process('acceptTorrentWasAlreadyAdded')
  }

  acceptTorrentFileWasInvalid() {
    this._process('acceptTorrentFileWasInvalid')
  }

  retryPickingTorrentFile() {
      this._process('retryPickingTorrentFile')
  }

  //// Start upload flow

  hasTorrentFile() {
    this._process('hasTorrentFile')
  }

  hasRawContent() {
    this._process('hasRawContent')

  }

}

// Create a maker function from a class or constructor function using 'new'
function factory (Type) {
  return function (...args) {
    return new Type(...args)
  }
}

class ApplicationStatemachineClient {

  constructor (applicationStore) {
    this.store = applicationStore

    this.eventEmitter = new EventEmitter()

    this.factories = {
      spvnode: factory(SPVNode),

      directories: factory(Directories),

      session: factory(Session),

      db: function (...args) {
        return TorrentsStorage.open.bind(null, ...args)
      },

      torrentStore: (infoHash,
                     savePath,
                     state,
                     progress,
                     totalSize,
                     downloadedSize,
                     downloadSpeed,
                     uploadSpeed,
                     uploadedTotal,
                     name,
                     numberOfBuyers,
                     numberOfSellers,
                     numberOfObservers,
                     numberOfNormalPeers,
                     numberOfSeeders,
                     startPaidDownloadViability,
                     sellerPrice,
                     sellerRevenue,
                     buyerPrice,
                     buyerSpent) => {
        return new TorrentStore(applicationStore,
                                null,
                                infoHash,
                                savePath,
                                state,
                                progress,
                                totalSize,
                                downloadedSize,
                                downloadSpeed,
                                uploadSpeed,
                                uploadedTotal,
                                name,
                                numberOfBuyers,
                                numberOfSellers,
                                numberOfObservers,
                                numberOfNormalPeers,
                                numberOfSeeders,
                                startPaidDownloadViability,
                                sellerPrice,
                                sellerRevenue,
                                buyerPrice,
                                buyerSpent)
      },

      // Return a Torrent with generators bound to application statemachine to access the wallet
      torrent: (torrentStore) => {
        return new Torrent(torrentStore,
            this.privateKeyGenerator.bind(this),
            this.pubKeyHashGenerator.bind(this),
            this.contractGenerator.bind(this),
            Common.getStandardSellerTerms,
            this.broadcastRawTransaction.bind(this))
      },

      testnetFaucet: function () { return faucet }
    }
  }

  // Helper method used by all child state machines to send an input to the root of the statemachine tree
  // We need this here, because of an issue with circual module dependency which would otherwise be
  // introduced if the child statemachine tries to load the parent statemachine module
  processStateMachineInput = function (...args) {
    Statemachine.queuedHandle(this, ...args)
  }

  reportError (err) {
    console.log(err.message)
  }

  privateKeyGenerator () {
    return bcoin.ec.generatePrivateKey()
  }

  pubKeyHashGenerator () {
    // get the next address from bcoin wallet
    var addr = this.services.wallet.getAddress()

    assert(addr.isPubkeyhash())

    return addr.getHash()
  }

  contractGenerator (contractOutputs, contractFeeRate) {
    let outputs = []

    for (let i in contractOutputs) {
      outputs.push(bcoin.output.fromRaw(contractOutputs[i]))
    }

    return this.services.wallet.send({
      sort: false,
      outputs: outputs,
      rate: contractFeeRate
    }).then((transaction) => {
      console.log('Contract TX:', transaction.toRaw().toString('hex'))
      console.log('Contract TX ID:', transaction.txid())
      return transaction.toRaw()
    })
  }

  broadcastRawTransaction (tx) {
    this.services.spvnode.sendTx(tx)
  }

  getWalletBalance (callback = () => {}) {
    this.services.wallet.getBalance().then((balance) => {
      callback(balance)
    })
  }

  topUpWalletFromFaucet (callback = () => {}) {
    if (this.services.spvnode.network !== 'testnet') return
    if (!this.services.testnetFaucet) return

    var address = this.services.wallet.getAddress()

    console.log('Faucet: Requesting some testnet coins...')

    this.services.testnetFaucet.getCoins(address.toString(), callback)
  }
}

export default Application
