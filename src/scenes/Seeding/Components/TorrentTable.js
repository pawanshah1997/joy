/**
 * Created by bedeho on 05/05/17.
 */

import React from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'

import Table, { Hint } from '../../../components/Table/index'
import TorrentRow from './TorrentRow'
import Dropzone from 'react-dropzone'

function getStyle(props) {

  return {
    dropZoneStyle : {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      borderStyle: 'none'
    },
    evenRow : {
      backgroundColor : 'hsla(0, 0%, 93%, 1)'
    },
    oddRow : {
      backgroundColor : 'white'
    }
  }

}

const TorrentTable = observer((props) => {

  let styles = getStyle(props)

  return (
    <Dropzone disableClick style={styles.dropZoneStyle} onDrop={(files) => { props.uploadingStore.startTorrentUploadFlowWithTorrentFile(files) }}>
      <Table column_titles={['', 'STATE', 'SPEED', 'PRICE', 'REVENUE', 'BUYERS']}>
        {
          props.uploadingStore.torrentRowStores.length === 0
            ?
          <Hint title='Drop torrent file here to start uploading' key={0}/>
            :
          props.uploadingStore.torrentRowStores.map((t, i) => {

            return (
              <TorrentRow
                key={t.torrentStore.infoHash}
                torrentTableRowStore={t}
                backgroundColor={(i % 2 === 0) ? styles.evenRow.backgroundColor : styles.oddRow.backgroundColor}
              />
            )

          })
        }
      </Table>
    </Dropzone>
  )

})

TorrentTable.propTypes = {
  uploadingStore: PropTypes.object.isRequired // HMR breaks instanceof test on UploadingStore
}

export default TorrentTable
