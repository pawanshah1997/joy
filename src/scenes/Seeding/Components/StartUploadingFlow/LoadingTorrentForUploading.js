/**
 * Created by bedeho on 27/09/17.
 */

import React from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'

import LinearProgress from 'material-ui/LinearProgress'
import InnerDialogHeading from '../../../../components/FullScreenDialog/InnerDialogHeading'

function getStyles (props) {
  return {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    subtitle: {
      padding: '20px',
      marginTop: '30px',
      width: '800px'
    },
    progressBar: {
      marginTop: '50px',
      height: '10px',
      borderRadius: '50px',
      width: '600px'
    }
  }
}

const LoadingTorrentForUploading = observer((props) => {
  let styles = getStyles(props)

  // NB: store.startingTorrentCheckingProgressPercentage is not really the right
  // observable.

  return (
    <InnerDialogHeading title='Loading torrent'>
      <div style={styles.container}>

        <div style={styles.subtitle}>
          Checking any existing downloaded data to make sure it is complete.
        </div>

        <LinearProgress mode='determinate'
          value={props.store.startingTorrentCheckingProgressPercentage}
          style={styles.progressBar} />

      </div>
    </InnerDialogHeading>
  )
})

LoadingTorrentForUploading.propTypes = {
  store: PropTypes.object.isRequired
}

export default LoadingTorrentForUploading
