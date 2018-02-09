/**
 * Created by bedeho on 21/07/17.
 */

var FileStorage = require('./FileStorage')

function MockTorrentInfo(fixture) {
    this._fixture = fixture
}

MockTorrentInfo.prototype.isValid = function() {
    return this._fixture.metadata != null
}

MockTorrentInfo.prototype.files = function () {
  return new FileStorage(this._fixture)
}

module.exports = MockTorrentInfo
