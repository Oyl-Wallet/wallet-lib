import fetch from 'node-fetch'
import {
  SwapBrcBid,
  SignedBid,
  OkxBid,
  GetOffersParams,
  GetCollectionOffersParams,
} from '../shared/interface'
import {
  getAllInscriptionsByAddressRegtest,
  getRuneBalanceRegtest,
  getRuneOutpointsRegtest,
} from './regtestApi'
import { Account, SpendStrategy } from '../account'
import { GetSellerPsbtRequest, SubmitBuyerPsbtRequest } from '../swap/types'
import { AccountUtxoPortfolio } from '@utxo/utxo'

/**
 * Represents the client for interacting with the Oyl API.
 */
export class OylApiClient {
  private host: string
  private testnet: boolean
  private regtest: boolean
  private apiKey: string
  private authToken: string = ''
  private network: string

  /**
   * Create an instance of the OylApiClient.
   * @param options - Configuration object containing the API host.
   */
  constructor(options?: {
    host: string
    apiKey: string
    network: string
    testnet?: boolean
    regtest?: boolean
  }) {
    this.host = options?.host || ''
    this.network = options.network
    this.testnet = options.testnet == true
    this.regtest = options.regtest == true
    this.apiKey = options.apiKey
  }

  /**
   * Create an instance of the OylApiClient from a plain object.
   * @param data - The data object.
   * @returns An instance of OylApiClient.
   */
  static fromObject(data: {
    host: string
    testnet?: boolean
    apiKey: string
    network: string
  }): OylApiClient {
    return new this(data)
  }

  setAuthToken(token: string) {
    this.authToken = token
  }

  /**
   * Convert this OylApiClient instance to a plain object.
   * @returns The plain object representation.
   */
  toObject(): { host: string; testnet: boolean; apiKey: string } {
    return {
      host: this.host,
      testnet: this.testnet,
      apiKey: this.apiKey,
    }
  }

  private async _call(path: string, method: string, data?: any) {
    try {
      const options: RequestInit = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authToken ? `Bearer ${this.authToken}` : '',
          'X-OYL-API-KEY': this.apiKey,
        },
        cache: 'no-cache',
      }
      if (this.testnet) {
        data['testnet'] = this.testnet
      }

      if (['post', 'put', 'patch'].includes(method)) {
        options.body = JSON.stringify(data)
      }

