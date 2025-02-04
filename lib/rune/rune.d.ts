/// <reference types="node" />
/// <reference types="node" />
import { Provider } from '../provider/provider';
import { Account } from '../account/account';
import { GatheredUtxos, RuneUTXO } from '../shared/interface';
import { Signer } from '../signer';
interface SingleRuneOutpoint {
    output: string;
    wallet_addr: string;
    pkscript: string;
    balances: number[];
    decimals: number[];
    rune_ids: string[];
    satoshis?: number;
}
export declare const createSendPsbt: ({ gatheredUtxos, account, runeId, provider, inscriptionAddress, toAddress, amount, feeRate, fee, }: {
    gatheredUtxos: GatheredUtxos;
    account: Account;
    runeId: string;
    provider: Provider;
    inscriptionAddress: string;
    toAddress: string;
    amount: number;
    feeRate?: number;
    fee?: number;
}) => Promise<{
    psbt: string;
}>;
export declare const createMintPsbt: ({ gatheredUtxos, account, runeId, provider, feeRate, fee, }: {
    gatheredUtxos: GatheredUtxos;
    account: Account;
    runeId: string;
    provider: Provider;
    feeRate?: number;
    fee?: number;
}) => Promise<{
    psbt: string;
}>;
export declare const createEtchCommit: ({ gatheredUtxos, tweakedPublicKey, runeName, account, provider, feeRate, fee, }: {
    gatheredUtxos: GatheredUtxos;
    tweakedPublicKey: string;
    runeName: string;
    account: Account;
    provider: Provider;
    feeRate?: number;
    fee?: number;
}) => Promise<{
    psbt: string;
    script: Buffer;
}>;
export declare const createEtchReveal: ({ symbol, cap, premine, perMintAmount, turbo, divisibility, runeName, receiverAddress, script, feeRate, tweakedPublicKey, provider, fee, commitTxId, account, }: {
    symbol: string;
    cap: bigint;
    premine: bigint;
    perMintAmount: bigint;
    turbo: boolean;
    divisibility: number;
    runeName: string;
    receiverAddress: string;
    script: Buffer;
    feeRate: number;
    tweakedPublicKey: string;
    provider: Provider;
    fee?: number;
    commitTxId: string;
    account: Account;
}) => Promise<{
    psbt: string;
}>;
export declare const getRuneOutpoints: ({ address, provider, runeId, }: {
    address: string;
    provider: Provider;
    runeId: string;
}) => Promise<SingleRuneOutpoint[]>;
export declare const findRuneUtxos: ({ address, greatestToLeast, provider, runeId, targetNumberOfRunes, }: {
    address: string;
    greatestToLeast: boolean;
    provider: Provider;
    runeId: string;
    targetNumberOfRunes: number;
}) => Promise<{
    runeUtxos: RuneUTXO[];
    runeTotalSatoshis: number;
    divisibility: number;
}>;
export declare const actualSendFee: ({ gatheredUtxos, account, runeId, provider, inscriptionAddress, toAddress, amount, feeRate, }: {
    gatheredUtxos: GatheredUtxos;
    account: Account;
    runeId: string;
    provider: Provider;
    inscriptionAddress?: string;
    toAddress: string;
    amount: number;
    feeRate?: number;
}) => Promise<{
    fee: number;
    vsize: number;
}>;
export declare const actualMintFee: ({ gatheredUtxos, account, runeId, provider, feeRate, }: {
    gatheredUtxos: GatheredUtxos;
    account: Account;
    runeId: string;
    provider: Provider;
    feeRate?: number;
}) => Promise<{
    fee: number;
    vsize: number;
}>;
export declare const actualEtchCommitFee: ({ tweakedPublicKey, gatheredUtxos, account, runeName, provider, feeRate, }: {
    tweakedPublicKey: string;
    gatheredUtxos: GatheredUtxos;
    account: Account;
    runeName: string;
    provider: Provider;
    feeRate?: number;
}) => Promise<{
    fee: number;
    vsize: number;
}>;
export declare const actualEtchRevealFee: ({ tweakedPublicKey, symbol, cap, premine, perMintAmount, turbo, divisibility, runeName, commitTxId, receiverAddress, script, account, provider, feeRate, }: {
    tweakedPublicKey: string;
    symbol: string;
    cap: bigint;
    premine: bigint;
    perMintAmount: bigint;
    turbo: boolean;
    divisibility: number;
    runeName: string;
    commitTxId: string;
    receiverAddress: string;
    script: Buffer;
    account: Account;
    provider: Provider;
    feeRate?: number;
}) => Promise<{
    fee: number;
    vsize: number;
}>;
export declare const send: ({ gatheredUtxos, toAddress, amount, runeId, inscriptionAddress, feeRate, account, provider, signer, }: {
    gatheredUtxos: GatheredUtxos;
    toAddress: string;
    amount: number;
    runeId: string;
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
export declare const mint: ({ gatheredUtxos, account, runeId, provider, feeRate, signer, }: {
    gatheredUtxos: GatheredUtxos;
    account: Account;
    runeId: string;
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
export declare const etchCommit: ({ gatheredUtxos, runeName, account, provider, feeRate, signer, }: {
    gatheredUtxos: GatheredUtxos;
    runeName: string;
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
export declare const etchReveal: ({ symbol, cap, premine, perMintAmount, turbo, divisibility, commitTxId, script, runeName, account, provider, feeRate, signer, }: {
    symbol: string;
    cap?: bigint;
    premine?: bigint;
    perMintAmount: bigint;
    turbo?: boolean;
    divisibility?: number;
    commitTxId: string;
    script: string;
    runeName: string;
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
export {};
