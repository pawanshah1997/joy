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

      backgroundColor: 'rgb(55, 83, 133)',
      borderBottom: '3px solid rgb(45, 68, 108)',
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
        backgroundColor: 'hsla(218, 41%, 33%, 1)'
      },

      ':active' :  {
        backgroundColor: 'rgb(45, 68, 108)',
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

  let styles = getStyles(props)

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
  //backgroundColor : PropTypes.string.isRequired,
  //textColor : PropTypes.string.isRequired
}

export default ToolbarButton