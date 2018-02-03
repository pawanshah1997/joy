/**
 * Created by bedeho on 23/05/17.
 */

import React, { Component } from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'

import { Row } from '../../components/Table'
import {
  NameField,
  StatusField,
  BytesField,
  ProgressField,
  BytesPerSecondField,
  ETAField,
  ModeField,
  PeerCountField
} from '../../components/RowFields'
import TorrentToolbar from './TorrentToolbar'

import AbsolutePositionChildren from '../../components/AbsolutePositionChildren/AbsolutePositionChildren'

import ToolbarVisibilityType from '../../utils/ToolbarVisibilityState'

@observer
class TorrentRow extends Component {

  /**
   * Local UI state
   * ==============
   * toolbarVisible {bool} - whether the toolbar for this row is currently visible
   */

  render (props) {
    return (
      <Row
        className={this.props.toolbarVisibilityStatus === ToolbarVisibilityType.OnHover ? 'row-managed-toolbar-visiblity' : ''}
        backgroundColor={this.props.backgroundColor}>

        <NameField name={this.props.torrent.name} />

        <StatusField paused={this.props.torrent.canStart} />

        <BytesField bytes={this.props.torrent.totalSize} />

        <ProgressField progress={this.props.torrent.progress} />

        <BytesPerSecondField bytes={this.props.torrent.downloadSpeed} />

        <ETAField bytes_remaining={this.props.torrent.totalSize - this.props.torrent.downloadedSize}
          bytes_per_second={this.props.torrent.downloadSpeed} />

        <ModeField isPaid={this.props.torrent.hasStartedPaidDownloading} />

        <PeerCountField count={this.props.torrent.numberOfSeeders} />

        <PeerCountField count={this.props.torrent.numberOfSellers} />

        { this.getRenderedToolbar() }

      </Row>
    )
  }

  getRenderedToolbar () {
    return (
      this.props.toolbarVisibilityStatus !== ToolbarVisibilityType.Hidden
      ? <AbsolutePositionChildren left={-310} top={3}>
        <TorrentToolbar {...this.props.toolbarProps} torrent={this.props.torrent} store={this.props.store} />
      </AbsolutePositionChildren>
      : null
    )
  }
}

TorrentRow.propTypes = {
  torrent: PropTypes.object.isRequired, // hould we here _require_ a TorrentStore?
  toolbarVisibilityStatus: PropTypes.oneOf(Object.values(ToolbarVisibilityType)).isRequired,
  toolbarProps: PropTypes.object, // later use shape?
  backgroundColor: PropTypes.string
}

export default TorrentRow
