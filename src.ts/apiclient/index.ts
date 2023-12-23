import fetch from 'node-fetch'
import { SwapBrcBid, SignedBid } from '../shared/interface'

/**
 * Represents the client for interacting with the Oyl API.
 */
export class OylApiClient {
  private host: string;
  private testnet: boolean;

  /**
   * Create an instance of the OylApiClient.
   * @param options - Configuration object containing the API host.
   */
  constructor(options?: { host: string, testnet?: boolean }) {
    this.host = options?.host || ''
    this.testnet = options.testnet == true 
  }

  /**
   * Create an instance of the OylApiClient from a plain object.
   * @param data - The data object.
   * @returns An instance of OylApiClient.
   */
  static fromObject(data: { host: string, testnet?: boolean }): OylApiClient {
    return new this(data)
  }

  /**
   * Convert this OylApiClient instance to a plain object.
   * @returns The plain object representation.
   */
  toObject(): { host: string, testnet: boolean } {
    return {
      host: this.host,
      testnet: this.testnet
    }
  }

  private async _call(path: string, method: string, data?: any) {
    try {
      const options: RequestInit = {
        method: method,
        headers: { 'Content-Type': 'application/json' },
      }
      if(this.testnet){
        data["testnet"] = this.testnet
      }

      if (['post', 'put', 'patch'].includes(method)) {
        options.body = JSON.stringify(data)
      }

      const response = await fetch(`${this.host}${path}`, options)
      return await response.json()
    } catch (err) {
      throw err
    }
  }

  /**
   * Import an address to the Oyl API.
   * @param address - The address to be imported.
   */
  async importAddress({ address }: { address: string }): Promise<any> {
    return await this._call('/import-address', 'post', { address })
  }

  /**
   * Push a transaction.
   * @param transactionHex - The hex of the transaction.
   */
  async pushTx({ transactionHex }: { transactionHex: string }): Promise<any> {
    return await this._call('/broadcast-transaction', 'post', {
      transactionHex,
    })
  }

  /**
   * Get transactions by address.
   * @param address - The address to query.
   */
  async getTxByAddress(address: string): Promise<any> {
    return await this._call('/address-transactions', 'post', { address })
  }

  /**
   * Get transactions by hash.
   * @param address - The hash to query.
   */
  async getTxByHash(hash: string) {
    return await this._call('/hash-transactions', 'post', {
      hash: hash,
    })
  }

  /**
   * Get brc20 info by ticker.
   * @param ticker - The hash to query.
   */
  async getBrc20TokenInfo(ticker: string) {
    return await this._call('/get-brc20-token-info', 'post', {
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
   * List wallets.
   */
  async listWallet(): Promise<any> {
    return await this._call('/list-wallets', 'get')
  }

  /**
   * List transactions.
   */
  async listTx(): Promise<any> {
    return await this._call('/list-tx', 'get')
  }

  /**
   * Get raw mempool.
   */
  async getRawMempool(): Promise<any> {
    return await this._call('/mempool', 'get')
  }

  /**
   * Get mempool information.
   */
  async getMempoolInfo(): Promise<any> {
    return await this._call('/mempool-info', 'get')
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
  async getOkxOfferPsbt({ offerId }: { offerId: number }): Promise<any> {
    const response = await this._call('/get-token-okx-offers', 'post', {
      offerId: offerId,
    })
    return response
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
    return await this._call('/initiate-bid', 'post', params)
  }

  /**
   * Submit a signed bid.
   * @param params - Parameters for the signed bid.
   */
  async submitSignedBid(params: SignedBid): Promise<any> {
    return await this._call('/finalize-bid', 'post', params)
  }

  /**
   * Get transaction fees.
   */
  async getFees(): Promise<any> {
    return await this._call('/get-fees', 'get')
  }

  /**
   * Subscribe for notifications.
   * @param webhookUrl - The URL to send notifications.
   * @param rbf - Replace-by-fee flag.
   */
  async subscribe({
    webhookUrl,
    rbf = false,
  }: {
    webhookUrl: string
    rbf?: boolean
  }): Promise<any> {
    return await this._call('/subscribe-webhook', 'post', {
      webhookUrl,
      rbf,
    })
  }

  /**
   * Import an address and subscribe for notifications.
   * @param address - The address to be imported.
   * @param webhookUrl - The URL to send notifications.
   * @param rbf - Replace-by-fee flag.
   */
  async importSubscribe({
    address,
    webhookUrl,
    rbf,
  }: {
    address: string
    webhookUrl: string
    rbf?: boolean
  }): Promise<void> {
    await this.importAddress({ address })
    await this.subscribe({ webhookUrl, rbf })
  }
}
