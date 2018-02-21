import DownloadingStore from '../../../src/scenes/Downloading/Stores/'
import TorrentTableRowStore from '../../../src/scenes/Common/TorrentTableRowStore'
import TorrentStore from '../../../src/core-stores/Torrent'

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

describe('DownloadingStore', function () {
  let downloadingStore, initialValues

  beforeEach(function () {
    initialValues = createInitialValues()
    downloadingStore = new DownloadingStore(...initialValues)
  })

  it('constructor initializes empty infoHash to TorrentTableRowStore map', function () {
    assert.equal(downloadingStore.torrentRowStores.length, 0)
    assert.equal(downloadingStore.state, DownloadingStore.STATE.InitState)
  })

  describe('addTorrentStore', function () {
    const infoHash1 = 'infoHash-1'
    beforeEach(function () {
      downloadingStore.setRowStorefromTorrentInfoHash(new Map([
        [infoHash1, {infoHash: infoHash1}]
      ]))
    })

    it('adds new torrent row store to map', function () {
      const newTorrentStore = new TorrentStore({ infoHash: 'infohash-2', state: 'Active.DownloadIncomplete' })

      let numberOfTorrentStores = downloadingStore.torrentRowStores.length

      downloadingStore.addTorrentStore(newTorrentStore)

      assert.equal(downloadingStore.torrentRowStores.length, numberOfTorrentStores + 1)

      const addedRowStore = downloadingStore.torrentRowStores.slice(-1).pop()

      assert(addedRowStore instanceof TorrentTableRowStore)

      assert(downloadingStore.rowStorefromTorrentInfoHash.has(newTorrentStore.infoHash))
      assert.deepEqual(downloadingStore.rowStorefromTorrentInfoHash.get(newTorrentStore.infoHash), addedRowStore)
    })

    it('throws if duplicate infoHash', function () {
      const duplicateTorrentStore = {infoHash: infoHash1}

      assert.throws(function () {
        downloadingStore.addTorrentStore(duplicateTorrentStore)
      })
    })
  })

  describe('removeTorrentStore', function () {
    const infoHash1 = 'infoHash-1'
    beforeEach(function () {
      downloadingStore.setRowStorefromTorrentInfoHash(new Map([
        [infoHash1, {infoHash: infoHash1}]
      ]))
    })

    it('removes store from map', function () {
      assert(downloadingStore.rowStorefromTorrentInfoHash.has(infoHash1))
      downloadingStore.removeTorrentStore(infoHash1)
      assert(!downloadingStore.rowStorefromTorrentInfoHash.has(infoHash1))
    })

    it('throws on removing store which does not exist', function () {
      assert.throws(function () {
        downloadingStore.removeTorrentStore('infohash-2')
      })
    })
  })
})
