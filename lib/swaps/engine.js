"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Engine = void 0;
const tslib_1 = require("tslib");
const __1 = require("..");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const errors_1 = require("../errors");
class Engine {
    provider;
    receiveAddress;
    selectedSpendAddress;
    selectedSpendPubkey;
    account;
    signer;
    assetType;
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
    /**
     * Should estimate the total amount of satoshi required to execute offers including fees
     **/
    async getOffersCostEstimate(offers) {
        let costEstimate = 0;
        for (let i = 0; i < offers.length; i++) {
            let offerPrice = offers[i]?.price
                ? offers[i].price
                : offers[i]?.totalPrice;
            costEstimate += (offerPrice + parseInt((482 * this.feeRate).toFixed(0)));
        }
        const totalCost = costEstimate;
        return totalCost;
    }
    getScriptPubKey() {
        const addressType = (0, __1.getAddressType)(this.selectedSpendAddress);
        switch (addressType) {
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
        const estimatedCost = await this.getOffersCostEstimate(offers);
        for (let i = 0; i < this.account.spendStrategy.addressOrder.length; i++) {
            if (this.account.spendStrategy.addressOrder[i] === 'taproot' ||
                this.account.spendStrategy.addressOrder[i] === 'nativeSegwit') {
                const address = this.account[this.account.spendStrategy.addressOrder[i]].address;
                let pubkey = this.account[this.account.spendStrategy.addressOrder[i]].pubkey;
                if (await this.canAddressAffordOffers(address, estimatedCost)) {
                    this.selectedSpendAddress = address;
                    this.selectedSpendPubkey = pubkey;
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
    async prepareAddress(marketPlaceBuy) {
        try {
            const prepared = await marketPlaceBuy.isWalletPrepared();
            if (!prepared) {
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
                return true;
            }
            return true;
        }
        catch (err) {
            throw new errors_1.OylTransactionError(new Error('An error occured while preparing address for marketplace buy'), this.txIds);
        }
    }
    async canAddressAffordOffers(address, estimatedCost) {
        const retrievedUtxos = await this.getUTXOsToCoverAmount(address, estimatedCost, [], true);
        return retrievedUtxos.length > 0;
    }
    addInputConditionally(inputData) {
        const addressType = (0, __1.getAddressType)(this.selectedSpendAddress);
        if (addressType === __1.AddressType.P2TR) {
            inputData['tapInternalKey'] = (0, __1.assertHex)(Buffer.from(this.selectedSpendPubkey, 'hex'));
        }
        return inputData;
    }
    async getUnspentsForAddress(address) {
        try {
            '=========== Getting all confirmed/unconfirmed utxos for ' +
                address +
                ' ============';
            return await this.provider.esplora
                .getAddressUtxo(address)
                .then((unspents) => unspents?.filter((utxo) => utxo.value > 546));
        }
        catch (e) {
            throw new errors_1.OylTransactionError(e, this.txIds);
        }
    }
    async getUnspentsForAddressInOrderByValue(address) {
        const unspents = await this.getUnspentsForAddress(address);
        console.log('=========== Confirmed Utxos len', unspents.length);
        return unspents.sort((a, b) => b.value - a.value);
    }
    async getUTXOsToCoverAmount(address, amountNeeded, excludedUtxos = [], insistConfirmedUtxos = false, inscriptionLocs) {
        try {
            console.log('=========== Getting Unspents for address in order by value ========');
            const unspentsOrderedByValue = await this.getUnspentsForAddressInOrderByValue(address);
            console.log('unspentsOrderedByValue len:', unspentsOrderedByValue.length);
            console.log('=========== Getting Collectibles for address ' + address + '========');
            const retrievedIxs = (await this.provider.api.getCollectiblesByAddress(address)).data;
            console.log('=========== Collectibles:', retrievedIxs.length);
            console.log('=========== Gotten Collectibles, splitting utxos ========');
            const bisInscriptionLocs = retrievedIxs.map((utxo) => utxo.satpoint);
            if (bisInscriptionLocs.length === 0) {
                inscriptionLocs = [];
            }
            else {
                inscriptionLocs = bisInscriptionLocs;
            }
            let sum = 0;
            const result = [];
            for await (let utxo of unspentsOrderedByValue) {
                if (this.isExcludedUtxo(utxo, excludedUtxos)) {
                    // Check if the UTXO should be excluded
                    continue;
                }
                if (insistConfirmedUtxos && utxo.status.confirmed != true) {
                    continue;
                }
                const currentUTXO = utxo;
                const utxoSatpoint = (0, __1.getSatpointFromUtxo)(currentUTXO);
                if ((inscriptionLocs &&
                    inscriptionLocs?.find((utxoLoc) => utxoLoc === utxoSatpoint)) ||
                    currentUTXO.value <= 546) {
                    continue;
                }
                sum += currentUTXO.value;
                result.push(currentUTXO);
                if (sum > amountNeeded) {
                    console.log('AMOUNT RETRIEVED: ', sum);
                    return result;
                }
            }
            return [];
        }
        catch (e) {
            throw new errors_1.OylTransactionError(e, this.txIds);
        }
    }
    async getAllUTXOsWorthASpecificValue(value) {
        const unspents = await this.getUnspentsForAddress(this.selectedSpendAddress);
        console.log('=========== Confirmed/Unconfirmed Utxos Len', unspents.length);
        return unspents.filter((utxo) => utxo.value === value);
    }
    isExcludedUtxo(utxo, excludedUtxos) {
        return excludedUtxos.some((excluded) => excluded.txHash === utxo.txid && excluded.vout === utxo.vout);
    }
}
exports.Engine = Engine;
//# sourceMappingURL=engine.js.map