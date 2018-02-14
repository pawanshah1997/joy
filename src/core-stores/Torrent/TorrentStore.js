import { observable, action, computed } from 'mobx'

class TorrentStore {

    @observable infoHash
    @observable name
    @observable state
    
    @observable totalSize

    /**
     * {String} Path where torrent data is saved and or read from
     */
    @observable savePath
  
    /**
     */
    @observable sellerTerms
  
  /**
   * {Number} Total number of pieces sold by us as a seller this
   * session
   */
  @observable numberOfPiecesSoldAsSeller
  
  /**
   * {Number} Total revenue so far from spending, does not include
   * tx fees for closing channel (they are deducted).
   */
  @observable totalRevenueFromPiecesAsSeller
  
    /**
     * {BuyerTerms} Terms when buying
     */
    @observable buyerTerms
  
    /**
     * {Number} The total amount (sats) sent as payments so far,
     * does not include tx fees used to open and close channel.
     */
    @observable totalSpendingOnPiecesAsBuyer
    
    /**
     * {Number} Current progress of torrent processing. While downloading,
     * this refers to completion rate, while checking resume
     * data it refers to the progress check.
     */
    @observable progress

    /**
     * libtorrent::torrent_status::total_done
     *
     * The total number of bytes of the file(s) that we have.
     * All this does not necessarily has to be downloaded during
     * this session (that's total_payload_download).
     */
    @observable downloadedSize
    @observable downloadSpeed
    @observable uploadSpeed
  
    /**
     * {Number} Number of peers classified as seeders (by libtorrent)
     */
    @observable numberOfSeeders

    // store the files (see libtorrent::file_storage)
    @observable torrentFiles

    /**
     * libtorrent::torrent_status::total_download/total_upload
     *
     * The number of bytes downloaded and uploaded to all peers, accumulated, this session only.
     * The session is considered to restart when a torrent is paused and restarted again.
     * When a torrent is paused, these counters are reset to 0. If you want complete, persistent,
     * stats, see all_time_upload and all_time_download.
     *
     */
    @observable uploadedTotal

    @observable viabilityOfPaidDownloadInSwarm

    /**
     * {Map.<String,PeerStore>} Maps peer id to peer store for corresponding peer
     */
    @observable peerStores
  
    constructor (infoHash,
                 name,
                 savePath,
                 state,
                 totalSize,
                 progress,
                 downloadedSize,
                 downloadSpeed,
                 uploadSpeed,
                 uploadedTotal,
                 numberOfSeeders,
                 sellerTerms,
                 numberOfPiecesSoldAsSeller,
                 totalRevenueFromPiecesAsSeller,
                 buyerTerms,
                 totalSpendingOnPiecesAsBuyer,
                 starter,
                 stopper,
                 paidDownloadStarter,
                 uploadBeginner,
                 uploadStopper,
    ) {

      /**
        this.infoHash = infoHash
        this.savePath = savePath
        this.state = state
        this.progress = progress ? progress : 0
        this.totalSize = totalSize ? totalSize : 0
        this.downloadedSize = downloadedSize ? downloadedSize : 0
        this.downloadSpeed = downloadSpeed ? downloadSpeed : 0
        this.uploadSpeed = uploadSpeed ? uploadSpeed : 0
        this.uploadedTotal = uploadedTotal ? uploadedTotal : 0
        this.name = name ? name : ''
        this.numberOfBuyers = numberOfBuyers ? numberOfBuyers : 0
        this.numberOfSellers = numberOfSellers ? numberOfSellers : 0
        this.numberOfObservers = numberOfObservers ? numberOfObservers : 0
        this.numberOfNormalPeers = numberOfNormalPeers ? numberOfNormalPeers : 0
        this.numberOfSeeders = numberOfSeeders ? numberOfSeeders : 0
        this.viabilityOfPaidDownloadInSwarm = viabilityOfPaidDownloadInSwarm ? viabilityOfPaidDownloadInSwarm : new ViabilityOfPaidDownloadInSwarm.NoJoyStreamPeerConnections()
        this.sellerPrice = sellerPrice ? sellerPrice : 0
        this.sellerRevenue = sellerRevenue ? sellerRevenue : new Map()
        this.buyerPrice = buyerPrice ? buyerPrice : 0
        this.buyerSpent = buyerSpent ? buyerSpent : new Map()
     */

        this.peerStores = new Map()

        this._starter = starter
        this._stopper = stopper
        this._folderOpener = folderOpener
        this._paidDownloadStarter = paidDownloadStarter
        this._uploadBeginner = uploadBeginner
        this._uploadStopper = uploadStopper
      this.setName(name)
      this.setProgress(progress)
      this.setNumberOfSeeders(numberOfSeeders)
      this.setSellerTerms(sellerTerms)
      this.setNumberOfPiecesSoldAsSeller(numberOfPiecesSoldAsSeller)
      this.setTotalRevenueFromPiecesAsSeller(totalRevenueFromPiecesAsSeller)
      this.setBuyerTerms(buyerTerms)
      this.setTotalSpendingOnPiecesAsBuyer(totalSpendingOnPiecesAsBuyer)
    }

