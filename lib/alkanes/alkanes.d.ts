/// <reference types="node" />
/// <reference types="node" />
import { Provider } from '../provider/provider';
import { Account, Signer } from '..';
import { GatheredUtxos, AlkanesPayload } from '../shared/interface';
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
export declare const actualExecuteFee: ({ gatheredUtxos, account, calldata, provider, feeRate, }: {
    gatheredUtxos: GatheredUtxos;
    account: Account;
    calldata: bigint[];
    provider: Provider;
    feeRate: number;
}) => Promise<{
    fee: number;
    vsize: number;
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
export declare const createDeployCommit: ({ payload, gatheredUtxos, tweakedPublicKey, account, provider, feeRate, fee, }: {
    payload: AlkanesPayload;
    gatheredUtxos: GatheredUtxos;
    tweakedPublicKey: string;
    account: Account;
    provider: Provider;
    feeRate?: number;
    fee?: number;
}) => Promise<{
    psbt: string;
    script: Buffer;
}>;
export declare const createDeployReveal: ({ createReserveNumber, receiverAddress, script, feeRate, tweakedPublicKey, provider, fee, commitTxId, }: {
    createReserveNumber: string;
    receiverAddress: string;
    script: Buffer;
    feeRate: number;
    tweakedPublicKey: string;
    provider: Provider;
    fee?: number;
    commitTxId: string;
}) => Promise<{
    psbt: string;
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
export declare const actualTransactRevealFee: ({ calldata, tweakedPublicKey, commitTxId, receiverAddress, script, provider, feeRate, }: {
    calldata: bigint[];
    tweakedPublicKey: string;
    commitTxId: string;
    receiverAddress: string;
    script: Buffer;
    provider: Provider;
    feeRate?: number;
}) => Promise<{
    fee: number;
    vsize: number;
}>;
export declare const executeReveal: ({ calldata, commitTxId, script, account, provider, feeRate, signer, }: {
    calldata: bigint[];
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
export declare const createTransactReveal: ({ calldata, receiverAddress, script, feeRate, tweakedPublicKey, provider, fee, commitTxId, }: {
    calldata: bigint[];
    receiverAddress: string;
    script: Buffer;
    feeRate: number;
    tweakedPublicKey: string;
    provider: Provider;
    fee?: number;
    commitTxId: string;
}) => Promise<{
    psbt: string;
    fee: number;
}>;
export declare const deployCommit: ({ payload, gatheredUtxos, account, provider, feeRate, signer, }: {
    payload: AlkanesPayload;
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
