/**
 * Created by bedeho on 17/08/17.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { inject, observer } from 'mobx-react'

import ButtonSection from './ButtonSection'

const RemoveSection = observer((props) => {

    // Derive ButtonSection props
    let className = "remove"
    let tooltip = "Remove"

    return (
        <ButtonSection className={className} tooltip={tooltip} onClick={props.onClick} />
    )
})

RemoveSection.propTypes = {
    onClick : PropTypes.func.isRequired
}

export default RemoveSection
