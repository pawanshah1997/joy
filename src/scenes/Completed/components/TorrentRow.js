import React from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'

import { Row } from '../../../components/Table'
import {
  NameField,
  BytesField,
  IsUploading,
  PeerCountField
} from '../../../components/RowFields'
import TorrentToolbar from './TorrentToolbar'
import AbsolutePositionChildren from '../../../components/AbsolutePositionChildren/AbsolutePositionChildren'
import {TorrentTableRowStore} from "../../Common";

const TorrentRow = observer((props) => {
  
  let torrentStore = props.torrentTableRowStore.torrentStore
  
  return (
    <Row
      onMouseEnter={() => { props.torrentTableRowStore.setShowToolbar(true) }}
      onMouseLeave={() => { props.torrentTableRowStore.setShowToolbar(false) }}
      style={ {backgroundColor : props.backgroundColor}}
    >
      <NameField name={torrentStore.name} />
      
      <IsUploading uploading={torrentStore.canEndUploading} />
      
      <BytesField bytes={torrentStore.totalSize} />
      
      <PeerCountField count={torrentStore.numberOfBuyers} />
      
      {
        props.torrentTableRowStore.showToolbar
          ?
          <AbsolutePositionChildren left={-250} top={3}>
            <TorrentToolbar torrentTableRowStore={props.torrentTableRowStore} />
          </AbsolutePositionChildren>
          :
          null
      }
    </Row>
  )
  
})

TorrentRow.propTypes = {
  torrentTableRowStore: PropTypes.instanceOf(TorrentTableRowStore).isRequired
}

export default TorrentRow
