import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { inject, observer } from 'mobx-react'

// Wallet
import WalletSceneStore from '../Stores'
import {
  SendDialogStore,
  ReceiveDialogStore,
} from '../Stores'

// Components

import SendingDialog from './SendDialog'
import ReceiveDialog from './ReceiveDialog'
//import ViewingHDSeedDialog from './ViewingHDSeedDialog'

import {
  Label,
  LabelContainer,
  MiddleSection,
  SimpleLabel,
  Toolbar,
  ToolbarButton,
  MaxFlexSpacer,
  TorrentCountLabel,
  CurrencyLabel,
  WalletStatusLabel
} from  './../../../components/MiddleSection'

import PaymentsTable from './PaymentsTable'

function getStyles(props) {

  return {
    root : {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1
    },
    middleSectionInnerContainer : {
      width: '950px',
      display: 'flex',
      alignItems: 'center'
    },
    paymentsTableContainer : {
      display : 'flex',
      flexGrow: 1,
      justifyContent : 'center',
      backgroundColor : props.middleSectionBaseColor
    },
    bottomNoticationBanner : {

    }
  }

}

const NoticationBanner = (props) => {

  let styles = {
    root : {
      padding : '15px',
      backgroundColor : '#dc3545'
    },
    container : {
      fontFamily : 'Helvetica',
      textAlign: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      color : 'hsla(354, 70%, 89%, 1)'
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.container}>
        {props.children}
      </div>
    </div>
  )

}


import SvgIcon from 'material-ui/SvgIcon'

const SendIcon = (props) => {

  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path d="M1.423,11.048L4,13l9-4l-6.977,5.499v6.749c0,0.933,1.164,1.358,1.765,0.644l3.131-3.72l6.5,4.876 c0.589,0.441,1.436,0.118,1.581-0.604l4.004-20c0.156-0.779-0.615-1.42-1.352-1.125l-20,8C0.928,9.609,0.799,10.58,1.423,11.048z"></path>
    </SvgIcon>
  )
}

const ReceiveIcon = (props) => {

  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M11,11H0V0h11V11z M2,9h7V2H2V9z"></path>
      <path d="M24,11H13V0h11V11z M15,9h7V2h-7V9z"></path>
      <path d="M11,24H0V13h11V24z M2,22h7v-7H2V22z"></path>
      <polygon points="24,20 22,20 22,15 20,15 20,18 14,18 14,13 16,13 16,16 18,16 18,13 24,13 "></polygon>
      <polygon points="24,24 14,24 14,20 16,20 16,22 24,22 "></polygon>
      <rect data-color="color-2" x="4" y="4" width="3" height="3"></rect>
      <rect data-color="color-2" x="17" y="4" width="3" height="3"></rect>
      <rect data-color="color-2" x="4" y="17" width="3" height="3"></rect>
    </SvgIcon>
  )

}

const SeedIcon = (props) => {

  return (
    <SvgIcon {...props} viewBox={"0 0 24 24"}>
      <path d="M23,22h-5.10059C17.43457,19.7207,15.41504,18,13,18v-2c2.76141,0,5-2.23859,5-5V9h-1 c-1.64331,0-3.08856,0.80353-4,2.02747V1h-2v5.02747C10.08856,4.80353,8.64331,4,7,4H6v2c0,2.76141,2.23859,5,5,5v7.42432 c-0.83911,0.36652-1.57001,0.95294-2.09961,1.71729C8.61035,20.04834,8.30664,20,8,20c-1.30371,0-2.41602,0.83594-2.8291,2H1 c-0.55273,0-1,0.44775-1,1s0.44727,1,1,1h22c0.55273,0,1-0.44775,1-1S23.55273,22,23,22z"></path>
    </SvgIcon>
  )
}

const WalletScene = observer((props) => {

  let styles = getStyles(props)

  let labelColorProps = {
      backgroundColorLeft : props.middleSectionDarkBaseColor,
      backgroundColorRight : props.middleSectionHighlightColor
  }

  return (
    <div style={styles.root}>

      <MiddleSection backgroundColor={props.middleSectionBaseColor} height='120px'>

        <div style={styles.middleSectionInnerContainer}>

          <Toolbar>

            <ToolbarButton title="send"
                           onClick={() => { props.walletSceneStore.sendClicked() }}
                           iconNode={<SendIcon color={"#ffffff"} style={{ height : '16px', width: '16px'}}/>}
            />

            <div style={{
              width: '10px',
              //backgroundColor: '#49a749',
              height: '55px'
            }}>
            </div>

            <ToolbarButton title="receive"
                           onClick={() => { props.walletSceneStore.receiveClicked()}}
                           iconNode={<ReceiveIcon color={"#ffffff"} style={{ height : '16px', width: '16px'}}/>}
            />

            <div style={{
              width: '10px',
              //backgroundColor: '#49a749',
              height: '55px'
            }}>
            </div>

            { /**

             <ToolbarButton title="view seed"
             onClick={() => { console.log('view seed')}}
             iconNode={<SeedIcon color={"#ffffff"} style={{ height : '16px', width: '16px'}}/>}
             />
             **/
            }


          </Toolbar>

          <MaxFlexSpacer />

          <LabelContainer>

              <WalletStatusLabel synchronizationPercentage={props.walletSceneStore.synchronizationPercentage}
                                 {...labelColorProps}
              />

              <CurrencyLabel labelText={"PENDING"}
                             satoshies={props.walletSceneStore.pendingBalance}
                             {...labelColorProps}
              />

          </LabelContainer>

        </div>

      </MiddleSection>

      <div style={styles.paymentsTableContainer}>
        <PaymentsTable walletSceneStore={props.walletSceneStore}/>
      </div>

      <NoticationBanner>
        This wallet does not use real Bitcoins, rather testnet coins, real coins are coming in the next release.
      </NoticationBanner>

      <SendingDialog sendDialogStore={props.walletSceneStore.visibleDialog instanceof SendDialogStore ? props.walletSceneStore.visibleDialog : null}/>
      <ReceiveDialog receiveDialogStore={props.walletSceneStore.visibleDialog instanceof ReceiveDialogStore ? props.walletSceneStore.visibleDialog : null}/>

    </div>    
  )
})

WalletScene.propTypes = {
  walletSceneStore : PropTypes.object.isRequired // HMR breaks PropTypes.instanceOf(WalletSceneStore).isRequired
}

export default WalletScene
