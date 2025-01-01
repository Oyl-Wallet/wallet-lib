"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = exports.defaultProvider = void 0;
const tslib_1 = require("tslib");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const __1 = require("..");
const defaultMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
exports.defaultProvider = {
    bitcoin: new __1.Provider({
        url: 'https://mainnet.sandshrew.io',
        version: 'v2',
        projectId: process.env.SANDSHREW_PROJECT_ID,
        network: bitcoin.networks.bitcoin,
        networkType: 'mainnet',
        apiUrl: 'https://staging-api.oyl.gg',
    }),
    regtest: new __1.Provider({
        url: 'http://localhost:3000',
        projectId: 'regtest',
        network: bitcoin.networks.regtest,
        networkType: 'regtest',
        apiUrl: 'https://staging-api.oyl.gg',
    }),
};
class Wallet {
    mnemonic;
    networkType;
    provider;
    account;
    signer;
    feeRate;
    constructor(options) {
        this.mnemonic = options?.mnemonic ? options?.mnemonic : defaultMnemonic;
        this.networkType = options?.networkType ? options?.networkType : 'regtest';
        this.provider = exports.defaultProvider[this.networkType];
        this.account = (0, __1.mnemonicToAccount)({
            mnemonic: this.mnemonic,
            opts: {
                network: this.provider.network
            }
        });
        const privateKeys = (0, __1.getWalletPrivateKeys)({
            mnemonic: this.mnemonic,
            opts: {
                network: this.account.network
            }
        });
        this.signer = new __1.Signer(this.account.network, {
            taprootPrivateKey: privateKeys.taproot.privateKey,
            segwitPrivateKey: privateKeys.nativeSegwit.privateKey,
            nestedSegwitPrivateKey: privateKeys.nestedSegwit.privateKey,
            legacyPrivateKey: privateKeys.legacy.privateKey
        });
        this.feeRate = options?.feeRate ? options?.feeRate : 2;
    }
}
exports.Wallet = Wallet;
//# sourceMappingURL=wallet.js.map