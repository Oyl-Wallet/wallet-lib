import { ProcessOfferOptions, SwapResponse } from '../types';
import { Provider } from '../../provider';
import { AssetType } from '../../shared/interface';
export interface UnsignedOrdinalsWalletBid {
    address: string;
    publicKey: string;
    feeRate: number;
    receiveAddress: string;
    provider: Provider;
    assetType: AssetType;
    inscriptions?: string[];
    outpoints?: string[];
}
export interface signedOrdinalsWalletBid {
    psbt: string;
    setupPsbt?: string;
    provider: Provider;
    assetType: AssetType;
}
export declare function getSellerPsbt(unsignedBid: UnsignedOrdinalsWalletBid): Promise<any>;
export declare function submitPsbt(signedBid: signedOrdinalsWalletBid): Promise<any>;
export declare function ordinalWalletSwap({ address, offer, receiveAddress, feeRate, pubKey, assetType, provider, utxos, signer, }: ProcessOfferOptions): Promise<SwapResponse>;
