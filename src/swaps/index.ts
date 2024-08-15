import {
    getAddressType,
    AddressType,
    assertHex,
} from '..'
import * as bitcoin from 'bitcoinjs-lib'
import {
    AssetType,
    MarketplaceAccount,
    MarketplaceOffer
} from '../shared/interface'
import { Signer } from '../signer'
import { OylTransactionError } from '../errors'
import { Provider } from 'provider/provider'
import { Account } from '@account/account'
import { DUMMY_UTXO_SATS, ESTIMATE_TX_SIZE, addInputConditionally, calculateAmountGathered, canAddressAffordBid, estimatePsbtFee, getAllUTXOsWorthASpecificValue, getBidCostEstimate, getUTXOsToCoverAmount, sanitizeFeeRate } from './helpers'
import { addressSpendableUtxos } from '../utxo/utxo'
import { unisatSwap } from './unisat'
import { okxSwap } from './okx'

export class Engine {
    private provider: Provider
    public receiveAddress: string
    public selectedSpendAddress: string | null
    public selectedSpendPubkey: string | null
    private account: Account
    private signer: Signer
    public assetType: AssetType
    public addressType: AddressType
    public feeRate: number
    public txIds: string[]
    public takerScript: string
    public addressesBound: boolean = false

    constructor(options: MarketplaceAccount) {
        this.provider = options.provider
        this.receiveAddress = options.receiveAddress
        this.account = options.account
        this.assetType = options.assetType
        this.signer = options.signer
        this.feeRate = options.feeRate
    }


    async selectSpendAddress(offers: MarketplaceOffer[]) {
        this.feeRate = await sanitizeFeeRate(this.provider, this.feeRate);
        const estimatedCost = getBidCostEstimate(offers, this.feeRate);
        for (let i = 0; i < this.account.spendStrategy.addressOrder.length; i++) {
            if (
                this.account.spendStrategy.addressOrder[i] === 'taproot' ||
                this.account.spendStrategy.addressOrder[i] === 'nativeSegwit'
            ) {
                const address =
                    this.account[this.account.spendStrategy.addressOrder[i]].address
                let pubkey: string =
                    this.account[this.account.spendStrategy.addressOrder[i]].pubkey
                if (await canAddressAffordBid({ address, estimatedCost, offers, provider: this.provider })) {
                    this.selectedSpendAddress = address
                    this.selectedSpendPubkey = pubkey
                    this.addressType = getAddressType(this.selectedSpendAddress)
                    break
                }
            }
            if (i === this.account.spendStrategy.addressOrder.length - 1) {
                throw new OylTransactionError(
                    new Error(
                        'Not enough (confirmed) satoshis available to buy marketplace offers, need  ' +
                        estimatedCost +
                        ' sats'
                    ),
                    this.txIds
                )
            }
        }
    }



    

   
    async processUnisatOffers(offers: MarketplaceOffer[]) {

        await this.selectSpendAddress(offers);
        const processedOffers = await unisatSwap ({
            address: this.selectedSpendAddress,
            offer: offers[0],
            receiveAddress: this.receiveAddress,
            feerate: this.feeRate,
            pubKey: this.selectedSpendPubkey,
            assetType: this.assetType,
            provider: this.provider,
            signer: this.signer
        })
        console.log(processedOffers)
    }

    async processOkxOffers(offers: MarketplaceOffer[]) {

        await this.selectSpendAddress(offers);
        const processedOffers = await okxSwap ({
            address: this.selectedSpendAddress,
            offer: offers[0],
            receiveAddress: this.receiveAddress,
            feeRate: this.feeRate,
            pubKey: this.selectedSpendPubkey,
            assetType: this.assetType,
            provider: this.provider,
            signer: this.signer
        })
        console.log(processedOffers)
    }
   

}

