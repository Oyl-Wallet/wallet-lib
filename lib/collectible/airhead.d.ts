import { Account } from '@account/account';
import { Provider } from 'provider';
export declare const createPsbt: ({ account, txId, provider, vout, value, oylFee, scriptpubkey, toAddress, feeRate, fee, }: {
    account: Account;
    txId: string;
    provider: Provider;
    vout: number;
    value: number;
    oylFee: number;
    scriptpubkey: string;
    toAddress: string;
    feeRate?: number;
    fee?: number;
}) => Promise<{
    psbt: string;
}>;
