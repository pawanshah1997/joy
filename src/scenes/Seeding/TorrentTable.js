/**
 * Created by bedeho on 05/05/17.
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'

import Table, { Hint } from '../../components/Table'
import TorrentRows from './components/TorrentRows'
import Dropzone from 'react-dropzone'

class TorrentsTable extends Component {

  /**
   * Local UI state
   * ==============
   * contextMenu {
   *  top/left {Number} top location, w.r.t. its parent, for where context menu should be rendered
   *  torrent {} torrent to which context menu corresponds
   * }
   */

  render () {
    var dropZoneStyle = {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      borderStyle: 'none'
    }

    return (
      <Dropzone disableClick style={dropZoneStyle} onDrop={(files) => { this.props.store.startTorrentUploadFlowWithTorrentFile(files) }}>
        <Table column_titles={['', 'STATE', 'SPEED', 'PRICE', 'REVENUE', 'BUYERS']}>
          {this.props.torrents.length === 0
            ? <Hint title='Drop torrent file here to start uploading' key={0} />
            : <TorrentRows torrents={this.props.torrents} store={this.props.store} />}
        </Table>
      </Dropzone>
    )
  }
}

TorrentsTable.propTypes = {
  torrents: PropTypes.array.isRequired, // Further refine this to require particular object (shapes) in array?
  store: PropTypes.object.isRequired
}

export default TorrentsTable
