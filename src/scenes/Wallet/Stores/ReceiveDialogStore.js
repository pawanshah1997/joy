/**
 * Created by bedeho on 01/11/2017.
 */

import {observable, action, runInAction, computed, autorun} from 'mobx'
const {clipboard} = require('electron')

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
  constructor(walletSceneStore, walletStore, showAddressAsQRCode) {
    this._walletSceneStore = walletSceneStore
    this._walletStore = walletStore

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
    clipboard.writeText(this.receiveAddress)
  }

  /**
   * {String} Receive address encoded as Base58Check encoded string
   */
  @computed get
  receiveAddress() {
    return this._walletStore.receiveAddress.toString()
  }

  @action.bound
  close = () => {
    this._walletSceneStore.closeCurrentDialog()
  }

}

export default ReceiveDialogStore
