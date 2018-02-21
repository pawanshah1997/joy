import CompletedStore from '../../../src/scenes/Completed/Stores/'
import TorrentTableRowStore from '../../../src/scenes/Common/TorrentTableRowStore'

var assert = require('chai').assert

const createInitialValues = () => {
  return [
    { // UIStore
      applicationStore: {
        walletStore: {}
      }
    }
  ]
}

describe('CompletedStore', function () {
  let completedStore, initialValues

  beforeEach(function () {
    initialValues = createInitialValues()
    completedStore = new CompletedStore(...initialValues)
  })

  it('constructor initializes empty infoHash to TorrentTableRowStore map', function () {
    assert.equal(completedStore.torrentRowStores.length, 0)
  })

  it('computes rows', function () {
    completedStore.setRowStorefromTorrentInfoHash(new Map([
      ['a', {infoHash: 'a', isFullyDownloaded: true}],
      ['b', {infoHash: 'b', isFullyDownloaded: false}]
    ]))

    assert.equal(completedStore.torrentRowStores.length, 1)
  })

  describe('addTorrentStore', function () {
    const infoHash1 = 'infoHash-1'
    beforeEach(function () {
      completedStore.setRowStorefromTorrentInfoHash(new Map([
        [infoHash1, {infoHash: infoHash1}]
      ]))
    })

    it('adds new torrent row store to map', function () {
      const newTorrentStore = { infoHash: 'infohash-2', state: 'Active.FinishedDownloading' }

      let numberOfTorrentStores = completedStore.torrentRowStores.length

      completedStore.addTorrentStore(newTorrentStore)

      assert.equal(completedStore.torrentRowStores.length, numberOfTorrentStores + 1)

      const addedRowStore = completedStore.torrentRowStores.slice(-1).pop()

      assert(addedRowStore instanceof TorrentTableRowStore)

      assert(completedStore.rowStorefromTorrentInfoHash.has(newTorrentStore.infoHash))
      assert.deepEqual(completedStore.rowStorefromTorrentInfoHash.get(newTorrentStore.infoHash), addedRowStore)
    })

    it('throws if duplicate infoHash', function () {
      const duplicateTorrentStore = {infoHash: infoHash1}

      assert.throws(function () {
        completedStore.addTorrentStore(duplicateTorrentStore)
      })
    })
  })

  describe('removeTorrentStore', function () {
    const infoHash1 = 'infoHash-1'
    beforeEach(function () {
      completedStore.setRowStorefromTorrentInfoHash(new Map([
        [infoHash1, {infoHash: infoHash1}]
      ]))
    })

    it('removes store from map', function () {
      assert(completedStore.rowStorefromTorrentInfoHash.has(infoHash1))
      completedStore.removeTorrentStore(infoHash1)
      assert(!completedStore.rowStorefromTorrentInfoHash.has(infoHash1))
    })

    it('throws on removing store which does not exist', function () {
      assert.throws(function () {
        completedStore.removeTorrentStore('infohash-2')
      })
    })
  })
})
