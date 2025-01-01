import { Provider, Account, Signer } from '..';
export declare const defaultProvider: {
    bitcoin: Provider;
    regtest: Provider;
};
export type NetworkType = 'mainnet' | 'regtest';
export interface WalletOptions {
    mnemonic?: string;
    networkType?: NetworkType;
    feeRate?: number;
}
export declare class Wallet {
    mnemonic: string;
    networkType: string;
    provider: Provider;
    account: Account;
    signer: Signer;
    feeRate: number;
    constructor(options?: WalletOptions);
}
