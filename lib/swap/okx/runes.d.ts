import { FormattedUtxo } from "@utxo/utxo";
import { GenOkxRuneUnsignedPsbt } from "../types";
import * as bitcoin from 'bitcoinjs-lib';
interface OkxRuneListingData {
    nftAddress: string;
    runeUtxo: FormattedUtxo;
    receiveBtcAddress: string;
    price: number;
}
export declare function buildOkxRunesPsbt({ address, utxos, network, pubKey, orderPrice, sellerPsbt, addressType, sellerAddress, decodedPsbt, feeRate, receiveAddress }: GenOkxRuneUnsignedPsbt): Promise<string>;
export declare function generateRuneListingUnsignedPsbt(listingData: OkxRuneListingData, network: bitcoin.Network, pubKey: string): Promise<string>;
export {};
