import { MarketplaceBuy, AddressType } from '../shared/interface';
import * as bitcoin from 'bitcoinjs-lib';
export declare class BuildMarketplaceTransaction {
    walletAddress: string;
    pubKey: string;
    api: any;
    esplora: any;
    psbtBase64: string;
    orderPrice: number;
    sandshrew: any;
    makersAddress: string | null;
    takerScript: string;
    network: bitcoin.Network;
    addressType: AddressType;
    receiveAddress: string;
    feeRate: number;
    constructor({ address, pubKey, receiveAddress, psbtBase64, price, provider, feeRate }: MarketplaceBuy);
    getUTXOsToCoverAmount(amountNeeded: number, inscriptionLocs?: string[]): Promise<any>;
    isWalletPrepared(): Promise<boolean>;
    prepareWallet(): Promise<{
        psbtHex: string;
        psbtBase64: string;
        remainder: number;
    }>;
    checkAffordability(costEstimate: any): Promise<boolean>;
    psbtBuilder(): Promise<{
        psbtHex: string;
        psbtBase64: string;
        remainder: number;
    }>;
    psbtMultiBuilder(previousOrderTxId: any, remainingSats: number): Promise<{
        psbtHex: string;
        psbtBase64: string;
        remainingSats: number;
    }>;
    getAllUTXOsWorthASpecificValue(value: number): Promise<any>;
    calculateAmountGathered(utxoArray: any): any;
    getUnspentsForAddress(): Promise<any>;
    getUnspentsForAddressInOrderByValue(): Promise<any>;
    getMakersAddress(): Promise<void>;
    addInputConditionally(inputData: any): any;
}
