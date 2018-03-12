/**
 * Created by bedeho on 06/11/2017.
 */

import {observable, action, computed} from 'mobx'

import PaymentStore from './PaymentStore'

import bcoin from 'bcoin'
import assert from 'assert'

class WalletStore {

  /**
   * {Wallet.STATE} Status of the wallet store
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

  /**
   * {Map.<PaymnetId>} Map of PaymnetStore promise resolvers
   */
  _pendingPaymnetStoreResolvers


  constructor(state, totalBalance, confirmedBalance, receiveAddress, blockTipHeight, synchronizedBlockHeight, paymentStores, pay) {

    this.setState(state)
    this.setTotalBalance(totalBalance)
    this.setConfirmedBalance(confirmedBalance)
    this.setReceiveAddress(receiveAddress)
    this.setBlockTipHeight(blockTipHeight)
    this.setSynchronizedBlockHeight(synchronizedBlockHeight)
    this.paymentStores = paymentStores

    this._pay = pay
    this._pendingPaymnetStoreResolvers = new Map()
  }

  @action.bound
  addPaymentStore (paymentStore) {
    this.paymentStores.push(paymentStore)

    // resolve pending promises
    const paymentId = paymentStore.txId + ':' + paymentStore.outputIndex
    const resolver = this._pendingPaymnetStoreResolvers.get(paymentId)

    if (resolver) {
      this._pendingPaymnetStoreResolvers.delete(paymentId)
      resolver(paymentStore)
    }
  }


  _waitForPaymentStore (payment) {
    const paymentId = payment.txId + ':' + payment.outputIndex

    return new Promise((resolve) => {
      this._pendingPaymnetStoreResolvers.set(paymentId, resolve)
    })
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

    // By the time we get here the a paymentStore may have been created and pushed to this.paymentStores,
    // return it if found.
    let paymentStore

    this.paymentStores.map(function (store) {
      if (store.txId === payment.txId && store.outputIndex === payment.outputIndex) {
        assert(!paymentStore)
        paymentStore = store
      }
    })

    if (paymentStore) return paymentStore

    // Returns a promise which will be resolved when the payment store is created
    return this._waitForPaymentStore(payment)
  }

}

export default WalletStore
