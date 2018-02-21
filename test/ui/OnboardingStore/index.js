import OnboardingStore from '../../../src/scenes/Onboarding/Stores/'

var assert = require('chai').assert

const createInitialValues = () => {
  return [
    { // UIStore
      applicationStore: {
        walletStore: {}
      }
    },
    OnboardingStore.STATE.WelcomeScreen
  ]
}

describe('OnboardingStore', function () {
  let onboardingStore, initialValues

  beforeEach(function () {
    initialValues = createInitialValues()
    onboardingStore = new OnboardingStore(...initialValues)
  })

  it('constructor initializes observables', function () {
    assert.equal(onboardingStore.state, initialValues[1])
  })

})
