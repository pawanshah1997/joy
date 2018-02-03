/**
 * Created by bedeho on 26/09/17.
 */

import React from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'

import FullScreenDialog from '../../../../components/FullScreenDialog'
import LoadingTorrentForUploading from './LoadingTorrentForUploading'
import UserPickingSavePath from './UserPickingSavePath'
import IncompleteDownloadWarning from './IncompleteDownloadWarning'

import UploadingStore from '../../../../core/UploadingStore'

import {
  InvalidTorrentFileAlertDialog,
  TorrentAlreadyAddedAlertDialog
} from '../../../../components/AlertDialog'

const StartUploadingFlow = observer((props) => {
  let state = props.uploadingStore.state

  let fullScreenDialogContent
  let enableCloseButton = true
  let fullScreen =
  // state === 'Started.OnUploadingScene.UserSelectingTorrentFileOrRawContent' ||
  // state === 'Started.OnUploadingScene.TorrentFileWasInvalid' ||
  // state === 'Started.OnUploadingScene.TorrentAlreadyAdded' ||
  state === UploadingStore.State.UserPickingSavePath ||
  state === UploadingStore.State.LoadingTorrentForUploading ||
  state === UploadingStore.State.TellUserAboutIncompleteDownload

  switch (state) {
    case UploadingStore.State.UserPickingSavePath:
      fullScreenDialogContent = <UserPickingSavePath {...props} />
      break
    case UploadingStore.State.LoadingTorrentForUploading:
      fullScreenDialogContent = <LoadingTorrentForUploading {...props} />
      break
    case UploadingStore.State.TellUserAboutIncompleteDownload:
      fullScreenDialogContent = <IncompleteDownloadWarning uploadingStore={props.uploadingStore} />
      break
    default:
      fullScreenDialogContent = null
  }

  return (
    <div>
      <InvalidTorrentFileAlertDialog
        open={state === UploadingStore.State.TorrentFileWasInvalid}
        onAcceptClicked={() => { props.uploadingStore.acceptTorrentFileWasInvalid() }}
        onRetryClicked={() => { props.uploadingStore.retryPickingTorrentFile() }} />

      <TorrentAlreadyAddedAlertDialog
        open={state === UploadingStore.State.TorrentAlreadyAdded}
        onOkClicked={() => { props.uploadingStore.acceptTorrentWasAlreadyAdded() }} />

      <FullScreenDialog
        closeClick={() => { props.uploadingStore.exitStartUploadingFlow() }}
        open={fullScreen}
        enableCloseButton={enableCloseButton} >
        { fullScreenDialogContent }
      </FullScreenDialog>
    </div>
  )
})

StartUploadingFlow.propTypes = {
  uploadingStore: PropTypes.object.isRequired
}

export default StartUploadingFlow
