import { AddressType } from '..';
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
    selectSpendAddress(offers: MarketplaceOffer[]): Promise<void>;
    signMarketplacePsbt(psbt: string, finalize?: boolean): Promise<{
        signedPsbt: string;
        signedHexPsbt: string;
    }>;
    processUnisatOffers(offers: MarketplaceOffer[]): Promise<void>;
}
