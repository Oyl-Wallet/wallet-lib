"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletPrivateKeys = exports.generateWallet = exports.mnemonicToAccount = exports.generateMnemonic = void 0;
const tslib_1 = require("tslib");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const secp256k1_1 = tslib_1.__importDefault(require("@bitcoinerlab/secp256k1"));
const bip32_1 = require("bip32");
const bip32 = (0, bip32_1.BIP32Factory)(secp256k1_1.default);
const bip39 = tslib_1.__importStar(require("bip39"));
bitcoin.initEccLib(secp256k1_1.default);
const dotenv = tslib_1.__importStar(require("dotenv"));
dotenv.config();
const generateMnemonic = () => {
    return bip39.generateMnemonic();
};
exports.generateMnemonic = generateMnemonic;
const mnemonicToAccount = ({ mnemonic = (0, exports.generateMnemonic)(), opts, }) => {
    const options = {
        network: opts?.network ? opts.network : bitcoin.networks.bitcoin,
        index: opts?.index ? opts.index : 0,
        spendStrategy: {
            addressOrder: opts?.spendStrategy?.addressOrder
                ? opts.spendStrategy.addressOrder
                : [
                    'nativeSegwit',
                    'nestedSegwit',
                    'legacy',
                    'taproot',
                ],
            utxoSortGreatestToLeast: opts?.spendStrategy?.utxoSortGreatestToLeast !== undefined
                ? opts.spendStrategy.utxoSortGreatestToLeast
                : true,
            changeAddress: opts?.spendStrategy?.changeAddress
                ? opts?.spendStrategy?.changeAddress
                : 'nativeSegwit',
        },
    };
    const account = (0, exports.generateWallet)({
        mnemonic,
        opts: options,
    });
    return account;
};
exports.mnemonicToAccount = mnemonicToAccount;
const generateWallet = ({ mnemonic, opts, }) => {
    const toXOnly = (pubKey) => pubKey.length === 32 ? pubKey : pubKey.slice(1, 33);
    if (!mnemonic) {
        throw Error('mnemonic not given');
    }
    let pathLegacy = `m/44'/0'/0'/0/${opts.index}`;
    let pathSegwitNested = `m/49'/0'/0'/0/${opts.index}`;
    let pathSegwit = `m/84'/0'/0'/0/${opts.index}`;
    let pathTaproot = `m/86'/0'/0'/0/${opts.index}`;
    //unisat accomadation
    if (opts.network === bitcoin.networks.testnet) {
        pathLegacy = `m/44'/1'/0'/0/${opts.index}`;
        pathSegwitNested = `m/49'/1'/0'/0/${opts.index}`;
        pathSegwit = `m/84'/1'/0'/0/${opts.index}`;
        pathTaproot = `m/86'/1'/0'/0/${opts.index}`;
    }
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed);
    // Legacy
    const childLegacy = root.derivePath(pathLegacy);
    const pubkeyLegacy = childLegacy.publicKey;
    const addressLegacy = bitcoin.payments.p2pkh({
        pubkey: pubkeyLegacy,
        network: opts.network,
    });
    const legacy = {
        pubkey: pubkeyLegacy.toString('hex'),
        address: addressLegacy.address,
    };
    // Nested Segwit
    const childSegwitNested = root.derivePath(pathSegwitNested);
    const pubkeySegwitNested = childSegwitNested.publicKey;
    const addressSegwitNested = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({
            pubkey: pubkeySegwitNested,
            network: opts.network,
        }),
    });
    const nestedSegwit = {
        pubkey: pubkeySegwitNested.toString('hex'),
        address: addressSegwitNested.address,
    };
    // Native Segwit
    const childSegwit = root.derivePath(pathSegwit);
    const pubkeySegwit = childSegwit.publicKey;
    const addressSegwit = bitcoin.payments.p2wpkh({
        pubkey: pubkeySegwit,
        network: opts.network,
    });
    const nativeSegwit = {
        pubkey: pubkeySegwit.toString('hex'),
        address: addressSegwit.address,
    };
    // Taproot
    const childTaproot = root.derivePath(pathTaproot);
    const pubkeyTaproot = childTaproot.publicKey;
    const pubkeyTaprootXOnly = toXOnly(pubkeyTaproot);
    const addressTaproot = bitcoin.payments.p2tr({
        internalPubkey: pubkeyTaprootXOnly,
        network: opts.network,
    });
    const taproot = {
        pubkey: pubkeyTaproot.toString('hex'),
        pubKeyXOnly: pubkeyTaprootXOnly.toString('hex'),
        address: addressTaproot.address,
    };
    return {
        taproot,
        nativeSegwit,
        nestedSegwit,
        legacy,
        spendStrategy: opts.spendStrategy,
        network: opts.network,
    };
};
exports.generateWallet = generateWallet;
const getWalletPrivateKeys = ({ mnemonic, opts, }) => {
    if (!mnemonic) {
        throw Error('mnemonic not given');
    }
    const options = {
        network: opts?.network ? opts.network : bitcoin.networks.bitcoin,
        index: opts?.index ? opts.index : 0,
    };
    let pathLegacy = `m/44'/0'/0'/0/${options.index}`;
    let pathSegwitNested = `m/49'/0'/0'/0/${options.index}`;
    let pathSegwit = `m/84'/0'/0'/0/${options.index}`;
    let pathTaproot = `m/86'/0'/0'/0/${options.index}`;
    //unisat accomadation
    if (options.network === bitcoin.networks.testnet) {
        pathLegacy = `m/44'/1'/0'/0/${options.index}`;
        pathSegwitNested = `m/49'/1'/0'/0/${options.index}`;
        pathSegwit = `m/84'/1'/0'/0/${options.index}`;
        pathTaproot = `m/86'/1'/0'/0/${options.index}`;
    }
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed);
    // Legacy
    const childLegacy = root.derivePath(pathLegacy);
    const privateKeyLegacy = childLegacy.privateKey;
    const legacy = {
        privateKey: privateKeyLegacy.toString('hex'),
    };
    // Nested Segwit
    const childSegwitNested = root.derivePath(pathSegwitNested);
    const privateKey = childSegwitNested.privateKey;
    const nestedSegwit = {
        privateKey: privateKey.toString('hex'),
    };
    // Native Segwit
    const childSegwit = root.derivePath(pathSegwit);
    const privateKeySegwit = childSegwit.privateKey;
    const nativeSegwit = {
        privateKey: privateKeySegwit.toString('hex'),
    };
    // Taproot
    const childTaproot = root.derivePath(pathTaproot);
    const privateKeyTaproot = childTaproot.privateKey;
    const taproot = {
        privateKey: privateKeyTaproot.toString('hex'),
    };
    return {
        taproot,
        nativeSegwit,
        nestedSegwit,
        legacy,
    };
};
exports.getWalletPrivateKeys = getWalletPrivateKeys;
//# sourceMappingURL=account.js.map