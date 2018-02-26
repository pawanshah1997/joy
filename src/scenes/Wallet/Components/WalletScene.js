import React, { Component } from 'react'
import { inject, observer } from 'mobx-react'
import Wallet from '../../../core/Wallet'
import LoadingWalletSceneContent from './LoadingWalletSceneContent'
import LiveWalletSceneContent from './LiveWalletSceneContent'

const WalletScene = inject('UIStore')(observer((props) => {
  
  let walletStore = props.UIStore.applicationStore.walletStore
  
  if(!walletStore || walletStore.state !== Wallet.STATE.STARTED)
    return <LoadingWalletSceneContent walletStore={walletStore}/>
  else
    return <LiveWalletSceneContent/>
  

}))

export default WalletScene
