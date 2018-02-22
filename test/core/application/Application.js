
/* global it, describe */

// babel-polyfill for generator (async/await)
import 'babel-polyfill'

// Use of pure js bcoin library because electron doesn't compile with openssl
// which is needed.
process.env.BCOIN_NO_NATIVE = '1'

// Disable workers which are not available in electron
require('bcoin').set({ useWorkers: false })

// Set primary network in Bcoin (oyh vey, what a singlton horrible pattern)
bcoin.set({ network :  config.network})

var expect = require('chai').expect
import sinon from 'sinon'
import os from 'os'
import fs from 'fs'
import rimraf from 'rimraf'
import path from 'path'

import Application, {WalletTopUpOptions} from '../../../src/core/Application'
import config from '../../../src/config'
import DeepInitialState from '../../../src/core/Torrent/Statemachine/DeepInitialState'
import { TorrentInfo } from 'joystream-node'

const buyerTerms = {
  maxPrice: 20,
  maxLock: 5,
  minNumberOfSellers: 1,
  maxContractFeePerKb: 2000
}

const sellerTerms = {
  minPrice: 20,
  minLock: 1,
  maxNumberOfSellers: 5,
  minContractFeePerKb: 2000,
  settlementFee: 2000
}

describe('Application', function() {
  
  describe('normal cycle', function() {
  
    let application = null
    
    afterEach(function() {
  
      /**
       * Since we add state assertions on application events,
       * we have to make sure to drop them after each test.
       */
      application.removeAllListeners()
    })
  
    it('create', function() {
    
      let walletTopUpOptions = new WalletTopUpOptions(false, 0)
    
      application = new Application([], false, false, walletTopUpOptions)
    
      expect(application.state).to.be.equal(Application.STATE.STOPPED)
    
    })
  
    it('start', function(done) {
      
      // Adjust timeout, starting the app takes time
      this.timeout(10000)
  
      let appDirectory = path.join(os.tmpdir(), '.joystream-test')
      
      // If an old directory exists, we delete it,
      // to give a fresh start
      if(fs.existsSync(appDirectory)) {
        rimraf.sync(appDirectory)
      }
      
      // Create fresh directory
      fs.mkdirSync(appDirectory)
    
      let config = {
        network: 'testnet',
        assistedPeerDiscovery: false,
        bitTorrentPort: 0
      }
      
      let startedResourcesEvents = new Set()
      
      application.on('resourceStarted', (resource) => {
        
        startedResourcesEvents.add(resource)
        
        areWeDone()
      })
      
      let startedEvent = false
      
      application.on('started', () => {
        startedEvent = true

        expect(application.state).to.be.equal(Application.STATE.STARTED)
        
        expect(startedResourcesEvents.size).to.be.equal(Application.NUMBER_OF_RESOURCE_TYPES)
  
        areWeDone()
      })
      
      let startingEvent = false
      
      application.on('starting', () => {
        startingEvent = true
        
        
        expect(application.state).to.be.equal(Application.STATE.STARTING)
  
        areWeDone()
      })
      
      let callbackCalled = false
      application.start(config, appDirectory, () => {
        
        callbackCalled = true
        
        areWeDone()
      })
      

      function areWeDone() {
        
        if(startingEvent && startedEvent && callbackCalled)
          done()
        
      }
    
    })
  
    let torrentInfo = loadTorrentInfoFixture('tears-of-steel.torrent')
  
    const infoHash = torrentInfo.infoHash()
  
    let settings = {
      infoHash : infoHash,
      metadata : torrentInfo,
      resumeData : null,
      name: torrentInfo.name() || infoHash,
      savePath: os.tmpdir(),
      deepInitialState: DeepInitialState.DOWNLOADING.UNPAID.STARTED,
      extensionSettings : {
        buyerTerms: buyerTerms
      }
    }
  
    it('add torrent successfully', function(done) {
  
      // Adjust timeout, starting the app takes time
      this.timeout(5000)
      
      let torrentAddedEventEmitted = false

      application.on('torrentAdded', (torrent) => {

        torrentAddedEventEmitted = true
        
        expect(torrent.infoHash).to.be.equal(settings.infoHash)

        areWeDone()

      })

      let addTorrentCallbackMade = false

      let torrentLoadedEventEmitted = false
    
      application.addTorrent(settings, (err, torrent) => {

        expect(err).to.be.null

        addTorrentCallbackMade = true

        // Make sure torrent matches
        expect(torrent.infoHash).to.be.equal(settings.infoHash)
      
        // and that it was actually added
        expect(application.torrents.get(torrent.infoHash)).to.be.equal(torrent)
        
        torrent.once('loaded', (deepInitialState) => {

          torrentLoadedEventEmitted = true
        
          // Make sure we started in right state
          expect(deepInitialState).to.be.equal(settings.deepInitialState)
  
          // and check other public values
          expect(torrent.torrentInfo).to.deep.equal(settings.metadata)
        
          areWeDone()
        
        })
        
        areWeDone()
      
      })

      function areWeDone() {
        
        if(torrentAddedEventEmitted &&
          addTorrentCallbackMade &&
          torrentLoadedEventEmitted)
          done()

      }

    })
  
    it('fail to add duplicate torrent', (done) => {
  
      application.addTorrent(settings, (err, torrent) => {
    
        expect(err).to.equal('Torrent already added')
        
        done()
    
      })
      
    })
  
    it('remove torrent', function(done) {
    
      let torrentRemovedEventEmitted = false
      application.on('torrentRemoved', (infoHash) => {
      
        torrentRemovedEventEmitted = true
        
        expect(infoHash).to.be.equal(settings.infoHash)
        
        areWeDone()
        
      })
    
      let removeTorrentCallbackCalled = false
      application.removeTorrent(settings.infoHash, false, (err) => {
        
        removeTorrentCallbackCalled = true
        
        // no error
        expect(err).to.be.null
        
        // torrent is gone
        expect(application.torrents.has(settings.infoHash)).to.be.false
        
        areWeDone()
      
      })
      
      function areWeDone() {
        
        if(torrentRemovedEventEmitted && removeTorrentCallbackCalled)
          done()
      
      }
    
    })
    
    it('cannot remove non-existent torrent', function(done) {
      
      // TBD
  
      //'No torrent added corresponding to given hash'
      
      done()
    })
    
    it('adding two new torrents to be persisted', function(done) {
  
      // TBD
      
      // add two torrents for presisiting
      
      done()
    })
    
    it('stop', function(done) {
      
      let stoppingEventEmitted = false
      application.on('stopping', () => {
        
        stoppingEventEmitted = true
  
        // make sure we are currently stopping
        expect(application.state).to.be.equal(Application.STATE.STOPPING)
  
        areWeDone()
        
      })
  
      let resourceStoppedEvents = new Set()
      application.on('resourceStopped', (resource) => {
    
        resourceStoppedEvents.add(resource)
    
      })
      
      let stoppedEventEmitted = false
      application.on('stopped', () => {
        
        stoppedEventEmitted = true
        
        expect(application.state).to.be.equal(Application.STATE.STOPPED)
        expect(resourceStoppedEvents.size).to.be.equal(Application.NUMBER_OF_RESOURCE_TYPES)
  
        areWeDone()
        
      })
      
      let stopCallbackMade = false
      application.stop(() => {
  
        stopCallbackMade = true
      
        expect(application.state).to.be.equal(Application.STATE.STOPPED)
        
        areWeDone()
      
      })
      
      function areWeDone() {
        
        if(stoppingEventEmitted &&
          stoppingEventEmitted &&
          stopCallbackMade)
          done()
        
      }
    
    })
    
    it('starting new app, loading same persisted torrents', function(done) {
  
      // TBD
      
      done()
    })
    
  })
  
})

function loadTorrentInfoFixture(filename) {
  
  let data = fs.readFileSync('test/core/application/torrents/' + filename)
  
  return new TorrentInfo(data)
}