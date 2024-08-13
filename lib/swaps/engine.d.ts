import { AddressType } from '..';
import { BuildMarketplaceTransaction } from './buildMarketplaceTx';
import { AssetType, MarketplaceAccount, MarketplaceOffer } from '../shared/interface';
export declare class Engine {
    private provider;
    receiveAddress: string;
    selectedSpendAddress: string | null;
    selectedSpendPubkey: string | null;
    private account;
    private signer;
    assetType: AssetType;
    addressType: AddressType;
    feeRate: number;
    txIds: string[];
    takerScript: string;
    addressesBound: boolean;
    constructor(options: MarketplaceAccount);
    getScriptPubKey(): void;
    selectSpendAddress(offers: MarketplaceOffer[]): Promise<void>;
    signMarketplacePsbt(psbt: string, finalize?: boolean): Promise<{
        signedPsbt: string;
        signedHexPsbt: string;
    }>;
    /**
     *
     * Prepare an address for atomic swaps by creating two fresh 600 satoshi UTXOS
     * for building the
     */
    prepareAddress(marketPlaceBuy: BuildMarketplaceTransaction): Promise<Boolean>;
    dummyUtxosPsbt(): Promise<void>;
}
