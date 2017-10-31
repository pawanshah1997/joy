/**
 * Created by bedeho on 05/05/17.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'

import Toolbar, {
  OpenFolderSection,
  PlaySection,
  RemoveAndDeleteSection,
  RemoveSection,
  StartPaidDownloadingSection,
  ToggleStatusSection
} from '../../../components/Toolbar/index'
import TorrentTableRowStore from '../../Common/TorrentTableRowStore'

const TorrentToolbar = observer((props) => {
  
  return (
    <Toolbar>

      <PlaySection canPlay={props.torrentTableRowStore.canPlayMedia}
                   play={() => { props.torrentTableRowStore.playMedia() }}
      />
      
      <StartPaidDownloadingSection torrent={props.torrentTableRowStore.torrentStore} />

      <ToggleStatusSection canStart={props.torrentTableRowStore.torrentStore.canStart}
                           canStop={props.torrentTableRowStore.torrentStore.canStop}
                           start={() => { props.torrentTableRowStore.torrentStore.start() }}
                           stop={() => { props.torrentTableRowStore.torrentStore.stop() }}
      />

      {/** <ChangeBuyerTermsSection torrent={props.torrent}/> **/}

      <RemoveSection onClick={() => { props.torrentTableRowStore.remove() }} />

      <RemoveAndDeleteSection onClick={() => { props.torrentTableRowStore.removeAndDeleteData() }} />

      <OpenFolderSection onClick={() => { props.torrentTableRowStore.openFolder() }} />

    </Toolbar>
  )
})

TorrentToolbar.propTypes = {
  torrentTableRowStore: PropTypes.object.isRequired // HMR breaks instanceOf(TorrentTableRowStore)
}

export default TorrentToolbar
