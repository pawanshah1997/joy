/**
 * Created by bedeho on 10/09/17.
 */

import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {observer} from 'mobx-react'
import {getCompactBitcoinUnits} from './../../../../common'

var bcoin = require('bcoin')
var currencyFormatter = require('currency-formatter')

function getStyles(props) {

  return {
    root :  {
      display: 'flex',
      flexDirection :  'column',
      //alignItems: 'center',
      justifyContent: 'center',
    },
    cryptoBalance : {
      fontFamily: 'Helvetica neue',
      fontSize: '30px',
      color: 'white',
      fontWeight: '400',
      marginLeft : '3px'
    },
    cryptoUnit : {
      paddingTop: '9px',
      color : '#7d8b91',
      fontSize: '12px'
    },
    subtitle : {
      color: props.subtitleColor,
      fontSize: '11px',
      fontWeight: 'bold',
      //top: '-5px',
      position: 'relative'
    },
    fiatRow : {
      display : 'flex',
      fontSize: '12px',
      marginBottom: '-5px'
    },
    cryptoRow : {
      display : 'flex'
    },
    fiatUnit : {
      color : '#7d8b91',
    },
    fiatBalance : {
      color : '#7d8b91',
      marginLeft : '3px',
      fontWeight : 'bold'
    }
  }
}

@observer
class BalancePanel extends Component {

    // We need state here, in order to control visibility
    // - currency: fiat vs bitcoin
    // - value: confirmed vs unconfirmed

    constructor(props) {
        super(props)
    }

    render () {

        let style = getStyles(this.props)

        let prettyBalanceInFiat = currencyFormatter.format(this.props.applicationNavigationStore.balanceInFiat, { code: 'USD', symbol : '' });

        let balanceInBTC = this.props.applicationNavigationStore.balanceInBTC
      
        return (
          <div style={style.root}>
            <div style={style.fiatRow}>
              <span style={style.fiatUnit}>USD</span>
              <span style={style.fiatBalance}>{prettyBalanceInFiat}</span>
            </div>
            <div style={style.cryptoRow}>
              <span style={style.cryptoUnit}>BCH</span>
              <span style={style.cryptoBalance}>{balanceInBTC}</span>
            </div>
          </div>
        )
    }
}

BalancePanel.propTypes = {
    walletStore : PropTypes.object,
    priceFeedStore : PropTypes.object,

    balanceColor : PropTypes.string.isRequired,
    subtitleColor : PropTypes.string.isRequired
}

import LinearProgress from 'material-ui/LinearProgress'
import CircularProgress from 'material-ui/CircularProgress'

const SynchronizationProgressPanel = observer((props) => {

    let styles = {
        root :  {
            display: 'flex',
            flexDirection :  'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '170px'
        },
        circularProgress : {
          marginBottom : '10px'
        },
        progress : {
            //height : '5px',
            marginBottom : '6px',
            backgroundColor : props.subtitleColor,
            overflow: 'hidden'
        },
        subtitle : {
            color: props.subtitleColor,
            fontSize: '11px',
            fontWeight: 'bold',
            position: 'relative'
        }
    }

    let mode = 'determinate' //props.applicationStore.spvChainSyncProgress < 0.1 ? 'indeterminate' : 'determinate'

    return (
        <div style={styles.root}>

            <CircularProgress color={props.subtitleColor}
                              size={20}
                              style={styles.circularProgress}
            />

            <LinearProgress color={props.balanceColor}
                            value={100*props.applicationStore.spvChainSyncProgress}
                            style={styles.progress}
                            mode={mode}
            />

            <div style={styles.subtitle}> SYNCHRONIZING WALLET</div>
        </div>
    )
})

const WalletPanel = observer((props) => {

    let styles = {
        root : {
            display: 'flex',
            flex: '0 0 220px',
            //alignItems: 'center',
            //justifyContent: 'center',
            backgroundColor: props.backgroundColor
        }
    }

    /*
     * Commented out synching indicator
    {
     props.applicationStore.spvChainSynced ? null
     : <SynchronizationProgressPanel applicationStore={props.applicationStore}
                                     balanceColor={props.balanceColor}
                                     subtitleColor={props.subtitleColor} />
     } */

    return (
        <div style={styles.root}>
                <BalancePanel applicationNavigationStore={props.applicationNavigationStore}
                              balanceColor={props.balanceColor}
                              subtitleColor={props.subtitleColor}
                />
            {props.children}
        </div>
    )
})

WalletPanel.propTypes = {
  applicationNavigationStore : PropTypes.object,

  backgroundColor : PropTypes.string.isRequired,
  balanceColor : PropTypes.string.isRequired,
  subtitleColor : PropTypes.string.isRequired
}

export default WalletPanel
