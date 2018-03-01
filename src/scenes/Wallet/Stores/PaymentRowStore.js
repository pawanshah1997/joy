/**
 * Created by bedeho on 06/12/2017.
 */

import {observable, action, runInAction, computed} from 'mobx'

class PaymentRowStore {

  /**
   * @property {PaymentStore} Store for this
   */
  paymentStore

  constructor(paymentStore, walletSceneStore) {
    this.paymentStore = paymentStore
    this._walletSceneStore = walletSceneStore
  }

  @computed get
  date() {

    // If the transaction is confirmed, we used the
    // mined time, otherwise we use the observation time.

    let date

    if(this.paymentStore.confirmed)
      date = this.paymentStore.minedDate
    else
      date = this.paymentStore.seenDate

    return date
  }

  click() {
    this._walletSceneStore.viewPayment(this.paymentStore.txId, this.paymentStore.outputIndex)
  }

}

export default PaymentRowStore