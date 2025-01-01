"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alkaneFactoryWasmDeploy = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const node_zlib_1 = require("node:zlib");
const util_1 = require("util");
const commander_1 = require("commander");
const wallet_1 = require("./wallet");
const alkanes = tslib_1.__importStar(require("../alkanes"));
const utxo = tslib_1.__importStar(require("../utxo"));
const utils_1 = require("./utils");
/* @dev example calls

oyl alkane factoryDeploy -r "0x0ffe" -c free_mint.wasm

oyl alkane factoryDeploy -r "0x0ffe" -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' -p regtest -feeRate 2

*/
exports.alkaneFactoryWasmDeploy = new commander_1.Command('factoryWasmDeploy')
    .requiredOption('-r, --reserveNumber <reserveNumber>', 'number to reserve for factory id')
    .requiredOption('-c, --contract <contract>', 'contract wasm fileto deploy')
    .option('-n, --networkType <networkType>', 'network type: regtest | mainnet')
    .option('-m, --mnemonic <mnemonic>', 'mnemonic used for signing transactions')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    .action(async (options) => {
    const wallet = new wallet_1.Wallet({
        mnemonic: options.mnemonic,
        feeRate: options.feeRate,
    });
    const contract = new Uint8Array(Array.from(await fs_extra_1.default.readFile(options.contract)));
    const gzip = (0, util_1.promisify)(node_zlib_1.gzip);
    const payload = {
        body: await gzip(contract, { level: 9 }),
        cursed: false,
        tags: { contentType: '' },
    };
    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } = await utxo.accountUtxos({ account: wallet.account, provider: wallet.provider });
    const commit = await alkanes.deployCommit({
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
    const mempool = await wallet.provider.sandshrew.bitcoindRpc.getRawMemPool(true);
    const mempoolTxs = Object.keys(mempool);
    console.log('mempool transactions: ', mempoolTxs);
    const blockHash = await wallet.provider.sandshrew.bitcoindRpc.generateBlock(wallet.account.nativeSegwit.address, mempoolTxs);
    console.log('Processed block: ', blockHash);
    console.log({ mempoolTxs, blockHash });
    (0, utils_1.waitFiveSeconds)();
    const reveal = await alkanes.deployReveal({
        createReserveNumber: options.reserveNumber,
        commitTxId: commit.txId,
        script: commit.script,
        account: wallet.account,
        provider: wallet.provider,
        feeRate: wallet.feeRate,
        signer: wallet.signer,
    });
    console.log({ commit: commit, reveal: reveal });
});
//# sourceMappingURL=alkane.js.map