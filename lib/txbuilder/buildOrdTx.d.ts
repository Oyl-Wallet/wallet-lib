import { PSBTTransaction } from './PSBTTransaction';
export declare function buildOrdTx(psbtTx: PSBTTransaction, segwitUtxos: any[], allUtxos: any[], segwitAddress: string, toAddress: string, metaOutputValue: any, feeRate: number, inscriptionId: string): Promise<import("bitcoinjs-lib").Psbt>;
