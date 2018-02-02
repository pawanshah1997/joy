/* global it, describe */

// babel-polyfill for generator (async/await)
import 'babel-polyfill'

// Use of pure js bcoin library because electron doesn't compile with openssl
// which is needed.
process.env.BCOIN_NO_NATIVE = '1'

import { assert } from 'chai'
import sinon from 'sinon'

var PromiseMock = require('promise-mock')
var ControlledPromise = require('./controlled_promise')

import ASM from '../../../src/core/Application/Statemachine'

describe('Application Statemachine', function () {
  let client = NewMockedClient(false)

  function handle (...args) {
    ASM.queuedHandle(client, ...args)
  }

  function machineState () {
    return ASM.compositeState(client)
  }

  function assertState (s) {
    assert.equal(machineState(), s)
  }

  beforeEach(function () {
    PromiseMock.install()
  })

  afterEach(function () {
    PromiseMock.uninstall()
  })

  it('starts', function () {
    assertState('NotStarted')

    // skipping resource initialization
    ASM.go(client, 'Starting/initializingApplicationDatabase')

    assertState('Starting.initializingApplicationDatabase')

    assert(client.services.openDatabase.called)

    Promise.run()

    assertState('Starting.InitialializingSpvNode')

    assert(client.services.spvnode.open.called)

    // open spvnode successfully
    client.services.spvnode.open.lastCall.args[0]()

    assertState('Starting.OpeningWallet')

    assert(client.services.spvnode.getWallet.called)

    let getWalletPromise = client.services.spvnode.getWallet.returnValues[0] // controlled promise

    getWalletPromise.resolve({
      on: sinon.spy(),
      removeAllListeners: sinon.spy()
    })

    Promise.run()

    assertState('Starting.ConnectingToBitcoinP2PNetwork')

    assert(client.services.spvnode.connect.called)

    client.services.spvnode.connect.returnValues[0].resolve()

    Promise.run()

    assertState('Starting.LoadingTorrents.AddingTorrents')

    assert(client.services.db.getAll.called)

    // no torrents in db return empty array
    client.services.db.getAll.returnValues[0].resolve([])

    Promise.run()

    // With no torrents to load, starting has completed and we should go to the
    // default scene in Started state
    assertState('Started')
  })

  it('stops', function () {
    handle('stop')

    // With no torrents in the session the statemachine will jump to DisconnectingFromBitcoinNetwork
    assertState('Stopping.DisconnectingFromBitcoinNetwork')

    assert(client.services.spvnode.disconnect.called)

    client.services.spvnode.disconnect.returnValues[0].resolve()

    Promise.run()

    assert(client.services.spvnode.close.called)

    client.services.spvnode.close.returnValues[0].resolve()

    Promise.run()

    assertState('NotStarted')
  })
})

function NewMockedClient (isFirstTimeRun) {
  let client = {}

  client.applicationSettings = {
      isFirstTimeRun : sinon.spy(function() {
        return isFirstTimeRun
      }),
      setIsFirstTimeRun : sinon.spy(),
      setLastVersionOfAppRun : sinon.spy()
  }

  client.processStateMachineInput = function (...args) {
    ASM.queuedHandle(client, ...args)
  }

  client.getWalletBalance = function () {

  }

  client.topUpWalletFromFaucet = function () {

  }

  client.factories = null

  client.config = {
    appDirectory: 'temp',
    logLevel: 'error',
    network: 'testnet'
  }

  var services = client.services = {}

  var db = {
    getAll: sinon.spy(function () {
      return ControlledPromise()
    }),

    getOne: sinon.spy(function (infoHash) {
      return ControlledPromise()
    }),

    close: sinon.spy(function (callback) {
      callback()
    })
  }

  services.openDatabase = sinon.spy(function () {
    return Promise.resolve(db)
  })

  client.torrents = new Map()

  var session = services.session = {}

  session.addTorrent = sinon.spy(function (addParams, callback) {
    // callback(null, {
    //   infoHash: addParams.infoHash,
    //   on : function() {},
    //   handle: {
    //     status: function () { return { infoHash: addParams.infoHash, state: 'finished'} }
    //   }
    // })
  })

  session.pauseLibtorrent = sinon.spy(function (callback) {
    callback(null)
  })

  var spvnode = services.spvnode = {}

  spvnode.open = sinon.spy()

  spvnode.close = sinon.spy(function () {
    return ControlledPromise()
  })

  spvnode.connect = sinon.spy(function () {
    return ControlledPromise()
  })

  spvnode.disconnect = sinon.spy(function () {
    return ControlledPromise()
  })

  spvnode.getWallet = sinon.spy(function () {
    return ControlledPromise()
  })

  client.reportError = function (err) {
    console.log(err.message)
  }

  var store = client.store = {}

  store.setTorrentsToLoad = function (num) {

  }

  store.setTorrentLoadingProgress = function (progress) {

  }

  store.setTorrentsToTerminate = function (num) {

  }

  store.setTorrentTerminatingProgress = function (progress) {

  }

  store.torrentAdded = function (torrent) {

  }

  store.setOnboardingStore = sinon.spy()

  store.setNumberCompletedInBackground = sinon.spy()

  return client
}
