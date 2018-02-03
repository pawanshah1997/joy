/**
 * Created by bedeho on 29/09/17.
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'

import AlertDialog from './AlertDialog'

const okLabelText = "NO"
const tryAgainLabelText = "TRY AGAIN"

const InvalidTorrentFileAlertDialog = (props) => {

    let buttonClicked = (title) => {

        if(title === okLabelText) {
            props.onAcceptClicked()
        } else if(title === tryAgainLabelText) {
            props.onRetryClicked()
        }

    }

    return (
        <AlertDialog
            title="Torrent file is invalid"
            body={"Would you like to try picking another file?"}
            open={props.open}
            buttonTitles={[okLabelText, tryAgainLabelText]}
            buttonClicked={buttonClicked}
        />
    )
}

InvalidTorrentFileAlertDialog.propTypes = {
    open : PropTypes.bool.isRequired,
    onAcceptClicked : PropTypes.func.isRequired,
    onRetryClicked : PropTypes.func.isRequired,
}

export default InvalidTorrentFileAlertDialog
