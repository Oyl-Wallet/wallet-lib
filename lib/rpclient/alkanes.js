"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlkanesRpc = exports.stripHexPrefix = void 0;
const tslib_1 = require("tslib");
const node_fetch_1 = tslib_1.__importDefault(require("node-fetch"));
const stripHexPrefix = (s) => s.substr(0, 2) === '0x' ? s.substr(2) : s;
exports.stripHexPrefix = stripHexPrefix;
const opcodes = ['99', '100', '101', '102', '103', '104', '1000'];
const opcodesHRV = [
    'name',
    'symbol',
    'totalSupply',
    'cap',
    'minted',
    'mintAmount',
    'data',
];
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
            if (error.name === 'AbortError') {
                console.error('Request Timeout:', error);
                throw new Error('Request timed out');
            }
            else {
                console.error('Request Error:', error);
                throw error;
            }
        }
    }
    async getAlkanesByHeight({ height, protocolTag = '1', }) {
        return (await this._call('alkanes_protorunesbyheight', [
            {
                height,
                protocolTag,
            },
        ]));
    }
    async getAlkanesByAddress({ address, protocolTag = '1', name, }) {
        const ret = await this._call('alkanes_protorunesbyaddress', [
            {
                address,
                protocolTag,
            },
        ]);
        const alkanesList = ret.outpoints
            .filter((outpoint) => outpoint.runes.length > 0)
            .map((outpoint) => ({
            ...outpoint,
            runes: outpoint.runes.map((rune) => ({
                ...rune,
                balance: Number(rune.balance),
                rune: {
                    ...rune.rune,
                    id: {
                        block: Number(rune.rune.id.block),
                        tx: Number(rune.rune.id.tx),
                    },
                },
            })),
        }));
        if (name) {
            return alkanesList.flatMap((outpoints) => outpoints.runes.filter((item) => item.rune.name === name));
        }
        return alkanesList;
    }
    async trace(request) {
        request.txid = Buffer.from(request.txid, 'hex').reverse().toString('hex');
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
        const alkaneList = await this._call('alkanes_protorunesbyoutpoint', [
            {
                txid: Buffer.from(txid, 'hex').reverse().toString('hex'),
                vout,
                protocolTag,
            },
        ]);
        return alkaneList.map((outpoint) => ({
            ...outpoint,
            token: {
                ...outpoint.token,
                id: {
                    block: Number(outpoint.token.id.block),
                    tx: Number(outpoint.token.id.tx),
                },
            },
            value: Number(outpoint.value),
        }));
    }
    async getAlkaneById({ block, tx, }) {
        const alkaneData = {
            name: '',
            mintActive: false,
            percentageMinted: 0,
            symbol: '',
            totalSupply: 0,
            cap: 0,
            minted: 0,
            mintAmount: 0,
        };
        for (let j = 0; j < opcodes.length; j++) {
            try {
                const result = await this.simulate({
                    target: { block, tx },
                    alkanes: [],
                    transaction: '0x',
                    block: '0x',
                    height: '20000',
                    txindex: 0,
                    inputs: [opcodes[j]],
                    pointer: 0,
                    refundPointer: 0,
                    vout: 0,
                });
                if (result.status === 0) {
                    alkaneData[opcodesHRV[j]] = Number(result.parsed.le);
                    if (opcodesHRV[j] === 'name' ||
                        opcodesHRV[j] === 'symbol' ||
                        opcodesHRV[j] === 'data') {
                        alkaneData[opcodesHRV[j]] = result.parsed.string;
                    }
                    alkaneData.mintActive =
                        Number(alkaneData.minted) < Number(alkaneData.cap);
                    alkaneData.percentageMinted = Math.floor((alkaneData.minted / alkaneData.cap) * 100);
                }
            }
            catch (error) {
                console.log(error);
            }
        }
        return alkaneData;
    }
    async getAlkanes({ limit, offset = 0, }) {
        if (limit > 1000) {
            throw new Error('Max limit reached. Request fewer than 1000 alkanes per call');
        }
        const alkaneResults = [];
        for (let i = offset; i <= limit; i++) {
            const alkaneData = {};
            let hasValidResult = false;
            alkaneData.id = {
                block: '2',
                tx: i.toString(),
            };
            for (let j = 0; j < opcodes.length; j++) {
                try {
                    const result = await this.simulate({
                        target: { block: '2', tx: i.toString() },
                        alkanes: [],
                        transaction: '0x',
                        block: '0x',
                        height: '20000',
                        txindex: 0,
                        inputs: [opcodes[j]],
                        pointer: 0,
                        refundPointer: 0,
                        vout: 0,
                    });
                    if (result.status === 0) {
                        alkaneData[opcodesHRV[j]] = Number(result.parsed.le);
                        if (opcodesHRV[j] === 'name' ||
                            opcodesHRV[j] === 'symbol' ||
                            opcodesHRV[j] === 'data') {
                            alkaneData[opcodesHRV[j]] = result.parsed.string;
                        }
                        hasValidResult = true;
                        alkaneData.mintActive =
                            Number(alkaneData.minted) < Number(alkaneData.cap);
                        alkaneData.percentageMinted = Math.floor((alkaneData.minted / alkaneData.cap) * 100);
                    }
                }
                catch (error) {
                    console.log(error);
                }
            }
            if (hasValidResult) {
                alkaneResults.push(alkaneData);
            }
        }
        return alkaneResults;
    }
    parseSimulateReturn(v) {
        if (v === '0x') {
            return 'invalid';
        }
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
//# sourceMappingURL=alkanes.js.map