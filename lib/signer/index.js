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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Signer = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const utils_1 = require("../shared/utils");
class Signer {
    network;
    segwitKeyPair;
    taprootKeyPair;
    addresses;
    constructor(network, keys) {
        if (keys.segwitPrivateKey) {
            this.segwitKeyPair = utils_1.ECPair.fromPrivateKey(Buffer.from(keys.segwitPrivateKey, 'hex'));
        }
        if (keys.taprootPrivateKey) {
            this.taprootKeyPair = utils_1.ECPair.fromPrivateKey(Buffer.from(keys.taprootPrivateKey, 'hex'));
        }
        this.network = network;
    }
    async signSegwitInput({ rawPsbt, inputNumber, finalize, }) {
        if (!this.segwitKeyPair) {
            throw new Error('Segwit signer was not initialized');
        }
        let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt);
        const matchingPubKey = unSignedPsbt.inputHasPubkey(inputNumber, Buffer.from(this.segwitKeyPair.publicKey));
        if (!matchingPubKey) {
            throw new Error('Input does not match signer type');
        }
        unSignedPsbt.signInput(inputNumber, this.segwitKeyPair);
        if (finalize) {
            unSignedPsbt.finalizeInput(inputNumber);
        }
        const signedPsbt = unSignedPsbt.toBase64();
        return { signedPsbt: signedPsbt };
    }
    async signTaprootInput({ rawPsbt, inputNumber, finalize, }) {
        if (!this.taprootKeyPair) {
            throw new Error('Taproot signer was not initialized');
        }
        let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
            network: this.network,
        });
        const tweakedSigner = (0, utils_1.tweakSigner)(this.taprootKeyPair);
        const matchingPubKey = unSignedPsbt.inputHasPubkey(inputNumber, tweakedSigner.publicKey);
        if (!matchingPubKey) {
            throw new Error('Input does not match signer type');
        }
        unSignedPsbt.signTaprootInput(inputNumber, tweakedSigner);
        if (finalize) {
            unSignedPsbt.finalizeInput(inputNumber);
        }
        const signedPsbt = unSignedPsbt.toBase64();
        return { signedPsbt: signedPsbt };
    }
    async signAllTaprootInputs({ rawPsbt, finalize, }) {
        if (!this.taprootKeyPair) {
            throw new Error('Taproot signer was not initialized');
        }
        let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt);
        let tweakedSigner = (0, utils_1.tweakSigner)(this.taprootKeyPair);
        for (let i = 0; i < unSignedPsbt.inputCount; i++) {
            const matchingPubKey = unSignedPsbt.inputHasPubkey(i, tweakedSigner.publicKey);
            if (matchingPubKey) {
                unSignedPsbt.signTaprootInput(i, tweakedSigner);
                if (finalize) {
                    unSignedPsbt.finalizeInput(i);
                }
            }
        }
        const signedPsbt = unSignedPsbt.toBase64();
        return { signedPsbt: signedPsbt, raw: unSignedPsbt };
    }
    async signAllSegwitInputs({ rawPsbt, finalize, }) {
        if (!this.segwitKeyPair) {
            throw new Error('Segwit signer was not initialized');
        }
        let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt);
        for (let i = 0; i < unSignedPsbt.inputCount; i++) {
            const matchingPubKey = unSignedPsbt.inputHasPubkey(i, this.segwitKeyPair.publicKey);
            if (matchingPubKey) {
                unSignedPsbt.signInput(i, this.segwitKeyPair);
                if (finalize) {
                    unSignedPsbt.finalizeInput(i);
                }
            }
        }
        const signedPsbt = unSignedPsbt.toBase64();
        const signedHexPsbt = unSignedPsbt.toHex();
        return { signedPsbt: signedPsbt, signedHexPsbt: signedHexPsbt };
    }
    async signMessage({ messageToSign, keyToUse, }) {
        if (!this.taprootKeyPair && keyToUse === 'taprootKeyPair') {
            throw new Error('Taproot signer was not initialized');
        }
        if (!this.taprootKeyPair && keyToUse === 'segwitKeyPair') {
            throw new Error('Taproot signer was not initialized');
        }
        const signedMessage = this[keyToUse].sign(Buffer.from(messageToSign));
        return signedMessage;
    }
}
exports.Signer = Signer;
//# sourceMappingURL=index.js.map