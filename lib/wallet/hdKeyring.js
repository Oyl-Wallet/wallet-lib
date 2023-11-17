"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HdKeyring = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bip371_1 = require("bitcoinjs-lib/src/psbt/bip371");
const events_1 = require("events");
const utils_1 = require("../shared/utils");
const bitcore_mnemonic_1 = __importDefault(require("bitcore-mnemonic"));
const hdPathString = "m/86'/0'/0'/0";
class HdKeyring extends events_1.EventEmitter {
    /**
     * Initializes a new instance of the HdKeyring class.
     * @param {HDKeyringOption} opts - HD Keyring options.
     */
    constructor(opts) {
        super(null);
        this.mnemonic = null;
        this.network = bitcoin.networks.bitcoin;
        this.root = null;
        this.wallets = [];
        this._index2wallet = {};
        this.activeIndexes = [];
        this.deserialize(opts);
    }
    /**
     * Serializes the HDKeyring instance to a JSON object.
     * @returns {Promise<HDKeyringOption>} A promise that resolves to an object with the HDKeyring properties.
     */
    serialize() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                mnemonic: this.mnemonic,
                activeIndexes: this.activeIndexes,
                hdPath: this.hdPath,
                passphrase: this.passphrase,
            };
        });
    }
    /**
     * Deserializes options to a HDKeyring instance.
     * @param {HDKeyringOption} _opts - The HDKeyring options object.
     * @returns {HdKeyring} The instance of the HDKeyring.
     */
    deserialize(_opts = {}) {
        if (this.root) {
            throw new Error('Btc-Hd-Keyring: Secret recovery phrase already provided');
        }
        let opts = _opts;
        this.wallets = [];
        this.mnemonic = null;
        this.root = null;
        this.hdPath = opts.hdPath || hdPathString;
        if (opts.passphrase) {
            this.passphrase = opts.passphrase;
        }
        if (opts.mnemonic) {
            this.initFromMnemonic(opts.mnemonic);
        }
        if (opts.activeIndexes) {
            this.activeAccounts(opts.activeIndexes);
        }
        return this;
    }
    /**
     * Initializes the HD keyring from a mnemonic phrase.
     * @param {string} mnemonic - The mnemonic phrase to use for initialization.
     */
    initFromMnemonic(mnemonic) {
        if (this.root) {
            throw new Error('Btc-Hd-Keyring: Secret recovery phrase already provided');
        }
        this.mnemonic = mnemonic;
        this._index2wallet = {};
        this.hdWallet = new bitcore_mnemonic_1.default(mnemonic);
        this.root = this.hdWallet
            .toHDPrivateKey(this.passphrase, this.network == bitcoin.networks.bitcoin ? 'livenet' : 'testnet')
            .deriveChild(this.hdPath);
        //console.log("root", this.root)
    }
    /**
     * Changes the HD path used by the keyring and reinitializes accounts.
     * @param {string} hdPath - The new HD path to be used.
     */
    changeHdPath(hdPath) {
        this.hdPath = hdPath;
        this.root = this.hdWallet
            .toHDPrivateKey(this.passphrase, this.network == bitcoin.networks.bitcoin ? 'livenet' : 'testnet')
            .deriveChild(this.hdPath);
        const indexes = this.activeIndexes;
        this._index2wallet = {};
        this.activeIndexes = [];
        this.wallets = [];
        this.activeAccounts(indexes);
    }
    /**
     * Retrieves an account's address by its HD path and index.
     * @param {string} hdPath - The HD path to derive the account from.
     * @param {number} index - The index of the account.
     * @returns {string} The account address as a string.
     */
    getAccountByHdPath(hdPath, index) {
        const root = this.hdWallet
            .toHDPrivateKey(this.passphrase, this.network == bitcoin.networks.bitcoin ? 'livenet' : 'testnet')
            .deriveChild(hdPath);
        const child = root.deriveChild(index);
        const ecpair = utils_1.ECPair.fromPrivateKey(child.privateKey.toBuffer());
        const address = ecpair.publicKey.toString('hex');
        return address;
    }
    /**
     * Adds a specified number of new accounts to the keyring.
     * @param {number} numberOfAccounts - The number of new accounts to add. Defaults to 1 if not specified.
     * @returns {Promise<string[]>} A promise that resolves to an array of new account addresses in hex format.
     */
    addAccounts(numberOfAccounts = 1) {
        if (!this.root) {
            this.initFromMnemonic(new bitcore_mnemonic_1.default().toString());
        }
        let count = numberOfAccounts;
        let currentIdx = 0;
        if (this.activeIndexes.length > 1) {
            currentIdx = this.activeIndexes[this.activeIndexes.length - 1];
        }
        const newWallets = [];
        while (count) {
            const [, wallet] = this._addressFromIndex(currentIdx);
            if (this.wallets.includes(wallet)) {
                currentIdx++;
            }
            else {
                this.wallets.push(wallet);
                newWallets.push(wallet);
                this.activeIndexes.push(currentIdx);
                count--;
            }
        }
        const hexWallets = newWallets.map((w) => {
            return w.publicKey.toString('hex');
        });
        return Promise.resolve(hexWallets);
    }
    /**
     * Activates a list of accounts by their indexes.
     * @param {number[]} indexes - An array of account indexes to activate.
     * @returns An array of activated account addresses in hex format.
     */
    activeAccounts(indexes) {
        const accounts = [];
        for (const index of indexes) {
            const [address, wallet] = this._addressFromIndex(index);
            this.wallets.push(wallet);
            this.activeIndexes.push(index);
            accounts.push(address);
        }
        return accounts;
    }
    /**
     * Retrieves a list of addresses within a specified index range.
     * @param {number} start - The start index of the range.
     * @param {number} end - The end index of the range.
     * @returns {{ address: string; index: number }[]} An array of objects with address and index properties.
     */
    getAddresses(start, end) {
        const from = start;
        const to = end;
        const accounts = [];
        for (let i = from; i < to; i++) {
            const [address] = this._addressFromIndex(i);
            accounts.push({
                address,
                index: i + 1,
            });
        }
        return accounts;
    }
    /**
     * Gets the hex string representations of public keys for all accounts.
     * @returns {string[]} An array of account addresses in hex format.
     */
    getAccounts() {
        return this.wallets.map((w) => {
            return w.publicKey.toString('hex');
        });
    }
    /**
     * Retrieves the private key for the given public key.
     * @param {string} publicKey - The public key to retrieve the private key for.
     * @returns {ECPairInterface} The corresponding private key.
     * @private
     */
    _getPrivateKeyFor(publicKey) {
        if (!publicKey) {
            throw new Error('Must specify publicKey.');
        }
        const wallet = this._getWalletForAccount(publicKey);
        return wallet;
    }
    /**
     * Retrieves the wallet for a given account's public key.
     * @param {string} publicKey - The public key of the account to retrieve the wallet for.
     * @returns {ECPairInterface} The wallet corresponding to the given public key.
     * @private
     */
    _getWalletForAccount(publicKey) {
        let wallet = this.wallets.find((wallet) => wallet.publicKey.toString('hex') == publicKey);
        if (!wallet) {
            throw new Error('Simple Keyring - Unable to find matching publicKey.');
        }
        return wallet;
    }
    /**
     * Signs a PSBT (Partially Signed Bitcoin Transaction) using the private keys managed by this keyring.
     * @param {bitcoin.Psbt} psbt - The PSBT to sign.
     * @param {{ index: number; publicKey: string; sighashTypes?: number[] }[]} inputs - The inputs to sign, with their index, public key, and optional sighash types.
     * @param opts - Additional options.
     * @returns {Promise<bitcoin.Psbt>} A promise that resolves to the signed PSBT.
     */
    signTransaction(psbt, inputs, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            inputs.forEach(({ index, publicKey, sighashTypes }) => {
                var _a;
                const keyPair = this._getPrivateKeyFor(publicKey);
                const input = psbt.data.inputs[index];
                if ((0, bip371_1.isTaprootInput)(input)) {
                    const tweakedSigner = (0, utils_1.tweakSigner)(keyPair, {
                        network: bitcoin.networks['bitcoin'],
                    });
                    const signer = ((_a = input.witnessUtxo) === null || _a === void 0 ? void 0 : _a.script) &&
                        input.tapInternalKey &&
                        !input.tapLeafScript
                        ? tweakedSigner
                        : keyPair;
                    psbt.signInput(index, signer, sighashTypes);
                }
                else {
                    psbt.signInput(index, keyPair, sighashTypes);
                }
            });
            return psbt;
        });
    }
    /**
     * Retrieves the address and corresponding ECPair object from a given index.
     * @param {number} i - The index to derive the address from.
     * @returns {[string, ECPairInterface]} A tuple containing the address and the ECPair object.
     */
    _addressFromIndex(i) {
        if (!this._index2wallet[i]) {
            const child = this.root.deriveChild(i);
            const ecpair = utils_1.ECPair.fromPrivateKey(child.privateKey.toBuffer());
            const address = ecpair.publicKey.toString('hex');
            this._index2wallet[i] = [address, ecpair];
        }
        return this._index2wallet[i];
    }
}
exports.HdKeyring = HdKeyring;
//# sourceMappingURL=hdKeyring.js.map