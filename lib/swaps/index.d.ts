import { BuildMarketplaceTransaction } from './buildMarketplaceTx';
import { AssetType, ExternalSwap, MarketplaceAccount, MarketplaceOffer, SignedBid, SwapPayload } from '../shared/interface';
export declare class Trade {
    private provider;
    private receiveAddress;
    private selectedSpendAddress;
    private selectedSpendPubkey;
    private account;
    private signer;
    assetType: AssetType;
    feeRate: number;
    txIds: string[];
    takerScript: string;
    addressesBound: boolean;
    constructor(options: MarketplaceAccount);
    /**
     * Should estimate the total amount of satoshi required to execute offers including fees
     **/
    getOffersCostEstimate(offers: MarketplaceOffer[]): Promise<number>;
    getScriptPubKey(): void;
    selectSpendAddress(offers: MarketplaceOffer[]): Promise<void>;
    processMultipleBuys(orders: any, previousOrderTxId: string, remainingSats: number, index: number, psbtBase64s: string[], psbtHexs: any[], txIds: string[]): any;
    signMarketplacePsbt(psbt: string, finalize?: boolean): Promise<{
        signedPsbt: string;
        signedHexPsbt: string;
    }>;
    processAllOffers(offers: MarketplaceOffer[]): Promise<{
        processed: boolean;
        processedOffers: any[];
    }>;
    getAssetPsbtPath(payload: SwapPayload): Promise<any>;
    getSubmitAssetPsbtPath(payload: SignedBid): Promise<any>;
    externalSwap(bid: ExternalSwap): Promise<any>;
    buyMarketPlaceOffers(pOffers: any): Promise<{
        txIds: string[];
    }>;
    prepareAddress(marketPlaceBuy: BuildMarketplaceTransaction): Promise<Boolean>;
    canAddressAffordOffers(address: string, estimatedCost: number): Promise<boolean>;
    externalSign(options: any): Promise<string>;
    getUnspentsForAddress(address: string): Promise<any>;
    addInputConditionally(inputData: any): any;
    getUnspentsForAddressInOrderByValue(address: string): Promise<any>;
    getUTXOsToCoverAmount(address: string, amountNeeded: number, excludedUtxos?: any[], insistConfirmedUtxos?: boolean, inscriptionLocs?: string[]): Promise<any>;
    getAllUTXOsWorthASpecificValue(value: number): Promise<any>;
    buildDummyAndPaymentUtxos(orderPrice: number): Promise<{
        dummyUtxos: any[];
        paymentUtxos: any[];
    }>;
    buildOkxRunesPsbt(psbt: string, orderPrice: number, sellerAddress: string): Promise<string>;
    createOkxSignedPsbt(sellerPsbt: string, orderPrice: number): Promise<string>;
    isExcludedUtxo(utxo: any, excludedUtxos: any): any;
    getSignatureForBind(): Promise<string>;
}
