import { Provider } from '../provider/provider';
import { Account } from '../account/account';
import { Signer } from '../signer';
export declare const createPsbt: ({ toAddress, amount, feeRate, account, provider, fee, }: {
    toAddress: string;
    feeRate: number;
    amount: number;
    account: Account;
    provider: Provider;
    fee?: number;
}) => Promise<{
    psbt: string;
    fee: number;
}>;
export declare const send: ({ toAddress, amount, feeRate, account, provider, signer, }: {
    toAddress: string;
    feeRate: number;
    amount: number;
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
export declare const actualFee: ({ toAddress, amount, feeRate, account, provider, signer, }: {
    toAddress: string;
    feeRate: number;
    amount: number;
    account: Account;
    provider: Provider;
    signer: Signer;
}) => Promise<{
    fee: number;
}>;
export declare const minimumFee: ({ taprootInputCount, nonTaprootInputCount, outputCount, }: {
    taprootInputCount: number;
    nonTaprootInputCount: number;
    outputCount: number;
}) => number;
