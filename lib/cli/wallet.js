"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = void 0;
require("dotenv/config");
const __1 = require("..");
const constants_1 = require("./constants");
const networks_1 = require("bitcoinjs-lib/src/networks");
class Wallet {
    mnemonic;
    networkType;
    provider;
    account;
    signer;
    feeRate;
    constructor(options) {
        this.mnemonic = options?.mnemonic || process.env.MNEMONIC || constants_1.TEST_WALLET.mnemonic;
        this.networkType = options?.networkType || 'regtest';
        this.provider = constants_1.DEFAULT_PROVIDER[this.networkType];
        const account = {
            taproot: { pubkey: '', pubKeyXOnly: '', address: '', hdPath: '' },
            nativeSegwit: { pubkey: '', address: '', hdPath: '' },
            nestedSegwit: { pubkey: '', address: '', hdPath: '' },
            legacy: { pubkey: '', address: '', hdPath: '' },
            network: networks_1.bitcoin,
            spendStrategy: {
                changeAddress: 'nativeSegwit',
                addressOrder: [],
                utxoSortGreatestToLeast: true,
            },
        };
        //use getHDPaths()
        this.account = (0, __1.mnemonicToAccount)({
            mnemonic: this.mnemonic,
            opts: {
                network: this.provider.network,
            },
        });
        const privateKeys = (0, __1.getWalletPrivateKeys)({
            mnemonic: this.mnemonic,
            opts: {
                network: this.account.network,
            },
        });
        this.signer = new __1.Signer(this.account.network, {
            taprootPrivateKey: privateKeys.taproot.privateKey,
            segwitPrivateKey: privateKeys.nativeSegwit.privateKey,
            nestedSegwitPrivateKey: privateKeys.nestedSegwit.privateKey,
            legacyPrivateKey: privateKeys.legacy.privateKey,
        });
        this.feeRate = options?.feeRate ? options?.feeRate : 2;
    }
}
exports.Wallet = Wallet;
//# sourceMappingURL=wallet.js.map