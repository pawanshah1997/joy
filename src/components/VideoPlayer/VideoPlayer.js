import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Provider, observer, inject } from 'mobx-react'
import CloseButton from './CloseButton'

import TorrentStreamProgress from './TorrentStreamProgress'

const VIDEO_ELEMENT_ID = 'video_element_id'

function getVideoDOMElement() {
    return document.getElementById(VIDEO_ELEMENT_ID)
}

@inject('uiConstantsStore')
@observer
class VideoPlayer extends Component {
  constructor (props) {
    super(props)

    this.state = {displayCloseButton: true}
  }

  componentDidMount () {

    let opts = {
        autoplay : this.props.mediaPlayerStore.autoPlay
    }

  }

  handleMouseEnter () {
    this.setState({displayCloseButton: true})
  }

  handleMouseLeave () {
    this.setState({displayCloseButton: false})
  }

  render () {

    const videoStyle = {
      height: '100%',
      width: '100%'
    }

    let styles = {

        root : {
            display : 'flex',
            flexDirection : 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            background: 'black',
            overflow: 'hidden'
        }
    }

    return (
      <div onMouseEnter={this.handleMouseEnter.bind(this)}
           onMouseLeave={this.handleMouseLeave.bind(this)}
           style={styles.root}
      >

        {
          this.state.displayCloseButton
            ?
            <CloseButton onClick={() => { this.props.mediaPlayerStore.exit()}} />
            :
            null
        }

          {
                this.props.mediaPlayerStore.showTorrentStreamProgress
              ?
                <TorrentStreamProgress mediaPlayerStore={this.props.mediaPlayerStore}/>
              :
                null
          }



        <video id={VIDEO_ELEMENT_ID}
               src='http://localhost:8888'
               onDurationChange={() => { this.props.mediaPlayerStore.durationChanged() }}
               onLoadedMetadata={(event) => { this.props.mediaPlayerStore.metadataLoaded(event) }}
               onLoadedData={() => { this.props.mediaPlayerStore.loadedData(getVideoDOMElement()) }}
               onProgress={() => { this.props.mediaPlayerStore.progress(getVideoDOMElement()) }}
               onWaiting={() => { this.props.mediaPlayerStore.isWaiting()}}
               onPlay={() => { this.props.mediaPlayerStore.play(getVideoDOMElement())}}
               onPlaying={() => { this.props.mediaPlayerStore.isPlaying()}}
               onCanPlay={() => { this.props.mediaPlayerStore.canPlay() }}
               onCanPlayThrough={() => { this.props.mediaPlayerStore.canPlayThrough() }}
               onError={() => { this.props.mediaPlayerStore.errorOccured(getVideoDOMElement()) }}
               style={videoStyle}
               controls
        />

      </div>
    )
  }
}

VideoPlayer.propTypes = {
    mediaPlayerStore : PropTypes.object.isRequired
}

export default VideoPlayer
