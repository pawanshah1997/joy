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
class Completed extends Component {
  componentWillMount () {
    this.props.uiStore.resetNumberCompletedInBackgroundCounter()
  }

  render () {
    let styles = getStyles(this.props)
    let labelColorProps = {
      backgroundColorLeft: this.props.middleSectionDarkBaseColor,
      backgroundColorRight: this.props.middleSectionHighlightColor
    }
    return (
      <div style={styles.root}>
        <MiddleSection backgroundColor={this.props.middleSectionBaseColor}>

          <MaxFlexSpacer />

          <LabelContainer>
            <TorrentCountLabel
              count={this.props.store.torrentsCompleted.length}
              {...labelColorProps} />

            <CurrencyLabel
              labelText={'SPENDING'}
              satoshies={this.props.store.totalSpent}
              {...labelColorProps} />

            <CurrencyLabel
              labelText={'REVENUE'}
              satoshies={this.props.store.totalRevenue}
              {...labelColorProps} />
          </LabelContainer>
        </MiddleSection>

        <TorrentTable torrents={this.props.store.torrentsCompleted} store={this.props.store} />

      </div>
    )
  }
}

Completed.propTypes = {
  store: PropTypes.object.isRequired,
  middleSectionBaseColor: PropTypes.string.isRequired,
  middleSectionDarkBaseColor: PropTypes.string.isRequired,
  middleSectionHighlightColor: PropTypes.string.isRequired
}

export default Completed
