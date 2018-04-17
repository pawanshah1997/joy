/**
 * Created by bedeho on 17/04/2018.
 */

import React, {Component} from 'react'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'



let style = {
  root : {
    display: 'flex',
    flexDirection: 'column'
  }
}

const IsolatedComponents = (props) => {

  return (
    <MuiThemeProvider>
      <div style={style.root}>
        <h1>Isolated Components</h1>

        <hr/>

        <h2>START DOWNLOAD FIELD</h2>

        <StartPaidDownloadingFieldSection />

      </div>
    </MuiThemeProvider>
  )
}

import StartPaidDownloadingField from '../scenes/Downloading/components/StartPaidDownloadingField'
import TorrentTableRowStore from '../scenes/Common/TorrentTableRowStore'
import {CanStart} from '../scenes/Common/ViabilityOfPaidDownloadingTorrent'

class StartPaidDownloadingFieldSection extends Component {

  constructor() {
    super()

    // Torrent 1
    let infoHash_1 = 'info1'
    let torrentStore = {
      infoHash: infoHash_1
    }
    let uiStore = {
      torrentsViabilityOfPaidDownloading : {
        get : function() {
          return new CanStart({ }, 123)
        }
      }
    }
    let row = new TorrentTableRowStore(torrentStore, uiStore, false)
    row.setStartingPaidDownload(true)

    this.state = {
      startPaidDownloadTorrentTableRowStore : row
    }
  }

  render() {

    return (
      <StartPaidDownloadingField torrentTableRowStore={this.state.startPaidDownloadTorrentTableRowStore}/>
    )
  }
}


export default IsolatedComponents