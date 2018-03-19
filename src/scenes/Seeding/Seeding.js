import React from 'react'
import { observer, inject } from 'mobx-react'
import PropTypes from 'prop-types'

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
} from  './../../components/MiddleSection'

import TorrentTable from './Components/TorrentTable'
import StartUploadingFlow from './Components/StartUploadingFlow'

function getStyles (props) {
  return {
    root: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1
    }
  }
}

const Seeding = inject('UIStore')(observer((props) => {

  let styles = getStyles(props)

  let labelColorProps = {
    backgroundColorRight: props.middleSectionHighlightColor,
    backgroundColorLeft: props.middleSectionDarkBaseColor
  }

  return (
    <div style={styles.root}>

      <MiddleSection backgroundColor={props.middleSectionBaseColor} height="120px">

        <Toolbar>

          <ToolbarButton title="add upload"
                         onClick={() => { props.UIStore.uploadingStore.startTorrentUploadFlowWithFilePicker() }}
                         iconNode={<AddTorrentIcon color={"#ffffff"} style={{ height : '16px', width: '16px'}} />}
          />

        </Toolbar>

        <MaxFlexSpacer />

        <LabelContainer>

          { /**
           <TorrentCountLabel count={props.UIStore.uploadingStore.torrentRowStores.length}
           {...labelColorProps} />
           **/
          }

          <CurrencyLabel labelText={'REVENUE'}
            satoshies={props.UIStore.totalRevenueFromPieces}
            {...labelColorProps} />

          <BandwidthLabel labelText={'UPLOAD SPEED'}
            bytesPerSecond={props.UIStore.uploadingStore.totalUploadSpeed}
            {...labelColorProps} />

        </LabelContainer>
      </MiddleSection>

      <TorrentTable uploadingStore={props.UIStore.uploadingStore}/>

      <StartUploadingFlow uploadingStore={props.UIStore.uploadingStore} />

    </div>
  )
}))

Seeding.propTypes = {
  middleSectionBaseColor: PropTypes.string.isRequired,
  middleSectionDarkBaseColor: PropTypes.string.isRequired,
  middleSectionHighlightColor: PropTypes.string.isRequired
}

export default Seeding
