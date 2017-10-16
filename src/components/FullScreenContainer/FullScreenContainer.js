/**
 * Created by bedeho on 06/10/2017.
 */

import React from 'react'
import PropTypes from 'prop-types'

function getStyles(props) {

    return {
        root : {
            position: 'absolute',
            left: '0px',
            top: '0px',
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: 'center',
            height: "100%", // quick hack
            width: "100%",
            zIndex: props.zIndex ? props.zIndex : 1
        }
    }
}

const FullScreenContainer = (props) => {

    let styles = getStyles(props)

    return (
        <div style={styles.root} >
            {props.children}
        </div>
    )
}

export default FullScreenContainer