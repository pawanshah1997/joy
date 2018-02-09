/**
 * Created by bedeho on 21/07/17.
 */

var sinon = require('sinon')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var TorrentState = require('joystream-node').TorrentState
var TorrentHandle = require('./TorrentHandle')

util.inherits(EventEmitter, MockTorrent)

// mocks a joystream-node Torrent
function MockTorrent(fixture) {
    if (!fixture) {
      throw new Error('MockTorrent with undefined fixture')
    }

    EventEmitter.call(this);

    this._fixture = fixture

    this.handle = new TorrentHandle(fixture)
    this.startUploading = sinon.spy()

    // Setup spies?/ stubs?
}

module.exports = MockTorrent
