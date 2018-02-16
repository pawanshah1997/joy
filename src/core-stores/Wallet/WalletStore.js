/**
 * Created by bedeho on 06/11/2017.
 */

import {observable, action, computed} from 'mobx'

import PaymentStore from './PaymentStore'

import bcoin from 'bcoin'

class WalletStore {

  /**
   * {STATUS} Status of the wallet store
   */
  @observable state

  /**
   * {Amount}
   */
  @observable totalBalance

  /**
   * {Amount}
   */
  @observable confirmedBalance

  /**
   * {Address} Current receive address for wallet
   */
  @observable receiveAddress

  /**
   * {Number}
   */
  @observable blockTipHeight

  /**
   * {Number}
   */
  @observable synchronizedBlockHeight

  /**
   * {Array.<PaymentStore>} Payment stores for all payments
   */
  @observable paymentStores

  constructor(state, totalBalance, confirmedBalance, receiveAddress, blockTipHeight, synchronizedBlockHeight, paymentStores, pay) {
    
    this.setState(state)
    this.setTotalBalance(totalBalance)
    this.setConfirmedBalance(confirmedBalance)
    this.setReceiveAddress(receiveAddress)
    this.setBlockTipHeight(blockTipHeight)
    this.setSynchronizedBlockHeight(synchronizedBlockHeight)
    this.paymentStores = paymentStores
    
    this._pay = pay
    
  }

  @action.bound
  _addPaymentStore(paymentStore) {
    this.paymentStores.push(paymentStore)
  }

  @action.bound
  setState(state) {
    this.state = state
  }

  @action.bound
  setTotalBalance(totalBalance) {
    this.totalBalance = totalBalance
  }

  @action.bound
  setConfirmedBalance(confirmedBalance) {
    this.confirmedBalance = confirmedBalance
  }

  @action.bound
  setReceiveAddress(receiveAddress) {
    this.receiveAddress = receiveAddress
  }

  @action.bound
  setBlockTipHeight(blockTipHeight) {
    this.blockTipHeight = blockTipHeight
  }

  @action.bound
  setSynchronizedBlockHeight(synchronizedBlockHeight) {
    this.synchronizedBlockHeight = synchronizedBlockHeight
  }

  /**
   * Make a payment
   * @param {Hash} pubKeyHash - for destination
   * @param {Number} amount - number of satoshis
   * @param {Number} satsPrkBFee - number of satoshis per kB.
   * @param {String} note - note to be attached to the payment
   * @returns {Promise} - Returns {@link PaymentStore}
   */
  @action.bound
  async pay(pubKeyHash, amount, satsPrkBFee, note) {
    
    if(!bcoin.util.isNumber(satsPrkBFee))
      throw new Error('satsPrkBFee is not a valid number')

    // Pay
    let payment = await this._pay(pubKeyHash, amount, satsPrkBFee, note)

    // create PaymentStore
    let paymentStore = new PaymentStore(payment)

    // add
    this._addPaymentStore(paymentStore)

    return paymentStore
  }

}

export default WalletStore
