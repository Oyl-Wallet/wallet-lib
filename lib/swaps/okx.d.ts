import * as bitcoin from 'bitcoinjs-lib';
import { FormattedUtxo } from '../utxo/utxo';
import { Signer } from '../signer';
import { Provider } from 'provider';
import { AddressType, AssetType, BuiltPsbt, MarketplaceOffer } from 'shared/interface';
interface DummyUtxoOptions {
    address: string;
    utxos: FormattedUtxo[];
    feeRate: number;
    pubKey: string;
    network: bitcoin.Network;
    addressType: AddressType;
}
interface PaymentUtxoOptions {
    utxos: FormattedUtxo[];
    feeRate: number;
    orderPrice: number;
    address: string;
    receiveAddress: string;
    sellerPsbt: string;
}
interface PrepareOkxAddress {
    address: string;
    provider: Provider;
    feeRate: number;
    pubKey: string;
    addressType: AddressType;
}
interface SignedOkxBid {
    fromAddress: string;
    psbt?: string;
    assetType: AssetType;
    provider: Provider;
    offer: MarketplaceOffer;
}
interface UnsignedOkxBid {
    offerId: number;
    assetType: AssetType;
    provider: Provider;
}
interface GenBrcAndCollectibleSignedPsbt {
    address: string;
    utxos: FormattedUtxo[];
    feeRate: number;
    receiveAddress: string;
    network: bitcoin.Network;
    pubKey: string;
    addressType: AddressType;
    signer?: Signer;
    sellerPsbt: string;
    orderPrice: number;
}
interface GenBrcAndCollectibleUnsignedPsbt {
    address: string;
    utxos: FormattedUtxo[];
    feeRate: number;
    receiveAddress: string;
    network: bitcoin.Network;
    pubKey: string;
    addressType: AddressType;
    sellerPsbt: string;
    orderPrice: number;
}
interface UnsignedPsbt {
    address: string;
    utxos: FormattedUtxo[];
    feeRate: number;
    receiveAddress: string;
    network: bitcoin.Network;
    pubKey: string;
    addressType: AddressType;
    signer?: Signer;
    sellerPsbt: string;
    orderPrice: number;
    sellerAddress?: string;
    assetType: AssetType;
}
export declare function prepareAddressForOkxPsbt({ address, provider, pubKey, feeRate, addressType, }: PrepareOkxAddress): Promise<string | null>;
export declare function dummyUtxosPsbt({ address, utxos, feeRate, pubKey, addressType, network }: DummyUtxoOptions): BuiltPsbt;
export declare function getSellerPsbt(unsignedBid: UnsignedOkxBid): Promise<any>;
export declare function submitSignedPsbt(signedBid: SignedOkxBid): Promise<any>;
export declare function getBuyerPsbt(unsignedPsbt: UnsignedPsbt): Promise<string>;
export declare function genBrcAndOrdinalSignedPsbt({ address, utxos, network, addressType, orderPrice, signer, sellerPsbt, feeRate, receiveAddress }: GenBrcAndCollectibleSignedPsbt): string;
export declare function genBrcAndOrdinalUnsignedPsbt({ address, utxos, network, pubKey, orderPrice, sellerPsbt, feeRate, receiveAddress }: GenBrcAndCollectibleUnsignedPsbt): string;
export declare function mergeSignedPsbt(signedBuyerPsbt: string, sellerPsbt: string[]): string;
export declare function buildDummyAndPaymentUtxos({ utxos, feeRate, orderPrice, address, receiveAddress, sellerPsbt }: PaymentUtxoOptions): {
    dummyUtxos: any[];
    paymentUtxos: any[];
};
export declare function okxSwap({ address, offer, receiveAddress, feeRate, pubKey, assetType, provider, signer }: {
    address: string;
    offer: MarketplaceOffer;
    receiveAddress: string;
    feeRate: number;
    pubKey: string;
    assetType: AssetType;
    provider: Provider;
    signer: Signer;
}): Promise<void>;
export {};
