/// <reference types="node" />
import { FormattedUtxo } from '../shared/interface';
import { Provider } from '../provider';
import { BidAffordabilityCheck, BidAffordabilityCheckResponse, BuiltPsbt, ConditionalInput, DummyUtxoOptions, MarketplaceBatchOffer, MarketplaceOffer, Marketplaces, OutputTxCheck, PrepareAddressForDummyUtxos, PsbtBuilder, SelectSpendAddress, SelectSpendAddressResponse, TxAddressTypes, UtxosToCoverAmount } from './types';
import { AddressType } from '../shared/interface';
import * as bitcoin from 'bitcoinjs-lib';
export declare const maxTxSizeForOffers: number;
export declare const CONFIRMED_UTXO_ENFORCED_MARKETPLACES: Marketplaces[];
export declare const DUMMY_UTXO_ENFORCED_MARKETPLACES: Marketplaces[];
export declare const ESTIMATE_TX_SIZE: number;
export declare const DUMMY_UTXO_SATS: number;
export declare function getUTXOsToCoverAmount({ utxos, amountNeeded, excludedUtxos, insistConfirmedUtxos, }: UtxosToCoverAmount): FormattedUtxo[];
export declare function isExcludedUtxo(utxo: FormattedUtxo, excludedUtxos: FormattedUtxo[]): Boolean;
export declare function getAllUTXOsWorthASpecificValue(utxos: FormattedUtxo[], value: number): FormattedUtxo[];
export declare function addInputConditionally(inputData: ConditionalInput, addressType: AddressType, pubKey: string): ConditionalInput;
export declare function getBidCostEstimate(offers: MarketplaceOffer[], feeRate: number): number;
/**
 *
 * ONLY INSIST retrieving confirmed utxos IF ALL the offers are from CONFIRMED_UTXO_ENFORCED_MARKETPLACES
 * Otherwise if there is AT LEAST ONE offer from a marketplace that does not enforce confirmed
 * utxos, DONT INSIST retrieving confirmed utxos.
 *  */
export declare function canAddressAffordBid({ estimatedCost, offers, utxos }: BidAffordabilityCheck): Promise<BidAffordabilityCheckResponse>;
export declare function calculateAmountGathered(utxoArray: FormattedUtxo[]): number;
export declare function selectSpendAddress({ offers, provider, feeRate, account, utxos }: SelectSpendAddress): Promise<SelectSpendAddressResponse>;
export declare function sanitizeFeeRate(provider: Provider, feeRate: number): Promise<number>;
export declare function prepareAddressForDummyUtxos({ address, network, pubKey, feeRate, addressType, nUtxos, utxos, }: PrepareAddressForDummyUtxos): Promise<BuiltPsbt | null>;
export declare function dummyUtxosPsbt({ address, utxos, feeRate, pubKey, addressType, network, nUtxos, }: DummyUtxoOptions): BuiltPsbt;
export declare function updateUtxos({ originalUtxos, txId, spendAddress, provider, }: {
    originalUtxos: FormattedUtxo[];
    txId: string;
    spendAddress: string;
    provider: Provider;
}): Promise<FormattedUtxo[]>;
export declare function outputTxCheck({ blueprint, swapTx, output, index, }: OutputTxCheck): boolean;
export declare function batchMarketplaceOffer(offers: MarketplaceOffer[]): (MarketplaceOffer | MarketplaceBatchOffer)[];
export declare function psbtTxAddressTypes({ psbt, network, }: {
    psbt: bitcoin.Psbt;
    network: bitcoin.Network;
}): {
    inputAddressTypes: AddressType[];
    outputAddressTypes: AddressType[];
};
export declare function estimatePsbtFee({ txAddressTypes, witness, }: {
    txAddressTypes: TxAddressTypes;
    witness?: Buffer[];
}): number;
export declare function buildPsbtWithFee({ inputTemplate, outputTemplate, utxos, changeOutput, retrievedUtxos, spendAddress, spendPubKey, amountRetrieved, spendAmount, addressType, feeRate, network, }: PsbtBuilder): BuiltPsbt;
