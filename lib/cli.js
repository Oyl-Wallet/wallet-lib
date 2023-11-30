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
exports.runCLI = exports.callBTCRPCEndpoint = exports.RPC_ADDR = exports.createInscriptionScript = exports.MEMPOOL_SPACE_API_V1_URL = exports.swapFlow = exports.callAPI = exports.viewPsbt = exports.testMarketplaceBuy = exports.loadRpc = void 0;
const yargs_1 = __importDefault(require("yargs"));
const change_case_1 = require("change-case");
const oylib_1 = require("./oylib");
const PSBTTransaction_1 = require("./txbuilder/PSBTTransaction");
const transactions = __importStar(require("./transactions"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const utils_1 = require("./shared/utils");
const axios_1 = __importDefault(require("axios"));
const ecc2 = __importStar(require("@bitcoinerlab/secp256k1"));
const bip32_1 = __importDefault(require("bip32"));
const buildMarketplaceTransaction_1 = require("./txbuilder/buildMarketplaceTransaction");
const bip32 = (0, bip32_1.default)(ecc2);
bitcoin.initEccLib(ecc2);
function loadRpc(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const wallet = new oylib_1.Wallet();
        try {
            const blockInfo = yield wallet.sandshrewBtcClient.bitcoindRpc.decodePSBT(process.env.PSBT_BASE64);
            const fees = yield wallet.esploraRpc.getAddressUtxo(process.env.TAPROOT_ADDRESS);
            console.log('Block Info:', blockInfo);
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
exports.loadRpc = loadRpc;
function testMarketplaceBuy() {
    return __awaiter(this, void 0, void 0, function* () {
        const options = {
            address: process.env.TAPROOT_ADDRESS,
            pubKey: process.env.TAPROOT_PUBKEY,
            feeRate: parseFloat(process.env.FEE_RATE),
            psbtBase64: process.env.PSBT_BASE64,
            price: 0.0005,
        };
        const intent = new buildMarketplaceTransaction_1.BuildMarketplaceTransaction(options);
        const builder = yield intent.psbtBuilder();
        console.log(builder);
    });
}
exports.testMarketplaceBuy = testMarketplaceBuy;
function viewPsbt() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(bitcoin.Psbt.fromBase64(process.env.PSBT_BASE64, {
            network: bitcoin.networks.bitcoin,
        }).data.inputs);
    });
}
exports.viewPsbt = viewPsbt;
function callAPI(command, data, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const oylSdk = new oylib_1.Wallet();
        const camelCommand = (0, change_case_1.camelCase)(command);
        if (!oylSdk[camelCommand])
            throw Error('command not foud: ' + camelCommand);
        const result = yield oylSdk[camelCommand](data);
        console.log(JSON.stringify(result, null, 2));
        return result;
    });
}
exports.callAPI = callAPI;
function swapFlow() {
    return __awaiter(this, void 0, void 0, function* () {
        const address = process.env.TAPROOT_ADDRESS;
        const feeRate = parseFloat(process.env.FEE_RATE);
        const mnemonic = process.env.TAPROOT_MNEMONIC;
        const pubKey = process.env.TAPROOT_PUBKEY;
        const psbt = bitcoin.Psbt.fromHex(process.env.PSBT_HEX, {
            network: bitcoin.networks.bitcoin,
        });
        //console.log(psbt)
        const wallet = new oylib_1.Wallet();
        const payload = yield wallet.fromPhrase({
            mnemonic: mnemonic.trim(),
            hdPath: process.env.HD_PATH,
            type: process.env.TYPE,
        });
        const keyring = payload.keyring.keyring;
        const signer = keyring.signTransaction.bind(keyring);
        const from = address;
        const addressType = transactions.getAddressType(from);
        if (addressType == null)
            throw Error('Invalid Address Type');
        const tx = new PSBTTransaction_1.PSBTTransaction(signer, from, pubKey, addressType, feeRate);
        const signedPsbt = yield tx.signPsbt(psbt);
        //@ts-ignore
        psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = false;
        //EXTRACT THE RAW TX
        //const rawtx = signedPsbt.extractTransaction().toHex()
        //console.log('rawtx', rawtx)
        //BROADCAST THE RAW TX TO THE NETWORK
        //const result = await wallet.apiClient.pushTx({ transactionHex: rawtx })
        //GET THE TX_HASH
        //const ready_txId = psbt.extractTransaction().getId()
        //CONFIRM TRANSACTION IS CONFIRMED
    });
}
exports.swapFlow = swapFlow;
const formatOptionsToSignInputs = (_psbt, isRevealTx = false, pubkey, tapAddress) => __awaiter(void 0, void 0, void 0, function* () {
    let toSignInputs = [];
    const psbtNetwork = bitcoin.networks.bitcoin;
    const psbt = typeof _psbt === 'string'
        ? bitcoin.Psbt.fromHex(_psbt, { network: psbtNetwork })
        : _psbt;
    psbt.data.inputs.forEach((v, index) => {
        var _a, _b;
        let script = null;
        let value = 0;
        const tapInternalKey = (0, utils_1.assertHex)(Buffer.from(pubkey, 'hex'));
        const p2tr = bitcoin.payments.p2tr({
            internalPubkey: tapInternalKey,
            network: bitcoin.networks.bitcoin,
        });
        if (((_a = v.witnessUtxo) === null || _a === void 0 ? void 0 : _a.script.toString('hex')) == ((_b = p2tr.output) === null || _b === void 0 ? void 0 : _b.toString('hex'))) {
            v.tapInternalKey = tapInternalKey;
        }
        if (v.witnessUtxo) {
            script = v.witnessUtxo.script;
            value = v.witnessUtxo.value;
        }
        else if (v.nonWitnessUtxo) {
            const tx = bitcoin.Transaction.fromBuffer(v.nonWitnessUtxo);
            const output = tx.outs[psbt.txInputs[index].index];
            script = output.script;
            value = output.value;
        }
        const isSigned = v.finalScriptSig || v.finalScriptWitness;
        if (script && !isSigned) {
            console.log('not signed');
            const address = bitcoinjs_lib_1.address.fromOutputScript(script, psbtNetwork);
            if (isRevealTx || tapAddress === address) {
                console.log('entered', index);
                if (v.tapInternalKey) {
                    toSignInputs.push({
                        index: index,
                        publicKey: pubkey,
                        sighashTypes: v.sighashType ? [v.sighashType] : undefined,
                    });
                }
            }
            // else {
            //   toSignInputs.push({
            //     index: index,
            //     publicKey: this.segwitPubKey,
            //     sighashTypes: v.sighashType ? [v.sighashType] : undefined,
            //   })
            // }
        }
    });
    return toSignInputs;
});
exports.MEMPOOL_SPACE_API_V1_URL = 'https://mempool.space/api/v1';
const createInscriptionScript = (pubKey, content) => {
    const mimeType = 'text/plain;charset=utf-8';
    const textEncoder = new TextEncoder();
    const marker = textEncoder.encode('ord');
    return [
        pubKey,
        'OP_CHECKSIG',
        'OP_0',
        'OP_IF',
        marker,
        '01',
        textEncoder.encode(mimeType),
        'OP_0',
        textEncoder.encode(content),
        'OP_ENDIF',
    ];
};
exports.createInscriptionScript = createInscriptionScript;
const INSCRIPTION_PREPARE_SAT_AMOUNT = 4000;
exports.RPC_ADDR = 'https://node.oyl.gg/v1/6e3bc3c289591bb447c116fda149b094';
const callBTCRPCEndpoint = (method, params) => __awaiter(void 0, void 0, void 0, function* () {
    const data = JSON.stringify({
        jsonrpc: '2.0',
        id: method,
        method: method,
        params: [params],
    });
    // @ts-ignore
    return yield axios_1.default
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
});
exports.callBTCRPCEndpoint = callBTCRPCEndpoint;
// async function createOrdPsbtTx() {
//   const wallet = new Wallet()
//   const test0 = await wallet.createOrdPsbtTx({
//     changeAddress: '',
//     fromAddress: '',
//     inscriptionId: '',
//     taprootPubKey: '',
//     segwitAddress: '',
//     segwitPubKey: '',
//     toAddress: '',
//     txFee: 0,
//     mnemonic: '',
//   })
//   console.log(test0)
// }
function runCLI() {
    return __awaiter(this, void 0, void 0, function* () {
        const RequiredPath = [
            "m/44'/0'/0'/0",
            "m/49'/0'/0'/0",
            "m/84'/0'/0'/0",
            "m/86'/0'/0'/0", // P2TR (Taproot)
        ];
        const [command] = yargs_1.default.argv._;
        const options = Object.assign({}, yargs_1.default.argv);
        const tapWallet = new oylib_1.Wallet();
        const mnemonic = 'rich baby hotel region tape express recipe amazing chunk flavor oven obtain';
        const taprootSigner = yield (0, utils_1.createTaprootSigner)({
            mnemonic: mnemonic,
            taprootAddress: 'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
        });
        const segwitSigner = yield (0, utils_1.createSegwitSigner)({
            mnemonic: mnemonic,
            segwitAddress: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
            segwitPubKey: '03ad1e146771ae624b49b463560766f5950a9341964a936ae6bf1627fda8d3b83b',
        });
        delete options._;
        switch (command) {
            case 'load':
                return yield loadRpc(options);
                break;
            case 'send':
                const taprootResponse = yield tapWallet.createPsbtTx({
                    amount: 4000,
                    changeAddress: 'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
                    feeRate: 62,
                    from: 'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
                    publicKey: '02ebb592b5f1a2450766487d451f3a6fb2a584703ef64c6acb613db62797f943be',
                    signer: taprootSigner,
                    to: 'bc1p5pvvfjtnhl32llttswchrtyd9mdzd3p7yps98tlydh2dm6zj6gqsfkmcnd',
                    isDry: true,
                });
                console.log({ taprootResponse });
                const segwitResponse = yield tapWallet.createPsbtTx({
                    amount: 4000,
                    changeAddress: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
                    feeRate: 62,
                    from: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
                    publicKey: '03ad1e146771ae624b49b463560766f5950a9341964a936ae6bf1627fda8d3b83b',
                    signer: segwitSigner,
                    to: 'bc1p5pvvfjtnhl32llttswchrtyd9mdzd3p7yps98tlydh2dm6zj6gqsfkmcnd',
                    isDry: true,
                });
                console.log({ segwitResponse });
                return;
            case 'test':
                // 'rich baby hotel region tape express recipe amazing chunk flavor oven obtain'
                return yield tapWallet.sendBRC20({
                    feeFromAddress: 'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
                    taprootPublicKey: '02ebb592b5f1a2450766487d451f3a6fb2a584703ef64c6acb613db62797f943be',
                    changeAddress: 'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
                    destinationAddress: 'bc1p5pvvfjtnhl32llttswchrtyd9mdzd3p7yps98tlydh2dm6zj6gqsfkmcnd',
                    feeRate: 75,
                    token: 'BONK',
                    segwitAddress: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
                    segwitPubkey: '03ad1e146771ae624b49b463560766f5950a9341964a936ae6bf1627fda8d3b83b',
                    mnemonic: mnemonic,
                    amount: 40,
                    payFeesWithSegwit: true,
                });
            // async function createOrdPsbtTx() {
            //   const wallet = new Wallet()
            //   const test0 = await wallet.createOrdPsbtTx({
            //     changeAddress: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
            //     fromAddress:
            //       'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
            //     inscriptionId:
            //       '68069fc341a462cd9a01ef4808b0bda0db7c0c6ea5dfffdc35b8992450cecb5bi0',
            //     taprootPubKey:
            //       '02ebb592b5f1a2450766487d451f3a6fb2a584703ef64c6acb613db62797f943be',
            //     segwitAddress: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
            //     segwitPubKey:
            //       '03ad1e146771ae624b49b463560766f5950a9341964a936ae6bf1627fda8d3b83b',
            //     toAddress:
            //       'bc1pkvt4pj7jgj02s95n6sn56fhgl7t7cfx5mj4dedsqyzast0whpchs7ujd7y',
            //     txFee: 68,
            //     payFeesWithSegwit: true,
            //     mnemonic:
            //       'rich baby hotel region tape express recipe amazing chunk flavor oven obtain',
            //   })
            //   console.log(test0)
            // }
            // await createOrdPsbtTx()
            // break
            case 'view':
                return yield viewPsbt();
                break;
            case 'market':
                return yield testMarketplaceBuy();
                break;
            case 'swap':
                return yield swapFlow();
                break;
            default:
                return yield callAPI(yargs_1.default.argv._[0], options);
                break;
        }
    });
}
exports.runCLI = runCLI;
//# sourceMappingURL=cli.js.map