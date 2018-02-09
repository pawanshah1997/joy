/**
 * Created by bedeho on 21/07/17.
 */

var TorrentInfo = require('./TorrentInfo')
var TorrentStatus = require('./TorrentStatus')

/// HandleSpy

function MockTorrentHandle(fixture) {
    this._fixture = fixture
    this._status = new TorrentStatus(fixture)
}

MockTorrentHandle.prototype.status = function () {
    return this._status
}

MockTorrentHandle.prototype.torrentFile = function () {
  return new TorrentInfo(this._fixture)
}

MockTorrentHandle.prototype.pause = function () {

}

module.exports = MockTorrentHandle
