/**
 * Created by bedeho on 02/11/2017.
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'

import Header from './Header'
import PaymentsTableBody from './PaymentsTableBody'

function getStyles(props) {

   let styles = {
    root : {
      display : 'flex',
      flexDirection : 'column',
      width : '930px' //'100%'
    },
    spacer :{
      display : 'none',
      height : '10px',
      borderRadius : '10px 20px 30px 40px'
      //marginBottom : '30px'
    }
  }

  if(props.height)
    styles.root.height = props.height

  return styles
}

const PaymentsTable = observer((props) => {

  let styles = getStyles(props)

  return (
    <div style={styles.root}>
      <Header walletSceneStore={props.walletSceneStore}/>
      <PaymentsTableBody paymentRowStores={props.walletSceneStore.filteredPaymentRowStores}/>
      <div style={styles.spacer}></div>
    </div>
  )

})

PaymentsTable.propTypes = {
  walletSceneStore : PropTypes.object.isRequired, // WalletSceneStore
  height: PropTypes.string
}

export default PaymentsTable
