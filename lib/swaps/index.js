"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Engine = void 0;
const __1 = require("..");
const errors_1 = require("../errors");
const helpers_1 = require("./helpers");
const unisat_1 = require("./unisat");
const okx_1 = require("./okx");
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
    async processUnisatOffers(offers) {
        await this.selectSpendAddress(offers);
        const processedOffers = await (0, unisat_1.unisatSwap)({
            address: this.selectedSpendAddress,
            offer: offers[0],
            receiveAddress: this.receiveAddress,
            feerate: this.feeRate,
            pubKey: this.selectedSpendPubkey,
            assetType: this.assetType,
            provider: this.provider,
            signer: this.signer
        });
        console.log(processedOffers);
    }
    async processOkxOffers(offers) {
        await this.selectSpendAddress(offers);
        const processedOffers = await (0, okx_1.okxSwap)({
            address: this.selectedSpendAddress,
            offer: offers[0],
            receiveAddress: this.receiveAddress,
            feeRate: this.feeRate,
            pubKey: this.selectedSpendPubkey,
            assetType: this.assetType,
            provider: this.provider,
            signer: this.signer
        });
        console.log(processedOffers);
    }
}
exports.Engine = Engine;
//# sourceMappingURL=index.js.map