/// <reference types="node" />
import { FormattedUtxo } from '../utxo/utxo';
import { Provider } from "provider";
import { AddressType, BidAffordabilityCheck, BuiltPsbt, ConditionalInput, MarketplaceOffer, Marketplaces, PsbtBuilder, UtxosToCoverAmount } from "../shared/interface";
import * as bitcoin from 'bitcoinjs-lib';
export declare const maxTxSizeForOffers: number;
export declare const CONFIRMED_UTXO_ENFORCED_MARKETPLACES: Marketplaces[];
export declare const ESTIMATE_TX_SIZE: number;
export declare const DUMMY_UTXO_SATS: number;
export declare function getUTXOsToCoverAmount({ utxos, amountNeeded, excludedUtxos, insistConfirmedUtxos }: UtxosToCoverAmount): FormattedUtxo[];
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
export declare function canAddressAffordBid({ address, estimatedCost, offers, provider }: BidAffordabilityCheck): Promise<Boolean>;
export declare function calculateAmountGathered(utxoArray: FormattedUtxo[]): number;
export declare function broadcastSignedTx(psbt: string, provider: Provider): Promise<any[]>;
export declare function sanitizeFeeRate(provider: Provider, feeRate: number): Promise<number>;
export declare function psbtTxAddressTypes({ psbt, network }: {
    psbt: bitcoin.Psbt;
    network: bitcoin.Network;
}): {
    inputAddressTypes: AddressType[];
    outputAddressTypes: AddressType[];
};
export declare function estimatePsbtFee({ psbt, network, witness }: {
    psbt: bitcoin.Psbt;
    network: bitcoin.Network;
    witness?: Buffer[];
}): number;
export declare function buildPsbtWithFee({ inputTemplate, outputTemplate, utxos, changeOutput, retrievedUtxos, spendAddress, spendPubKey, amountRetrieved, spendAmount, addressType, feeRate, network }: PsbtBuilder): BuiltPsbt;
