import { Command } from 'commander';
export declare const RANDOM_ADDRESS = "bcrt1qz3y37epk6hqlul2pt09hrwgj0s09u5g6kzrkm2";
export declare const REGTEST_FAUCET: {
    mnemonic: string;
    nativeSegwit: {
        address: string;
        publicKey: string;
    };
    taproot: {
        address: string;
        publicKey: string;
        publicKeyXonly: string;
    };
    privateKey: string;
    publicKey: string;
    wif: string;
};
export declare const init: Command;