    @action.bound
    setInfoHash(infoHash) {
      this.infoHash = infoHash
    }

    @action.bound
    setSavePath(savePath) {
        this.savePath = savePath
    }

    @action.bound
    setState(state) {
      this.state = state
    }

    @action.bound
    setName (name) {
        this.name = name
    }

    @action.bound
    setTotalSize (totalSize) {
        this.totalSize = totalSize
    }

    @action.bound
    setDownloadedSize(downloadedSize) {
        this.downloadedSize = downloadedSize
    }

    @action.bound
    setDownloadSpeed(downloadSpeed) {
        this.downloadSpeed = downloadSpeed
    }

    @action.bound
    setUploadSpeed(uploadSpeed) {
        this.uploadSpeed = uploadSpeed
    }

    @action.bound
    setUploadedTotal(uploadedTotal) {
        this.uploadedTotal = uploadedTotal
    }

    @action.bound
    setNumberOfSeeders(numberOfSeeders) {
      this.numberOfSeeders = numberOfSeeders
    }

    @action.bound
    setProgress (progress) {
        this.progress = progress
    }

    @action.bound
    setViabilityOfPaidDownloadInSwarm (viabilityOfPaidDownloadInSwarm) {
        this.viabilityOfPaidDownloadInSwarm = viabilityOfPaidDownloadInSwarm
    }

    @action.bound
    setTorrentFiles (torrentFiles) {
      this.torrentFiles = torrentFiles
    }

    @action.bound
    setSellerTerms (sellerTerms) {
      this.sellerTerms = sellerTerms
    }

    @action.bound
    setNumberOfPiecesSoldAsSeller (numberOfPiecesSoldAsSeller) {
        this.numberOfPiecesSoldAsSeller = numberOfPiecesSoldAsSeller
    }
    
    @action.bound
    setTotalRevenueFromPiecesAsSeller(totalRevenueFromPiecesAsSeller) {
      this.totalRevenueFromPiecesAsSeller = totalRevenueFromPiecesAsSeller
    }

    @action.bound
    setBuyerTerms (buyerTerms) {
      this.buyerTerms = buyerTerms
    }

    @action.bound
    setTotalSpendingOnPiecesAsBuyer (totalSpendingOnPiecesAsBuyer) {
      this.totalSpendingOnPiecesAsBuyer = totalSpendingOnPiecesAsBuyer
    }

    @computed get isLoading() {
        return this.state.startsWith("Loading")
    }
  
    @computed get isDownloading () {
        return this.state.startsWith("Active.DownloadIncomplete")
    }
  
    @computed get isFullyDownloaded () {
    return this.state.startsWith("Active.FinishedDownloading")
    }
  
    @computed get isUploading () {
    return this.state.startsWith("Active.FinishedDownloading.Uploading")
    }

    @computed get
    isTerminating() {
        return this.state.startsWith('Terminating')
    }

    @computed get canChangeBuyerTerms () {
        if (this.state.startsWith("Active.DownloadIncomplete.Unpaid.Started")) return true
        if (this.state.startsWith('Loading.WaitingForMissingBuyerTerms')) return true
        return false
    }

    @computed get canChangeSellerTerms () {
        return this.state.startsWith("Active.FinishedDownloading.Uploading.Started")
    }

    @computed get canBeginUploading() {
        return this.state.startsWith("Active.FinishedDownloading.Passive")
    }

    @computed get canEndUploading() {
        return this.state.startsWith("Active.FinishedDownloading.Uploading.Started")
    }

    @computed get hasStartedPaidDownloading() {
        return this.state.startsWith("Active.DownloadIncomplete.Paid.Started")
    }

    @computed get canStop() {
        return this.state.startsWith("Active.DownloadIncomplete.Unpaid.Started.ReadyForStartPaidDownloadAttempt") ||
            this.state.startsWith("Active.FinishedDownloading.Uploading.Started")

    }

    @computed get canStart() {
        return this.state.startsWith("Active.DownloadIncomplete.Unpaid.Stopped") ||
            this.state.startsWith("Active.FinishedDownloading.Uploading.Stopped")
    }
    
    @computed get numberOfBuyers() {

      let n = 0

      this.peerStores.forEach((store, pid) => {

        if(store.peerIsBuyer)
          n++

      })

      return n
    }

    @computed get numberOfSellers() {

      let n = 0

      this.peerStores.forEach((store, pid) => {

        if(store.peerIsSeller)
          n++
      })

      return n
    }

    @computed get numberOfObservers() {

      let n = 0

      this.peerStores.forEach((store, pid) => {

        if(store.peerIsObserver)
          n++
      })

      return n
    }

    @computed get numberOfNormalPeers() {

      let n = 0

      this.peerStores.forEach((store, pid) => {

        if(store.peerSupportsProtocol)
          n++
      })

      return n
    }

    start() {
        this._starter()
    }

    stop() {
        this._stopper()
    }

    startPaidDownload() {
        this._paidDownloadStarter
    }

    beginUploading() {
        this._uploadBeginner()
    }

    endUploading() {
        this._uploadStopper()
    }
    
}

export default TorrentStore
