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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRuneUtxosToSpend = exports.encodeVarint = exports.isValidJSON = exports.addBtcUtxo = exports.filterUtxos = exports.filterTaprootUtxos = exports.sendCollectible = exports.isP2TR = exports.isP2SHScript = exports.isP2WSHScript = exports.isP2WPKH = exports.isP2PKH = exports.getRawTxnHashFromTxnId = exports.calculateTaprootTxSize = exports.getOutputValueByVOutIndex = exports.waitForTransaction = exports.callBTCRPCEndpoint = exports.RPC_ADDR = exports.createRuneMintScript = exports.createRuneSendScript = exports.createInscriptionScript = exports.signInputs = exports.timeout = exports.formatInputsToSign = exports.formatOptionsToSignInputs = exports.calculateAmountGatheredUtxo = exports.calculateAmountGathered = exports.getInscriptionsByWalletBIS = exports.getSatpointFromUtxo = exports.getWitnessDataChunk = exports.utxoToInput = exports.validator = exports.amountToSatoshis = exports.delay = exports.satoshisToAmount = exports.tweakSigner = exports.checkPaymentType = exports.getNetwork = exports.assertHex = exports.ECPair = exports.inscriptionSats = exports.addressTypeMap = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecpair_1 = __importDefault(require("ecpair"));
const secp256k1_1 = __importDefault(require("@bitcoinerlab/secp256k1"));
const interface_1 = require("../shared/interface");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const constants_1 = require("./constants");
const axios_1 = __importDefault(require("axios"));
const buildOrdTx_1 = require("../txbuilder/buildOrdTx");
const bip371_1 = require("bitcoinjs-lib/src/psbt/bip371");
bitcoin.initEccLib(secp256k1_1.default);
exports.addressTypeMap = { 0: 'p2pkh', 1: 'p2tr', 2: 'p2sh', 3: 'p2wpkh' };
exports.inscriptionSats = 546;
exports.ECPair = (0, ecpair_1.default)(secp256k1_1.default);
const assertHex = (pubKey) => pubKey.length === 32 ? pubKey : pubKey.slice(1, 33);
exports.assertHex = assertHex;
function tapTweakHash(pubKey, h) {
    return bitcoin.crypto.taggedHash('TapTweak', Buffer.concat(h ? [pubKey, h] : [pubKey]));
}
function getNetwork(value) {
    if (value === 'mainnet' || value === 'main') {
        return bitcoin.networks['bitcoin'];
    }
    return bitcoin.networks[value];
}
exports.getNetwork = getNetwork;
function checkPaymentType(payment, network) {
    return (script) => {
        try {
            return payment({ output: script, network: getNetwork(network) });
        }
        catch (error) {
            return false;
        }
    };
}
exports.checkPaymentType = checkPaymentType;
function tweakSigner(signer, opts = {}) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let privateKey = signer.privateKey;
    if (!privateKey) {
        throw new Error('Private key required');
    }
    if (signer.publicKey[0] === 3) {
        privateKey = secp256k1_1.default.privateNegate(privateKey);
    }
    const tweakedPrivateKey = secp256k1_1.default.privateAdd(privateKey, tapTweakHash((0, exports.assertHex)(signer.publicKey), opts.tweakHash));
    if (!tweakedPrivateKey) {
        throw new Error('Invalid tweaked private key!');
    }
    return exports.ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
        network: opts.network,
    });
}
exports.tweakSigner = tweakSigner;
function satoshisToAmount(val) {
    const num = new bignumber_js_1.default(val);
    return num.dividedBy(100000000).toFixed(8);
}
exports.satoshisToAmount = satoshisToAmount;
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.delay = delay;
function amountToSatoshis(val) {
    const num = new bignumber_js_1.default(val);
    return num.multipliedBy(100000000).toNumber();
}
exports.amountToSatoshis = amountToSatoshis;
const validator = (pubkey, msghash, signature) => exports.ECPair.fromPublicKey(pubkey).verify(msghash, signature);
exports.validator = validator;
function utxoToInput(utxo, publicKey) {
    let data;
    switch (utxo.addressType) {
        case interface_1.AddressType.P2TR:
            data = {
                hash: utxo.txId,
                index: utxo.outputIndex,
                witnessUtxo: {
                    value: utxo.satoshis,
                    script: Buffer.from(utxo.scriptPk, 'hex'),
                },
                tapInternalKey: (0, exports.assertHex)(publicKey),
            };
            return {
                data,
                utxo,
            };
        case interface_1.AddressType.P2WPKH:
            data = {
                hash: utxo.txId,
                index: utxo.outputIndex,
                witnessUtxo: {
                    value: utxo.satoshis,
                    script: Buffer.from(utxo.scriptPk, 'hex'),
                },
            };
            return {
                data,
                utxo,
            };
        case interface_1.AddressType.P2PKH:
            data = {
                hash: utxo.txId,
                index: utxo.outputIndex,
                witnessUtxo: {
                    value: utxo.satoshis,
                    script: Buffer.from(utxo.scriptPk, 'hex'),
                },
            };
            return {
                data,
                utxo,
            };
        case interface_1.AddressType.P2SH_P2WPKH:
            const redeemData = bitcoin.payments.p2wpkh({ pubkey: publicKey });
            data = {
                hash: utxo.txId,
                index: utxo.outputIndex,
                witnessUtxo: {
                    value: utxo.satoshis,
                    script: Buffer.from(utxo.scriptPk, 'hex'),
                },
                redeemScript: redeemData.output,
            };
            return {
                data,
                utxo,
            };
        default:
            data = {
                hash: '',
                index: 0,
                witnessUtxo: {
                    value: 0,
                    script: Buffer.from(utxo.scriptPk, 'hex'),
                },
            };
            return {
                data,
                utxo,
            };
    }
}
exports.utxoToInput = utxoToInput;
const getWitnessDataChunk = function (content, encodeType = 'utf8') {
    const buffered = Buffer.from(content, encodeType);
    const contentChunks = [];
    let chunks = 0;
    while (chunks < buffered.byteLength) {
        const split = buffered.subarray(chunks, chunks + constants_1.maximumScriptBytes);
        chunks += split.byteLength;
        contentChunks.push(split);
    }
    return contentChunks;
};
exports.getWitnessDataChunk = getWitnessDataChunk;
const getSatpointFromUtxo = (utxo) => {
    return `${utxo.tx_hash_big_endian}:${utxo.tx_output_n}:0`;
};
exports.getSatpointFromUtxo = getSatpointFromUtxo;
const getInscriptionsByWalletBIS = async (walletAddress, offset = 0) => {
    return (await axios_1.default
        .get(`https://api.bestinslot.xyz/v3/wallet/inscriptions?address=${walletAddress}&sort_by=inscr_num&order=asc&offset=${offset}&count=100`, {
        headers: {
            'X-Api-Key': 'abbfff3d-49fa-4f7f-883a-0a5fce48a9f1',
        },
    })
        .then((res) => res.data?.data));
};
exports.getInscriptionsByWalletBIS = getInscriptionsByWalletBIS;
function calculateAmountGathered(utxoArray) {
    return utxoArray?.reduce((prev, currentValue) => prev + currentValue.value, 0);
}
exports.calculateAmountGathered = calculateAmountGathered;
function calculateAmountGatheredUtxo(utxoArray) {
    return utxoArray?.reduce((prev, currentValue) => prev + currentValue.satoshis, 0);
}
exports.calculateAmountGatheredUtxo = calculateAmountGatheredUtxo;
const formatOptionsToSignInputs = async ({ _psbt, pubkey, segwitPubkey, segwitAddress, taprootAddress, network, }) => {
    let toSignInputs = [];
    let index = 0;
    for await (const v of _psbt.data.inputs) {
        let script = null;
        let value = 0;
        const isSigned = v.finalScriptSig || v.finalScriptWitness;
        const lostInternalPubkey = !v.tapInternalKey;
        if (v.witnessUtxo) {
            script = v.witnessUtxo.script;
            value = v.witnessUtxo.value;
        }
        else if (v.nonWitnessUtxo) {
            const tx = bitcoin.Transaction.fromBuffer(v.nonWitnessUtxo);
            const output = tx.outs[_psbt.txInputs[index].index];
            script = output.script;
            value = output.value;
        }
        if (!isSigned || lostInternalPubkey) {
            const tapInternalKey = (0, exports.assertHex)(Buffer.from(pubkey, 'hex'));
            const p2tr = bitcoin.payments.p2tr({
                internalPubkey: tapInternalKey,
                network: network,
            });
            if (v.witnessUtxo?.script.toString('hex') == p2tr.output?.toString('hex')) {
                v.tapInternalKey = tapInternalKey;
                if (v.tapInternalKey) {
                    toSignInputs.push({
                        index: index,
                        publicKey: pubkey,
                        sighashTypes: v.sighashType ? [v.sighashType] : undefined,
                    });
                }
            }
        }
        if (script && !isSigned && !(0, bip371_1.isTaprootInput)(v)) {
            toSignInputs.push({
                index: index,
                publicKey: segwitPubkey,
                sighashTypes: v.sighashType ? [v.sighashType] : undefined,
            });
        }
        index++;
    }
    return toSignInputs;
};
exports.formatOptionsToSignInputs = formatOptionsToSignInputs;
const formatInputsToSign = async ({ _psbt, senderPublicKey, network, }) => {
    let index = 0;
    for await (const v of _psbt.data.inputs) {
        const isSigned = v.finalScriptSig || v.finalScriptWitness;
        const lostInternalPubkey = !v.tapInternalKey;
        if (!isSigned || lostInternalPubkey) {
            const tapInternalKey = (0, bip371_1.toXOnly)(Buffer.from(senderPublicKey, 'hex'));
            const p2tr = bitcoin.payments.p2tr({
                internalPubkey: tapInternalKey,
                network: network,
            });
            if (v.witnessUtxo?.script.toString('hex') === p2tr.output?.toString('hex')) {
                v.tapInternalKey = tapInternalKey;
            }
        }
        index++;
    }
    return _psbt;
};
exports.formatInputsToSign = formatInputsToSign;
const timeout = async (n) => await new Promise((resolve) => setTimeout(resolve, n));
exports.timeout = timeout;
const signInputs = async (psbt, toSignInputs, taprootPubkey, segwitPubKey, segwitSigner, taprootSigner) => {
    const taprootInputs = [];
    const segwitInputs = [];
    const inputs = psbt.data.inputs;
    toSignInputs.forEach(({ publicKey }, i) => {
        const input = inputs[i];
        if (publicKey === taprootPubkey && !input.finalScriptWitness) {
            taprootInputs.push(toSignInputs[i]);
        }
        if (segwitPubKey && segwitSigner) {
            if (publicKey === segwitPubKey) {
                segwitInputs.push(toSignInputs[i]);
            }
        }
    });
    if (taprootInputs.length > 0) {
        await taprootSigner(psbt, taprootInputs);
    }
    if (segwitSigner && segwitInputs.length > 0) {
        await segwitSigner(psbt, segwitInputs);
    }
    return psbt;
};
exports.signInputs = signInputs;
const createInscriptionScript = (pubKey, content) => {
    const mimeType = 'text/plain;charset=utf-8';
    const textEncoder = new TextEncoder();
    const mimeTypeHex = Buffer.from(textEncoder.encode(mimeType)).toString('hex');
    const contentHex = Buffer.from(textEncoder.encode(content)).toString('hex');
    const markerHex = '6f7264';
    return `${pubKey} OP_CHECKSIG OP_0 OP_IF ${markerHex} 01 ${mimeTypeHex} OP_0 ${contentHex} OP_ENDIF`;
};
exports.createInscriptionScript = createInscriptionScript;
function encodeToBase26(inputString) {
    const baseCharCode = 'a'.charCodeAt(0);
    return inputString
        .toLowerCase()
        .split('')
        .map((char) => {
        const charCode = char.charCodeAt(0);
        if (charCode >= baseCharCode && charCode < baseCharCode + 26) {
            return String.fromCharCode(charCode - baseCharCode + 97); // Convert to base26 (a-z)
        }
        else {
            return char;
        }
    })
        .join('');
}
const createRuneSendScript = ({ runeId, amount, sendOutputIndex = 1, pointer = 0, }) => {
    const pointerFlag = (0, exports.encodeVarint)(BigInt(22)).varint;
    const pointerVarint = (0, exports.encodeVarint)(BigInt(pointer)).varint;
    const bodyFlag = (0, exports.encodeVarint)(BigInt(0)).varint;
    const amountToSend = (0, exports.encodeVarint)(BigInt(amount)).varint;
    const encodedOutputIndex = (0, exports.encodeVarint)(BigInt(sendOutputIndex)).varint;
    const splitIdString = runeId.split(':');
    const block = Number(splitIdString[0]);
    const blockTx = Number(splitIdString[1]);
    const encodedBlock = (0, exports.encodeVarint)(BigInt(block)).varint;
    const encodedBlockTxNumber = (0, exports.encodeVarint)(BigInt(blockTx)).varint;
    const runeStone = Buffer.concat([
        pointerFlag,
        pointerVarint,
        bodyFlag,
        encodedBlock,
        encodedBlockTxNumber,
        amountToSend,
        encodedOutputIndex,
    ]);
    let runeStoneLength = runeStone.byteLength.toString(16);
    if (runeStoneLength.length % 2 !== 0) {
        runeStoneLength = '0' + runeStone.byteLength.toString(16);
    }
    const script = Buffer.concat([
        Buffer.from('6a', 'hex'),
        Buffer.from('5d', 'hex'),
        Buffer.from(runeStoneLength, 'hex'),
        runeStone,
    ]);
    return script;
};
exports.createRuneSendScript = createRuneSendScript;
const createRuneMintScript = ({ runeId, amountToMint, mintOutPutIndex = 1, pointer = 1, }) => {
    const pointerFlag = (0, exports.encodeVarint)(BigInt(22)).varint;
    const pointerVarint = (0, exports.encodeVarint)(BigInt(pointer)).varint;
    const bodyFlag = (0, exports.encodeVarint)(BigInt(0)).varint;
    const mintFlag = (0, exports.encodeVarint)(BigInt(20)).varint;
    const mintAmount = (0, exports.encodeVarint)(BigInt(amountToMint)).varint;
    const encodedOutputIndex = (0, exports.encodeVarint)(BigInt(mintOutPutIndex)).varint;
    const splitIdString = runeId.split(':');
    const block = Number(splitIdString[0]);
    const blockTx = Number(splitIdString[1]);
    const encodedBlock = (0, exports.encodeVarint)(BigInt(block)).varint;
    const encodedBlockTxNumber = (0, exports.encodeVarint)(BigInt(blockTx)).varint;
    const runeStone = Buffer.concat([
        pointerFlag,
        pointerVarint,
        mintFlag,
        encodedBlock,
        mintFlag,
        encodedBlockTxNumber,
        bodyFlag,
        encodedBlock,
        encodedBlockTxNumber,
        mintAmount,
        encodedOutputIndex,
    ]);
    let runeStoneLength = runeStone.byteLength.toString(16);
    if (runeStoneLength.length % 2 !== 0) {
        runeStoneLength = '0' + runeStone.byteLength.toString(16);
    }
    const script = Buffer.concat([
        Buffer.from('6a', 'hex'),
        Buffer.from('5d', 'hex'),
        Buffer.from(runeStoneLength, 'hex'),
        runeStone,
    ]);
    return script;
};
exports.createRuneMintScript = createRuneMintScript;
exports.RPC_ADDR = 'https://mainnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094';
const callBTCRPCEndpoint = async (method, params, network) => {
    if (network === 'testnet') {
        exports.RPC_ADDR =
            'https://testnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094';
    }
    if (network === 'regtest') {
        exports.RPC_ADDR === 'http://localhost:3000/v1/regtest';
    }
    const data = JSON.stringify({
        jsonrpc: '2.0',
        id: method,
        method: method,
        params: [params],
    });
    // @ts-ignore
    return await axios_1.default
        .post(exports.RPC_ADDR, data, {
        headers: {
            'content-type': 'application/json',
        },
    })
        .then((res) => res.data)
        .catch((e) => {
        console.error(e.response);
        throw e;
    });
};
exports.callBTCRPCEndpoint = callBTCRPCEndpoint;
async function waitForTransaction({ txId, sandshrewBtcClient, }) {
    const timeout = 60000; // 1 minute in milliseconds
    const startTime = Date.now();
    while (true) {
        try {
            const result = await sandshrewBtcClient.bitcoindRpc.getMemPoolEntry(txId);
            if (result) {
                break;
            }
            // Check for timeout
            if (Date.now() - startTime > timeout) {
                throw new Error(`Timeout: Could not find transaction in mempool: ${txId}`);
            }
            // Wait for 5 seconds before retrying
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        catch (error) {
            // Check for timeout
            if (Date.now() - startTime > timeout) {
                throw new Error(`Timeout: Could not find transaction in mempool: ${txId}`);
            }
            // Wait for 5 seconds before retrying
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
}
exports.waitForTransaction = waitForTransaction;
async function getOutputValueByVOutIndex({ txId, vOut, esploraRpc, }) {
    const timeout = 60000; // 1 minute in milliseconds
    const startTime = Date.now();
    while (true) {
        const txDetails = await esploraRpc.getTxInfo(txId);
        if (txDetails?.vout && txDetails.vout.length > 0) {
            return {
                value: txDetails.vout[vOut].value,
                script: txDetails.vout[vOut].scriptpubkey,
            };
        }
        // Check for timeout
        if (Date.now() - startTime > timeout) {
            throw new Error('Timeout reached, stopping search.');
        }
        // Wait for 5 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }
}
exports.getOutputValueByVOutIndex = getOutputValueByVOutIndex;
function calculateTaprootTxSize(taprootInputCount, nonTaprootInputCount, outputCount) {
    const baseTxSize = 10; // Base transaction size without inputs/outputs
    // Size contributions from inputs
    const taprootInputSize = 64; // Average size of a Taproot input (can vary)
    const nonTaprootInputSize = 42; // Average size of a non-Taproot input (can vary)
    const outputSize = 40;
    const totalInputSize = taprootInputCount * taprootInputSize +
        nonTaprootInputCount * nonTaprootInputSize;
    const totalOutputSize = outputCount * outputSize;
    return baseTxSize + totalInputSize + totalOutputSize;
}
exports.calculateTaprootTxSize = calculateTaprootTxSize;
async function getRawTxnHashFromTxnId(txnId) {
    const res = await axios_1.default.post('https://mainnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094', {
        jsonrpc: '2.0',
        id: 1,
        method: 'btc_getrawtransaction',
        params: [txnId],
    }, {
        headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
}
exports.getRawTxnHashFromTxnId = getRawTxnHashFromTxnId;
const isP2PKH = (script, network) => {
    const p2pkh = checkPaymentType(bitcoin.payments.p2pkh, network)(script);
    return {
        type: 'p2pkh',
        payload: p2pkh,
    };
};
exports.isP2PKH = isP2PKH;
const isP2WPKH = (script, network) => {
    const p2wpkh = checkPaymentType(bitcoin.payments.p2wpkh, network)(script);
    return {
        type: 'p2wpkh',
        payload: p2wpkh,
    };
};
exports.isP2WPKH = isP2WPKH;
const isP2WSHScript = (script, network) => {
    const p2wsh = checkPaymentType(bitcoin.payments.p2wsh, network)(script);
    return {
        type: 'p2sh',
        payload: p2wsh,
    };
};
exports.isP2WSHScript = isP2WSHScript;
const isP2SHScript = (script, network) => {
    const p2sh = checkPaymentType(bitcoin.payments.p2sh, network)(script);
    return {
        type: 'p2sh',
        payload: p2sh,
    };
};
exports.isP2SHScript = isP2SHScript;
const isP2TR = (script, network) => {
    const p2tr = checkPaymentType(bitcoin.payments.p2tr, network)(script);
    return {
        type: 'p2tr',
        payload: p2tr,
    };
};
exports.isP2TR = isP2TR;
const sendCollectible = async ({ inscriptionId, inputAddress, outputAddress, taprootPublicKey, segwitPublicKey, segwitAddress, isDry, segwitSigner, taprootSigner, payFeesWithSegwit = false, feeRate, network, taprootUtxos, segwitUtxos, metaOutputValue, sandshrewBtcClient, }) => {
    const psbt = new bitcoin.Psbt({ network: getNetwork(network) });
    const utxosToSend = await insertCollectibleUtxo({
        taprootUtxos: taprootUtxos,
        inscriptionId: inscriptionId,
        toAddress: outputAddress,
        psbt: psbt,
    });
    psbt.txOutputs[0].value = metaOutputValue;
    await (0, buildOrdTx_1.getUtxosForFees)({
        payFeesWithSegwit: payFeesWithSegwit,
        psbtTx: psbt,
        taprootUtxos: taprootUtxos,
        segwitUtxos: segwitUtxos,
        segwitAddress: segwitAddress,
        feeRate: feeRate,
        taprootAddress: inputAddress,
        segwitPubKey: segwitPublicKey,
        utxosToSend: utxosToSend,
        network: getNetwork(network),
        fromAddress: inputAddress,
    });
    const toSignInputs = await (0, exports.formatOptionsToSignInputs)({
        _psbt: psbt,
        pubkey: taprootPublicKey,
        segwitPubkey: segwitPublicKey,
        segwitAddress: segwitAddress,
        taprootAddress: inputAddress,
        network: getNetwork(network),
    });
    const signedPsbt = await (0, exports.signInputs)(psbt, toSignInputs, taprootPublicKey, segwitPublicKey, segwitSigner, taprootSigner);
    signedPsbt.finalizeAllInputs();
    const rawTx = signedPsbt.extractTransaction().toHex();
    const txId = signedPsbt.extractTransaction().getId();
    const [result] = await sandshrewBtcClient.bitcoindRpc.testMemPoolAccept([
        rawTx,
    ]);
    if (!result.allowed) {
        throw new Error(result['reject-reason']);
    }
    if (!isDry) {
        await sandshrewBtcClient.bitcoindRpc.sendRawTransaction(rawTx);
    }
    return { txId, rawTx };
};
exports.sendCollectible = sendCollectible;
const insertCollectibleUtxo = async ({ taprootUtxos, inscriptionId, toAddress, psbt, }) => {
    const { metaUtxos } = taprootUtxos.reduce((acc, utxo) => {
        utxo.inscriptions.length
            ? acc.metaUtxos.push(utxo)
            : acc.nonMetaUtxos.push(utxo);
        return acc;
    }, { metaUtxos: [], nonMetaUtxos: [] });
    return await (0, buildOrdTx_1.addInscriptionUtxo)({
        metaUtxos: metaUtxos,
        inscriptionId: inscriptionId,
        toAddress: toAddress,
        psbtTx: psbt,
    });
};
const filterTaprootUtxos = async ({ taprootUtxos, }) => {
    if (!taprootUtxos || taprootUtxos.length === 0) {
        return null;
    }
    const { nonMetaUtxos } = taprootUtxos.reduce((acc, utxo) => {
        utxo.inscriptions.length > 0 || utxo.satoshis === 546
            ? acc.metaUtxos.push(utxo)
            : acc.nonMetaUtxos.push(utxo);
        return acc;
    }, { metaUtxos: [], nonMetaUtxos: [] });
    const sortedNonMetaUtxos = nonMetaUtxos.sort((a, b) => b.satoshis - a.satoshis);
    return sortedNonMetaUtxos;
};
exports.filterTaprootUtxos = filterTaprootUtxos;
const filterUtxos = async ({ utxos }) => {
    const { nonMetaUtxos } = utxos.reduce((acc, utxo) => {
        utxo.value === 546 && utxo.vout === 0
            ? acc.metaUtxos.push(utxo)
            : acc.nonMetaUtxos.push(utxo);
        return acc;
    }, { metaUtxos: [], nonMetaUtxos: [] });
    return nonMetaUtxos;
};
exports.filterUtxos = filterUtxos;
const addBtcUtxo = async ({ spendUtxos, toAddress, psbt, amount, feeRate, network, spendAddress, spendPubKey, altSpendPubKey, altSpendUtxos, fee, }) => {
    const txSize = calculateTaprootTxSize(1, 0, 2);
    let calculatedFee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
    let finalFee = fee ? fee : calculatedFee;
    let utxosToSend = (0, buildOrdTx_1.findUtxosToCoverAmount)(spendUtxos, amount + finalFee);
    let usingAlt = false;
    if (utxosToSend?.selectedUtxos.length > 1) {
        const txSize = calculateTaprootTxSize(utxosToSend.selectedUtxos.length, 0, 2);
        fee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
        utxosToSend = (0, buildOrdTx_1.findUtxosToCoverAmount)(spendUtxos, amount + finalFee);
    }
    if (!utxosToSend) {
        utxosToSend = (0, buildOrdTx_1.findUtxosToCoverAmount)(altSpendUtxos, amount + finalFee);
        if (utxosToSend?.selectedUtxos.length > 1) {
            const txSize = calculateTaprootTxSize(utxosToSend.selectedUtxos.length, 0, 2);
            fee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
            utxosToSend = (0, buildOrdTx_1.findUtxosToCoverAmount)(spendUtxos, amount + finalFee);
        }
        if (!utxosToSend) {
            throw new Error('Insufficient Balance');
        }
        usingAlt = true;
    }
    const amountGathered = calculateAmountGatheredUtxo(utxosToSend.selectedUtxos);
    for (let i = 0; i < utxosToSend.selectedUtxos.length; i++) {
        psbt.addInput({
            hash: utxosToSend.selectedUtxos[i].txId,
            index: utxosToSend.selectedUtxos[i].outputIndex,
            witnessUtxo: {
                value: utxosToSend.selectedUtxos[i].satoshis,
                script: Buffer.from(utxosToSend.selectedUtxos[i].scriptPk, 'hex'),
            },
        });
    }
    psbt.addOutput({
        address: toAddress,
        value: amount,
    });
    const changeAmount = amountGathered - (finalFee + amount);
    psbt.addOutput({
        address: spendAddress,
        value: changeAmount,
    });
    const updatedPsbt = await (0, exports.formatInputsToSign)({
        _psbt: psbt,
        senderPublicKey: usingAlt ? altSpendPubKey : spendPubKey,
        network,
    });
    return { psbt: updatedPsbt, fee: finalFee };
};
exports.addBtcUtxo = addBtcUtxo;
const isValidJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    }
    catch (e) {
        return false;
    }
};
exports.isValidJSON = isValidJSON;
const encodeVarint = (bigIntValue) => {
    const bufferArray = [];
    let num = bigIntValue;
    do {
        let byte = num & BigInt(0x7f); // Get the next 7 bits of the number.
        num >>= BigInt(7); // Remove the 7 bits we just processed.
        if (num !== BigInt(0)) {
            // If there are more bits to process,
            byte |= BigInt(0x80); // set the continuation bit.
        }
        bufferArray.push(Number(byte));
    } while (num !== BigInt(0));
    return { varint: Buffer.from(bufferArray) };
};
exports.encodeVarint = encodeVarint;
function findRuneUtxosToSpend(utxos, target) {
    if (!utxos || utxos.length === 0) {
        return undefined;
    }
    let totalAmount = 0;
    const selectedUtxos = [];
    for (const utxo of utxos) {
        if (totalAmount >= target)
            break;
        selectedUtxos.push(utxo);
        totalAmount += utxo.amount;
    }
    if (totalAmount >= target) {
        return {
            selectedUtxos,
            change: totalAmount - target,
        };
    }
    else {
        return undefined;
    }
}
exports.findRuneUtxosToSpend = findRuneUtxosToSpend;
//# sourceMappingURL=utils.js.map