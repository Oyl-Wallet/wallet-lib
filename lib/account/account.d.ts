import * as bitcoin from 'bitcoinjs-lib';
export type Account = {
    taproot: {
        pubkey: string;
        pubKeyXOnly: string;
        address: string;
    };
    nativeSegwit: {
        pubkey: string;
        address: string;
    };
    nestedSegwit: {
        pubkey: string;
        address: string;
    };
    legacy: {
        pubkey: string;
        address: string;
    };
    spendStrategy: SpendStrategy;
    network: bitcoin.Network;
};
export type AddressKey = 'nativeSegwit' | 'taproot' | 'nestedSegwit' | 'legacy';
export interface SpendStrategy {
    addressOrder: AddressKey[];
    utxoSortGreatestToLeast: boolean;
    changeAddress: AddressKey;
}
export interface MnemonicToAccountOptions {
    network?: bitcoin.networks.Network;
    index?: number;
    spendStrategy?: SpendStrategy;
}
export declare const generateMnemonic: () => string;
export declare const validateMnemonic: (mnemonic: string) => boolean;
export declare const mnemonicToAccount: ({ mnemonic, opts, }: {
    mnemonic?: string;
    opts?: MnemonicToAccountOptions;
}) => Account;
export declare const generateWallet: ({ mnemonic, opts, }: {
    mnemonic?: string;
    opts: MnemonicToAccountOptions;
}) => {
    taproot: {
        pubkey: string;
        pubKeyXOnly: string;
        address: string;
    };
    nativeSegwit: {
        pubkey: string;
        address: string;
    };
    nestedSegwit: {
        pubkey: string;
        address: string;
    };
    legacy: {
        pubkey: string;
        address: string;
    };
    spendStrategy: SpendStrategy;
    network: bitcoin.networks.Network;
};
export declare const getWalletPrivateKeys: ({ mnemonic, opts, }: {
    mnemonic: string;
    opts?: MnemonicToAccountOptions;
}) => {
    taproot: {
        privateKey: string;
    };
    nativeSegwit: {
        privateKey: string;
    };
    nestedSegwit: {
        privateKey: string;
    };
    legacy: {
        privateKey: string;
    };
};
