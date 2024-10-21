import { AddressType, AssetType, FormattedUtxo } from '../shared/interface'
import { Psbt } from 'bitcoinjs-lib'
import { Provider } from '../provider'
import { Account } from '../account'
import * as bitcoin from 'bitcoinjs-lib'
import { Signer } from '../signer'

export interface ConditionalInput {
  hash: string
  index: number
  witnessUtxo: { value: number; script: Buffer }
  tapInternalKey?: Buffer
  segwitInternalKey?: Buffer
}

export interface SelectedUtxoOffers {
  offer: MarketplaceOffer
  utxo: FormattedUtxo[]
}

export interface DummyUtxoOptions {
  address: string
  utxos: FormattedUtxo[]
  feeRate: number
  pubKey: string
  nUtxos?: number
  network: bitcoin.Network
  addressType: AddressType
}

export interface PaymentUtxoOptions {
  utxos: FormattedUtxo[]
  feeRate: number
  orderPrice: number
  address: string
  receiveAddress: string
  sellerPsbt: string
}

export interface PrepareAddressForDummyUtxos {
  address: string
  network: bitcoin.Network
  feeRate: number
  pubKey: string
  nUtxos?: number
  utxos?: FormattedUtxo[]
  addressType: AddressType
}

export interface SignedOkxBid {
  fromAddress: string
  psbt?: string
  assetType: AssetType
  provider: Provider
  offer: MarketplaceOffer
}

export interface UnsignedOkxBid {
  offerId: number
  assetType: AssetType
  provider: Provider
}

export interface GenOkxBrcAndCollectibleUnsignedPsbt {
  address: string
  utxos: FormattedUtxo[]
  feeRate: number
  receiveAddress: string
  network: bitcoin.Network
  pubKey: string
  addressType: AddressType
  sellerPsbt: string
  orderPrice: number
}

export interface GenOkxRuneUnsignedPsbt {
  address: string
  utxos: FormattedUtxo[]
  feeRate: number
  decodedPsbt?: any
  receiveAddress: string
  network: bitcoin.Network
  pubKey: string
  addressType: AddressType
  sellerPsbt: string
  sellerAddress: string
  orderPrice: number
}

export interface UnsignedPsbt {
  address: string
  utxos: FormattedUtxo[]
  feeRate: number
  receiveAddress: string
  network: bitcoin.Network
  pubKey: string
  addressType: AddressType
  signer?: Signer
  decodedPsbt?: any
  sellerPsbt: string
  orderPrice: number
  sellerAddress?: string
  assetType: AssetType
}

export interface SelectSpendAddress {
  offers: MarketplaceOffer[]
  provider: Provider
  feeRate: number
  account: Account
  utxos: FormattedUtxo[]
}

export interface SelectSpendAddressResponse {
  offers: MarketplaceOffer[]
  utxos: FormattedUtxo[]
  address: string
  pubKey: string
  addressType: AddressType
}

export interface MarketplaceOffer {
  ticker: string
  offerId: any
  amount?: string
  address?: string
  marketplace: string
  price?: number
  unitPrice?: number
  totalPrice?: number
  psbt?: string
  outpoint?: string
  inscriptionId?: string
}

export interface MarketplaceBatchOffer {
  ticker: string
  offerId: string[]
  amount?: string[]
  address?: string[]
  marketplace: string
  price?: number[]
  unitPrice?: number[]
  totalPrice?: number[]
  psbt?: string
  outpoint?: string[]
  inscriptionId?: string[]
}

export enum Marketplaces {
  UNISAT,
  OKX,
  ORDINALS_WALLET,
  MAGISAT,
  MAGIC_EDEN,
}

export interface PsbtBuilder {
  network: bitcoin.Network
  utxos: FormattedUtxo[]
  retrievedUtxos?: FormattedUtxo[]
  inputTemplate: ConditionalInput[]
  changeOutput: OutputTxTemplate | null
  outputTemplate: OutputTxTemplate[]
  amountRetrieved: number
  spendAddress: string
  spendPubKey: string
  spendAmount: number
  addressType: AddressType
  feeRate: number
}

