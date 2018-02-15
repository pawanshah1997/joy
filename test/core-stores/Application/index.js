import ApplicationStore from '../../../src/core-stores/Application'

var assert = require('chai').assert
var sinon = require('sinon')

const createInitialValues = () => {
  return {
    state: '0',
    startedResources: new Set(),
    onboardingTorrents: ['a', 'b', 'c'],
    onboardingIsEnabled: true,
    applicationSettings: {'a': 1},
    walletStore: {'b': 2},
    priceFeedStore: {'c': 3},
    torrentStores: new Map(),
    starter: sinon.spy(),
    stopper: sinon.spy(),
    torrentAdder: sinon.spy(),
    torrentRemover: sinon.spy()
  }
}

const createConstructorArgs = (initialValues) => {
  return [
    initialValues.state,
    initialValues.startedResources,
    initialValues.onboardingTorrents,
    initialValues.onboardingIsEnabled,
    initialValues.applicationSettings,
    initialValues.walletStore,
    initialValues.priceFeedStore,
    initialValues.torrentStores,
    initialValues.starter,
    initialValues.stopper,
    initialValues.torrentAdder,
    initialValues.torrentRemover
  ]
}

describe('Application Store', function () {

  describe('constructor', function () {

    it('initializes observables', function () {
      const initialValues = createInitialValues()
      const constructorArgs = createConstructorArgs(initialValues)

      // NB: ctor should really be passed in an object rather than a long list of arguments
      const applicationStore = new ApplicationStore(...constructorArgs)

      // checks public observale value on store matches initial values
      function checkInitialValue (store, valuesMap, observableName) {
        assert.deepEqual(store[observableName], valuesMap[observableName])
      }

      const check = checkInitialValue.bind(applicationStore, initialValues)

      check('state')
      check('startedResources')
      check('onboardingTorrents')
      check('onboardingIsEnabled')
      check('applicationSettings')
      check('walletStore')
      check('priceFeedStore')
      check('torrentStores')
    })
  })

  describe('actions', function () {
    let initialValues, constructorArgs, applicationStore

    beforeEach(function () {
      initialValues = createInitialValues()
      constructorArgs = createConstructorArgs(initialValues)
      applicationStore = new ApplicationStore(...constructorArgs)
    })

    it('setState', function () {
      let value = 'newstate'
      applicationStore.setState(value)
      assert.equal(applicationStore.state, value)

      value = 'anotherstate'
      applicationStore.setState(value)
      assert.equal(applicationStore.state, value)
    })

    it('setStartedResources', function () {
      let value = new Set([1, 2, 3])
      applicationStore.setStartedResources(value)
      assert.deepEqual(applicationStore.startedResources, value)

      value = new Set([4, 5, 6])
      applicationStore.setStartedResources(value)
      assert.deepEqual(applicationStore.startedResources, value)
    })

    it('setOnboardingIsEnabled', function () {
      let value = true
      applicationStore.setOnboardingIsEnabled(value)
      assert.equal(applicationStore.onboardingIsEnabled, value)

      value = false
      applicationStore.setOnboardingIsEnabled(value)
      assert.equal(applicationStore.onboardingIsEnabled, value)
    })

    it('start', function() {
      applicationStore.start()

      assert(initialValues.starter.called)
    })

    it('stop', function() {
      applicationStore.stop()

      assert(initialValues.stopper.called)
    })

    it('addTorrent', function () {
      const settings = 'abc'
      const callback = sinon.spy()

      applicationStore.addTorrent(settings, callback)

      const adder = initialValues.torrentAdder
      assert(adder.called)
      assert.equal(adder.getCall(0).args[0], settings)
    })

    it('removeTorrent', function () {
      const infoHash = '123'
      const deleteData = false
      const callback = sinon.spy()
      applicationStore.removeTorrent(infoHash, deleteData, callback)

      const remover = initialValues.torrentRemover
      assert(remover.called)
      assert.equal(remover.getCall(0).args[0], infoHash)
      assert.equal(remover.getCall(0).args[1], deleteData)
      assert.equal(remover.getCall(0).args[2], applicationStore.onTorrentRemoved)
    })

    describe('onNewTorrentStore', function () {
      let initialValues, constructorArgs, applicationStore

      beforeEach(function () {
        initialValues = createInitialValues()
        constructorArgs = createConstructorArgs(initialValues)
        applicationStore = new ApplicationStore(...constructorArgs)
      })

      it('adds new torrent store to torrent stores', function () {
        const settings = 'abc'
        const callback = sinon.spy()

        applicationStore.addTorrent(settings, callback)

        const infoHash = 'xyz'

        assert(!applicationStore.torrentStores.has(infoHash))

        applicationStore.onNewTorrentStore({
          infoHash: infoHash
        })

        assert(applicationStore.torrentStores.has(infoHash))
      })

      it('invokes pending user callback', function () {
        const settings = {infoHash: 'abc'}
        const callback = sinon.spy()

        applicationStore.addTorrent(settings, callback)

        assert(!callback.called)

        applicationStore.onNewTorrentStore({
          infoHash: settings.infoHash
        })

        assert(callback.called)
      })

    })

    describe('onTorrentRemoved', function () {
      let initialValues, constructorArgs, applicationStore

      beforeEach(function () {
        initialValues = createInitialValues()
        constructorArgs = createConstructorArgs(initialValues)
        applicationStore = new ApplicationStore(...constructorArgs)
      })

    })

  })

})
