var request = require('request')

const FAUCET_URLS = {
  // Bitcoin testnet
  'testnet': 'http://45.79.102.125:7099/withdraw/',
  // Bitcoin Cash testnet
  'bitcoincashtestnet': 'http://45.79.102.125:7098/withdraw/'
}

/**
  * Makes a request to testnet faucet to get some free coins
  * @address - address to send coins to (bcoin.Address)
  */
function getCoins (address, callback = () => {}) {
  // Determine faucet service to use from network
  const url = FAUCET_URLS[address.network.type]

  if (!url) {
    return callback('unsupported network')
  }

  _getCoins(url, address.toString(), callback)
}

/**
  * Makes a request to testnet faucet to get some free coins
  * @faucetUrl - URL to joystream faucet web service (string)
  * @address - address to send coins to (string: base58 encoded)
  */
function _getCoins (faucetUrl, address, callback = () => {}) {
  var query = {
    address: address
  }

  request({url: faucetUrl, qs: query}, (err, response, body) => {
    if (err) {
      // network error
      callback(err.message)
    } else {
      // Success
      if (response.statusCode === 200) {
        return callback()
      }

      // Faucet rejected request - details in data.message
      try {
        var errorMessage = JSON.parse(body).data.message
      } catch (e) {
        // error parsing json response
        return callback('request failed. unable to parse error message in response')
      }

      callback(errorMessage)
    }
  })
}

export default getCoins
