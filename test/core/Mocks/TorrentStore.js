/**
 * Created by bedeho on 21/07/17.
 */

var sinon = require('sinon')

function MockTorrentStore() {
    this.setMetadata = sinon.spy()
    this.setPeers = sinon.spy()
    this.setSuitableSellers = sinon.spy()
    this.setTorrentFiles = sinon.spy()
    this.setSellerPrice = sinon.spy()
    this.setStartPaidDownloadViability = sinon.spy()
    this.setViabilityOfPaidDownloadInSwarm = sinon.spy()
}

module.exports = MockTorrentStore