      const response: Response = await fetch(`${this.host}${path}`, options)
      return await response.json()
    } catch (err) {
      throw err
    }
  }

  /**
   * Check beta access code.
   * @param code - Access code.
   * @param userId - User id.
   */
  async checkAccessCode({ code, userId }: { code: string; userId: string }) {
    return await this._call('/check-access-code', 'post', {
      code,
      userId,
    })
  }

  /**
   * Get whitelist leaderboard.
   * @param address - the address requesting the leaderboard.
   */
  async getWhitelistLeaderboard({ address }: { address: string }) {
    return await this._call('/get-whitelist-leaderboard', 'post', {
      address,
    })
  }
  /**
   * Get an address's xp for the whitelist.
   * @param taprootAddress - taprootAddress.
   * @param segwitAddress - .segwitAddress
   */
  async getWhitelistXp({
    taprootAddress,
    segwitAddress,
  }: {
    taprootAddress: string
    segwitAddress?: string
  }) {
    return await this._call('/get-whitelist-xp', 'post', {
      taprootAddress,
      segwitAddress,
    })
  }

  /**
   * Get brc20 info by ticker.
   * @param ticker - The ticker to query.
   */
  async getBrc20TokenInfo(ticker: string) {
    return await this._call('/get-brc20-token-info', 'post', {
      ticker: ticker,
    })
  }

  /**
   * Get Runes info by ticker.
   * @param ticker - The ticker to query.
   */
  async getRuneTokenInfo(ticker: string) {
    return await this._call('/get-rune-token-info', 'post', {
      ticker: ticker,
    })
  }

  async getSellerPsbt(params: GetSellerPsbtRequest) {
    return await this._call('/get-seller-psbt', 'post', params)
  }

  async submitBuyerPsbt(params: SubmitBuyerPsbtRequest) {
    return await this._call('/submit-buyer-psbt', 'post', params)
  }

  /**
   * Get Collection info by id.
   * @param collectionId - The collectionId to query.
   */
  async getCollectionInfo(collectionId: string) {
    return await this._call('/get-collection-info', 'post', {
      collectionId: collectionId,
    })
  }

  /**
   * Get brc20 details by ticker.
   * @param ticker - The ticker to query.
   */
  async getBrc20TokenDetails(ticker: string) {
    return await this._call('/get-brc20-token-details', 'post', {
      ticker: ticker,
    })
  }
  /**
   * Get Brc20 balances by address.
   * @param address - The address to query.
   */

  async getBrc20sByAddress(address: string) {
    return await this._call('/get-address-brc20-balance', 'post', {
      address: address,
    })
  }

  async getBrcPrice(ticker: string) {
    return await this._call('/get-brc-price', 'post', {
      ticker: ticker,
    })
  }

  async getBrc20Tickers(tickerParams: {
    sort_by?: string
    order?: string
    offset?: number
    count?: number
    minting_status?: string
  }) {
    return await this._call('/get-brc20-tickers', 'post', tickerParams)
  }

  async getRuneTickers() {
    return await this._call('/get-rune-tickers', 'post')
  }

  async getMarketplaceCollections() {
    return await this._call('/get-marketplace-collections', 'post')
  }

  async getAggrMarketplaceCollections(onlyOffers?: boolean) {
    return await this._call('/get-aggr-marketplace-collections', 'post', {
      onlyOffers,
    })
  }

  async getAllInscriptionsByAddress(address: string): Promise<any> {
    if (this.regtest) {
      return await getAllInscriptionsByAddressRegtest(address)
    } else {
      return await this._call('/get-inscriptions', 'post', {
        address: address,
        exclude_brc20: false,
        count: 20,
        order: 'desc',
      })
    }
  }

  async getInscriptionsForTxn(txn_id: string): Promise<any> {
    const res = await this._call('/get-inscriptions-for-txn', 'post', {
      tx_id: txn_id,
    })

    return res.data
  }

  async getTaprootTxHistory(taprootAddress, totalTxs): Promise<any> {
    const res = await this._call('/get-taproot-history', 'post', {
      taprootAddress: taprootAddress,
      totalTxs: totalTxs,
    })

    return res.data
  }

  async getTaprootBalance(address: string): Promise<any> {
    const res = await this._call('/get-taproot-balance', 'post', {
      address: address,
    })
    if (res.data) {
      return res.data
    } else {
      return res
    }
  }

  async getAddressBalance(address: string): Promise<any> {
    const res = await this._call('/get-address-balance', 'post', {
      address: address,
    })
    if (res.data) {
      return res.data
    } else {
      return res
    }
  }

  /**
   * Get account balance.
   * @param account - The stringified account object to get balance for.
   */
  async getAccountBalance(account: string): Promise<any> {
    const res = await this._call('/get-account-balance', 'post', {
      account: account,
    })
    if (res.data) {
      return res.data
    } else {
      return res
    }
  }

  /**
   * Get account utxos.
   * @param account - The account object to get utxos for.
   */
  async getAccountUtxos(account: Account): Promise<AccountUtxoPortfolio> {
    const stringifiedAccount = JSON.stringify(account)
    const res = await this._call('/get-account-utxos', 'post', {
      account: stringifiedAccount,
    })
    if (res.data) {
      return res.data
    } else {
      return res
    }
  }

  /**
   * Get address utxos.
   * @param address - The address to get utxos for.
   * @param spendStrategy - The spendStrategy object to use.
   */
  async getAddressUtxos(
    address: string,
    spendStrategy?: SpendStrategy
  ): Promise<any> {
    const stringifiedSpendStrategy = spendStrategy
      ? JSON.stringify(spendStrategy)
      : null
    const res = await this._call('/get-address-utxos', 'post', {
      address: address,
      spendStrategy: stringifiedSpendStrategy,
    })
    if (res.data) {
      return res.data
    } else {
      return res
    }
  }

  /**
   * Get account balance.
   * @param account - The stringified account object to get balance for.
   */
  async getaccountUtxos(account: string, spendAmount?: number): Promise<any> {
    const res = await this._call('/get-account-spendable-utxos', 'post', {
      account,
      spendAmount,
    })
    if (res.data) {
      return res.data
    } else {
      return res
    }
  }

  /**
   * Get account balance.
   * @param address - The stringified account object to get balance for.
   */
  async getaddressUtxos(
    address: string,
    spendAmount?: number,
    spendStrategy?: string
  ): Promise<any> {
    const res = await this._call('/get-address-spendable-utxos', 'post', {
      address,
      spendAmount,
      spendStrategy,
    })
    if (res.data) {
      return res.data
    } else {
      return res
    }
  }

  /**
   * Get collectible by ID.
   * @param id - The ID of the collectible.
   */
  async getCollectiblesById(id: string): Promise<any> {
    return await this._call('/get-inscription-info', 'post', {
      inscription_id: id,
    })
  }

  /**
   * Get collectibles by address.
   * @param address - The address to query.
   */
  async getCollectiblesByAddress(address: string): Promise<any> {
    return await this._call('/get-inscriptions', 'post', {
      address: address,
      exclude_brc20: true,
    })
  }

  /**
   * Get Unisat ticker offers.
   * @param _ticker - The ticker to query.
   */
  async getUnisatTickerOffers({ ticker }: { ticker: string }): Promise<any> {
    const response = await this._call('/get-token-unisat-offers', 'post', {
      ticker: ticker,
    })
    if (response.error) throw Error(response.error)
    return response.data.list
  }

  /**
   * Get Aggregated brc20 ticker offers for a limit order.
   * @param ticker - The ticker to query.
   * @param limitOrderAmount - The limit order amount.
   * @param marketPrice - The limit order market price.
   * @param testnet - mainnet/testnet network toggle.
   */
  async getAggregatedOffers({
    ticker,
    limitOrderAmount,
  }: {
    ticker: string
    limitOrderAmount: number
  }): Promise<any> {
    const response = await this._call('/get-brc20-aggregate-offers', 'post', {
      ticker: ticker,
      limitOrderAmount,
    })
    if (response.error) throw Error(response.error)
    return response
  }

  /**
   * Get BRC-20 offers.
   * @param ticker - The ticker to query.
   * @param limit - The number of offers to return.
   * @param sort_by - The sort by field.
   * @param order - The order of sorted offers to return.
   * @param offset - The offset to paginate offers.
   */
  async getBrc20Offers({
    ticker,
    limit,
    sort_by,
    order,
    offset,
  }: GetOffersParams): Promise<any> {
    const response = await this._call('/get-brc20-offers', 'post', {
      ticker,
      limit,
      sort_by,
      order,
      offset,
    })
    if (response.error) throw Error(response.error)
    return response
  }

  /**
   * Get Rune offers.
   * @param ticker - The ticker to query.
   * @param limit - The number of offers to return.
   * @param sort_by - The sort by field.
   * @param order - The order of sorted offers to return.
   * @param offset - The offset to paginate offers.
   */
  async getRuneOffers({
    ticker,
    limit,
    sort_by,
    order,
    offset,
  }: GetOffersParams): Promise<any> {
    const response = await this._call('/get-rune-offers', 'post', {
      ticker,
      limit,
      sort_by,
      order,
      offset,
    })
    if (response.error) throw Error(response.error)
    return response
  }

  /**
   * Get Collection offers.
   * @param collectionId - The collectionId to query.
   * @param limit - The number of offers to return.
   * @param sort_by - The sort by field.
   * @param order - The order of sorted offers to return.
   * @param offset - The offset to paginate offers.
   */
  async getCollectionOffers({
    collectionId,
    limit,
    sort_by,
    order,
    offset,
  }: GetCollectionOffersParams): Promise<any> {
    const response = await this._call('/get-collection-offers', 'post', {
      collectionId,
      limit,
      sort_by,
      order,
      offset,
    })
    if (response.error) throw Error(response.error)
    return response
  }

  /**
   * Get Okx ticker offers.
   * @param _ticker - The ticker to query.
   */
  async getOkxTickerOffers({ ticker }: { ticker: string }): Promise<any> {
    const response = await this._call('/get-token-okx-offers', 'post', {
      ticker: ticker,
    })
    if (response.error) throw Error(response.error)
    return response.data.items
  }

  /**
   * Get Okx offer psbt.
   * @param offerId - The offer Id to query.
   */
  async getOkxOfferPsbt({
    offerId,
    rune,
  }: {
    offerId: number
    rune?: boolean
  }): Promise<any> {
    const response = await this._call('/get-okx-offer-psbt', 'post', {
      offerId: offerId,
      rune,
    })
    return response
  }

  /**
   * Submit a signed bid for OKX marketplace.
   * @param params - Parameters for the signed bid.
   */
  async submitOkxBid(bidDetails: OkxBid): Promise<any> {
    const response = await this._call('/finalize-okx-bid', 'post', bidDetails)
    return response
  }

  /**
   * Submit a signed bid for rune offers on OKX marketplace.
   * @param params - Parameters for the signed bid.
   */
  async submitOkxRuneBid({
    orderId,
    fromAddress,
    psbt,
  }: {
    orderId: number
    fromAddress: string
    psbt: string
  }): Promise<any> {
    const response = await this._call('/finalize-okx-rune-offer', 'post', {
      orderId,
      fromAddress,
      psbt,
    })
    return response
  }

  /**
   * Get Ordinals-Wallet offer psbt for Collectibles & BRC20s.
   */
  async getOrdinalsWalletNftOfferPsbt({
    publicKey,
    feeRate,
    address,
    receiveAddress,
    inscriptions,
  }: {
    publicKey: string
    feeRate: number
    address: string
    receiveAddress: string
    inscriptions: string[]
  }): Promise<any> {
    const response = await this._call('/get-ow-nft-offer-psbt', 'post', {
      publicKey,
      feeRate,
      address,
      receiveAddress,
      inscriptions,
    })
    return response
  }

  /**
   * Get Ordinals-Wallet offer psbt for Collectibles & BRC20s.
   */
  async getOrdinalsWalletRuneOfferPsbt({
    publicKey,
    feeRate,
    address,
    outpoints,
    receiveAddress,
  }: {
    publicKey: string
    feeRate: number
    address: string
    outpoints: string[]
    receiveAddress: string
  }): Promise<any> {
    const response = await this._call('/get-ow-rune-offer-psbt', 'post', {
      publicKey,
      feeRate,
      address,
      outpoints,
      receiveAddress,
    })
    return response
  }

  /**
   * Submit a signed psbt to bid for offers on Ordinals Wallet marketplace.
   */
  async submitOrdinalsWalletBid({
    psbt,
    setupPsbt,
  }: {
    psbt: string
    setupPsbt: string
  }): Promise<any> {
    const response = await this._call('/finalize-ow-bid', 'post', {
      psbt,
      setupPsbt,
    })
    return response
  }

  /**
   * Submit a signed psbt to bid for runeoffers on Ordinals Wallet marketplace.
   */
  async submitOrdinalsWalletRuneBid({
    psbt,
    setupPsbt,
  }: {
    psbt: string
    setupPsbt: string
  }): Promise<any> {
    const response = await this._call('/finalize-ow-rune-bid', 'post', {
      psbt,
      setupPsbt,
    })
    return response
  }

  /**
   * Get BTC price.
   */
  async getBtcPrice() {
    const response = await this._call('/get-bitcoin-price', 'post', {
      ticker: null,
    })
    return response
  }

  /**
   * Get Mintable Runes
   */
  async getMintableRunes() {
    const response = await this._call('/get-mintable-runes', 'post', {})
    return response
  }

  /**
   * Get faucet TBTC.
   */
  async requestFaucet(userId: string, address: string) {
    const response = await this._call('/request-faucet-btc', 'post', {
      userId,
      address,
    })
    return response
  }

  /**
   * Get BTC market chart.
   * @param days - The number of days to use as interval.
   */
  async getBitcoinMarketChart(days: string): Promise<any> {
    const response = await this._call('/get-bitcoin-market-chart', 'post', {
      days: days,
    })
    return response
  }

  /**
   * Get BTC market weekly.
   */
  async getBitcoinMarketWeekly() {
    const response = await this._call('/get-bitcoin-market-weekly', 'post', {
      ticker: null,
    })
    return response
  }

  /**
   * Get BTC markets.
   */
  async getBitcoinMarkets() {
    const response = await this._call('/get-bitcoin-markets', 'post', {
      ticker: null,
    })
    return response
  }

  /**
   * Get Omnisat ticker offers.
   * @param _ticker - The ticker to query.
   */
  async getOmnisatTickerOffers({ ticker }: { ticker: string }): Promise<
    Array<{
      _id: string
      ownerAddress: string
      amount: string
      price: number
      psbtBase64: string
      psbtHex: string
      ticker: string
      transferableInscription: {
        inscription_id: string
        ticker: string
        transfer_amount: string
        is_valid: boolean
        is_used: boolean
        satpoint: string
        min_price: any
        min_unit_price: any
        ordinalswallet_price: any
        ordinalswallet_unit_price: any
        unisat_price: any
        unisat_unit_price: any
      }
      createdAt: number
      updatedAt: string
    }>
  > {
    const response = await this._call('/get-token-omnisat-offers', 'post', {
      ticker: ticker,
    })
    if (response.error) throw Error(response.error)
    return response.data as Array<{
      _id: string
      ownerAddress: string
      amount: string
      price: number
      psbtBase64: string
      psbtHex: string
      ticker: string
      transferableInscription: {
        inscription_id: string
        ticker: string
        transfer_amount: string
        is_valid: boolean
        is_used: boolean
        satpoint: string
        min_price: any
        min_unit_price: any
        ordinalswallet_price: any
        ordinalswallet_unit_price: any
        unisat_price: any
        unisat_unit_price: any
      }
      createdAt: number
      updatedAt: string
    }>
  }

  /**
   * Get Omnisat offer psbt.
   * @param offerId - The offer Id to query.
   */
  async getOmnisatOfferPsbt({
    offerId,
    ticker,
  }: {
    offerId: string
    ticker: string
  }): Promise<any> {
    const response = await this._call('/get-omnisat-offer-psbt', 'post', {
      offerId: offerId,
      ticker: ticker,
    })
    return response
  }

  /**
   * Initialize a swap bid.
   * @param params - Parameters for the bid.
   */
  async initSwapBid(params: SwapBrcBid): Promise<any> {
    return await this._call('/initiate-unisat-bid', 'post', params)
  }

  /**
   * Initialize a Rune swap bid.
   * @param params - Parameters for the bid.
   */
  async initRuneSwapBid(params: SwapBrcBid): Promise<any> {
    return await this._call('/initiate-unisat-rune-bid', 'post', params)
  }

  /**
   * Initialize a collection swap bid.
   * @param params - Parameters for the bid.
   */
  async initCollectionSwapBid(params: SwapBrcBid): Promise<any> {
    return await this._call('/initiate-unisat-collection-bid', 'post', params)
  }

  /**
   * Submit a signed bid.
   * @param params - Parameters for the signed bid.
   */
  async submitSignedBid(params: SignedBid): Promise<any> {
    return await this._call('/finalize-unisat-bid', 'post', params)
  }

  /**
   * Submit a signed Collection bid.
   * @param params - Parameters for the signed bid.
   */
  async submitSignedCollectionBid(params: SignedBid): Promise<any> {
    return await this._call('/finalize-unisat-collection-bid', 'post', params)
  }

  /**
   * Submit a signed Collection bid.
   * @param params - Parameters for the signed bid.
   */
  async submitSignedRuneBid(params: SignedBid): Promise<any> {
    return await this._call('/finalize-unisat-rune-bid', 'post', params)
  }

  async sendBtcEstimate({
    amount,
    feeRate,
    account,
    signer,
  }: {
    amount: number
    feeRate: number
    account: string
    signer: string
  }): Promise<any> {
    return await this._call('/send-btc-estimate', 'post', {
      amount,
      feeRate,
      account,
      signer,
    })
  }

  async sendBrc20Estimate({
    feeRate,
    account,
  }: {
    feeRate: number
    account: string
  }): Promise<any> {
    return await this._call('/send-brc20-estimate', 'post', {
      feeRate,
      account,
    })
  }

  async sendCollectibleEstimate({
    inscriptionId,
    feeRate,
    account,
    signer,
  }: {
    inscriptionId: string
    feeRate: number
    account: string
    signer: string
  }): Promise<any> {
    return await this._call('/send-collectible-estimate', 'post', {
      inscriptionId,
      feeRate,
      account,
      signer,
    })
  }

  async sendRuneEstimate({
    runeId,
    amount,
    feeRate,
    account,
    signer,
  }: {
    runeId: string
    amount: number
    feeRate: number
    account: string
    signer: string
  }): Promise<any> {
    return await this._call('/send-rune-estimate', 'post', {
      runeId,
      amount,
      feeRate,
      account,
      signer,
    })
  }

  async getRuneOutpoints({ address }: { address: string }): Promise<any> {
    if (this.regtest) {
      return (await getRuneOutpointsRegtest(address)).data
    } else {
      return (
        await this._call('/get-rune-outpoints', 'post', {
          address,
        })
      ).data
    }
  }

  async getRuneBalance({ address }: { address: string }): Promise<any> {
    if (this.regtest) {
      return (await getRuneBalanceRegtest(address)).data
    } else {
      return (
        await this._call('/get-rune-balance', 'post', {
          address,
        })
      ).data
    }
  }

  async getOutputRune({ output }: { output: string }): Promise<any> {
    return (
      await this._call('/get-output-rune-info', 'post', {
        output,
      })
    ).data
  }
}
