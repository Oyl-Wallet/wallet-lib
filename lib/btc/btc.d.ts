import { Provider } from '../provider/provider';
import { Account } from '../account/account';
import { Signer } from '../signer';
import { FormattedUtxo } from '../utxo';
export declare const createPsbt: ({ utxos, toAddress, amount, feeRate, account, provider, fee, }: {
    utxos: FormattedUtxo[];
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
export declare const send: ({ utxos, toAddress, amount, feeRate, account, provider, signer, fee, }: {
    utxos: FormattedUtxo[];
    toAddress: string;
    amount: number;
    feeRate: number;
    account: Account;
    provider: Provider;
    signer: Signer;
    fee?: number;
}) => Promise<{
    txId: string;
    rawTx: string;
    size: any;
    weight: any;
    fee: number;
    satsPerVByte: string;
}>;
export declare const actualFee: ({ utxos, toAddress, amount, feeRate, account, provider, }: {
    utxos: FormattedUtxo[];
    toAddress: string;
    feeRate: number;
    amount: number;
    account: Account;
    provider: Provider;
}) => Promise<{
    fee: number;
    vsize: number;
}>;
export declare const minimumFee: ({ taprootInputCount, nonTaprootInputCount, outputCount, }: {
    taprootInputCount: number;
    nonTaprootInputCount: number;
    outputCount: number;
}) => number;
