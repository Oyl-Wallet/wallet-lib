/// <reference types="node" />
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairInterface } from 'ecpair';
type walletInit = {
    segwitPrivateKey?: string;
    taprootPrivateKey?: string;
};
export declare class Signer {
    network: bitcoin.Network;
    segwitKeyPair: ECPairInterface;
    taprootKeyPair: ECPairInterface;
    addresses: walletInit;
    constructor(network: bitcoin.Network, keys: walletInit);
    signSegwitInput({ rawPsbt, inputNumber, finalize, }: {
        rawPsbt: string;
        inputNumber: number;
        finalize: boolean;
    }): Promise<{
        signedPsbt: string;
    }>;
    signTaprootInput({ rawPsbt, inputNumber, finalize, }: {
        rawPsbt: string;
        inputNumber: number;
        finalize: boolean;
    }): Promise<{
        signedPsbt: string;
    }>;
    signAllTaprootInputs({ rawPsbt, finalize, }: {
        rawPsbt: string;
        finalize: boolean;
    }): Promise<{
        signedPsbt: string;
        raw: bitcoin.Psbt;
    }>;
    signAllSegwitInputs({ rawPsbt, finalize, }: {
        rawPsbt: string;
        finalize: boolean;
    }): Promise<{
        signedPsbt: string;
        signedHexPsbt: string;
    }>;
    signMessage({ messageToSign, keyToUse, }: {
        messageToSign: string;
        keyToUse: 'segwitKeyPair' | 'taprootKeyPair';
    }): Promise<Buffer>;
}
export {};
