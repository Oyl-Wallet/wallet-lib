import * as bitcoin from 'bitcoinjs-lib'
import { FormattedUtxo, addressSpendableUtxos } from '../utxo/utxo';
import { Signer } from '../signer'
import { Provider } from 'provider'
import { getAddressType, timeout } from ".."
import {
    genSignedBuyingPSBTWithoutListSignature,
    generateUnsignedBuyingPsbt,
    mergeSignedBuyingPsbt,
    BuyingData,
} from '@okxweb3/coin-bitcoin'
import { DUMMY_UTXO_SATS, ESTIMATE_TX_SIZE, addInputConditionally, broadcastSignedTx, buildPsbtWithFee, calculateAmountGathered, getAllUTXOsWorthASpecificValue, getUTXOsToCoverAmount } from './helpers'
import { AddressType, AssetType, BuiltPsbt, ConditionalInput, MarketplaceOffer, OutputTxTemplate } from "../shared/interface"

interface DummyUtxoOptions {
    address: string
    utxos: FormattedUtxo[]
    feeRate: number
    pubKey: string
    network: bitcoin.Network
    addressType: AddressType
}

interface BuyingDataUtxos {
    txHash: string
    vout: number
    coinAmount: number
}

interface PaymentUtxoOptions {
    utxos: FormattedUtxo[]
    feeRate: number
    orderPrice: number
    address: string
    receiveAddress: string
    sellerPsbt: string
}

interface PrepareOkxAddress {
    address: string
    provider: Provider
    feeRate: number
    pubKey: string
    addressType: AddressType
}

interface SignedOkxBid {
    fromAddress: string;
    psbt?: string;
    assetType: AssetType
    provider: Provider
    offer: MarketplaceOffer
}

interface UnsignedOkxBid {
    offerId: number
    assetType: AssetType
    provider: Provider
}

interface GenBrcAndCollectibleSignedPsbt {
    address: string
    utxos: FormattedUtxo[]
    feeRate: number
    receiveAddress: string
    network: bitcoin.Network
    pubKey: string
    addressType: AddressType
    signer?: Signer
    sellerPsbt: string
    orderPrice: number
}

