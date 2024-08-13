"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signBip322Message = exports.bip0322Hash = void 0;
const tslib_1 = require("tslib");
const secp256k1 = tslib_1.__importStar(require("noble-secp256k1"));
const base_1 = require("@scure/base");
const btc = tslib_1.__importStar(require("@scure/btc-signer"));
const bitcoin_address_validation_1 = require("bitcoin-address-validation");
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const bitcoinjs_message_1 = require("bitcoinjs-message");
const varuint_bitcoin_1 = require("varuint-bitcoin");
const bitcoinMainnet = {
    bech32: 'bc',
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80,
};
const bitcoinTestnet = {
    bech32: 'tb',
    pubKeyHash: 0x6f,
    scriptHash: 0xc4,
    wif: 0xef,
};
const bitcoinNetworks = {
    Mainnet: bitcoinMainnet,
    Testnet: bitcoinTestnet,
};
const getBtcNetwork = (networkType) => {
    return bitcoinNetworks[networkType];
};
/**
 *
 * @param message
 * @returns Bip322 Message Hash
 *
 */
function bip0322Hash(message) {
    const { sha256 } = bitcoinjs_lib_1.crypto;
    const tag = 'BIP0322-signed-message';
    const tagHash = sha256(Buffer.from(tag));
    const result = sha256(Buffer.concat([tagHash, tagHash, Buffer.from(message)]));
    return result.toString('hex');
}
exports.bip0322Hash = bip0322Hash;
function encodeVarString(b) {
    return Buffer.concat([(0, varuint_bitcoin_1.encode)(b.byteLength), b]);
}
const getSigningPk = (type, privateKey) => {
    switch (type) {
        case bitcoin_address_validation_1.AddressType.p2tr: {
            return secp256k1.schnorr.getPublicKey(privateKey);
        }
        case bitcoin_address_validation_1.AddressType.p2sh: {
            return secp256k1.getPublicKey(privateKey, true);
        }
        case bitcoin_address_validation_1.AddressType.p2wpkh: {
            return secp256k1.getPublicKey(privateKey, true);
        }
        default: {
            throw new Error('Unsupported Address Type');
        }
    }
};
const getSignerScript = (type, publicKey, network) => {
    switch (type) {
        case bitcoin_address_validation_1.AddressType.p2tr: {
            return btc.p2tr(publicKey, undefined, network);
        }
        case bitcoin_address_validation_1.AddressType.p2wpkh: {
            return btc.p2wpkh(publicKey, network);
        }
        case bitcoin_address_validation_1.AddressType.p2sh: {
            const p2wph = btc.p2wpkh(publicKey, network);
            return btc.p2sh(p2wph, network);
        }
        default: {
            throw new Error('Unsupported Address Type');
        }
    }
};
const signBip322Message = async ({ message, network, privateKey, signatureAddress, }) => {
    const { type } = (0, bitcoin_address_validation_1.getAddressInfo)(signatureAddress);
    const ecpairPk = privateKey;
    const newPk = privateKey.toString('hex');
    if (type === bitcoin_address_validation_1.AddressType.p2sh) {
        return (await (0, bitcoinjs_message_1.signAsync)(message, ecpairPk, false, { segwitType: 'p2sh(p2wpkh)' })).toString('base64');
    }
    const publicKey = getSigningPk(type, newPk);
    const txScript = getSignerScript(type, publicKey, getBtcNetwork(network));
    const inputHash = base_1.hex.decode('0000000000000000000000000000000000000000000000000000000000000000');
    const txVersion = 0;
    const inputIndex = 4294967295;
    const sequence = 0;
    const scriptSig = btc.Script.encode(['OP_0', base_1.hex.decode(bip0322Hash(message))]);
    // tx-to-spend
    const txToSpend = new btc.Transaction({
        allowUnknownOutputs: true,
        version: txVersion,
    });
    txToSpend.addOutput({
        amount: BigInt(0),
        script: txScript.script,
    });
    txToSpend.addInput({
        txid: inputHash,
        index: inputIndex,
        sequence,
        finalScriptSig: scriptSig,
    });
    // tx-to-sign
    const txToSign = new btc.Transaction({
        allowUnknownOutputs: true,
        version: txVersion,
    });
    txToSign.addInput({
        txid: txToSpend.id,
        index: 0,
        sequence,
        tapInternalKey: type === bitcoin_address_validation_1.AddressType.p2tr ? publicKey : undefined,
        witnessUtxo: {
            script: txScript.script,
            amount: BigInt(0),
        },
        redeemScript: bitcoin_address_validation_1.AddressType.p2sh ? txScript.redeemScript : Buffer.alloc(0),
    });
    txToSign.addOutput({ script: btc.Script.encode(['RETURN']), amount: BigInt(0) });
    txToSign.sign(base_1.hex.decode(newPk));
    txToSign.finalize();
    // formulate-signature
    const firstInput = txToSign.getInput(0);
    if (firstInput.finalScriptWitness?.length) {
        const len = (0, varuint_bitcoin_1.encode)(firstInput.finalScriptWitness?.length);
        const result = Buffer.concat([len, ...firstInput.finalScriptWitness.map((w) => encodeVarString(w))]);
        return result.toString('base64');
    }
    else {
        return '';
    }
};
exports.signBip322Message = signBip322Message;
//# sourceMappingURL=BIP322.js.map