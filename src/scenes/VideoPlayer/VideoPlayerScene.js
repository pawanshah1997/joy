/**
 * Created by bedeho on 18/10/2017.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { Provider, observer } from 'mobx-react'
import FullScreenContainer from '../../components/FullScreenContainer'
import VideoPlayer from  '../../components/VideoPlayer'

const VideoPlayerScene = observer((props) => {
    
    return (
        props.activeMediaPlayerStore
      ?
        <FullScreenContainer>
            <VideoPlayer mediaPlayerStore={props.activeMediaPlayerStore}/>
        </FullScreenContainer>
        :
        null
    )

})

VideoPlayerScene.propTypes = {
  activeMediaPlayerStore : PropTypes.object
}

export default VideoPlayerScene
