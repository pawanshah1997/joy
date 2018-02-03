/**
 * Created by bedeho on 05/05/17.
 */

import React from 'react'
import PropTypes from 'prop-types'

import Toolbar, {
    OpenFolderSection,
    PlaySection,
    RemoveAndDeleteSection,
    RemoveSection,
    StopUploadingSection} from '../../components/Toolbar'

const TorrentToolbar = (props) => {
  return (
    <Toolbar>
      <PlaySection torrent={props.torrent} />
      <StopUploadingSection torrent={props.torrent} />
      <RemoveSection torrent={props.torrent} store={props.store} />
      <RemoveAndDeleteSection torrent={props.torrent} store={props.store} />
      <OpenFolderSection torrent={props.torrent} />
    </Toolbar>
  )
}

TorrentToolbar.propTypes = {
  torrent: PropTypes.object.isRequired,
  store: PropTypes.object.isRequired
}

export default TorrentToolbar
