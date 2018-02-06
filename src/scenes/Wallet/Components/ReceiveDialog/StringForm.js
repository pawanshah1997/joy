/**
 * Created by bedeho on 19/12/2017.
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'

import Button from './Button'

import {
  ButtonSection,
  PrimaryButton
} from '../../../../components/Dialog'

function getStyle(props) {

  return {
    root : {
      display : 'flex',
      flexDirection : 'column'
    },
    addressContainer : {
      display: 'flex',
      alignItems : 'center',
      justifyContent : 'center',
      height : '300px'
    },
    addressField : {
      backgroundColor : 'rgba(128, 128, 128, 0.14)',
      color : 'rgba(128, 128, 128, 0.99)',
      fontFamily : 'Helvetica neue',
      padding: '10px 20px',
      fontSize: '25px',
      borderRadius: '4px',
      fontWeight: '100'
    },
    buttonContainer : {
      display: 'flex',
      alignItems : 'center',
      justifyContent : 'center',
      padding: '40px',
      paddingTop: '0px'
    }
  }
}

const StringForm = (props) => {

  let styles = getStyle(props)

  return (
    <div style={styles.root}>

      <div style={styles.addressContainer}>

        <span style={styles.addressField}>
          {props.address}
        </span>

      </div>

      { /**
      <div style={styles.buttonContainer}>
        <Button title="Show as QR code"
                onClick={props.onFlipClick}
        />
      </div>

       **/ }


      <ButtonSection>

        <PrimaryButton label="Show QR code"
                       onClick={props.onFlipClick}
                       disabled={false}

        />

      </ButtonSection>

    </div>
  )
}

StringForm.propTypes = {
  address : PropTypes.string.isRequired,
  onFlipClick : PropTypes.func.isRequired,
  onClose : PropTypes.func.isRequired
}

export default StringForm