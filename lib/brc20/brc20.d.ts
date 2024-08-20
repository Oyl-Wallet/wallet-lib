/// <reference types="node" />
import { Provider } from '../provider/provider';
import * as bitcoin from 'bitcoinjs-lib';
import { Account } from '../account/account';
import { Signer } from '../signer';
export declare const transferEstimate: ({ toAddress, feeRate, account, provider, fee, }: {
    toAddress: string;
    feeRate: number;
    account: Account;
    provider: Provider;
    fee?: number;
}) => Promise<{
    psbt: string;
    fee: number;
}>;
export declare const commit: ({ ticker, amount, feeRate, account, tweakedTaprootPublicKey, provider, fee, finalSendFee, }: {
    ticker: string;
    amount: number;
    feeRate: number;
    account: Account;
    tweakedTaprootPublicKey: Buffer;
    provider: Provider;
    fee?: number;
    finalSendFee?: number;
}) => Promise<{
    psbt: string;
    fee: number;
    script: Buffer;
}>;
export declare const reveal: ({ receiverAddress, script, feeRate, tweakedTaprootKeyPair, provider, fee, commitTxId, }: {
    receiverAddress: string;
    script: Buffer;
    feeRate: number;
    tweakedTaprootKeyPair: bitcoin.Signer;
    provider: Provider;
    fee?: number;
    commitTxId: string;
}) => Promise<{
    psbt: string;
    psbtHex: string;
    fee: number;
}>;
export declare const transfer: ({ commitChangeUtxoId, revealTxId, toAddress, feeRate, account, provider, fee, }: {
    commitChangeUtxoId: string;
    revealTxId: string;
    toAddress: string;
    feeRate: number;
    account: Account;
    provider: Provider;
    fee?: number;
}) => Promise<{
    psbt: string;
}>;
export declare const send: ({ toAddress, ticker, amount, account, provider, feeRate, signer, }: {
    toAddress: string;
    ticker: string;
    amount: number;
    feeRate: number;
    account: Account;
    provider: Provider;
    signer: Signer;
}) => Promise<{
    txId: string;
    rawTxn: string;
    sendBrc20Txids: string[];
}>;
