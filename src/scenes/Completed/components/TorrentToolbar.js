import React from 'react'
import PropTypes from 'prop-types'

import Toolbar, {
    OpenFolderSection,
    PlaySection,
    RemoveAndDeleteSection,
    RemoveSection,
    StartUploadingSection} from '../../../components/Toolbar'
import TorrentTableRowStore from "../../Common/TorrentTableRowStore";

const TorrentToolbar = (props) => {
  
  return (
    <Toolbar>
      
      <PlaySection canPlay={props.torrentTableRowStore.canPlayMedia}
                   play={() => { props.torrentTableRowStore.playMedia() }}
      />
      
      <StartUploadingSection canBeginPaidUploadWidthDefaultTerms={props.torrentTableRowStore.torrentStore.canBeginUploading}
                             onClick={() => { props.torrentTableRowStore.beginPaidUploadWithDefaultTerms() }}
      />
      
      <RemoveSection onClick={() => { props.torrentTableRowStore.remove() }} />
      
      <RemoveAndDeleteSection onClick={() => { props.torrentTableRowStore.removeAndDeleteData() }} />
      
      <OpenFolderSection onClick={() => { props.torrentTableRowStore.openFolder() }} />
      
    </Toolbar>
  )
}

TorrentToolbar.propTypes = {
  torrentTableRowStore: PropTypes.object.isRequired // HMR breaks PropTypes.instanceOf(TorrentTableRowStore)
}

export default TorrentToolbar
