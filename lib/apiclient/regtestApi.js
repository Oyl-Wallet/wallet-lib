"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuneBalanceRegtest = exports.getRuneOutpointsRegtest = exports.getAllInscriptionsByAddressRegtest = void 0;
const tslib_1 = require("tslib");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const __1 = require("..");
const getAllInscriptionsByAddressRegtest = async (address) => {
    const oyl = new __1.Provider({
        url: 'http://localhost:3000',
        projectId: 'regtest',
        network: bitcoin.networks.regtest,
        networkType: 'mainnet',
        apiUrl: 'https://staging-api.oyl.gg',
    });
    const utxosResponse = await oyl.esplora.getAddressUtxo(address);
    const data = [];
    const inscriptionUtxos = utxosResponse.filter((utxo) => utxo.value == 546);
    for (const utxo of inscriptionUtxos) {
        if (utxo.txid) {
            const transactionDetails = await oyl.ord.getTxOutput(utxo.txid + ':' + utxo.vout);
            const { inscription_id, inscription_number, satpoint, content_type, address, } = await oyl.ord.getInscriptionById(transactionDetails.inscriptions[0]);
            if (inscription_id) {
                data.push({
                    inscription_id,
                    inscription_number,
                    satpoint,
                    mime_type: content_type,
                    owner_wallet_addr: address,
                });
            }
        }
    }
    return {
        statusCode: 200,
        data,
    };
};
exports.getAllInscriptionsByAddressRegtest = getAllInscriptionsByAddressRegtest;
const getRuneOutpointsRegtest = async (address) => {
    const oyl = new __1.Provider({
        url: 'http://localhost:3000',
        projectId: 'regtest',
        network: bitcoin.networks.regtest,
        networkType: 'mainnet',
        apiUrl: 'https://staging-api.oyl.gg',
    });
    const allUtxos = await oyl.esplora.getAddressUtxo(address);
    const data = [];
    for (const utxo of allUtxos) {
        if (utxo.txid) {
            const output = utxo.txid + ':' + utxo.vout;
            const txDetails = await oyl.ord.getTxOutput(output);
            for (let i = 0; i < txDetails.runes.length; i++) {
                const runeName = txDetails.runes[i][0];
                const { id } = await oyl.ord.getRuneByName(runeName);
                const runeAmount = txDetails.runes[i][1].amount;
                const index = data.findIndex((rune) => rune.rune_name == runeName);
                if (index != -1) {
                    // update balance
                    data[index].total_balance += runeAmount;
                }
                else {
                    // create new record
                    const txInfo = await oyl.esplora.getTxInfo(utxo.txid);
                    data.push({
                        pkscript: txInfo.vout[utxo.vout].scriptpubkey,
                        wallet_addr: address,
                        output,
                        rune_ids: [id],
                        balances: [runeAmount],
                        rune_names: [runeName],
                        spaced_rune_names: [runeName],
                        decimals: [txDetails.runes[i][1].divisibility],
                    });
                }
            }
        }
    }
    return {
        statusCode: 200,
        data,
    };
};
exports.getRuneOutpointsRegtest = getRuneOutpointsRegtest;
const getRuneBalanceRegtest = async (address) => {
    const oyl = new __1.Provider({
        url: 'http://localhost:3000',
        projectId: 'regtest',
        network: bitcoin.networks.regtest,
        networkType: 'mainnet',
        apiUrl: 'https://staging-api.oyl.gg',
    });
    const allUtxos = await oyl.esplora.getAddressUtxo(address);
    const data = [];
    for (const utxo of allUtxos) {
        if (utxo.txid) {
            const output = utxo.txid + ':' + utxo.vout;
            const txDetails = await oyl.ord.getTxOutput(output);
            if (txDetails.runes.length > 0) {
                const runeName = txDetails.runes[0][0];
                const { id } = await oyl.ord.getRuneByName(runeName);
                const runeAmount = txDetails.runes[0][1].amount;
                const index = data.findIndex((rune) => rune.rune_name == runeName);
                if (index != -1) {
                    // update balance
                    data[index].total_balance += runeAmount;
                }
                else {
                    // create new record
                    const txInfo = await oyl.esplora.getTxInfo(utxo.txid);
                    data.push({
                        pkscript: txInfo.vout[1].scriptpubkey,
                        wallet_addr: address,
                        rune_id: id,
                        total_balance: runeAmount,
                        rune_name: runeName,
                        spaced_rune_name: runeName,
                        decimals: 0,
                        avg_unit_price_in_sats: null,
                    });
                }
            }
        }
    }
    return {
        statusCode: 200,
        data,
    };
};
exports.getRuneBalanceRegtest = getRuneBalanceRegtest;
//# sourceMappingURL=regtestApi.js.map