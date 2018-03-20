/**
 * Created by bedeho on 13/09/17.
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Radium from 'radium'

function getStyles(state, props) {

  return {
    root : {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',

      // backgroundColor: state.mouseIsOver ? 'hsl(120, 39%, 55%)' : 'hsl(120, 39%, 65%)',

      backgroundColor: props.colors.normalColor,
      borderBottom: '3px solid ' + props.colors.borderBottomColor,
      borderRadius: '6px',

      paddingLeft: '24px',
      paddingRight: '24px',
      height: '55px',
      color: 'white',
      fontSize: '16px',
      fontWeight: 'bold',
      //width: '180px',
      //height: '65px',
      fontFamily: 'helvetica',
      //boxShadow: '1px 1px 2px hsla(219, 41%, 39%, 1)'

      ':hover' : {
        backgroundColor: props.colors.hoverColor
      },

      ':active' :  {
        backgroundColor: props.colors.activeColor,
        borderBottomWidth: '1px'
      }
    },
    iconContainer : {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight : '10px'
    }
  }
}

const ToolbarButton = Radium((props) => {

  let styles = getStyles(null, props)

  return (
    <span onClick={props.onClick}
          style={styles.root}>
      {
        props.iconNode
          ?
          <div style={styles.iconContainer}>
            {props.iconNode}
          </div>
          :
          null
      }
      {props.title}
    </span>
  )

})

ToolbarButton.propTypes = {
  iconNode: PropTypes.node,
  title : PropTypes.string.isRequired,
  onClick : PropTypes.func.isRequired,
  colors : PropTypes.object
  //backgroundColor : PropTypes.string.isRequired,
  //textColor : PropTypes.string.isRequired
}

ToolbarButton.defaultProps = {
  colors : {
    normalColor : 'rgb(55, 83, 133)',
    hoverColor : 'hsla(218, 41%, 33%, 1)',
    activeColor: 'rgb(45, 68, 108)',
    borderBottomColor : 'rgb(45, 68, 108)'
  }
}

export default ToolbarButton