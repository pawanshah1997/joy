/**
 * Created by bedeho on 06/05/17.
 */

import React from 'react'
import PropTypes from 'prop-types'

function getStyles(props) {

    return {
        root : {
            display: 'flex',
            flexDirection: 'row',

            backgroundColor: props.backgroundColor,
            color: 'hsla(0, 0%, 40%, 1)',

            fontSize: '16px',

            // Prevent growing or shrinking, and start out at 60px tall
            flex: '0 0 60px',

            paddingLeft: '20px',
            paddingRight: '20px'
        }
    }
}

const Row = (props) => {

    let styles = getStyles(props)

    return (
        <div style={styles.root}
             {...props}
        >
            {props.children}
        </div>
    )
}

Row.propTypes = {
  backgroundColor : PropTypes.string,
  rowProps : PropTypes.object
}

Row.defaultPropTypes = {
  backgroundColor : 'white'
}

export default Row
