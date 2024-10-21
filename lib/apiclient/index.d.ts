import { SwapBrcBid, SignedBid, OkxBid, GetOffersParams, GetCollectionOffersParams } from '../shared/interface';
import { Account, SpendStrategy } from '../account';
import { GetSellerPsbtRequest, SubmitBuyerPsbtRequest } from '../swap/types';
import { AccountUtxoPortfolio } from '@utxo/utxo';
/**
 * Represents the client for interacting with the Oyl API.
 */
export declare class OylApiClient {
    private host;
    private testnet;
    private regtest;
    private apiKey;
    private authToken;
    private network;
    /**
     * Create an instance of the OylApiClient.
     * @param options - Configuration object containing the API host.
     */
    constructor(options?: {
        host: string;
        apiKey: string;
        network: string;
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
        network: string;
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
     * Get whitelist leaderboard.
     * @param address - the address requesting the leaderboard.
     */
    getWhitelistLeaderboard({ address }: {
        address: string;
    }): Promise<any>;
    /**
     * Get an address's xp for the whitelist.
     * @param taprootAddress - taprootAddress.
     * @param segwitAddress - .segwitAddress
     */
    getWhitelistXp({ taprootAddress, segwitAddress, }: {
        taprootAddress: string;
        segwitAddress?: string;
    }): Promise<any>;
    /**
     * Get brc20 info by ticker.
     * @param ticker - The ticker to query.
     */
    getBrc20TokenInfo(ticker: string): Promise<any>;
    /**
     * Get Runes info by ticker.
     * @param ticker - The ticker to query.
     */
    getRuneTokenInfo(ticker: string): Promise<any>;
    getSellerPsbt(params: GetSellerPsbtRequest): Promise<any>;
    submitBuyerPsbt(params: SubmitBuyerPsbtRequest): Promise<any>;
    /**
     * Get Collection info by id.
     * @param collectionId - The collectionId to query.
     */
    getCollectionInfo(collectionId: string): Promise<any>;
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
    getRuneTickers(): Promise<any>;
    getMarketplaceCollections(): Promise<any>;
    getAggrMarketplaceCollections(onlyOffers?: boolean): Promise<any>;
    getAllInscriptionsByAddress(address: string): Promise<any>;
    getInscriptionsForTxn(txn_id: string): Promise<any>;
    getTaprootTxHistory(taprootAddress: any, totalTxs: any): Promise<any>;
    getTaprootBalance(address: string): Promise<any>;
    getAddressBalance(address: string): Promise<any>;
    /**
     * Get account balance.
     * @param account - The stringified account object to get balance for.
     */
    getAccountBalance(account: string): Promise<any>;
    /**
     * Get account utxos.
     * @param account - The account object to get utxos for.
     */
    getAccountUtxos(account: Account): Promise<AccountUtxoPortfolio>;
    /**
     * Get address utxos.
     * @param address - The address to get utxos for.
     * @param spendStrategy - The spendStrategy object to use.
     */
    getAddressUtxos(address: string, spendStrategy?: SpendStrategy): Promise<any>;
    /**
     * Get account balance.
     * @param account - The stringified account object to get balance for.
     */
    getaccountUtxos(account: string, spendAmount?: number): Promise<any>;
    /**
     * Get account balance.
     * @param address - The stringified account object to get balance for.
     */
    getaddressUtxos(address: string, spendAmount?: number, spendStrategy?: string): Promise<any>;
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
     * @param limit - The number of offers to return.
     * @param sort_by - The sort by field.
     * @param order - The order of sorted offers to return.
     * @param offset - The offset to paginate offers.
     */
    getBrc20Offers({ ticker, limit, sort_by, order, offset, }: GetOffersParams): Promise<any>;
    /**
     * Get Rune offers.
     * @param ticker - The ticker to query.
     * @param limit - The number of offers to return.
     * @param sort_by - The sort by field.
     * @param order - The order of sorted offers to return.
     * @param offset - The offset to paginate offers.
     */
    getRuneOffers({ ticker, limit, sort_by, order, offset, }: GetOffersParams): Promise<any>;
    /**
     * Get Collection offers.
     * @param collectionId - The collectionId to query.
     * @param limit - The number of offers to return.
     * @param sort_by - The sort by field.
     * @param order - The order of sorted offers to return.
     * @param offset - The offset to paginate offers.
     */
    getCollectionOffers({ collectionId, limit, sort_by, order, offset, }: GetCollectionOffersParams): Promise<any>;
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
    getOkxOfferPsbt({ offerId, rune, }: {
        offerId: number;
        rune?: boolean;
    }): Promise<any>;
    /**
     * Submit a signed bid for OKX marketplace.
     * @param params - Parameters for the signed bid.
     */
    submitOkxBid(bidDetails: OkxBid): Promise<any>;
    /**
     * Submit a signed bid for rune offers on OKX marketplace.
     * @param params - Parameters for the signed bid.
     */
    submitOkxRuneBid({ orderId, fromAddress, psbt, }: {
        orderId: number;
        fromAddress: string;
        psbt: string;
    }): Promise<any>;
    /**
     * Get Ordinals-Wallet offer psbt for Collectibles & BRC20s.
     */
    getOrdinalsWalletNftOfferPsbt({ publicKey, feeRate, address, receiveAddress, inscriptions, }: {
        publicKey: string;
        feeRate: number;
        address: string;
        receiveAddress: string;
        inscriptions: string[];
    }): Promise<any>;
    /**
     * Get Ordinals-Wallet offer psbt for Collectibles & BRC20s.
     */
    getOrdinalsWalletRuneOfferPsbt({ publicKey, feeRate, address, outpoints, receiveAddress, }: {
        publicKey: string;
        feeRate: number;
        address: string;
        outpoints: string[];
        receiveAddress: string;
    }): Promise<any>;
    /**
     * Submit a signed psbt to bid for offers on Ordinals Wallet marketplace.
     */
    submitOrdinalsWalletBid({ psbt, setupPsbt, }: {
        psbt: string;
        setupPsbt: string;
    }): Promise<any>;
    /**
     * Submit a signed psbt to bid for runeoffers on Ordinals Wallet marketplace.
     */
    submitOrdinalsWalletRuneBid({ psbt, setupPsbt, }: {
        psbt: string;
        setupPsbt: string;
    }): Promise<any>;
    /**
     * Get BTC price.
     */
    getBtcPrice(): Promise<any>;
    /**
     * Get Mintable Runes
     */
    getMintableRunes(): Promise<any>;
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
     * Initialize a Rune swap bid.
     * @param params - Parameters for the bid.
     */
    initRuneSwapBid(params: SwapBrcBid): Promise<any>;
    /**
     * Initialize a collection swap bid.
     * @param params - Parameters for the bid.
     */
    initCollectionSwapBid(params: SwapBrcBid): Promise<any>;
    /**
     * Submit a signed bid.
     * @param params - Parameters for the signed bid.
     */
    submitSignedBid(params: SignedBid): Promise<any>;
    /**
     * Submit a signed Collection bid.
     * @param params - Parameters for the signed bid.
     */
    submitSignedCollectionBid(params: SignedBid): Promise<any>;
    /**
     * Submit a signed Collection bid.
     * @param params - Parameters for the signed bid.
     */
    submitSignedRuneBid(params: SignedBid): Promise<any>;
    sendBtcEstimate({ amount, feeRate, account, signer, }: {
        amount: number;
        feeRate: number;
        account: string;
        signer: string;
    }): Promise<any>;
    sendBrc20Estimate({ feeRate, account, }: {
        feeRate: number;
        account: string;
    }): Promise<any>;
    sendCollectibleEstimate({ inscriptionId, feeRate, account, signer, }: {
        inscriptionId: string;
        feeRate: number;
        account: string;
        signer: string;
    }): Promise<any>;
    sendRuneEstimate({ runeId, amount, feeRate, account, signer, }: {
        runeId: string;
        amount: number;
        feeRate: number;
        account: string;
        signer: string;
    }): Promise<any>;
    getRuneOutpoints({ address }: {
        address: string;
    }): Promise<any>;
    getRuneBalance({ address }: {
        address: string;
    }): Promise<any>;
    getOutputRune({ output }: {
        output: string;
    }): Promise<any>;
}
