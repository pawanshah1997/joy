/**
 * Created by bedeho on 04/10/17.
 */

import React from 'react'
import { observer } from 'mobx-react'
import PropTypes from 'prop-types'

import FullScreenContainer from '../../../components/FullScreenContainer'
import {OnboardingStore} from '../../../core'
import WelcomeScreenContent from './WelcomeScreenContent'

const WelcomeScreen = observer((props) => {
    console.log(props.onBoardingStore.state)

    return (
        props.onBoardingStore.state === OnboardingStore.State.WelcomeScreen
            ?
        <FullScreenContainer>
            <WelcomeScreenContent onboardingStore={props.onBoardingStore} />
        </FullScreenContainer>
            :
        null
    )

})

WelcomeScreen.propTypes = {
    onBoardingStore : PropTypes.object.isRequired
}

export default WelcomeScreen
