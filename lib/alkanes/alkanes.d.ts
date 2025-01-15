/// <reference types="node" />
import { Provider } from '../provider/provider';
import * as bitcoin from 'bitcoinjs-lib';
import { Account } from '../account/account';
import { GatheredUtxos, AlkanesPayload } from '../shared/interface';
import { Signer } from '../signer';
interface AlkaneId {
    block: string;
    tx: string;
}
export declare const createSendPsbt: ({ gatheredUtxos, account, alkaneId, provider, toAddress, amount, feeRate, fee, }: {
    gatheredUtxos: GatheredUtxos;
    account: Account;
    alkaneId: {
        block: string;
        tx: string;
    };
    provider: Provider;
    toAddress: string;
    amount: number;
    feeRate?: number;
    fee?: number;
}) => Promise<{
    psbt: string;
}>;
export declare const createExecutePsbt: ({ gatheredUtxos, account, calldata, provider, feeRate, fee, }: {
    gatheredUtxos: GatheredUtxos;
    account: Account;
    calldata: bigint[];
    provider: Provider;
    feeRate?: number;
    fee?: number;
}) => Promise<{
    psbt: string;
    psbtHex: string;
}>;
export declare const createDeployCommit: ({ payload, gatheredUtxos, tweakedTaprootKeyPair, account, provider, feeRate, fee, }: {
    payload?: AlkanesPayload;
    gatheredUtxos: GatheredUtxos;
    tweakedTaprootKeyPair: bitcoin.Signer;
    account: Account;
    provider: Provider;
    feeRate?: number;
    fee?: number;
}) => Promise<{
    psbt: string;
    script: Buffer;
}>;
export declare const createDeployReveal: ({ createReserveNumber, receiverAddress, script, feeRate, tweakedTaprootKeyPair, provider, fee, commitTxId, }: {
    createReserveNumber: string;
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
export declare const findAlkaneUtxos: ({ address, greatestToLeast, provider, alkaneId, targetNumberOfAlkanes, }: {
    address: string;
    greatestToLeast: boolean;
    provider: Provider;
    alkaneId: {
        block: string;
        tx: string;
    };
    targetNumberOfAlkanes: number;
}) => Promise<{
    alkaneUtxos: any[];
    totalSatoshis: number;
}>;
export declare const actualSendFee: ({ gatheredUtxos, account, alkaneId, provider, toAddress, amount, feeRate, signer, }: {
    gatheredUtxos: GatheredUtxos;
    account: Account;
    alkaneId: {
        block: string;
        tx: string;
    };
    provider: Provider;
    toAddress: string;
    amount: number;
    feeRate?: number;
    signer: Signer;
}) => Promise<{
    fee: number;
}>;
export declare const actualDeployCommitFee: ({ payload, tweakedTaprootKeyPair, gatheredUtxos, account, provider, feeRate, signer, }: {
    payload?: AlkanesPayload;
    tweakedTaprootKeyPair: bitcoin.Signer;
    gatheredUtxos: GatheredUtxos;
    account: Account;
    provider: Provider;
    feeRate?: number;
    signer: Signer;
}) => Promise<{
    fee: number;
}>;
export declare const actualDeployRevealFee: ({ createReserveNumber, tweakedTaprootKeyPair, commitTxId, receiverAddress, script, provider, feeRate, }: {
    createReserveNumber: string;
    tweakedTaprootKeyPair: bitcoin.Signer;
    commitTxId: string;
    receiverAddress: string;
    script: Buffer;
    provider: Provider;
    feeRate?: number;
}) => Promise<{
    fee: number;
}>;
export declare const actualExecuteFee: ({ gatheredUtxos, account, calldata, provider, feeRate, signer, }: {
    gatheredUtxos: GatheredUtxos;
    account: Account;
    calldata: bigint[];
    provider: Provider;
    feeRate: number;
    signer: Signer;
}) => Promise<{
    fee: number;
}>;
export declare const send: ({ gatheredUtxos, toAddress, amount, alkaneId, feeRate, account, provider, signer, }: {
    gatheredUtxos: GatheredUtxos;
    toAddress: string;
    amount: number;
    alkaneId: AlkaneId;
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
export declare const deployCommit: ({ payload, gatheredUtxos, account, provider, feeRate, signer, }: {
    payload?: AlkanesPayload;
    gatheredUtxos: GatheredUtxos;
    account: Account;
    provider: Provider;
    feeRate?: number;
    signer: Signer;
}) => Promise<{
    script: string;
    txId: string;
    rawTx: string;
    size: any;
    weight: any;
    fee: number;
    satsPerVByte: string;
}>;
export declare const deployReveal: ({ createReserveNumber, commitTxId, script, account, provider, feeRate, signer, }: {
    createReserveNumber: string;
    commitTxId: string;
    script: string;
    account: Account;
    provider: Provider;
    feeRate?: number;
    signer: Signer;
}) => Promise<{
    txId: string;
    rawTx: string;
    size: any;
    weight: any;
    fee: number;
    satsPerVByte: string;
}>;
export declare const execute: ({ gatheredUtxos, account, calldata, provider, feeRate, signer, }: {
    gatheredUtxos: GatheredUtxos;
    account: Account;
    calldata: bigint[];
    provider: Provider;
    feeRate?: number;
    signer: Signer;
}) => Promise<{
    txId: string;
    rawTx: string;
    size: any;
    weight: any;
    fee: number;
    satsPerVByte: string;
}>;
export {};
