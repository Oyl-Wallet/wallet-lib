"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Marketplace = void 0;
const tslib_1 = require("tslib");
const __1 = require("..");
const buildMarketplaceTx_1 = require("./buildMarketplaceTx");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const interface_1 = require("../shared/interface");
const coin_bitcoin_1 = require("@okxweb3/coin-bitcoin");
const BIP322_1 = require("./BIP322");
const errors_1 = require("../errors");
class Marketplace {
    provider;
    receiveAddress;
    selectedSpendAddress;
    selectedSpendPubkey;
    spendAddress;
    spendPubKey;
    altSpendAddress;
    altSpendPubKey;
    signer;
    assetType;
    feeRate;
    txIds;
    addressesBound = false;
    constructor(options) {
        this.provider = options.provider;
        this.receiveAddress = options.receiveAddress;
        this.spendAddress = options.spendAddress;
        this.assetType = options.assetType;
        this.spendPubKey = options.spendPubKey;
        this.altSpendAddress = options.altSpendAddress;
        this.altSpendPubKey = options.altSpendPubKey;
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
            costEstimate += offerPrice;
        }
        const totalCost = 482 * this.feeRate + costEstimate;
        return totalCost;
    }
    async selectSpendAddress(offers) {
        const estimatedCost = await this.getOffersCostEstimate(offers);
        if (await this.canAddressAffordOffers(this.spendAddress, estimatedCost)) {
            this.selectedSpendAddress = this.spendAddress;
            this.selectedSpendPubkey = this.spendPubKey;
        }
        else if (await this.canAddressAffordOffers(this.altSpendAddress, estimatedCost)) {
            this.selectedSpendAddress = this.altSpendAddress;
            this.selectedSpendPubkey = this.altSpendPubKey;
        }
        else {
            throw new errors_1.OylTransactionError(new Error('Not enough sats available to buy marketplace offers, need  ' +
                estimatedCost +
                ' sats'), this.txIds);
        }
    }
    async processMultipleBuys(orders, previousOrderTxId, remainingSats, index = 1, psbtBase64s = [], psbtHexs = [], txIds) {
        if (index >= orders.length) {
            return { txIds, psbtHexs, psbtBase64s };
        }
        try {
            const order = orders[index];
            const marketPlaceBuy = new buildMarketplaceTx_1.BuildMarketplaceTransaction({
                address: this.selectedSpendAddress,
                pubKey: this.selectedSpendPubkey,
                receiveAddress: this.receiveAddress,
                psbtBase64: order.psbtBase64,
                price: order.price,
                feeRate: this.feeRate,
                provider: this.provider,
            });
            const { psbtBase64: filledOutBase64, remainingSats: updatedRemainingSats, } = await marketPlaceBuy.psbtMultiBuilder(previousOrderTxId, remainingSats);
            const psbtPayload = await this.signMarketplacePsbt(filledOutBase64, true);
            const result = await this.provider.sandshrew.bitcoindRpc.finalizePSBT(psbtPayload.signedPsbt);
            const txPayload = await this.provider.sandshrew.bitcoindRpc.decodeRawTransaction(result.hex);
            const txId = txPayload.txid;
            psbtHexs.push(result.hex);
            txIds.push(txId);
            return await this.processMultipleBuys(orders, txId, updatedRemainingSats, index + 1, psbtBase64s, psbtHexs, txIds);
        }
        catch (error) {
            //skip to the next if an error occurs
            return await this.processMultipleBuys(orders, previousOrderTxId, remainingSats, index + 1, psbtBase64s, psbtHexs, txIds);
        }
    }
    async signMarketplacePsbt(psbt, finalize = false) {
        const payload = await this.signer.signAllInputs({ rawPsbt: psbt, finalize });
        return payload;
    }
    async processAllOffers(offers) {
        const processedOffers = [];
        this.txIds = [];
        await this.selectSpendAddress(offers);
        let externalSwap = false;
        const testnet = this.provider.network == (0, __1.getNetwork)('testnet');
        for (const offer of offers) {
            if (offer.marketplace == 'omnisat') {
                let newOffer = await this.provider.api.getOmnisatOfferPsbt({
                    offerId: offer.offerId,
                    ticker: offer.ticker,
                });
                if (newOffer != false) {
                    processedOffers.push(newOffer);
                }
            }
            else if (offer.marketplace == 'unisat') {
                let txId = await this.externalSwap({
                    auctionId: offer.offerId,
                    bidPrice: offer.totalPrice,
                });
                if (txId != null) {
                    this.txIds.push(txId);
                    processedOffers.push(txId);
                }
                externalSwap = true;
                await (0, __1.timeout)(10000);
            }
            else if (offer.marketplace == 'okx' && !testnet) {
                const offerPsbt = await this.provider.api.getOkxOfferPsbt({
                    offerId: offer.offerId,
                });
                const signedPsbt = await this.createOkxSignedPsbt(offerPsbt.data.sellerPsbt, offer.totalPrice);
                const payload = {
                    ticker: offer.ticker,
                    price: offer.totalPrice,
                    amount: parseInt(offer.amount),
                    fromAddress: this.selectedSpendAddress,
                    toAddress: offer.address,
                    inscriptionId: offer.inscriptionId,
                    buyerPsbt: signedPsbt,
                    orderId: offer.offerId,
                    brc20: this.assetType == interface_1.AssetType.BRC20 ? true : false,
                };
                const tx = await this.provider.api.submitOkxBid(payload);
                let txId = tx?.data;
                if (txId != null) {
                    this.txIds.push(txId);
                    processedOffers.push(txId);
                }
                externalSwap = true;
                await (0, __1.timeout)(10000);
            }
        }
        if (processedOffers.length < 1) {
            throw new errors_1.OylTransactionError(new Error('Offers  unavailable'), this.txIds);
        }
        return {
            processed: externalSwap,
            processedOffers,
        };
    }
    async getAssetPsbtPath(payload) {
        switch (this.assetType) {
            case interface_1.AssetType.BRC20:
                return await this.provider.api.initSwapBid(payload);
                break;
            case interface_1.AssetType.RUNES:
                return await this.provider.api.initRuneSwapBid(payload);
                break;
            case interface_1.AssetType.COLLECTIBLE:
                return await this.provider.api.initCollectionSwapBid(payload);
                break;
        }
    }
    async getSubmitAssetPsbtPath(payload) {
        switch (this.assetType) {
            case interface_1.AssetType.BRC20:
                return await this.provider.api.submitSignedBid(payload);
                break;
            case interface_1.AssetType.RUNES:
                console.log('payload to submit', payload);
                return await this.provider.api.submitSignedRuneBid(payload);
                break;
            case interface_1.AssetType.COLLECTIBLE:
                return await this.provider.api.submitSignedCollectionBid(payload);
                break;
        }
    }
    async externalSwap(bid) {
        const payload = {
            address: this.selectedSpendAddress,
            auctionId: bid.auctionId,
            bidPrice: bid.bidPrice,
            pubKey: this.selectedSpendPubkey,
            receiveAddress: this.receiveAddress,
            feerate: this.feeRate,
        };
        console.log(this.selectSpendAddress);
        console.log(this.receiveAddress);
        console.log(this.addressesBound);
        if (this.selectedSpendAddress != this.receiveAddress &&
            !this.addressesBound) {
            console.log('getting new signature');
            const signature = await this.getSignatureForBind();
            payload['signature'] = signature;
            this.addressesBound = true;
        }
        const psbt = await this.getAssetPsbtPath(payload);
        console.log('psbt from initiate swap', psbt);
        if (!psbt?.error) {
            const unsignedPsbt = psbt.psbtBid;
            const swapOptions = bid;
            swapOptions['psbt'] = unsignedPsbt;
            console.log('swap-Options before signing', swapOptions);
            const signedPsbt = await this.externalSign(swapOptions);
            console.log('psbt after signing', signedPsbt);
            const data = await this.getSubmitAssetPsbtPath({
                psbtBid: signedPsbt,
                auctionId: bid.auctionId,
                bidId: psbt.bidId,
            });
            if (data.txid)
                return data.txid;
        }
        return null;
    }
    async buyMarketPlaceOffers(pOffers) {
        if (pOffers.processed) {
            return { txIds: this.txIds };
        }
        const offers = pOffers.processedOffers;
        if (offers.length < 1)
            throw new errors_1.OylTransactionError(new Error('No offers to buy'), this.txIds);
        const marketPlaceBuy = new buildMarketplaceTx_1.BuildMarketplaceTransaction({
            address: this.selectedSpendAddress,
            pubKey: this.selectedSpendPubkey,
            receiveAddress: this.receiveAddress,
            psbtBase64: offers[0].psbtBase64,
            price: offers[0].price,
            feeRate: this.feeRate,
            provider: this.provider,
        });
        const preparedWallet = await this.prepareAddress(marketPlaceBuy);
        await (0, __1.timeout)(30000);
        if (!preparedWallet) {
            throw new errors_1.OylTransactionError(new Error('Address not prepared to buy marketplace offers'), this.txIds);
        }
        const { psbtBase64, remainder } = await marketPlaceBuy.psbtBuilder();
        const psbtPayload = await this.signMarketplacePsbt(psbtBase64, true);
        const result = await this.provider.sandshrew.bitcoindRpc.finalizePSBT(psbtPayload.signedPsbt);
        const [broadcast] = await this.provider.sandshrew.bitcoindRpc.testMemPoolAccept([result.hex]);
        if (!broadcast.allowed) {
            console.log('in buyMarketPlaceOffers', broadcast);
            throw new errors_1.OylTransactionError(result['reject-reason'], this.txIds);
        }
        await this.provider.sandshrew.bitcoindRpc.sendRawTransaction(result.hex);
        const txPayload = await this.provider.sandshrew.bitcoindRpc.decodeRawTransaction(result.hex);
        const txId = txPayload.txid;
        let remainingSats = remainder;
        const multipleBuys = await this.processMultipleBuys(offers, txId, remainingSats, 1, [], [], this.txIds);
        this.txIds.push(txId);
        for (let i = 0; i < multipleBuys.psbtHexs.length; i++) {
            await (0, __1.timeout)(30000);
            const [broadcast] = await this.provider.sandshrew.bitcoindRpc.testMemPoolAccept([
                multipleBuys.psbtHexs[i],
            ]);
            if (!broadcast.allowed) {
                console.log('Error in broadcasting tx: ' + multipleBuys.txIds[i]);
                console.log(broadcast);
                console.log(result['reject-reason']);
                throw new errors_1.OylTransactionError(result['reject-reason'], this.txIds);
            }
            await this.provider.sandshrew.bitcoindRpc.sendRawTransaction(multipleBuys.psbtHexs[i]);
            this.txIds.push(multipleBuys.txIds[i]);
        }
        return {
            txIds: this.txIds,
        };
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
            console.log('Error', err);
            throw new errors_1.OylTransactionError(new Error('An error occured while preparing address for marketplace buy'), this.txIds);
        }
    }
    async canAddressAffordOffers(address, estimatedCost) {
        const retrievedUtxos = await this.getUTXOsToCoverAmount(address, estimatedCost);
        return retrievedUtxos.length > 0;
    }
    async externalSign(options) {
        const psbt = bitcoin.Psbt.fromHex(options.psbt, {
            network: this.provider.network,
        });
        console.log('external sign options', options);
        const psbtPayload = await this.signMarketplacePsbt(psbt.toBase64(), false);
        console.log('psbt payload', psbtPayload);
        return psbtPayload.signedHexPsbt;
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
    async getUTXOsToCoverAmount(address, amountNeeded, excludedUtxos = [], inscriptionLocs) {
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
    async buildDummyAndPaymentUtxos(orderPrice) {
        const allUtxosWorth600 = await this.getAllUTXOsWorthASpecificValue(600);
        if (allUtxosWorth600.length < 2) {
            throw new errors_1.OylTransactionError(new Error('not enough padding utxos (600 sat) for marketplace buy'), this.txIds);
        }
        const dummyUtxos = [];
        for (let i = 0; i < 2; i++) {
            dummyUtxos.push({
                txHash: allUtxosWorth600[i].txid,
                vout: allUtxosWorth600[i].vout,
                coinAmount: allUtxosWorth600[i].value,
            });
        }
        const requiredSatoshis = orderPrice + 3000 + 546;
        const retrievedUtxos = await this.getUTXOsToCoverAmount(this.selectedSpendAddress, requiredSatoshis, dummyUtxos);
        if (retrievedUtxos.length === 0) {
            throw new errors_1.OylTransactionError(new Error('Not enough funds to purchase this offer'), this.txIds);
        }
        const paymentUtxos = [];
        retrievedUtxos.forEach((utxo) => {
            paymentUtxos.push({
                txHash: utxo.txid,
                vout: utxo.vout,
                coinAmount: utxo.value,
            });
        });
        return {
            dummyUtxos,
            paymentUtxos,
        };
    }
    async createOkxSignedPsbt(sellerPsbt, orderPrice) {
        const marketPlaceBuy = new buildMarketplaceTx_1.BuildMarketplaceTransaction({
            address: this.selectedSpendAddress,
            pubKey: this.selectedSpendPubkey,
            receiveAddress: this.receiveAddress,
            psbtBase64: '',
            price: 0,
            feeRate: this.feeRate,
            provider: this.provider,
        });
        const preparedWallet = await this.prepareAddress(marketPlaceBuy);
        await (0, __1.timeout)(30000);
        if (!preparedWallet) {
            throw new errors_1.OylTransactionError(new Error('Address not prepared to buy marketplace offers'), this.txIds);
        }
        const keyPair = (0, __1.getAddressType)(this.selectedSpendAddress) == __1.AddressType.P2WPKH
            ? this.signer.segwitKeyPair
            : this.signer.taprootKeyPair;
        const privateKey = keyPair.toWIF();
        const data = (await this.buildDummyAndPaymentUtxos(orderPrice));
        data['receiveNftAddress'] = this.receiveAddress;
        data['paymentAndChangeAddress'] = this.selectedSpendAddress;
        data['feeRate'] = this.feeRate;
        data['sellerPsbts'] = [sellerPsbt];
        const buyingData = data;
        const buyerPsbt = (0, coin_bitcoin_1.genSignedBuyingPSBTWithoutListSignature)(buyingData, privateKey, coin_bitcoin_1.networks.bitcoin);
        return buyerPsbt;
    }
    isExcludedUtxo(utxo, excludedUtxos) {
        return excludedUtxos.some((excluded) => excluded.txHash === utxo.txid && excluded.vout === utxo.vout);
    }
    async getSignatureForBind() {
        const testnet = this.provider.network == (0, __1.getNetwork)('testnet');
        const message = `Please confirm that\nPayment Address: ${this.selectedSpendAddress}\nOrdinals Address: ${this.receiveAddress}`;
        if ((0, __1.getAddressType)(this.receiveAddress) == __1.AddressType.P2WPKH) {
            const keyPair = this.signer.segwitKeyPair;
            const privateKey = keyPair.privateKey;
            const signature = await (0, BIP322_1.signBip322Message)({
                message,
                network: testnet ? 'testnet' : 'mainnet',
                privateKey,
                signatureAddress: this.receiveAddress,
            });
            return signature;
        }
        else if ((0, __1.getAddressType)(this.receiveAddress) == __1.AddressType.P2TR) {
            const keyPair = this.signer.taprootKeyPair;
            const privateKey = keyPair.privateKey;
            const signature = await (0, BIP322_1.signBip322Message)({
                message,
                network: testnet ? 'testnet' : 'mainnet',
                privateKey,
                signatureAddress: this.receiveAddress,
            });
            return signature;
        }
    }
}
exports.Marketplace = Marketplace;
//# sourceMappingURL=index.js.map