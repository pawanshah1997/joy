import React, { Component } from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'

import {
    LabelContainer,
    MiddleSection,
    Toolbar,
    ToolbarButton,
    MaxFlexSpacer,
    TorrentCountLabel,
    CurrencyLabel,
    BandwidthLabel
} from './../../components/MiddleSection'

import TorrentTable from './TorrentTable'
import StartUploadingFlow from './components/StartUploadingFlow'

function getStyles (props) {
  return {
    root: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1
    }
  }
}

@observer
class Seeding extends Component {
  startUplodingClicked = () => {
    this.props.uiStore.uploadingStore.uploadTorrentFile()
  }

  render () {
    let styles = getStyles(this.props)

    let labelColorProps = {
      backgroundColorRight: this.props.middleSectionHighlightColor,
      backgroundColorLeft: this.props.middleSectionDarkBaseColor
    }

    return (
      <div style={styles.root}>
        <MiddleSection backgroundColor={this.props.middleSectionBaseColor}>
          <Toolbar>
            <ToolbarButton title='Start uploading'
              onClick={this.startUplodingClicked} />
          </Toolbar>

          <MaxFlexSpacer />

          <LabelContainer>
            <TorrentCountLabel count={this.props.store.torrentsUploading.length}
              {...labelColorProps} />

            <CurrencyLabel labelText={'REVENUE'}
              satoshies={this.props.store.totalRevenue}
              {...labelColorProps} />

            <BandwidthLabel labelText={'UPLOAD SPEED'}
              bytesPerSecond={this.props.store.totalUploadSpeed}
              {...labelColorProps} />

          </LabelContainer>
        </MiddleSection>

        <TorrentTable torrents={this.props.store.torrentsUploading} store={this.props.store} />

        <StartUploadingFlow store={this.props.store} uploadingStore={this.props.uiStore.uploadingStore} />

      </div>
    )
  }
}

Seeding.propTypes = {
  store: PropTypes.object.isRequired,
  middleSectionBaseColor: PropTypes.string.isRequired,
  middleSectionDarkBaseColor: PropTypes.string.isRequired,
  middleSectionHighlightColor: PropTypes.string.isRequired
}

export default Seeding
