import { BuildMarketplaceTransaction } from './buildMarketplaceTx';
import { AssetType, MarketplaceAccount, MarketplaceOffer } from '../shared/interface';
export declare class Engine {
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
    signMarketplacePsbt(psbt: string, finalize?: boolean): Promise<{
        signedPsbt: string;
        signedHexPsbt: string;
    }>;
    prepareAddress(marketPlaceBuy: BuildMarketplaceTransaction): Promise<Boolean>;
    canAddressAffordOffers(address: string, estimatedCost: number): Promise<boolean>;
    addInputConditionally(inputData: any): any;
    getUnspentsForAddress(address: string): Promise<any>;
    getUnspentsForAddressInOrderByValue(address: string): Promise<any>;
    getUTXOsToCoverAmount(address: string, amountNeeded: number, excludedUtxos?: any[], insistConfirmedUtxos?: boolean, inscriptionLocs?: string[]): Promise<any>;
    getAllUTXOsWorthASpecificValue(value: number): Promise<any>;
    isExcludedUtxo(utxo: any, excludedUtxos: any): any;
}
