import {EventEmitter} from 'events'

import Application from '../../../src/core/Application'
import sinon from 'sinon'

class MockApplication extends EventEmitter {
  
  state
  
  constructor(state) {
    super()
    
    this.state = state
    
    this.start = sinon.spy()
    this.stop = sinon.spy()
    this.addTorrent = sinon.spy()
    this.removeTorrent = sinon.spy()
  }
  
  updateState(state) {
    this.state = state
    this.emit('state', state)
  }

}

export default  MockApplication
