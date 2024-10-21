import { ProcessOfferOptions, SwapResponse } from "../types";
export declare function magicEdenSwap({ address, offer, receiveAddress, feeRate, pubKey, assetType, provider, utxos, receivePublicKey, signer }: ProcessOfferOptions): Promise<SwapResponse>;
