import { SandshrewBitcoinClient } from '../rpclient/sandshrew';
import { EsploraRpc } from '../rpclient/esplora';
import { OrdRpc } from '../rpclient/ord';
import { OylApiClient } from '../apiclient';
import * as bitcoin from 'bitcoinjs-lib';
export declare class Provider {
    sandshrew: SandshrewBitcoinClient;
    esplora: EsploraRpc;
    ord: OrdRpc;
    api: OylApiClient;
    network: bitcoin.networks.Network;
    constructor({ url, projectId, network, networkType, version, }: {
        url: string;
        projectId: string;
        network: bitcoin.networks.Network;
        networkType: 'signet' | 'mainnet' | 'testnet';
        version?: string;
    });
    getHost(networkType: 'signet' | 'mainnet' | 'testnet'): "https://api.oyl.gg" | "http://localhost:3000";
    pushPsbt({ psbtHex, psbtBase64, }: {
        psbtHex?: string;
        psbtBase64?: string;
    }): Promise<{
        txId: string;
        rawTx: string;
        size: any;
        weight: any;
        fee: number;
        satsPerVByte: string;
    }>;
}
