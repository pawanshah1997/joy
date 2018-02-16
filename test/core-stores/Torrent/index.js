import TorrentStore from '../../../src/core-stores/Torrent'

var assert = require('chai').assert
var sinon = require('sinon')

const createInitialValues = () => {
  return {
    infoHash: 'abc',
    name: 'torrent.name',
    savePath: 'path',
    state: 1,
    totalSize: 100,
    progress: 50,
    downloadedSize: 50,
    downloadSpeed: 15,
    uploadSpeed: 5,
    uploadedTotal: 0,
    numberOfSeeders: 2,
    sellerTerms: 'seller_terms',
    buyerTerms: 'buyer_terms',
    numberOfPiecesSoldAsSeller: 0,
    totalRevenueFromPiecesAsSeller: 0,
    totalSpendingOnPiecesAsBuyer: 0,
    starter: sinon.spy(),
    stopper: sinon.spy(),
    paidDownloadStarter: sinon.spy(),
    uploadBeginner: sinon.spy(),
    uploadStopper: sinon.spy()
  }
}

describe('Torrent Store', function () {
  let initialValues, torrentStore

  beforeEach(function () {
    initialValues = createInitialValues()
    torrentStore = new TorrentStore(initialValues)
  })

  it('constructor initializes observables', function () {
    function checkInitialValue (store, valuesMap, observableName) {
      assert.deepEqual(store[observableName], valuesMap[observableName])
    }

    const check = checkInitialValue.bind(null, torrentStore, initialValues)

    const observables = [
      'infoHash', 'name', 'savePath', 'state', 'totalSize', 'progress',
      'downloadedSize', 'downloadSpeed', 'uploadSpeed', 'uploadedTotal',
      'numberOfSeeders', 'sellerTerms', 'buyerTerms', 'numberOfPiecesSoldAsSeller',
      'totalRevenueFromPiecesAsSeller', 'totalSpendingOnPiecesAsBuyer'
    ]

    observables.forEach(function (observableName) {
      check(observableName)
    })
  })

})
