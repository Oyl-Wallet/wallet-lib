"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuneOutpointsRegtest = exports.getAllInscriptionsByAddressRegtest = void 0;
const oylib_1 = require("../oylib");
const constants_1 = require("../shared/constants");
const getAllInscriptionsByAddressRegtest = async (address) => {
    const oyl = new oylib_1.Oyl(constants_1.defaultNetworkOptions.regtest);
    const utxosResponse = await oyl.esploraRpc.getAddressUtxo(address);
    const data = [];
    const inscriptionUtxos = utxosResponse.filter((utxo) => utxo.value == 546);
    for (const utxo of inscriptionUtxos) {
        if (utxo.txid) {
            const transactionDetails = await oyl.ordRpc.getTxOutput(utxo.txid + ':' + utxo.vout);
            const { inscription_id, inscription_number, satpoint, content_type, address, } = await oyl.ordRpc.getInscriptionById(transactionDetails.inscriptions[0]);
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
    const oyl = new oylib_1.Oyl(constants_1.defaultNetworkOptions.regtest);
    const allUtxos = await oyl.esploraRpc.getAddressUtxo(address);
    const data = [];
    //const inscriptionUtxos = utxosResponse.filter((utxo) => utxo.value == 546)
    for (const utxo of allUtxos) {
        if (utxo.txid) {
            const output = utxo.txid + ':' + utxo.vout;
            const txDetails = await oyl.ordRpc.getTxOutput(output);
            if (txDetails.runes.length > 0) {
                const runeName = txDetails.runes[0][0];
                const { id } = await oyl.ordRpc.getRuneByName(runeName);
                const runeAmount = txDetails.runes[0][1].amount;
                const index = data.findIndex((rune) => rune.rune_names[0] == runeName);
                if (index != -1) {
                    // update balance
                    data[index].balances[0] += runeAmount;
                }
                else {
                    // create new record
                    data.push({
                        pkscript: utxo.scriptPk,
                        wallet_addr: utxo.address,
                        output,
                        rune_ids: [id],
                        balances: [runeAmount],
                        rune_names: [runeName],
                        spaced_rune_names: [runeName],
                        decimals: [txDetails.runes[0][1].divisibility]
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
//# sourceMappingURL=regtestApi.js.map