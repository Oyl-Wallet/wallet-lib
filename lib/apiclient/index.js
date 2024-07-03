"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OylApiClient = void 0;
const tslib_1 = require("tslib");
const node_fetch_1 = tslib_1.__importDefault(require("node-fetch"));
const regtestApi_1 = require("../tests/regtestApi");
/**
 * Represents the client for interacting with the Oyl API.
 */
class OylApiClient {
    host;
    testnet;
    regtest;
    apiKey;
    authToken = '';
    network;
    /**
     * Create an instance of the OylApiClient.
     * @param options - Configuration object containing the API host.
     */
    constructor(options) {
        this.host = options?.host || '';
        this.network = options.network;
        this.testnet = options.testnet == true;
        this.regtest = options.regtest == true;
        this.apiKey = options.apiKey;
    }
    /**
     * Create an instance of the OylApiClient from a plain object.
     * @param data - The data object.
     * @returns An instance of OylApiClient.
     */
    static fromObject(data) {
        return new this(data);
    }
    setAuthToken(token) {
        this.authToken = token;
    }
    /**
     * Convert this OylApiClient instance to a plain object.
     * @returns The plain object representation.
     */
    toObject() {
        return {
            host: this.host,
            testnet: this.testnet,
            apiKey: this.apiKey,
        };
    }
    async _call(path, method, data) {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: this.authToken ? `Bearer ${this.authToken}` : '',
                    'X-Bitcoin-Network': this.network,
                },
                cache: 'no-cache',
            };
            if (this.testnet) {
                data['testnet'] = this.testnet;
            }
            if (['post', 'put', 'patch'].includes(method)) {
                options.body = JSON.stringify(data);
            }
            const response = await (0, node_fetch_1.default)(`${this.host}${path}`, options);
            return await response.json();
        }
        catch (err) {
            throw err;
        }
    }
    /**
     * Check beta access code.
     * @param code - Access code.
     * @param userId - User id.
     */
    async checkAccessCode({ code, userId }) {
        return await this._call('/check-access-code', 'post', {
            code,
            userId,
        });
    }
    /**
     * Get brc20 info by ticker.
     * @param ticker - The ticker to query.
     */
    async getBrc20TokenInfo(ticker) {
        return await this._call('/get-brc20-token-info', 'post', {
            ticker: ticker,
        });
    }
    /**
     * Get Runes info by ticker.
     * @param ticker - The ticker to query.
     */
    async getRuneTokenInfo(ticker) {
        return await this._call('/get-rune-token-info', 'post', {
            ticker: ticker,
        });
    }
    /**
     * Get Collection info by id.
     * @param collectionId - The collectionId to query.
     */
    async getCollectionInfo(collectionId) {
        return await this._call('/get-collection-info', 'post', {
            collectionId: collectionId,
        });
    }
    /**
     * Get brc20 details by ticker.
     * @param ticker - The ticker to query.
     */
    async getBrc20TokenDetails(ticker) {
        console.log(ticker);
        return await this._call('/get-brc20-token-details', 'post', {
            ticker: ticker,
        });
    }
    /**
     * Get Brc20 balances by address.
     * @param address - The address to query.
     */
    async getBrc20sByAddress(address) {
        return await this._call('/get-address-brc20-balance', 'post', {
            address: address,
        });
    }
    async getBrcPrice(ticker) {
        return await this._call('/get-brc-price', 'post', {
            ticker: ticker,
        });
    }
    async getBrc20Tickers(tickerParams) {
        return await this._call('/get-brc20-tickers', 'post', tickerParams);
    }
    async getRuneTickers() {
        return await this._call('/get-rune-tickers', 'post');
    }
    async getMarketplaceCollections() {
        return await this._call('/get-marketplace-collections', 'post');
    }
    async getAllInscriptionsByAddress(address) {
        if (this.regtest) {
            return await (0, regtestApi_1.getAllInscriptionsByAddressRegtest)(address);
        }
        else {
            return await this._call('/get-inscriptions', 'post', {
                address: address,
                exclude_brc20: false,
                count: 20,
                order: 'desc',
            });
        }
    }
    async getInscriptionsForTxn(txn_id) {
        const res = await this._call('/get-inscriptions-for-txn', 'post', {
            tx_id: txn_id,
        });
        return res.data;
    }
    async getTaprootTxHistory(taprootAddress, totalTxs) {
        const res = await this._call('/get-taproot-history', 'post', {
            taprootAddress: taprootAddress,
            totalTxs: totalTxs,
        });
        return res.data;
    }
    async getTaprootBalance(address) {
        const res = await this._call('/get-taproot-balance', 'post', {
            address: address,
        });
        if (res.data) {
            return res.data;
        }
        else {
            return res;
        }
    }
    async getAddressBalance(address) {
        const res = await this._call('/get-address-balance', 'post', {
            address: address,
        });
        if (res.data) {
            return res.data;
        }
        else {
            return res;
        }
    }
    /**
     * Get collectible by ID.
     * @param id - The ID of the collectible.
     */
    async getCollectiblesById(id) {
        return await this._call('/get-inscription-info', 'post', {
            inscription_id: id,
        });
    }
    /**
     * Get collectibles by address.
     * @param address - The address to query.
     */
    async getCollectiblesByAddress(address) {
        return await this._call('/get-inscriptions', 'post', {
            address: address,
            exclude_brc20: true,
        });
    }
    /**
     * Get Unisat ticker offers.
     * @param _ticker - The ticker to query.
     */
    async getUnisatTickerOffers({ ticker }) {
        const response = await this._call('/get-token-unisat-offers', 'post', {
            ticker: ticker,
        });
        if (response.error)
            throw Error(response.error);
        return response.data.list;
    }
    /**
     * Get Aggregated brc20 ticker offers for a limit order.
     * @param ticker - The ticker to query.
     * @param limitOrderAmount - The limit order amount.
     * @param marketPrice - The limit order market price.
     * @param testnet - mainnet/testnet network toggle.
     */
    async getAggregatedOffers({ ticker, limitOrderAmount, }) {
        const response = await this._call('/get-brc20-aggregate-offers', 'post', {
            ticker: ticker,
            limitOrderAmount,
        });
        if (response.error)
            throw Error(response.error);
        return response;
    }
    /**
     * Get BRC-20 offers.
     * @param ticker - The ticker to query.
     * @param limit - The limit of offers to return (Default = 5).
     */
    async getBrc20Offers({ ticker, limit = 5, }) {
        const response = await this._call('/get-brc20-offers', 'post', {
            ticker,
            limit,
        });
        if (response.error)
            throw Error(response.error);
        return response;
    }
    /**
     * Get Rune offers.
     * @param ticker - The ticker to query.
     * @param limit - The limit of offers to return (Default = 5).
     */
    async getRuneOffers({ ticker, limit = 5, }) {
        const response = await this._call('/get-rune-offers', 'post', {
            ticker,
            limit,
        });
        if (response.error)
            throw Error(response.error);
        return response;
    }
    /**
     * Get Collection offers.
     * @param collectionId - The collectionId to query.
     * @param limit - The limit of offers to return (Default = 5).
     */
    async getCollectionOffers({ collectionId, limit = 5, }) {
        const response = await this._call('/get-collection-offers', 'post', {
            collectionId,
            limit,
        });
        if (response.error)
            throw Error(response.error);
        return response;
    }
    /**
     * Get Okx ticker offers.
     * @param _ticker - The ticker to query.
     */
    async getOkxTickerOffers({ ticker }) {
        const response = await this._call('/get-token-okx-offers', 'post', {
            ticker: ticker,
        });
        if (response.error)
            throw Error(response.error);
        return response.data.items;
    }
    /**
     * Get Okx offer psbt.
     * @param offerId - The offer Id to query.
     */
    async getOkxOfferPsbt({ offerId }) {
        const response = await this._call('/get-okx-offer-psbt', 'post', {
            offerId: offerId,
        });
        return response;
    }
    /**
     * Submit a signed bid for OKX marketplace.
     * @param params - Parameters for the signed bid.
     */
    async submitOkxBid(bidDetails) {
        const response = await this._call('/finalize-okx-bid', 'post', bidDetails);
        return response;
    }
    /**
     * Get BTC price.
     */
    async getBtcPrice() {
        const response = await this._call('/get-bitcoin-price', 'post', {
            ticker: null,
        });
        return response;
    }
    /**
     * Get Mintable Runes
     */
    async getMintableRunes() {
        const response = await this._call('/get-mintable-runes', 'post', {});
        return response;
    }
    /**
     * Get faucet TBTC.
     */
    async requestFaucet(userId, address) {
        const response = await this._call('/request-faucet-btc', 'post', {
            userId,
            address,
        });
        return response;
    }
    /**
     * Get BTC market chart.
     * @param days - The number of days to use as interval.
     */
    async getBitcoinMarketChart(days) {
        const response = await this._call('/get-bitcoin-market-chart', 'post', {
            days: days,
        });
        return response;
    }
    /**
     * Get BTC market weekly.
     */
    async getBitcoinMarketWeekly() {
        const response = await this._call('/get-bitcoin-market-weekly', 'post', {
            ticker: null,
        });
        return response;
    }
    /**
     * Get BTC markets.
     */
    async getBitcoinMarkets() {
        const response = await this._call('/get-bitcoin-markets', 'post', {
            ticker: null,
        });
        return response;
    }
    /**
     * Get Omnisat ticker offers.
     * @param _ticker - The ticker to query.
     */
    async getOmnisatTickerOffers({ ticker }) {
        const response = await this._call('/get-token-omnisat-offers', 'post', {
            ticker: ticker,
        });
        if (response.error)
            throw Error(response.error);
        return response.data;
    }
    /**
     * Get Omnisat offer psbt.
     * @param offerId - The offer Id to query.
     */
    async getOmnisatOfferPsbt({ offerId, ticker, }) {
        const response = await this._call('/get-omnisat-offer-psbt', 'post', {
            offerId: offerId,
            ticker: ticker,
        });
        return response;
    }
    /**
     * Initialize a swap bid.
     * @param params - Parameters for the bid.
     */
    async initSwapBid(params) {
        return await this._call('/initiate-unisat-bid', 'post', params);
    }
    /**
     * Initialize a Rune swap bid.
     * @param params - Parameters for the bid.
     */
    async initRuneSwapBid(params) {
        return await this._call('/initiate-unisat-rune-bid', 'post', params);
    }
    /**
     * Initialize a collection swap bid.
     * @param params - Parameters for the bid.
     */
    async initCollectionSwapBid(params) {
        return await this._call('/initiate-unisat-collection-bid', 'post', params);
    }
    /**
     * Submit a signed bid.
     * @param params - Parameters for the signed bid.
     */
    async submitSignedBid(params) {
        return await this._call('/finalize-unisat-bid', 'post', params);
    }
    /**
     * Submit a signed Collection bid.
     * @param params - Parameters for the signed bid.
     */
    async submitSignedCollectionBid(params) {
        return await this._call('/finalize-unisat-collection-bid', 'post', params);
    }
    /**
     * Submit a signed Collection bid.
     * @param params - Parameters for the signed bid.
     */
    async submitSignedRuneBid(params) {
        return await this._call('/finalize-unisat-rune-bid', 'post', params);
    }
    async sendBtcEstimate({ feeRate, amount, altSpendPubKey, spendAddress, spendPubKey, altSpendAddress, }) {
        return await this._call('/send-btc-estimate', 'post', {
            feeRate,
            amount,
            altSpendPubKey,
            spendAddress,
            spendPubKey,
            altSpendAddress,
        });
    }
    async sendBrc20Estimate({ feeRate, altSpendPubKey, spendAddress, spendPubKey, altSpendAddress, }) {
        return await this._call('/send-brc20-estimate', 'post', {
            spendPubKey,
            feeRate,
            altSpendPubKey,
            spendAddress,
            altSpendAddress,
        });
    }
    async sendCollectibleEstimate({ spendAddress, altSpendAddress, feeRate, }) {
        return await this._call('/send-collectible-estimate', 'post', {
            spendAddress,
            altSpendAddress,
            feeRate,
        });
    }
    async sendRuneEstimate({ spendAddress, altSpendAddress, feeRate, }) {
        return await this._call('/send-rune-estimate', 'post', {
            spendAddress,
            altSpendAddress,
            feeRate,
        });
    }
    async getRuneOutpoints({ address }) {
        if (this.regtest) {
            return (await (0, regtestApi_1.getRuneOutpointsRegtest)(address)).data;
        }
        else {
            return (await this._call('/get-rune-outpoints', 'post', {
                address,
            })).data;
        }
    }
    async getRuneBalance({ address }) {
        if (this.regtest) {
            return (await (0, regtestApi_1.getRuneBalanceRegtest)(address)).data;
        }
        else {
            return (await this._call('/get-rune-balance', 'post', {
                address,
            })).data;
        }
    }
    async getOutputRune({ output }) {
        return (await this._call('/get-output-rune-info', 'post', {
            output,
        })).data;
    }
}
exports.OylApiClient = OylApiClient;
//# sourceMappingURL=index.js.map