import {
    getAddressType,
    AddressType,
    assertHex,
} from '..'
import { BuildMarketplaceTransaction } from './buildMarketplaceTx'
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
import { DUMMY_UTXO_SATS, ESTIMATE_TX_SIZE, addInputConditionally, calculateAmountGathered, canAddressAffordBid, getAllUTXOsWorthASpecificValue, getBidCostEstimate, getUTXOsToCoverAmount, sanitizeFeeRate } from './helpers'
import { addressSpendableUtxos } from '@utxo/utxo'


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


    getScriptPubKey() {
        switch (this.addressType) {
            case AddressType.P2TR: {
                const tapInternalKey = assertHex(Buffer.from(this.selectedSpendPubkey, 'hex'))
                const p2tr = bitcoin.payments.p2tr({
                    internalPubkey: tapInternalKey,
                    network: this.provider.network,
                })
                this.takerScript = p2tr.output?.toString('hex')
                break
            }
            case AddressType.P2WPKH: {
                const p2wpkh = bitcoin.payments.p2wpkh({
                    pubkey: Buffer.from(this.selectedSpendPubkey, 'hex'),
                    network: this.provider.network,
                })
                this.takerScript = p2wpkh.output?.toString('hex')
                break
            }
        }
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
                    this.getScriptPubKey();
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


    async signMarketplacePsbt(psbt: string, finalize: boolean = false) {
        const payload = await this.signer.signAllInputs({
            rawPsbt: psbt,
            finalize,
        })
        return payload
    }


    /**
     * 
     * Prepare an address for atomic swaps by creating two fresh 600 satoshi UTXOS
     * for building the 
     */
    async prepareAddress(
        marketPlaceBuy: BuildMarketplaceTransaction
    ): Promise<Boolean> {
        try {
            const { utxos } = await addressSpendableUtxos({ address: this.selectedSpendAddress, provider: this.provider });
            const paddingUtxos = getAllUTXOsWorthASpecificValue(utxos, 600)
            if (paddingUtxos.length < 2) {
                const { psbtBase64 } = await marketPlaceBuy.prepareWallet()
                const psbtPayload = await this.signMarketplacePsbt(psbtBase64, true)
                const result = await this.provider.sandshrew.bitcoindRpc.finalizePSBT(
                    psbtPayload.signedPsbt
                )
                const [broadcast] =
                    await this.provider.sandshrew.bitcoindRpc.testMemPoolAccept([
                        result.hex,
                    ])

                if (!broadcast.allowed) {
                    console.log('in prepareAddress', broadcast)
                    throw new OylTransactionError(result['reject-reason'], this.txIds)
                }
                await this.provider.sandshrew.bitcoindRpc.sendRawTransaction(result.hex)
                const txPayload =
                    await this.provider.sandshrew.bitcoindRpc.decodeRawTransaction(
                        result.hex
                    )
                const txId = txPayload.txid
                this.txIds.push(txId)
            }
            return true
        } catch (err) {
            throw new OylTransactionError(
                new Error(
                    'An error occured while preparing address for marketplace buy'
                ),
                this.txIds
            )
        }
    }

    async dummyUtxosPsbt() {
        const amountNeeded = (DUMMY_UTXO_SATS + parseInt((ESTIMATE_TX_SIZE * this.feeRate).toFixed(0)))
        const retrievedUtxos = await getUTXOsToCoverAmount({
            address: this.selectedSpendAddress,
            amountNeeded,
            provider: this.provider
        })
        if (retrievedUtxos.length === 0) {
            throw new OylTransactionError(
                new Error(
                    'An error occured while preparing address for marketplace buy'
                ),
                this.txIds
            )
        }
        const dummyUtxoTx = new bitcoin.Psbt({ network: this.provider.network })
        retrievedUtxos.forEach((utxo) => {
            const input = addInputConditionally({
                hash: utxo.txId,
                index: utxo.outputIndex,
                witnessUtxo: {
                    value: utxo.satoshis,
                    script: Buffer.from(utxo.scriptPk, 'hex'),
                },
            }, this.addressType, this.selectedSpendPubkey)
            dummyUtxoTx.addInput(input)
        })

        const amountRetrieved = calculateAmountGathered(retrievedUtxos)
        const remainder = amountRetrieved - amountNeeded
        dummyUtxoTx.addOutput({
            address: this.selectedSpendAddress,
            value: 600,
        })
        dummyUtxoTx.addOutput({
            address: this.selectedSpendAddress,
            value: 600,
        })
        dummyUtxoTx.addOutput({
            address: this.selectedSpendAddress,
            value: remainder,
        })

        return {
            psbtHex: dummyUtxoTx.toHex(),
            psbtBase64: dummyUtxoTx.toBase64()
        }
    }


}

