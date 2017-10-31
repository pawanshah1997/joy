/**
 * Created by bedeho on 19/09/17.
 */

import React from 'react'
import PropTypes from 'prop-types'
import SimpleLabel from  './SimpleLabel'

import {getCompactBitcoinUnits} from '../../common'

function getStyles(props) {

    return {
        value : {
            fontWeight : 'bold',
            marginRight : '3px'
        },
        unit : {
          fontSize: '12px'
        }
    }

}

// NB: CurrencyLabel & BandwidthLabel really should just be using a "unit label" which
// supports the idea of having value&unit combo, that would be more resuable, as is its not great


const CurrencyLabel = (props) => {

    let styles = getStyles(props)

    let representation = getCompactBitcoinUnits(props.satoshies)

    let value = (
        <div style={styles.root}>
            <span style={styles.value}>{representation.value}</span>
            <span style={styles.unit}>{representation.unit}</span>
        </div>
    )

    return (
        <SimpleLabel labelNode={props.labelText}
                     valueNode={value}
                     valueFieldWidth="100px"
                     {...props}
        />
    )

}

CurrencyLabel.propTypes = {
    labelText : PropTypes.string.isRequired,
    satoshies : PropTypes.number.isRequired,
    backgroundColorLeft : PropTypes.string.isRequired,
    backgroundColorRight : PropTypes.string.isRequired
}

export default CurrencyLabel