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
exports.validateSegwitAddress = exports.validateTaprootAddress = exports.getAddressType = exports.getMetaUtxos = exports.convertUsdValue = exports.calculateBalance = exports.getBtcPrice = exports.getUnspentOutputs = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
/**
 *
 Returns from https://www.blockchain.com/explorer/api/blockchain_api.
 One way UTXOs can be gotten directly from the node is with RPC command - 'gettxout'
 However this accepts a single transaction as a parameter, making it impratical to use
 directly when getting UTXOs by address/public key. The best idea will be to index the
 all UTXOs from the blockchain in a db (just like with wallets and transactions on bcoin)
 and extend the bcoin RPC server. To return the nodes.
 Also consider - if this is a client wallet that can be run with a custom server, there will
 need to be a default alternative outside Oyl Api (e.g the blockchainApi)
 *
 */
const getUnspentOutputs = (address) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield (0, node_fetch_1.default)(`https://blockchain.info/unspent?active=${address}`, {
            headers: {
                Accept: 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch unspent output for address ${address}`);
        }
        const jsonResponse = yield response.json();
        return jsonResponse;
    }
    catch (error) {
        console.log(error);
    }
});
exports.getUnspentOutputs = getUnspentOutputs;
const getBtcPrice = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield (0, node_fetch_1.default)(`https://blockchain.info/ticker`, {
            headers: {
                Accept: 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch btc price from binance`);
        }
        const jsonResponse = yield response.json();
        return jsonResponse;
    }
    catch (error) {
        console.log(Error);
    }
});
exports.getBtcPrice = getBtcPrice;
const calculateBalance = function (utxos) {
    let balance = 0;
    for (let utxo = 0; utxo < utxos.length; utxo++) {
        balance += utxos[utxo].value;
    }
    return balance / 1e8; // Convert from satoshis to BTC
};
exports.calculateBalance = calculateBalance;
const convertUsdValue = (amount) => __awaiter(void 0, void 0, void 0, function* () {
    const pricePayload = yield (0, exports.getBtcPrice)();
    const btcPrice = parseFloat(pricePayload.USD.last);
    const amountInBTC = parseFloat(amount) * btcPrice;
    return amountInBTC.toFixed(2);
});
exports.convertUsdValue = convertUsdValue;
const getMetaUtxos = (address, utxos, inscriptions) => __awaiter(void 0, void 0, void 0, function* () {
    const formattedData = [];
    for (const utxo of utxos) {
        const formattedUtxo = {
            txId: utxo.tx_hash_big_endian,
            outputIndex: utxo.tx_output_n,
            satoshis: utxo.value,
            scriptPk: utxo.script,
            addressType: getAddressType(address),
            address: address,
            inscriptions: [],
        };
        for (const inscription of inscriptions) {
            if (inscription.detail.location
                .split(':')[0]
                .includes(utxo.tx_hash_big_endian)) {
                formattedUtxo.inscriptions.push(inscription.detail);
            }
            else {
            }
        }
        formattedData.push(formattedUtxo);
    }
    return formattedData;
});
exports.getMetaUtxos = getMetaUtxos;
function getAddressType(address) {
    if (address.startsWith('1')) {
        return 0;
    }
    else if (address.startsWith('bc1p')) {
        return 1;
    }
    else if (address.startsWith('3')) {
        return 2;
    }
    else if (address.startsWith('bc1q')) {
        return 3;
    }
    else {
        return null; // If the address doesn't match any known type
    }
}
exports.getAddressType = getAddressType;
const validateTaprootAddress = ({ address, type }) => {
    try {
        const decodedBech32 = bitcoin.address.fromBech32(address);
        if (decodedBech32.version === 1 && decodedBech32.data.length === 32) {
            return type === 'taproot';
        }
    }
    catch (error) {
        // Address is not in Bech32 format
        return false;
    }
    return false;
};
exports.validateTaprootAddress = validateTaprootAddress;
const validateSegwitAddress = ({ address, type }) => {
    try {
        const decodedBech32 = bitcoin.address.fromBech32(address);
        if (decodedBech32.version === 0) {
            return type === 'segwit';
        }
    }
    catch (error) {
        // Address is not in Bech32 format
        return false;
    }
    return false;
};
exports.validateSegwitAddress = validateSegwitAddress;
//# sourceMappingURL=index.js.map
