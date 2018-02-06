/**
 * Created by bedeho on 01/11/2017.
 */

import {observable, action, runInAction, computed, autorun} from 'mobx'

class ReceiveDialogStore {

  /**
   * {Bool} Whether address should be displayed as QR code,
   * or alternatively, as a string
   */
  @observable showAddressAsQRCode

  /**
   * Constructor
   * @param {WalletSceneStore} walletSceneStore -
   */
  constructor(walletSceneStore, showAddressAsQRCode) {
    this._walletSceneStore = walletSceneStore

    this.setShowAddressAsQRCode(showAddressAsQRCode)
  }

  @action.bound
  setShowAddressAsQRCode(showAddressAsQRCode) {
    this.showAddressAsQRCode = showAddressAsQRCode
  }

  @action.bound
  flipAddressDisplayMode = () => {
    this.setShowAddressAsQRCode(!this.showAddressAsQRCode)
  }

  @action.bound
  copyToClipBoard() {
    console.log('copy this to clipboard')
  }

  /**
   * {String} Receive address encoded as Base58Check encoded string
   */
  @computed get
  receiveAddress() {
    return this._walletSceneStore.walletStore.receiveAddress.toString()
  }

  @action.bound
  close = () => {
    this._walletSceneStore.closeCurrentDialog()
  }

}

export default ReceiveDialogStore