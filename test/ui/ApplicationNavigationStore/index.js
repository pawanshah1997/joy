import ApplicationNavigationStore from '../../../src/scenes/Application/Stores/ApplicationNavigationStore'

var assert = require('chai').assert

const createInitialValues = () => {
  return [
    ApplicationNavigationStore.TAB.Downloading,
    1,
    'USD',
    { totalBalance: 100000 },
    { cryptoToUsdExchangeRate: 10000 },
    100000000
  ]
}

describe('ApplicationNavigationStore', function () {
  let navigationStore, initialValues

  beforeEach(function () {
    initialValues = createInitialValues()
    navigationStore = new ApplicationNavigationStore(...initialValues)
  })

  it('constructor', function () {
    assert.equal(navigationStore.activeTab, initialValues[0])
    assert.equal(navigationStore.numberCompletedInBackground, initialValues[1])
    assert.equal(navigationStore.fiatUnit, initialValues[2])
  })
})
