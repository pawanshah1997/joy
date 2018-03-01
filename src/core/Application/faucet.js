var request = require('request')

export const TESTNET_FAUCET_URL = "http://45.79.102.125:7099/withdraw/"

/**
  * Makes a request to testnet faucet to get some free coins
  * @address - address to send coins to (string: base58 encoded)
  */
function getCoins (address, callback = () => {}) {
  var query = {
    address: address
  }

  request({url: TESTNET_FAUCET_URL, qs: query}, (err, response, body) => {
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
