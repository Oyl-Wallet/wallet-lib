"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRuneUtxosToSpend = exports.encodeVarint = exports.isValidJSON = exports.filterUtxos = exports.filterTaprootUtxos = exports.getRawTxnHashFromTxnId = exports.calculateTaprootTxSize = exports.getOutputValueByVOutIndex = exports.waitForTransaction = exports.getAddressType = exports.callBTCRPCEndpoint = exports.RPC_ADDR = exports.encodeProtoburn = exports.createProtoBurnScript = exports.createRuneEtchScript = exports.createRuneMintScript = exports.createRuneSendScript = exports.createInscriptionScript = exports.signInputs = exports.timeout = exports.formatInputsToSign = exports.calculateAmountGatheredUtxo = exports.calculateAmountGathered = exports.getInscriptionsByWalletBIS = exports.getWitnessDataChunk = exports.utxoToInput = exports.validator = exports.amountToSatoshis = exports.delay = exports.satoshisToAmount = exports.tweakSigner = exports.getFee = exports.getNetwork = exports.assertHex = exports.ECPair = exports.inscriptionSats = exports.addressTypeMap = void 0;
const tslib_1 = require("tslib");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const ecpair_1 = tslib_1.__importDefault(require("ecpair"));
const secp256k1_1 = tslib_1.__importDefault(require("@bitcoinerlab/secp256k1"));
const interface_1 = require("./interface");
const bignumber_js_1 = tslib_1.__importDefault(require("bignumber.js"));
const constants_1 = require("./constants");
const axios_1 = tslib_1.__importDefault(require("axios"));
const bip371_1 = require("bitcoinjs-lib/src/psbt/bip371");
const ordit_sdk_1 = require("@sadoprotocol/ordit-sdk");
const runestone_lib_1 = require("@magiceden-oss/runestone-lib");
const runestone_protostone_upgrade_1 = require("protorune/lib/src.ts/runestone_protostone_upgrade");
const protostone_1 = require("protorune/lib/src.ts/protostone");
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
    if (value === 'signet') {
        return bitcoin.networks['testnet'];
    }
    return bitcoin.networks[value];
}
exports.getNetwork = getNetwork;
async function getFee({ provider, psbt, feeRate, }) {
    let rawPsbt = bitcoin.Psbt.fromBase64(psbt, {
        network: provider.network,
    });
    const signedHexPsbt = rawPsbt.extractTransaction().toHex();
    const tx = await provider.sandshrew.bitcoindRpc.testMemPoolAccept([
        signedHexPsbt,
    ]);
    const vsize = tx[0].vsize;
    const accurateFee = vsize * feeRate;
    return accurateFee;
}
exports.getFee = getFee;
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
//FLAG FOR REMOVAL
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
    const mimeTypeBuff = Buffer.from(textEncoder.encode(mimeType));
    const contentBuff = Buffer.from(textEncoder.encode(content));
    const markerBuff = Buffer.from(textEncoder.encode('ord'));
    return [
        pubKey,
        bitcoin.opcodes.OP_CHECKSIG,
        bitcoin.opcodes.OP_0,
        bitcoin.opcodes.OP_IF,
        markerBuff,
        1,
        1,
        mimeTypeBuff,
        bitcoin.opcodes.OP_0,
        contentBuff,
        bitcoin.opcodes.OP_ENDIF,
    ];
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
const createRuneSendScript = ({ runeId, amount, divisibility = 0, sendOutputIndex = 1, pointer = 0, }) => {
    if (divisibility === 0) {
        amount = Math.floor(amount);
    }
    const pointerFlag = (0, exports.encodeVarint)(BigInt(22)).varint;
    const pointerVarint = (0, exports.encodeVarint)(BigInt(pointer)).varint;
    const bodyFlag = (0, exports.encodeVarint)(BigInt(0)).varint;
    const amountToSend = (0, exports.encodeVarint)(BigInt(amount * 10 ** divisibility)).varint;
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
const createRuneMintScript = ({ runeId, mintOutPutIndex = 1, pointer = 1, }) => {
    const pointerFlag = (0, exports.encodeVarint)(BigInt(22)).varint;
    const pointerVarint = (0, exports.encodeVarint)(BigInt(pointer)).varint;
    const bodyFlag = (0, exports.encodeVarint)(BigInt(0)).varint;
    const mintFlag = (0, exports.encodeVarint)(BigInt(20)).varint;
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
const createRuneEtchScript = ({ pointer = 0, runeName, symbol, divisibility, perMintAmount, premine = 0, cap, turbo, }) => {
    console.log({
        etching: {
            divisibility,
            premine: BigInt(premine),
            runeName,
            symbol,
            terms: {
                cap: cap && BigInt(cap),
                amount: perMintAmount && BigInt(perMintAmount),
            },
            turbo,
        },
        pointer,
    });
    const runeEtch = (0, runestone_lib_1.encodeRunestone)({
        etching: {
            divisibility,
            premine: BigInt(premine),
            runeName,
            symbol,
            terms: {
                cap: cap && BigInt(cap),
                amount: perMintAmount && BigInt(perMintAmount),
            },
            turbo,
        },
        pointer,
    }).encodedRunestone;
    return runeEtch;
};
exports.createRuneEtchScript = createRuneEtchScript;
const createProtoBurnScript = ({ runes, protocolTag, pointer, }) => {
    const runestone = (0, exports.encodeProtoburn)({
        runes,
        protocolTag,
        pointer,
    });
    return runestone;
};
exports.createProtoBurnScript = createProtoBurnScript;
const encodeProtoburn = ({ runes, protocolTag, pointer, }) => {
    // outputs and their meanings:
    //  - output 0: runestone
    //  - output 1: UTXO of address
    //  - output 2: virtual output -- represents the protoburn on our protoburn protocol
    // all runes will go to output 2 -- performing the protoburn
    // all unused runes will be refunded to pointer 1 and retained by the runes protocol
    // the protostone will burn all runes onto the pointer 1 UTXO
    const runestone = (0, runestone_protostone_upgrade_1.encodeRunestoneProtostone)({
        edicts: runes.map((r) => ({ ...r, output: 2 })),
        pointer,
        protostones: [protostone_1.ProtoStone.burn({ protocolTag, pointer: 1 })],
    }).encodedRunestone;
    return runestone;
};
exports.encodeProtoburn = encodeProtoburn;
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
function getAddressType(address) {
    if (ordit_sdk_1.addressFormats.mainnet.p2pkh.test(address) ||
        ordit_sdk_1.addressFormats.testnet.p2pkh.test(address) ||
        ordit_sdk_1.addressFormats.regtest.p2pkh.test(address)) {
        return interface_1.AddressType.P2PKH;
    }
    else if (ordit_sdk_1.addressFormats.mainnet.p2tr.test(address) ||
        ordit_sdk_1.addressFormats.testnet.p2tr.test(address) ||
        ordit_sdk_1.addressFormats.regtest.p2tr.test(address)) {
        return interface_1.AddressType.P2TR;
    }
    else if (ordit_sdk_1.addressFormats.mainnet.p2sh.test(address) ||
        ordit_sdk_1.addressFormats.testnet.p2sh.test(address) ||
        ordit_sdk_1.addressFormats.regtest.p2sh.test(address)) {
        return interface_1.AddressType.P2SH_P2WPKH;
    }
    else if (ordit_sdk_1.addressFormats.mainnet.p2wpkh.test(address) ||
        ordit_sdk_1.addressFormats.testnet.p2wpkh.test(address) ||
        ordit_sdk_1.addressFormats.regtest.p2wpkh.test(address)) {
        return interface_1.AddressType.P2WPKH;
    }
    else {
        return null;
    }
}
exports.getAddressType = getAddressType;
async function waitForTransaction({ txId, sandshrewBtcClient, }) {
    const timeout = 60000; // 1 minute in milliseconds
    const startTime = Date.now();
    while (true) {
        try {
            const result = await sandshrewBtcClient.bitcoindRpc.getMemPoolEntry(txId);
            if (result) {
                await delay(5000);
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
    let totalSatoshis = 0;
    const selectedUtxos = [];
    for (const utxo of utxos) {
        if (totalAmount >= target)
            break;
        selectedUtxos.push(utxo);
        totalSatoshis += utxo.satoshis;
        totalAmount += utxo.amount;
    }
    if (totalAmount >= target) {
        return {
            selectedUtxos,
            change: totalAmount - target,
            totalSatoshis: totalSatoshis,
        };
    }
    else {
        return undefined;
    }
}
exports.findRuneUtxosToSpend = findRuneUtxosToSpend;
//# sourceMappingURL=utils.js.map