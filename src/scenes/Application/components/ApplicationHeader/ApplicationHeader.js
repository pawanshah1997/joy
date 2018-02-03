import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { Header } from '../../../../components/Header'
import ButtonGroup from './ButtonGroup'
import WalletPanel from './WalletPanel'
import {
  UploadButton,
  DowloadButton,
  FinishedButton,
  WalletButton,
  CommunityButton,
  LivestreamButton,
  NewButton,
  PublicButton
} from './Buttons'

import Scene from '../../../../core/Scene'
import { OnboardingStore } from '../../../../core'
// import {ExplainerTip} from '../../../OnBoarding'
import ExplainerTip, { Section, SectionSpacer } from '../../../OnBoarding/ExplainerTip'

/**
 * ApplicationHeader
 */

function getStyle (props) {
  return {
    root: {
      backgroundColor: props.baseColor,
      // borderBottom: '4px solid ' + props.accentColor,
      flex: '0 0 ' + props.height, // prevent resizing
      height: props.height
    },
    seperator: {
      width: '2px',
      backgroundColor: props.separatorColor,
      marginTop: '15px',
      marginBottom: '15px'
    },
    spacer: {
      flexGrow: 1
    }
  }
}

const ApplicationHeader = observer((props) => {
  var style = getStyle(props)

  var buttonColorProps = {
    rootColors: {
      normal: props.baseColor,
      hover: props.attentionColor,
      selected: props.accentColor
    },
    contentColors: {
      normal: props.faceColor,
      hover: props.activeFaceColor,
      selected: props.activeFaceColor,
      disabled: props.faceColor
    },
    notificationColor: props.notificationColor
  }

  return (
    <Header style={style.root}>
      <ButtonGroup separatorColor={props.separatorColor}>

        <DowloadButton
          selected={props.uiStore.scene === Scene.Downloading}
          onClick={() => { props.uiStore.setScene(Scene.Downloading) }}
          style={style.button}
          {...buttonColorProps} />

        <UploadButton
          selected={props.uiStore.scene === Scene.Uploading}
          onClick={() => { props.uiStore.setScene(Scene.Uploading) }}
          style={style.button}
          {...buttonColorProps} />

        <FinishedButton
          selected={props.uiStore.scene === Scene.Completed}
          notificationCount={props.uiStore.numberCompletedInBackground}
          onClick={() => { props.uiStore.setScene(Scene.Completed) }}
          style={style.button}
          {...buttonColorProps} />

        <CommunityButton
          selected={props.uiStore.scene === Scene.Community}
          onClick={() => { props.uiStore.setScene(Scene.Community) }}
          style={style.button}
          {...buttonColorProps} />

        <WalletButton
          onClick={() => { console.log('click: hello 2') }}
          style={style.button}
          disabled
          {...buttonColorProps} />

        <LivestreamButton
          onClick={() => { console.log('click: hello 3') }}
          style={style.button}
          disabled
          {...buttonColorProps} />

        <NewButton
          onClick={() => { console.log('click: hello 4') }}
          style={style.button}
          disabled
          {...buttonColorProps} />

        <PublicButton
          onClick={() => { console.log('click: hello 5') }}
          style={style.button}
          disabled
          {...buttonColorProps} />

        { props.uiStore.onBoardingStore &&
          props.uiStore.onBoardingStore.state === OnboardingStore.State.DisabledFeaturesExplanation
          ? <ExplainerTip
            title='To be enabled'
            explainerTop={60}
            explainerLeft={-430}
            circleTop={30}
            circleLeft={-240}
            zIndex={2}
            buttonTitle='Ok'
            buttonClick={() => { props.uiStore.onBoardingStore.disabledFeaturesExplanationAccepted() }} >
              The wallet, live, new and publish tabs are disabled for now, they will be enabled as we roll out these features. Stay tuned for updates !
            </ExplainerTip>
          : null }

      </ButtonGroup>

      <div style={style.spacer} />

      <div style={style.seperator} />

      <WalletPanel
        applicationStore={props.app}
        backgroundColor={props.baseColor}
        balanceColor={props.balanceColor}
        subtitleColor={props.faceColor}>
        { props.uiStore.onBoardingStore &&
          props.uiStore.onBoardingStore.state === OnboardingStore.State.BalanceExplanation
          ? <ExplainerTip
            title='Your wallet'
            explainerTop={30}
            explainerLeft={-450}
            circleTop={-10}
            circleLeft={-85}
            zIndex={2}
            buttonTitle='Ok'
            buttonClick={() => { props.uiStore.onBoardingStore.balanceExplanationAccepted() }} >
            <div style={{ width: '400px' }}>
              <Section title='Testnet coins'
                text={
                  <div>We are sending you free <span style={{ fontWeight: 'bold' }}>testnet</span> coins promptly, and your unconfirmed balance is visible here. Once you see a balance in your wallet you will be able to do paid speedups on torrents.</div>
                } />
              <SectionSpacer height={'20px'} />
            </div>
          </ExplainerTip>
          : null }
      </WalletPanel>
    </Header>
  )
})

ApplicationHeader.propTypes = {
  height: PropTypes.string.isRequired,
  app: PropTypes.object.isRequired,
  uiStore: PropTypes.object.isRequired,
  baseColor: PropTypes.string,
  attentionColor: PropTypes.string,
  accentColor: PropTypes.string.isRequired,
  notificationColor: PropTypes.string,
  balanceColor: PropTypes.string,
  separatorColor: PropTypes.string
}

ApplicationHeader.defaultProps = {
  // colors
  baseColor: '#1c262b',
  attentionColor: '#1c262b', // '#7d8b91',
  notificationColor: '#c9302c', // '#c52578',
  balanceColor: 'white',
  faceColor: '#7d8b91',
  activeFaceColor: 'white',
  separatorColor: '#242f35'
}

export default ApplicationHeader
