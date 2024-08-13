import { AssetType, MarketplaceOffer } from "../shared/interface";
import { Signer } from '../signer';
import { Provider } from "provider";
export interface UnsignedBid {
    address: string;
    auctionId: string;
    bidPrice: number;
    pubKey: string;
    receiveAddress: string;
    altAddressSignature?: string;
    feerate: number;
    provider: Provider;
    assetType: AssetType;
}
export interface SignedBid {
    psbtHex: string;
    auctionId: string;
    bidId: string;
    provider: Provider;
    assetType: AssetType;
}
export declare function getPsbt(unsignedBid: UnsignedBid): Promise<any>;
export declare function submitPsbt(signedBid: SignedBid): Promise<any>;
export declare function unisatSwap({ address, offer, receiveAddress, feerate, pubKey, assetType, provider, signer }: {
    address: string;
    offer: MarketplaceOffer;
    receiveAddress: string;
    feerate: number;
    pubKey: string;
    assetType: AssetType;
    provider: Provider;
    signer: Signer;
}): Promise<any>;
export declare function getMessageSignature({ address, receiveAddress, signer, }: {
    address: any;
    receiveAddress: any;
    signer: any;
}): Promise<string>;
