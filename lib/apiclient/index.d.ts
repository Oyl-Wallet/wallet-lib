import { SwapBrcBid, SignedBid, OkxBid } from '../shared/interface';
/**
 * Represents the client for interacting with the Oyl API.
 */
export declare class OylApiClient {
    private host;
    private testnet;
    private regtest;
    private apiKey;
    private authToken;
    /**
     * Create an instance of the OylApiClient.
     * @param options - Configuration object containing the API host.
     */
    constructor(options?: {
        host: string;
        apiKey: string;
        testnet?: boolean;
        regtest?: boolean;
    });
    /**
     * Create an instance of the OylApiClient from a plain object.
     * @param data - The data object.
     * @returns An instance of OylApiClient.
     */
    static fromObject(data: {
        host: string;
        testnet?: boolean;
        apiKey: string;
    }): OylApiClient;
    setAuthToken(token: string): void;
    /**
     * Convert this OylApiClient instance to a plain object.
     * @returns The plain object representation.
     */
    toObject(): {
        host: string;
        testnet: boolean;
        apiKey: string;
    };
    private _call;
    /**
     * Check beta access code.
     * @param code - Access code.
     * @param userId - User id.
     */
    checkAccessCode({ code, userId }: {
        code: string;
        userId: string;
    }): Promise<any>;
    /**
     * Get brc20 info by ticker.
     * @param ticker - The ticker to query.
     */
    getBrc20TokenInfo(ticker: string): Promise<any>;
    /**
     * Get brc20 details by ticker.
     * @param ticker - The ticker to query.
     */
    getBrc20TokenDetails(ticker: string): Promise<any>;
    /**
     * Get Brc20 balances by address.
     * @param address - The address to query.
     */
    getBrc20sByAddress(address: string): Promise<any>;
    getBrcPrice(ticker: string): Promise<any>;
    getBrc20Tickers(tickerParams: {
        sort_by?: string;
        order?: string;
        offset?: number;
        count?: number;
        minting_status?: string;
    }): Promise<any>;
    getAllInscriptionsByAddress(address: string): Promise<any>;
    getInscriptionsForTxn(txn_id: string): Promise<any>;
    getTaprootTxHistory(taprootAddress: any, totalTxs: any): Promise<any>;
    getTaprootBalance(address: string): Promise<any>;
    getAddressBalance(address: string): Promise<any>;
    /**
     * Get collectible by ID.
     * @param id - The ID of the collectible.
     */
    getCollectiblesById(id: string): Promise<any>;
    /**
     * Get collectibles by address.
     * @param address - The address to query.
     */
    getCollectiblesByAddress(address: string): Promise<any>;
    /**
     * Get Unisat ticker offers.
     * @param _ticker - The ticker to query.
     */
    getUnisatTickerOffers({ ticker }: {
        ticker: string;
    }): Promise<any>;
    /**
     * Get Aggregated brc20 ticker offers for a limit order.
     * @param ticker - The ticker to query.
     * @param limitOrderAmount - The limit order amount.
     * @param marketPrice - The limit order market price.
     * @param testnet - mainnet/testnet network toggle.
     */
    getAggregatedOffers({ ticker, limitOrderAmount, }: {
        ticker: string;
        limitOrderAmount: number;
    }): Promise<any>;
    /**
     * Get BRC-20 offers.
     * @param ticker - The ticker to query.
     * @param limit - The limit of offers to return (Default = 5).
     */
    getBrc20Offers({ ticker, limit, }: {
        ticker: string;
        limit?: number;
    }): Promise<any>;
    /**
     * Get Okx ticker offers.
     * @param _ticker - The ticker to query.
     */
    getOkxTickerOffers({ ticker }: {
        ticker: string;
    }): Promise<any>;
    /**
     * Get Okx offer psbt.
     * @param offerId - The offer Id to query.
     */
    getOkxOfferPsbt({ offerId }: {
        offerId: number;
    }): Promise<any>;
    /**
     * Submit a signed bid for OKX marketplace.
     * @param params - Parameters for the signed bid.
     */
    submitOkxBid(bidDetails: OkxBid): Promise<any>;
    /**
     * Get BTC price.
     */
    getBtcPrice(): Promise<any>;
    /**
    * Get faucet TBTC.
    */
    requestFaucet(userId: string, address: string): Promise<any>;
    /**
     * Get BTC market chart.
     * @param days - The number of days to use as interval.
     */
    getBitcoinMarketChart(days: string): Promise<any>;
    /**
     * Get BTC market weekly.
     */
    getBitcoinMarketWeekly(): Promise<any>;
    /**
     * Get BTC markets.
     */
    getBitcoinMarkets(): Promise<any>;
    /**
     * Get Omnisat ticker offers.
     * @param _ticker - The ticker to query.
     */
    getOmnisatTickerOffers({ ticker }: {
        ticker: string;
    }): Promise<Array<{
        _id: string;
        ownerAddress: string;
        amount: string;
        price: number;
        psbtBase64: string;
        psbtHex: string;
        ticker: string;
        transferableInscription: {
            inscription_id: string;
            ticker: string;
            transfer_amount: string;
            is_valid: boolean;
            is_used: boolean;
            satpoint: string;
            min_price: any;
            min_unit_price: any;
            ordinalswallet_price: any;
            ordinalswallet_unit_price: any;
            unisat_price: any;
            unisat_unit_price: any;
        };
        createdAt: number;
        updatedAt: string;
    }>>;
    /**
     * Get Omnisat offer psbt.
     * @param offerId - The offer Id to query.
     */
    getOmnisatOfferPsbt({ offerId, ticker, }: {
        offerId: string;
        ticker: string;
    }): Promise<any>;
    /**
     * Initialize a swap bid.
     * @param params - Parameters for the bid.
     */
    initSwapBid(params: SwapBrcBid): Promise<any>;
    /**
     * Submit a signed bid.
     * @param params - Parameters for the signed bid.
     */
    submitSignedBid(params: SignedBid): Promise<any>;
    sendBtcEstimate({ feeRate, amount, altSpendPubKey, spendAddress, spendPubKey, altSpendAddress, }: {
        feeRate?: number;
        amount: number;
        altSpendPubKey?: string;
        spendAddress: string;
        spendPubKey: string;
        altSpendAddress?: string;
    }): Promise<any>;
    sendBrc20Estimate({ feeRate, altSpendPubKey, spendAddress, spendPubKey, altSpendAddress, }: {
        feeRate?: number;
        altSpendPubKey?: string;
        spendAddress: string;
        spendPubKey: string;
        altSpendAddress?: string;
    }): Promise<any>;
    sendCollectibleEstimate({ spendAddress, altSpendAddress, feeRate, }: {
        feeRate?: number;
        spendAddress: string;
        altSpendAddress?: string;
    }): Promise<any>;
    sendRuneEstimate({ spendAddress, altSpendAddress, feeRate, }: {
        feeRate?: number;
        spendAddress: string;
        altSpendAddress?: string;
    }): Promise<any>;
    getRuneOutpoints({ address }: {
        address: string;
    }): Promise<any>;
    getRuneBalance({ address }: {
        address: string;
    }): Promise<any>;
}
