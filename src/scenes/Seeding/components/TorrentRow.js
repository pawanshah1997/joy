/**
 * Created by bedeho on 23/05/17.
 */

import React, { Component } from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'

import { Row } from '../../../components/Table'
import { NameField,
         StatusField,
         BytesPerSecondField,
         BitcoinValueField,
         PeerCountField} from '../../../components/RowFields'
import TorrentToolbar from '../TorrentToolbar'
import AbsolutePositionChildren from '../../../components/AbsolutePositionChildren/AbsolutePositionChildren'

@observer
class TorrentRow extends Component {

  /**
   * Local UI state
   * ==============
   * toolbarVisible {bool} - whether the toolbar for this row is currently visible
   */

  constructor () {
    super()

    this.state = {
      hover: false
    }
  }

  onMouseEnterHandler () {
    this.setState({hover: true})
  }

  onMouseLeaveHandler () {
    this.setState({hover: false})
  }

  render (props) {
    const mouseEvents = {
      onMouseEnter: this.onMouseEnterHandler.bind(this),
      onMouseLeave: this.onMouseLeaveHandler.bind(this)
    }
    return (
      // Duplicated element see completed TorrentRow
      <Row
        className={this.state.hover ? 'row-managed-toolbar-visiblity' : ''}
        backgroundColor={this.props.backgroundColor}
        mouseEvents={mouseEvents} >

        <NameField name={this.props.torrent.name} />

        <StatusField paused={this.props.torrent.canStart} />

        <BytesPerSecondField bytes={this.props.torrent.uploadSpeed} />

        <BitcoinValueField satoshis={this.props.torrent.sellerPrice} />

        <BitcoinValueField satoshis={this.props.torrent.totalRevenue} />

        <PeerCountField count={this.props.torrent.numberOfBuyers} />

        { this.state.hover
        ? <AbsolutePositionChildren left={-250} top={3}>
          <TorrentToolbar torrent={this.props.torrent} store={this.props.store} />
        </AbsolutePositionChildren>
        : null }

      </Row>
    )
  }
}

TorrentRow.propTypes = {
  torrent: PropTypes.object.isRequired, // hould we here _require_ a TorrentStore?
  store: PropTypes.object.isRequired
}

export default TorrentRow
