"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Signer = void 0;
const tslib_1 = require("tslib");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const utils_1 = require("../shared/utils");
class Signer {
    network;
    segwitKeyPair;
    taprootKeyPair;
    legacyKeyPair;
    nestedSegwitKeyPair;
    addresses;
    constructor(network, keys) {
        if (keys.segwitPrivateKey) {
            const keyPair = utils_1.ECPair.fromPrivateKey(Buffer.from(keys.segwitPrivateKey, 'hex'));
            this.segwitKeyPair = keyPair;
        }
        if (keys.taprootPrivateKey) {
            const keyPair = utils_1.ECPair.fromPrivateKey(Buffer.from(keys.taprootPrivateKey, 'hex'));
            this.taprootKeyPair = keyPair;
        }
        if (keys.legacyPrivateKey) {
            const keyPair = utils_1.ECPair.fromPrivateKey(Buffer.from(keys.legacyPrivateKey, 'hex'));
            this.legacyKeyPair = keyPair;
        }
        if (keys.nestedSegwitPrivateKey) {
            const keyPair = utils_1.ECPair.fromPrivateKey(Buffer.from(keys.nestedSegwitPrivateKey, 'hex'));
            this.nestedSegwitKeyPair = keyPair;
        }
        this.network = network;
    }
    async signInput({ rawPsbt, inputNumber, finalize, }) {
        if (!this.segwitKeyPair) {
            throw new Error('Segwit signer was not initialized');
        }
        let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt);
        const matchingPubKey = unSignedPsbt.inputHasPubkey(inputNumber, this.segwitKeyPair.publicKey);
        if (matchingPubKey) {
            unSignedPsbt.signInput(inputNumber, this.segwitKeyPair);
            if (finalize) {
                unSignedPsbt.finalizeInput(inputNumber);
            }
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
        let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
            network: this.network,
        });
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
        const signedHexPsbt = unSignedPsbt.toHex();
        return {
            signedPsbt: signedPsbt,
            raw: unSignedPsbt,
            signedHexPsbt: signedHexPsbt,
        };
    }
    async signAllInputs({ rawPsbt, rawPsbtHex, finalize, }) {
        let unSignedPsbt;
        if (rawPsbt) {
            unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
                network: this.network,
            });
        }
        if (rawPsbtHex) {
            unSignedPsbt = bitcoin.Psbt.fromHex(rawPsbtHex, {
                network: this.network,
            });
        }
        for (let i = 0; i < unSignedPsbt.inputCount; i++) {
            let tweakedSigner;
            let matchingLegacy;
            let matchingNative;
            let matchingTaprootPubKey;
            let matchingNestedSegwit;
            if (this.taprootKeyPair) {
                tweakedSigner = (0, utils_1.tweakSigner)(this.taprootKeyPair, {
                    network: this.network,
                });
                matchingTaprootPubKey = unSignedPsbt.inputHasPubkey(i, tweakedSigner.publicKey);
            }
            if (this.legacyKeyPair) {
                matchingLegacy = unSignedPsbt.inputHasPubkey(i, this.legacyKeyPair.publicKey);
            }
            if (this.segwitKeyPair) {
                matchingNative = unSignedPsbt.inputHasPubkey(i, this.segwitKeyPair.publicKey);
            }
            if (this.nestedSegwitKeyPair) {
                matchingNestedSegwit = unSignedPsbt.inputHasPubkey(i, this.nestedSegwitKeyPair.publicKey);
            }
            switch (true) {
                case matchingTaprootPubKey:
                    unSignedPsbt.signTaprootInput(i, tweakedSigner);
                    if (finalize) {
                        unSignedPsbt.finalizeInput(i);
                    }
                    break;
                case matchingLegacy:
                    unSignedPsbt.signInput(i, this.legacyKeyPair);
                    if (finalize) {
                        unSignedPsbt.finalizeInput(i);
                    }
                    break;
                case matchingNative:
                    unSignedPsbt.signInput(i, this.segwitKeyPair);
                    if (finalize) {
                        unSignedPsbt.finalizeInput(i);
                    }
                    break;
                case matchingNestedSegwit:
                    unSignedPsbt.signInput(i, this.nestedSegwitKeyPair);
                    if (finalize) {
                        unSignedPsbt.finalizeInput(i);
                    }
                    break;
                default:
            }
        }
        const signedPsbt = unSignedPsbt.toBase64();
        const signedHexPsbt = unSignedPsbt.extractTransaction().toHex();
        return { signedPsbt, signedHexPsbt };
    }
    async signAllSegwitInputs({ rawPsbt, finalize, }) {
        if (!this.segwitKeyPair) {
            throw new Error('Segwit signer was not initialized');
        }
        let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
            network: this.network,
        });
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