interface GenBrcAndCollectibleUnsignedPsbt {
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

interface UnsignedPsbt {
    address: string
    utxos: FormattedUtxo[]
    feeRate: number
    receiveAddress: string
    network: bitcoin.Network
    pubKey: string
    addressType: AddressType
    signer?: Signer
    sellerPsbt: string
    orderPrice: number
    sellerAddress?: string
    assetType: AssetType
}

export async function prepareAddressForOkxPsbt({
    address,
    provider,
    pubKey,
    feeRate,
    addressType,
}:
    PrepareOkxAddress
): Promise<string | null>{
    try {
        const { utxos } = await addressSpendableUtxos({ address, provider });
        const paddingUtxos = getAllUTXOsWorthASpecificValue(utxos, 600)
        if (paddingUtxos.length < 2) {
            const network = provider.network
            const { psbtBase64 } = dummyUtxosPsbt({ address, utxos, network, feeRate, pubKey, addressType })
            return psbtBase64;
        }
        return null;
    } catch (err) {
        throw new Error(
            'An error occured while preparing address for okx marketplace'
        )
    }
}



export function dummyUtxosPsbt({ address, utxos, feeRate, pubKey, addressType, network }: DummyUtxoOptions): BuiltPsbt {
    const amountNeeded = (DUMMY_UTXO_SATS + parseInt((ESTIMATE_TX_SIZE * feeRate).toFixed(0)))
    const retrievedUtxos = getUTXOsToCoverAmount({
        utxos,
        amountNeeded,
    })
    if (retrievedUtxos.length === 0) {
        throw new Error('No utxos available')
    }

    const txInputs: ConditionalInput[] = []
    const txOutputs: OutputTxTemplate[] = []

    retrievedUtxos.forEach((utxo) => {
        const input = addInputConditionally({
            hash: utxo.txId,
            index: utxo.outputIndex,
            witnessUtxo: {
                value: utxo.satoshis,
                script: Buffer.from(utxo.scriptPk, 'hex'),
            },
        }, addressType, pubKey)
        txInputs.push(input)
    })

    const amountRetrieved = calculateAmountGathered(retrievedUtxos)
    const changeAmount = amountRetrieved - amountNeeded
    let changeOutput: OutputTxTemplate | null = null
    txOutputs.push({
        address,
        value: 600,
    })
    txOutputs.push({
        address,
        value: 600,
    })
    if (changeAmount > 0) changeOutput = { address, value: changeAmount }

    return buildPsbtWithFee({
        inputTemplate: txInputs,
        outputTemplate: txOutputs,
        utxos,
        changeOutput,
        retrievedUtxos,
        spendAddress: address,
        spendPubKey: pubKey,
        amountRetrieved,
        spendAmount: DUMMY_UTXO_SATS,
        feeRate,
        network,
        addressType
    })

}


export async function getSellerPsbt(unsignedBid: UnsignedOkxBid) {
    switch (unsignedBid.assetType) {
        case AssetType.BRC20:
            return await unsignedBid.provider.api.getOkxOfferPsbt({ offerId: unsignedBid.offerId })

        case AssetType.RUNES:
            return await unsignedBid.provider.api.getOkxOfferPsbt({ offerId: unsignedBid.offerId, rune: true })

        case AssetType.COLLECTIBLE:
            return await unsignedBid.provider.api.getOkxOfferPsbt({ offerId: unsignedBid.offerId })
    }
}


export async function submitSignedPsbt(signedBid: SignedOkxBid) {
    const offer = signedBid.offer
    switch (signedBid.assetType) {
        case AssetType.BRC20:
            const brcPayload = {
                ticker: offer.ticker,
                price: offer.totalPrice,
                amount: parseInt(offer.amount),
                fromAddress: signedBid.fromAddress,
                toAddress: offer.address,
                inscriptionId: offer.inscriptionId,
                buyerPsbt: signedBid.psbt,
                orderId: offer.offerId,
                brc20: true
            }
            return await signedBid.provider.api.submitOkxBid(brcPayload)

        case AssetType.RUNES:
            const runePayload = {
                fromAddress: signedBid.fromAddress,
                psbt: signedBid.psbt,
                orderId: offer.offerId,
            }
            return await signedBid.provider.api.submitOkxRuneBid(runePayload)

        case AssetType.COLLECTIBLE:
            const collectiblePayload = {
                ticker: offer.ticker,
                price: offer.totalPrice,
                amount: parseInt(offer.amount),
                fromAddress: signedBid.fromAddress,
                toAddress: offer.address,
                inscriptionId: offer.inscriptionId,
                buyerPsbt: signedBid.psbt,
                orderId: offer.offerId,
                brc20: false
            }
            return await signedBid.provider.api.submitOkxBid(collectiblePayload)

    }
}
export async function getBuyerPsbt(unsignedPsbt: UnsignedPsbt) {
    switch (unsignedPsbt.assetType) {
        case AssetType.BRC20:
            if (!unsignedPsbt.signer) {
                return genBrcAndOrdinalUnsignedPsbt(unsignedPsbt)
            } else {
                return genBrcAndOrdinalSignedPsbt(unsignedPsbt)
            }


        case AssetType.RUNES:
            return

        case AssetType.COLLECTIBLE:
            if (!unsignedPsbt.signer) {
                return genBrcAndOrdinalUnsignedPsbt(unsignedPsbt)
            } else {
                return genBrcAndOrdinalSignedPsbt(unsignedPsbt)
            }
    }
}

export function genBrcAndOrdinalSignedPsbt({
    address,
    utxos,
    network,
    addressType,
    orderPrice,
    signer,
    sellerPsbt,
    feeRate,
    receiveAddress
}: GenBrcAndCollectibleSignedPsbt
): string {
    const keyPair =
        addressType == AddressType.P2WPKH
            ? signer.segwitKeyPair
            : signer.taprootKeyPair
    const privateKey = keyPair.toWIF()
    const data = buildDummyAndPaymentUtxos({ utxos, feeRate, orderPrice, address, receiveAddress, sellerPsbt }) as any
    const buyingData: BuyingData = data
    const buyerPsbt = genSignedBuyingPSBTWithoutListSignature(
        buyingData,
        privateKey,
        network
    )
    //base64 format
    return buyerPsbt
}

export function genBrcAndOrdinalUnsignedPsbt({
    address,
    utxos,
    network,
    pubKey,
    orderPrice,
    sellerPsbt,
    feeRate,
    receiveAddress
}: GenBrcAndCollectibleUnsignedPsbt
): string {
    const data = buildDummyAndPaymentUtxos({ utxos, feeRate, orderPrice, address, receiveAddress, sellerPsbt }) as any

    const buyingData: BuyingData = data
    const buyerPsbt = generateUnsignedBuyingPsbt(
        buyingData,
        network,
        pubKey
    )
    //base64 format
    return buyerPsbt
}

export function mergeSignedPsbt(signedBuyerPsbt: string, sellerPsbt: string[]): string {
    const mergedPsbt = mergeSignedBuyingPsbt(signedBuyerPsbt, sellerPsbt)
    return mergedPsbt.toBase64()
}

export function buildDummyAndPaymentUtxos({ utxos, feeRate, orderPrice, address, receiveAddress, sellerPsbt }: PaymentUtxoOptions) {
    const allUtxosWorth600 = getAllUTXOsWorthASpecificValue(utxos, 600)
    if (allUtxosWorth600.length < 2) {
        throw new Error('not enough padding utxos (600 sat) for marketplace buy')
    }

    const dummyUtxos = []
    for (let i = 0; i < 2; i++) {
        dummyUtxos.push({
            txHash: allUtxosWorth600[i].txId,
            vout: allUtxosWorth600[i].outputIndex,
            coinAmount: allUtxosWorth600[i].satoshis,
        })
    }

    const amountNeeded = orderPrice + parseInt((ESTIMATE_TX_SIZE * feeRate).toFixed(0))
    const retrievedUtxos = getUTXOsToCoverAmount({
        utxos,
        amountNeeded,
        excludedUtxos: dummyUtxos
    })
    if (retrievedUtxos.length === 0) {
        throw new Error('Not enough funds to purchase this offer')
    }

    const paymentUtxos = []
    retrievedUtxos.forEach((utxo) => {
        paymentUtxos.push({
            txHash: utxo.txId,
            vout: utxo.outputIndex,
            coinAmount: utxo.satoshis,
        })
    })

    const data = {
        dummyUtxos,
        paymentUtxos,
    }
    data['receiveNftAddress'] = receiveAddress
    data['paymentAndChangeAddress'] = address
    data['feeRate'] = feeRate
    data['sellerPsbts'] = [sellerPsbt]

    return data
}

export async function okxSwap ({
    address, 
    offer,
    receiveAddress,
    feeRate,
    pubKey,
    assetType,
    provider,
    signer
}:{
    address: string
    offer: MarketplaceOffer
    receiveAddress: string
    feeRate: number
    pubKey: string
    assetType: AssetType
    provider: Provider
    signer: Signer
}) {
    const addressType = getAddressType(address);
    const psbtForDummyUtxos = await prepareAddressForOkxPsbt({address, provider, pubKey, feeRate, addressType})
    if (psbtForDummyUtxos != null){
        const {signedPsbt} = await signer.signAllInputs({
            rawPsbt: psbtForDummyUtxos,
            finalize: true,
        })
        const {txId} = await provider.pushPsbt({psbtBase64: signedPsbt})
        console.log("preptxid", txId)
    }
    const unsignedBid: UnsignedOkxBid = {
        offerId: offer.offerId,
        provider,
        assetType
    }
    
    const sellerData = await getSellerPsbt(unsignedBid);
    const sellerPsbt = sellerData.data.sellerPsbt;
    const network = provider.network
    const { utxos } = await addressSpendableUtxos({ address, provider });
    const buyerPsbt = await getBuyerPsbt({
        address,
        utxos,
        feeRate,
        receiveAddress,
        network,
        pubKey,
        addressType,
        sellerPsbt,
        orderPrice: offer.totalPrice,
        assetType
    })

   const {signedPsbt} = await signer.signAllInputs({
        rawPsbt: buyerPsbt,
        finalize: false
    })

    const mergedPsbt = mergeSignedPsbt(signedPsbt, [sellerPsbt]) 
    const transaction = await submitSignedPsbt({
        fromAddress: address,
        psbt: mergedPsbt,
        assetType,
        provider,
        offer
    })
    if (transaction.statusCode == 200)return transaction.data

}