/**
 * Created by bedeho on 01/11/2017.
 */

import {observable, action, runInAction, computed} from 'mobx'

class ViewingHDSeedDialog {


    constructor(walletScene) {
        this._walletScene = walletScene
    }

    @action.bound
    close() {

    }

}

export default ViewingHDSeedDialog