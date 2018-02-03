/**
 * Created by bedeho on 03/08/17.
 */
import React from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'

import DownloadingStore from '../../../../core/DownloadingStore'

import {
  InvalidTorrentFileAlertDialog,
  TorrentAlreadyAddedAlertDialog} from '../../../../components/AlertDialog'

const StartDownloadingFlow = observer((props) => {
  console.log(props.downloadingStore.state)
  return (
    <div>
      <InvalidTorrentFileAlertDialog
        open={props.downloadingStore.state === DownloadingStore.State.TorrentFileWasInvalid}
        onAcceptClicked={() => { props.downloadingStore.acceptTorrentFileWasInvalid() }}
        onRetryClicked={() => { props.downloadingStore.retryPickingTorrentFile() }} />

      <TorrentAlreadyAddedAlertDialog
        open={props.downloadingStore.state === DownloadingStore.State.TorrentAlreadyAdded}
        onOkClicked={() => { props.downloadingStore.acceptTorrentWasAlreadyAdded() }} />
    </div>
  )
})

StartDownloadingFlow.propTypes = {
  downloadingStore: PropTypes.object.isRequired
}

module.exports = StartDownloadingFlow
