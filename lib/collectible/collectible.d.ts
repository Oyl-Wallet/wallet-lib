import { Provider } from '../provider';
import { Account } from '../account/account';
import { Signer } from '../signer';
export declare const createPsbt: ({ account, inscriptionId, provider, inscriptionAddress, toAddress, feeRate, fee, }: {
    account: Account;
    inscriptionId: string;
    provider: Provider;
    inscriptionAddress: string;
    toAddress: string;
    feeRate?: number;
    fee?: number;
}) => Promise<{
    psbt: string;
}>;
export declare const findCollectible: ({ address, provider, inscriptionId, }: {
    address: string;
    provider: Provider;
    inscriptionId: string;
}) => Promise<{
    txId: string;
    voutIndex: string;
    data: any;
}>;
export declare const send: ({ toAddress, inscriptionId, inscriptionAddress, feeRate, account, provider, signer, }: {
    toAddress: string;
    inscriptionId: string;
    inscriptionAddress?: string;
    feeRate?: number;
    account: Account;
    provider: Provider;
    signer: Signer;
}) => Promise<{
    txId: string;
    rawTx: string;
    size: any;
    weight: any;
    fee: number;
    satsPerVByte: string;
}>;
export declare const actualFee: ({ account, inscriptionId, provider, inscriptionAddress, toAddress, feeRate, signer, }: {
    account: Account;
    inscriptionId: string;
    provider: Provider;
    inscriptionAddress?: string;
    toAddress: string;
    feeRate?: number;
    signer: Signer;
}) => Promise<{
    fee: number;
}>;
