"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlkanesRpc = void 0;
const tslib_1 = require("tslib");
const node_fetch_1 = tslib_1.__importDefault(require("node-fetch"));
class AlkanesRpc {
    alkanesUrl;
    constructor(url) {
        this.alkanesUrl = url;
    }
    async _call(method, params = []) {
        const requestData = {
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: 1,
        };
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
            cache: 'no-cache',
        };
        try {
            const response = await (0, node_fetch_1.default)(this.alkanesUrl, requestOptions);
            const responseData = await response.json();
            if (responseData.error) {
                console.error('Alkanes JSON-RPC Error:', responseData.error);
                throw new Error(responseData.error);
            }
            return responseData.result;
        }
        catch (error) {
            console.error('Request Error:', error);
            throw error;
        }
    }
    async getAlkanesByHeight({ blockHeight, protocolTag = '1', }) {
        return (await this._call('alkanes_protorunesbyheight', [
            {
                blockHeight,
                protocolTag,
            },
        ]));
    }
    async getAlkanesByAddress({ address, protocolTag = '1', }) {
        return await this._call('alkanes_protorunesbyaddress', [
            {
                address,
                protocolTag,
            },
        ]);
    }
    async trace(request) {
        request.txid = Buffer.from(Array.from(Buffer.from(request.txid, 'hex')).reverse()).toString('hex');
        const ret = await this._call('alkanes_trace', [request]);
        return await ret;
    }
    async simulate(request) {
        const ret = await this._call('alkanes_simulate', [request]);
        const parsed = this.parseSimulateReturn(ret.execution.data);
        ret.parsed = parsed;
        return ret;
    }
    async getAlkanesByOutpoint({ txid, vout, protocolTag = '1', }) {
        return await this._call('alkanes_protorunesbyoutpoint', [
            { txid: '0x' + txid, vout, protocolTag },
        ]);
    }
    parseSimulateReturn(v) {
        console.log(v);
        const stripHexPrefix = (v) => (v.startsWith('0x') ? v.slice(2) : v);
        const addHexPrefix = (v) => '0x' + stripHexPrefix(v);
        let decodedString;
        try {
            decodedString = Buffer.from(stripHexPrefix(v), 'hex').toString('utf8');
            if (/[\uFFFD]/.test(decodedString)) {
                throw new Error('Invalid UTF-8 string');
            }
        }
        catch (err) {
            decodedString = addHexPrefix(v);
        }
        return {
            string: decodedString,
            bytes: addHexPrefix(v),
            le: BigInt(addHexPrefix(Buffer.from(Array.from(Buffer.from(stripHexPrefix(v), 'hex')).reverse()).toString('hex'))).toString(),
            be: BigInt(addHexPrefix(v)).toString(),
        };
    }
}
exports.AlkanesRpc = AlkanesRpc;
// new AlkanesRpc('http://localhost:3000/v1/regtest')
//   .getAlkanesByAddress({
//     address: 'bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx',
//     protocolTag: '1',
//   })
//   .then((ret) =>
//     console.log(ret.outpoints.filter((outpoint) => outpoint.runes.length > 0))
//   )
new AlkanesRpc('http://localhost:3000/v1/regtest')
    .getAlkanesByOutpoint({
    txid: '110f4653d6fe00153cf0f2d9b4cfeb5d4acec846dfd5304501639d0d3a8cdd6c',
    vout: 4,
    protocolTag: '1',
})
    .then((ret) => console.log(ret));
//# sourceMappingURL=alkanes.js.map