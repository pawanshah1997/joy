import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { UI_CONSTANTS } from '../../../constants'

import ApplicationHeader from './ApplicationHeader'

const NavigationFrame = observer((props) => {
  let style = {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1
  }

  return (
    <div style={style}>
      <ApplicationHeader
        app={props.app}
        uiStore={props.uiStore}
        height={'90px'}
        accentColor={UI_CONSTANTS.primaryColor} />
      {props.children}
    </div>
  )
})

NavigationFrame.propTypes = {
  app: PropTypes.object.isRequired,
  uiStore: PropTypes.object.isRequired
}

export default NavigationFrame
