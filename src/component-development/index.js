import React from 'react'
import ReactDOM from 'react-dom'

// babel-polyfill for generator (async/await)
import 'babel-polyfill'

/**
 * Isolated application store just for powering Components
 */

import Application from '../core/Application'
import {MockApplication} from '../../test/core/Mocks'
import UIStore from '../scenes/UIStore'

import {default as ApplicationScene} from '../scenes/Application'
import MockApplicationAnimator from './MockApplicationAnimator'

//let app = new MockApplication(Application.STATE.STOPPED, [], true)

let animator = new MockApplicationAnimator(false)
let uiStore = new UIStore(animator.mockApplication)

// Expose in top scope for easy access from console
let app = animator.mockApplication

/**
 * Some Components use react-tap-event-plugin to listen for touch events because onClick is not
 * fast enough This dependency is temporary and will eventually go away.
 * Until then, be sure to inject this plugin at the start of your app.
 *
 * NB:! Can only be called once per application lifecycle
 */
var injectTapEventPlugin = require('react-tap-event-plugin')
injectTapEventPlugin()

// First time render
render()

// Setup future rendering
if (module.hot) {
    module.hot.accept(render)
}

function render() {

    // NB: We have to re-require Application every time, or else this won't work
    var AppContainer = require('react-hot-loader').AppContainer
    //var ComponentDevelopmentApplication = require('./App').default

    ReactDOM.render(
        <AppContainer>
          <ApplicationScene UIStore={uiStore} displayMobxDevTools={false}/>
        </AppContainer>
        ,
        document.getElementById('root')
    )
}