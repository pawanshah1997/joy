import React, { Component } from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'
import {
  LabelContainer,
  MiddleSection,
  MaxFlexSpacer,
  TorrentCountLabel,
  CurrencyLabel
} from './../../components/MiddleSection'

import { TorrentTable } from './components'
import {TorrentTableRowStore} from "../Common";

function getStyles (props) {
  return {
    root: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1
    }
  }
}

const Completed = observer((props) => {
  
  let styles = getStyles(props)
  
  let labelColorProps = {
    backgroundColorLeft: props.middleSectionDarkBaseColor,
    backgroundColorRight: props.middleSectionHighlightColor
  }
  
  return (
    <div style={styles.root}>
      
      <MiddleSection backgroundColor={props.middleSectionBaseColor} height="120px">
        
        <MaxFlexSpacer />

        <LabelContainer>
          <TorrentCountLabel
            count={props.completedStore.torrentRowStores.length}
            {...labelColorProps} />

          <CurrencyLabel
            labelText={'SPENDING'}
            satoshies={props.completedStore.totalSpent}
            {...labelColorProps} />

          <CurrencyLabel
            labelText={'REVENUE'}
            satoshies={props.completedStore.totalRevenue}
            {...labelColorProps} />
        </LabelContainer>
      </MiddleSection>

      <TorrentTable completedStore={props.completedStore}/>

    </div>
  )
  
})

Completed.propTypes = {
  completedStore: PropTypes.object.isRequired, // HMR breaks instanceOf(TorrentTableRowStore)
  
  middleSectionBaseColor: PropTypes.string.isRequired,
  middleSectionDarkBaseColor: PropTypes.string.isRequired,
  middleSectionHighlightColor: PropTypes.string.isRequired
}

export default Completed
