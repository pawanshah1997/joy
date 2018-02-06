import React from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'

import DownloadingStore from './Stores'

// Components
import TorrentTable from './components/TorrentTable'
import StartDownloadingFlow from './components/StartDownloadingFlow'

import {
    LabelContainer,
    MiddleSection,
    Toolbar,
    ToolbarButton,
    MaxFlexSpacer,
    TorrentCountLabel,
    CurrencyLabel,
    BandwidthLabel,
    AddTorrentIcon
} from './../../components/MiddleSection'

function getStyles (props) {
  return {
    root: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1
    }
  }
}

const Downloading = observer((props) => {
  
  let styles = getStyles(props)
  
  let labelColorProps = {
    backgroundColorLeft : props.middleSectionDarkBaseColor,
    backgroundColorRight : props.middleSectionHighlightColor
  }
  
  return (
    <div style={styles.root}>

      <MiddleSection backgroundColor={props.middleSectionBaseColor} height="120px">

        <Toolbar>

          <ToolbarButton title="add download"
                         onClick={() => { props.downloadingStore.startDownloadWithTorrentFileFromFilePicker()}}
                         iconNode={<AddTorrentIcon color={"#ffffff"} style={{ height : '16px', width: '16px'}}/>}
          />

        </Toolbar>

        <MaxFlexSpacer />

        <LabelContainer>

          <TorrentCountLabel count={props.downloadingStore.torrentRowStores.length}
                             {...labelColorProps}
          />

          <CurrencyLabel labelText={"SPENDING"}
                         satoshies={props.downloadingStore.totalSpent}
                         {...labelColorProps}
          />

          <BandwidthLabel labelText={'DOWNLOAD SPEED'}
                          bytesPerSecond={props.downloadingStore.totalDownloadSpeed}
                          {...labelColorProps}
          />

        </LabelContainer>

      </MiddleSection>

      <TorrentTable downloadingStore={props.downloadingStore}/>

      <StartDownloadingFlow downloadingStore={props.downloadingStore}/>

    </div>
  )

})

Downloading.propTypes = {
  downloadingStore : PropTypes.object.isRequired, // HMR breaks PropTypes.instanceOf(DownloadingStore).isRequired
  
  // Colors: drop
  middleSectionBaseColor: PropTypes.string.isRequired,
  middleSectionDarkBaseColor: PropTypes.string.isRequired,
  middleSectionHighlightColor: PropTypes.string.isRequired
}

export default Downloading
