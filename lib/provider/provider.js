"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Provider = exports.defaultNetworkOptions = void 0;
const tslib_1 = require("tslib");
const sandshrew_1 = require("../rpclient/sandshrew");
const esplora_1 = require("../rpclient/esplora");
const ord_1 = require("../rpclient/ord");
const opi_1 = require("../rpclient/opi");
const apiclient_1 = require("../apiclient");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const __1 = require("..");
const defaultNetworkOptions = (networkType) => {
    switch (networkType) {
        case ('mainnet'):
            return { baseUrl: 'https://mainnet.sandshrew.io',
                version: 'v1',
                projectId: process.env.SANDSHREW_PROJECT_ID,
                network: 'mainnet',
                apiUrl: 'https://api.oyl.gg',
                opiUrl: 'https://mainnet-opi.sandshrew.io/v1'
            };
        case ('testnet'):
            return {
                baseUrl: 'https://testnet.sandshrew.io',
                version: 'v1',
                projectId: process.env.SANDSHREW_PROJECT_ID,
                network: 'testnet',
                apiUrl: 'https://testnet-api.oyl.gg',
                opiUrl: 'https://testnet-opi.sandshrew.io/v1',
            };
        case ('regtest'):
            return {
                baseUrl: 'http://localhost:3000',
                version: 'v1',
                projectId: 'regtest',
                network: 'regtest',
                apiUrl: 'https://mainnet-api.oyl.gg',
                opiUrl: 'http://localhost:3000',
            };
        case ('signet'):
            return {
                baseUrl: 'https://signet.sandshrew.io',
                version: 'v1',
                projectId: process.env.SANDSHREW_PROJECT_ID,
                network: 'signet',
                apiUrl: 'https://signet-api.oyl.gg',
                opiUrl: 'https://testnet-opi.sandshrew.io/v1',
            };
        default:
            throw new Error(`Invalid network specified ${networkType}`);
    }
};
exports.defaultNetworkOptions = defaultNetworkOptions;
class Provider {
    sandshrew;
    esplora;
    ord;
    opi;
    api;
    network;
    networkType;
    constructor({ url, projectId, network, networkType, version = 'v1', apiUrl, opiUrl, }) {
        let isTestnet;
        let isRegtest;
        switch (network) {
            case bitcoin.networks.testnet:
                isTestnet = true;
            case bitcoin.networks.regtest:
                isRegtest = true;
        }
        const masterUrl = `${url}/${version}/${projectId}`;
        this.sandshrew = new sandshrew_1.SandshrewBitcoinClient(masterUrl);
        this.esplora = new esplora_1.EsploraRpc(masterUrl);
        this.ord = new ord_1.OrdRpc(masterUrl);
        this.opi = new opi_1.Opi(opiUrl ? opiUrl : (0, exports.defaultNetworkOptions)(networkType).opiUrl);
        this.api = new apiclient_1.OylApiClient({
            network: networkType,
            host: apiUrl ? apiUrl : (0, exports.defaultNetworkOptions)(networkType).apiUrl,
            testnet: isTestnet ? true : null,
            regtest: isRegtest ? true : null,
            apiKey: projectId,
        });
        this.api.setAuthToken(process.env.API_TOKEN);
        this.network = network;
        this.networkType = networkType;
    }
    async pushPsbt({ psbtHex, psbtBase64, }) {
        if (!psbtHex && !psbtBase64) {
            throw new Error('Please supply psbt in either base64 or hex format');
        }
        if (psbtHex && psbtBase64) {
            throw new Error('Please select one format of psbt to broadcast');
        }
        let psbt;
        if (psbtHex) {
            psbt = bitcoin.Psbt.fromHex(psbtHex, {
                network: this.network,
            });
        }
        if (psbtBase64) {
            psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
                network: this.network,
            });
        }
        let extractedTx;
        try {
            extractedTx = psbt.extractTransaction();
        }
        catch (error) {
            throw new Error('Transaction could not be extracted do to invalid Psbt.');
        }
        const txId = extractedTx.getId();
        const rawTx = extractedTx.toHex();
        const [result] = await this.sandshrew.bitcoindRpc.testMemPoolAccept([rawTx]);
        if (!result.allowed) {
            throw new Error(result['reject-reason']);
        }
        await this.sandshrew.bitcoindRpc.sendRawTransaction(rawTx);
        await (0, __1.waitForTransaction)({
            txId,
            sandshrewBtcClient: this.sandshrew,
        });
        const txInMemPool = await this.sandshrew.bitcoindRpc.getMemPoolEntry(txId);
        const fee = txInMemPool.fees['base'] * 10 ** 8;
        return {
            txId,
            rawTx,
            size: txInMemPool.vsize,
            weight: txInMemPool.weight,
            fee: fee,
            satsPerVByte: (fee / (txInMemPool.weight / 4)).toFixed(2),
        };
    }
}
exports.Provider = Provider;
//# sourceMappingURL=provider.js.map