export interface BuiltPsbt {
  psbtHex: string
  psbtBase64: string
  inputTemplate: ConditionalInput[]
  outputTemplate: OutputTxTemplate[]
}
export interface GetSellerPsbtRequest {
  //<T extends GetSellerPsbtSchemas = GetSellerPsbtSchemas> {
  marketplaceType: Marketplaces
  assetType: AssetType
  buyerAddress: string
  buyerPublicKey: string
  feeRate: number
  ticker?: string
  receiveAddress?: string
  receivePublicKey?: string;
  orders: BuyOrder[]
  //additionalParams?: Omit<T, keyof GetSellerPsbtRequest<T>>;
}

export interface BuyOrder {
  orderId?: string | number
  price?: number
  inscriptionId?: string
  outpoint?: string
  amount?: number
  bidId?: string
  fee?: number
}

export interface GetSellerPsbtResponse {
  marketplaceType: Marketplaces
  psbt: string
  additionalData?: {
    [key: string]: any
  }
}

export interface SubmitBuyerPsbtRequest {
  //<T extends SubmitBuyerPsbtSchemas = SubmitBuyerPsbtSchemas> {
  marketplaceType: Marketplaces
  assetType: AssetType
  buyerAddress: string
  buyerPublicKey?: string
  receiveAddress?: string
  psbt: string
  orders: BuyOrder[]
  //additionalParams?: Omit<T, keyof SubmitBuyerPsbtRequest<T>>;
}

export interface SubmitBuyerPsbtResponse {
  marketplaceType: Marketplaces
  txid: string
  additionalData?: {
    [key: string]: any
  }
}

export interface SwapResponse {
  dummyTxId: string
  purchaseTxId: string
}

export interface OutputTxTemplate {
  address: string
  value: number
}

export interface SwapPayload {
  address: string
  auctionId: string
  bidPrice: number
  pubKey: string
  receiveAddress: string
  feerate: number
}

export const marketplaceName = {
  unisat: Marketplaces.UNISAT,
  okx: Marketplaces.OKX,
  'ordinals-wallet': Marketplaces.ORDINALS_WALLET,
  magisat: Marketplaces.MAGISAT,
  'magic-eden': Marketplaces.MAGIC_EDEN,
}

export interface UtxosToCoverAmount {
  utxos: FormattedUtxo[]
  amountNeeded: number
  excludedUtxos?: FormattedUtxo[]
  insistConfirmedUtxos?: boolean
}

export interface BidAffordabilityCheck {
  estimatedCost: number
  offers: MarketplaceOffer[]
  utxos: FormattedUtxo[]
}

export interface BidAffordabilityCheckResponse {
  retrievedUtxos: FormattedUtxo[]
  estimatedCost: number
  offers_: MarketplaceOffer[]
  canAfford: boolean
}

export interface OutputTxCheck {
  blueprint: FormattedUtxo
  swapTx: boolean
  output: OutputTxTemplate
  index: number
}

export interface TxAddressTypes {
  inputAddressTypes: AddressType[]
  outputAddressTypes: AddressType[]
}

export interface UpdateUtxos {
  originalUtxos: FormattedUtxo[]
  swapTx?: boolean
  txId: string
  inputTemplate: ConditionalInput[]
  outputTemplate: OutputTxTemplate[]
}

export interface FeeEstimatorOptions {
  feeRate: number
  network: bitcoin.Network
  psbt?: Psbt
  witness?: Buffer[]
}
export interface ProcessOfferOptions {
  address: string
  offer: MarketplaceOffer | MarketplaceBatchOffer
  receiveAddress: string
  utxos: FormattedUtxo[]
  feeRate: number
  pubKey: string
  receivePublicKey?: string;
  assetType: AssetType
  provider: Provider
  signer: Signer
}
