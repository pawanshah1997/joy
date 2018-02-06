import React from 'react'
import ReactDOM from 'react-dom'

// babel-polyfill for generator (async/await)
import 'babel-polyfill'

/**
 * Isolated application store just for powering Components
 */
import ApplicationStore from '../core-stores/Application/ApplicationStore'
import Scene from '../core/Application/Scene'

var applicationStore = new ApplicationStore(
    'Started.OnDownloadingScene',
    [],
    12,
    2351212,
    12321,
    553,
    21,
    {
        addNewTorrent: () => { console.log("adding new torrent")},
        moveToScene: (s) => {

            console.log("moveToScene:" + s)

            if (s == Scene.Completed)
                applicationStore.setState('Started.OnCompletedScene')
            else if (s == Scene.Downloading)
                applicationStore.setState('Started.OnDownloadingScene')
            else if (s == Scene.Uploading)
                applicationStore.setState('Started.OnUploadingScene')
        },
        acceptTorrentFileWasInvalid: () => {
            applicationStore.setState('Started.OnDownloadingScene')
        },
        retryPickingTorrentFile: () => {
            applicationStore.setState('Started.OnDownloadingScene')
        },
        acceptTorrentFileAlreadyAdded: () => {
            applicationStore.setState('Started.OnDownloadingScene')
        }
    })

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
    var ComponentDevelopmentApplication = require('./App').default

    ReactDOM.render(
        <AppContainer>
            <ComponentDevelopmentApplication store={applicationStore}/>
        </AppContainer>
        ,
        document.getElementById('root')
    )
}