"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Engine = void 0;
const tslib_1 = require("tslib");
const __1 = require("..");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const errors_1 = require("../errors");
const helpers_1 = require("./helpers");
const utxo_1 = require("@utxo/utxo");
class Engine {
    provider;
    receiveAddress;
    selectedSpendAddress;
    selectedSpendPubkey;
    account;
    signer;
    assetType;
    addressType;
    feeRate;
    txIds;
    takerScript;
    addressesBound = false;
    constructor(options) {
        this.provider = options.provider;
        this.receiveAddress = options.receiveAddress;
        this.account = options.account;
        this.assetType = options.assetType;
        this.signer = options.signer;
        this.feeRate = options.feeRate;
    }
    getScriptPubKey() {
        switch (this.addressType) {
            case __1.AddressType.P2TR: {
                const tapInternalKey = (0, __1.assertHex)(Buffer.from(this.selectedSpendPubkey, 'hex'));
                const p2tr = bitcoin.payments.p2tr({
                    internalPubkey: tapInternalKey,
                    network: this.provider.network,
                });
                this.takerScript = p2tr.output?.toString('hex');
                break;
            }
            case __1.AddressType.P2WPKH: {
                const p2wpkh = bitcoin.payments.p2wpkh({
                    pubkey: Buffer.from(this.selectedSpendPubkey, 'hex'),
                    network: this.provider.network,
                });
                this.takerScript = p2wpkh.output?.toString('hex');
                break;
            }
        }
    }
    async selectSpendAddress(offers) {
        this.feeRate = await (0, helpers_1.sanitizeFeeRate)(this.provider, this.feeRate);
        const estimatedCost = (0, helpers_1.getBidCostEstimate)(offers, this.feeRate);
        for (let i = 0; i < this.account.spendStrategy.addressOrder.length; i++) {
            if (this.account.spendStrategy.addressOrder[i] === 'taproot' ||
                this.account.spendStrategy.addressOrder[i] === 'nativeSegwit') {
                const address = this.account[this.account.spendStrategy.addressOrder[i]].address;
                let pubkey = this.account[this.account.spendStrategy.addressOrder[i]].pubkey;
                if (await (0, helpers_1.canAddressAffordBid)({ address, estimatedCost, offers, provider: this.provider })) {
                    this.selectedSpendAddress = address;
                    this.selectedSpendPubkey = pubkey;
                    this.addressType = (0, __1.getAddressType)(this.selectedSpendAddress);
                    this.getScriptPubKey();
                    break;
                }
            }
            if (i === this.account.spendStrategy.addressOrder.length - 1) {
                throw new errors_1.OylTransactionError(new Error('Not enough (confirmed) satoshis available to buy marketplace offers, need  ' +
                    estimatedCost +
                    ' sats'), this.txIds);
            }
        }
    }
    async signMarketplacePsbt(psbt, finalize = false) {
        const payload = await this.signer.signAllInputs({
            rawPsbt: psbt,
            finalize,
        });
        return payload;
    }
    /**
     *
     * Prepare an address for atomic swaps by creating two fresh 600 satoshi UTXOS
     * for building the
     */
    async prepareAddress(marketPlaceBuy) {
        try {
            const { utxos } = await (0, utxo_1.addressSpendableUtxos)({ address: this.selectedSpendAddress, provider: this.provider });
            const paddingUtxos = (0, helpers_1.getAllUTXOsWorthASpecificValue)(utxos, 600);
            if (paddingUtxos.length < 2) {
                const { psbtBase64 } = await marketPlaceBuy.prepareWallet();
                const psbtPayload = await this.signMarketplacePsbt(psbtBase64, true);
                const result = await this.provider.sandshrew.bitcoindRpc.finalizePSBT(psbtPayload.signedPsbt);
                const [broadcast] = await this.provider.sandshrew.bitcoindRpc.testMemPoolAccept([
                    result.hex,
                ]);
                if (!broadcast.allowed) {
                    console.log('in prepareAddress', broadcast);
                    throw new errors_1.OylTransactionError(result['reject-reason'], this.txIds);
                }
                await this.provider.sandshrew.bitcoindRpc.sendRawTransaction(result.hex);
                const txPayload = await this.provider.sandshrew.bitcoindRpc.decodeRawTransaction(result.hex);
                const txId = txPayload.txid;
                this.txIds.push(txId);
            }
            return true;
        }
        catch (err) {
            throw new errors_1.OylTransactionError(new Error('An error occured while preparing address for marketplace buy'), this.txIds);
        }
    }
    async dummyUtxosPsbt() {
        const amountNeeded = (helpers_1.DUMMY_UTXO_SATS + parseInt((helpers_1.ESTIMATE_TX_SIZE * this.feeRate).toFixed(0)));
        const retrievedUtxos = await (0, helpers_1.getUTXOsToCoverAmount)({
            address: this.selectedSpendAddress,
            amountNeeded,
            provider: this.provider
        });
        if (retrievedUtxos.length === 0) {
            throw new errors_1.OylTransactionError(new Error('An error occured while preparing address for marketplace buy'), this.txIds);
        }
        const dummyUtxoTx = new bitcoin.Psbt({ network: this.provider.network });
        retrievedUtxos.forEach((utxo) => {
            const input = (0, helpers_1.addInputConditionally)({
                hash: utxo.txId,
                index: utxo.outputIndex,
                witnessUtxo: {
                    value: utxo.satoshis,
                    script: Buffer.from(utxo.scriptPk, 'hex'),
                },
            }, this.addressType, this.selectedSpendPubkey);
            dummyUtxoTx.addInput(input);
        });
        const amountRetrieved = (0, helpers_1.calculateAmountGathered)(retrievedUtxos);
        const remainder = amountRetrieved - amountNeeded;
        dummyUtxoTx.addOutput({
            address: this.selectedSpendAddress,
            value: 600,
        });
        dummyUtxoTx.addOutput({
            address: this.selectedSpendAddress,
            value: 600,
        });
        dummyUtxoTx.addOutput({
            address: this.selectedSpendAddress,
            value: remainder,
        });
        return {
            psbtHex: dummyUtxoTx.toHex(),
            psbtBase64: dummyUtxoTx.toBase64()
        };
    }
}
exports.Engine = Engine;
//# sourceMappingURL=engine.js.map