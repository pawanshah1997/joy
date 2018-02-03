import React, { Component } from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'

import { Row } from '../../../components/Table'
import { NameField, BytesField, IsUploading, PeerCountField } from '../../../components/RowFields'
import TorrentToolbar from './TorrentToolbar'
import AbsolutePositionChildren from '../../../components/AbsolutePositionChildren/AbsolutePositionChildren'
import ToolbarVisibilityType from '../../../utils/ToolbarVisibilityState'

@observer
class TorrentRow extends Component {
  /**
   * Local UI state
   * ==============
   * toolbarVisible {bool} - whether the toolbar for this row is currently visible
   */

  render (props) {
    return (
      // Duplicated element see uploading TorrentRow
      <Row className={this.props.toolbarVisibilityStatus === ToolbarVisibilityType.OnHover ? 'row-managed-toolbar-visiblity' : ''} backgroundColor={this.props.backgroundColor}>
        <NameField name={this.props.torrent.name} />
        <IsUploading uploading={this.props.torrent.canEndUploading} />
        <BytesField bytes={this.props.torrent.totalSize} />
        <PeerCountField count={this.props.torrent.numberOfBuyers} />
        { this.getRenderedToolbar() }
      </Row>
    )
  }

  getRenderedToolbar () {
    return (
      this.props.toolbarVisibilityStatus !== ToolbarVisibilityType.Hidden
      ? <AbsolutePositionChildren left={-250} top={3}>
        <TorrentToolbar {...this.props.toolbarProps} torrent={this.props.torrent} store={this.props.store} />
      </AbsolutePositionChildren>
      : null
    )
  }
}

TorrentRow.propTypes = {
  torrent: PropTypes.object.isRequired, // hould we here _require_ a TorrentStore?
  toolbarVisibilityStatus: PropTypes.oneOf(Object.values(ToolbarVisibilityType)).isRequired,
  toolbarProps: PropTypes.object // later use shape?
}

export default TorrentRow
