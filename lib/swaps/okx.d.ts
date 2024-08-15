import { Signer } from '../signer';
import { Provider } from 'provider';
import { AddressType, BuiltPsbt } from 'shared/interface';
interface DummyUtxoOptions {
    address: string;
    provider: Provider;
    feeRate: number;
    pubKey: string;
    addressType: AddressType;
}
interface PrepareOkxAddress {
    address: string;
    provider: Provider;
    feeRate: number;
    pubKey: string;
    addressType: AddressType;
    signer: Signer;
}
/**
     *
     * Prepare an address for atomic swaps by creating two fresh 600 satoshi UTXOS
     * for building the
     */
export declare function prepareAddressForOkxPsbt({ address, provider, pubKey, feeRate, addressType, signer }: PrepareOkxAddress): Promise<string[]>;
export declare function dummyUtxosPsbt({ address, provider, feeRate, pubKey, addressType }: DummyUtxoOptions): Promise<BuiltPsbt>;
export {};
