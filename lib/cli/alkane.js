"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factoryWasmDeploy = void 0;
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const node_zlib_1 = require("node:zlib");
const util_1 = require("util");
const path_1 = tslib_1.__importDefault(require("path"));
const wallet_1 = require("./wallet");
const alkanes = tslib_1.__importStar(require("../alkanes"));
const utxo = tslib_1.__importStar(require("../utxo"));
const utils_1 = require("../shared/utils");
/* @dev example calls
  oyl alkane factoryWasmDeploy -r "0x0ffe" -c free_mint.wasm
*/
exports.factoryWasmDeploy = new commander_1.Command('factoryWasmDeploy')
    .requiredOption('-r, --reserveNumber <reserveNumber>', 'number to reserve for factory id')
    .requiredOption('-c, --contract <contract>', 'contract wasm fileto deploy')
    .option('-n, --networkType <networkType>', 'network type: regtest | mainnet')
    .option('-m, --mnemonic <mnemonic>', 'mnemonic used for signing transactions')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    .action(async (options) => {
    console.log(`Deploying contract ${options.contract}`);
    const wallet = new wallet_1.Wallet({
        mnemonic: options.mnemonic,
        feeRate: options.feeRate,
    });
    const contract = new Uint8Array(Array.from(await fs_extra_1.default.readFile(path_1.default.join(__dirname, './', options.contract))));
    const gzip = (0, util_1.promisify)(node_zlib_1.gzip);
    const payload = {
        body: await gzip(contract, { level: 9 }),
        cursed: false,
        tags: { contentType: '' },
    };
    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } = await utxo.accountUtxos({ account: wallet.account, provider: wallet.provider });
    const { txId: commitTxId, script } = await alkanes.deployCommit({
        payload,
        gatheredUtxos: {
            utxos: accountSpendableTotalUtxos,
            totalAmount: accountSpendableTotalBalance,
        },
        feeRate: wallet.feeRate,
        account: wallet.account,
        signer: wallet.signer,
        provider: wallet.provider,
    });
    console.log('Commit txid: ', commitTxId);
    const mempool = await wallet.provider.sandshrew.bitcoindRpc.getRawMemPool(true);
    const mempoolTxs = Object.keys(mempool);
    console.log('mempool transactions: ', mempoolTxs);
    const blockHash = await wallet.provider.sandshrew.bitcoindRpc.generateBlock(wallet.account.nativeSegwit.address, mempoolTxs);
    await (0, utils_1.timeout)(5000);
    const { txId: revealTxId } = await alkanes.deployReveal({
        createReserveNumber: options.reserveNumber,
        commitTxId: commitTxId,
        script: script,
        account: wallet.account,
        provider: wallet.provider,
        feeRate: wallet.feeRate,
        signer: wallet.signer,
    });
    console.log('Reveal txid: ', revealTxId);
});
//# sourceMappingURL=alkane.js.map