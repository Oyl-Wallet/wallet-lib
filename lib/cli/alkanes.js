"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alkaneSend = exports.alkaneExecute = exports.alkaneTokenDeploy = exports.alkaneContractDeploy = exports.alkanesTrace = void 0;
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const node_zlib_1 = require("node:zlib");
const util_1 = require("util");
const path_1 = tslib_1.__importDefault(require("path"));
const alkanes = tslib_1.__importStar(require("../alkanes/alkanes"));
const utxo = tslib_1.__importStar(require("../utxo"));
const wallet_1 = require("./wallet");
const contract_1 = require("../alkanes/contract");
const token_1 = require("../alkanes/token");
exports.alkanesTrace = new commander_1.Command('trace')
    .description('Returns data based on txid and vout of alkanes transaction')
    .requiredOption('-p, --provider <provider>', 'provider to use to access the network.')
    .option('-params, --parameters <parameters>', 'parameters for the ord method you are calling.')
    /* @dev example call
      oyl alkanes trace -params '{"txid":"abc123...","vout":3}' -p regtest
  
      please note the json format if you need to pass an object.
    */
    .action(async (options) => {
    const wallet = new wallet_1.Wallet({ networkType: options.provider });
    const provider = wallet.provider;
    let isJson;
    try {
        isJson = JSON.parse(options.parameters);
        const { vout, txid } = isJson;
        console.log(await provider.alkanes.trace({ vout, txid }));
    }
    catch (error) {
        const { vout, txid } = isJson;
        console.log(await provider.alkanes.trace({ vout, txid }));
    }
});
exports.alkaneContractDeploy = new commander_1.Command('new-contract')
    .requiredOption('-c, --contract <contract>', 'Relative path to contract wasm file to deploy (e.g., "../alkanes/free_mint.wasm")')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    .requiredOption('-resNumber, --reserveNumber <reserveNumber>', 'number to reserve for factory id')
    /* @dev example call
  oyl alkanes new-contract -c ./src/alkanes/free_mint.wasm -resNumber 777 -p regtest -feeRate 2
  */
    .action(async (options) => {
    const wallet = new wallet_1.Wallet({ networkType: options.provider });
    const account = wallet.account;
    const provider = wallet.provider;
    const signer = wallet.signer;
    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } = await utxo.accountUtxos({ account, provider });
    const contract = new Uint8Array(Array.from(await fs_extra_1.default.readFile(path_1.default.resolve(process.cwd(), options.contract))));
    const gzip = (0, util_1.promisify)(node_zlib_1.gzip);
    const payload = {
        body: await gzip(contract, { level: 9 }),
        cursed: false,
        tags: { contentType: '' },
    };
    console.log(await (0, contract_1.contractDeployment)({
        reserveNumber: options.reserveNumber,
        payload,
        gatheredUtxos: {
            utxos: accountSpendableTotalUtxos,
            totalAmount: accountSpendableTotalBalance,
        },
        feeRate: options.feeRate,
        account,
        signer,
        provider,
    }));
});
exports.alkaneTokenDeploy = new commander_1.Command('new-token')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-resNumber, --reserveNumber <reserveNumber>', 'number to reserve for factory id')
    .requiredOption('-cap, --capacity <cap>', 'the token cap')
    .requiredOption('-name, --token-name <name>', 'the token name')
    .requiredOption('-symbol, --token-symbol <symbol>', 'the token symbol')
    .requiredOption('-amount, --amount-per-mint <amount-per-mint>', 'amount of tokens minted each time mint is called')
    .option('-pre, --premine <premine>', 'amount to premine')
    .option('-i, --image <image>', 'Relative path to image file to deploy (e.g., "../alkanes/free_mint.wasm")')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    /* @dev example call
  oyl alkanes new-token -resNumber 777 -p regtest -feeRate 2 -amount 1000 -name "OYL" -symbol "OL" -cap 100000 -pre 5000
  */
    .action(async (options) => {
    const wallet = new wallet_1.Wallet({ networkType: options.provider });
    const account = wallet.account;
    const provider = wallet.provider;
    const signer = wallet.signer;
    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } = await utxo.accountUtxos({ account, provider });
    const calldata = [
        BigInt(6),
        BigInt(options.reserveNumber),
        BigInt(0),
        BigInt(6000),
        BigInt(2000),
        BigInt(2000),
        BigInt('0x' +
            Buffer.from("DDD").toString('hex')),
        BigInt('0x' +
            Buffer.from("D").toString('hex')),
    ];
    console.log(calldata);
    if (options.image) {
        const image = new Uint8Array(Array.from(await fs_extra_1.default.readFile(path_1.default.resolve(process.cwd(), options.image))));
        const gzip = (0, util_1.promisify)(node_zlib_1.gzip);
        const payload = {
            body: await gzip(image, { level: 9 }),
            cursed: false,
            tags: { contentType: '' },
        };
        console.log(await (0, token_1.tokenDeployment)({
            payload,
            gatheredUtxos: {
                utxos: accountSpendableTotalUtxos,
                totalAmount: accountSpendableTotalBalance,
            },
            feeRate: options.feeRate,
            calldata,
            account,
            signer,
            provider,
        }));
        return;
    }
    console.log(await alkanes.execute({
        gatheredUtxos: {
            utxos: accountSpendableTotalUtxos,
            totalAmount: accountSpendableTotalBalance,
        },
        feeRate: options.feeRate,
        calldata,
        account,
        signer,
        provider,
    }));
    return;
});
exports.alkaneExecute = new commander_1.Command('execute')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-data, --calldata <calldata>', 'op code + params to be called on a contract', (value, previous) => {
    const items = value.split(',');
    return previous ? previous.concat(items) : items;
}, [])
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    /* @dev example call
  oyl alkanes execute -p regtest -feeRate 2 -data '101'
  Mint from initial token contract:
  oyl alkanes execute -p regtest -feeRate 2 -data '2,1,77'
  */
    .action(async (options) => {
    const wallet = new wallet_1.Wallet({ networkType: options.provider });
    const account = wallet.account;
    const provider = wallet.provider;
    const signer = wallet.signer;
    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } = await utxo.accountUtxos({ account, provider });
    const calldata = [];
    for (let i = 0; i < options.calldata.length; i++) {
        calldata.push(BigInt(options.calldata[i]));
    }
    console.log(await alkanes.execute({
        gatheredUtxos: {
            utxos: accountSpendableTotalUtxos,
            totalAmount: accountSpendableTotalBalance,
        },
        feeRate: options.feeRate,
        calldata,
        account,
        signer,
        provider,
    }));
});
exports.alkaneSend = new commander_1.Command('send')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-to, --to <to>')
    .requiredOption('-amt, --amount <amount>')
    .requiredOption('-blk, --block <block>')
    .requiredOption('-tx, --txNum <txNum>')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    /* @dev example call
  oyl alkanes send -p regtest -feeRate 2 -tx '1' -blk '2' -amt 1000 -to bcrt1pkq6ayylfpe5hn05550ry25pkakuf72x9qkjc2sl06dfcet8sg25ql4dm73
  */
    .action(async (options) => {
    const wallet = new wallet_1.Wallet({ networkType: options.provider });
    const account = wallet.account;
    const provider = wallet.provider;
    const signer = wallet.signer;
    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } = await utxo.accountUtxos({ account, provider });
    console.log(await (0, token_1.send)({
        gatheredUtxos: {
            utxos: accountSpendableTotalUtxos,
            totalAmount: accountSpendableTotalBalance,
        },
        feeRate: options.feeRate,
        alkaneId: { block: options.block, tx: options.txNum },
        toAddress: options.to,
        amount: Number(options.amount),
        account,
        signer,
        provider,
    }));
});
//# sourceMappingURL=alkanes.js.map