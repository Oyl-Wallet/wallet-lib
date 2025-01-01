"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = exports.REGTEST_FAUCET = exports.RANDOM_ADDRESS = void 0;
const commander_1 = require("commander");
const utils_1 = require("../shared/utils");
const wallet_1 = require("./wallet");
exports.RANDOM_ADDRESS = 'bcrt1qz3y37epk6hqlul2pt09hrwgj0s09u5g6kzrkm2';
exports.REGTEST_FAUCET = {
    mnemonic: 'hub dinosaur mammal approve riot rebel library legal sick discover loop alter',
    nativeSegwit: {
        address: 'bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv',
        publicKey: '03d3af89f242cc0df1d7142e9a354a59b1cd119c12c31ff226b32fb77fa12acce2'
    },
    taproot: {
        address: 'bcrt1p45un5d47hvfhx6mfezr6x0htpanw23tgll7ppn6hj6gfzu3x3dnsaegh8d',
        publicKey: '022ffc336daa8196f1aa796135a568b1125ba08c2879c22468effea8e4a0c4c8b9',
        publicKeyXonly: '2ffc336daa8196f1aa796135a568b1125ba08c2879c22468effea8e4a0c4c8b9'
    },
    privateKey: 'bc1p45un5d47hvfhx6mfezr6x0htpanw23tgll7ppn6hj6gfzu3x3dns8g57gc',
    publicKey: '03d3af89f242cc0df1d7142e9a354a59b1cd119c12c31ff226b32fb77fa12acce2',
    wif: 'cTBsa8seu4xA7EZ7N2AXeq2qUfrVsD2KS3F7Tj72WKaXF15hp7Vq'
};
/* @dev usage
  oyl regtest init
*/
exports.init = new commander_1.Command('init')
    .description('Generate blocks to initialize regtest chain')
    .option('-m, --mnemonic <mnemonic>', 'mnemonic used for signing transactions')
    .option('-a, --address <address>', 'address that will receive initial funds')
    .action(async (options) => {
    const totalBlockCount = 260;
    const faucetBlockCount = 60;
    const addressBlockCount = 5;
    const wallet = new wallet_1.Wallet({
        mnemonic: options.mnemonic,
    });
    const address = options.address ? options.address : wallet.account.nativeSegwit.address;
    const currentBlockCount = await wallet.provider.sandshrew.bitcoindRpc.getBlockCount();
    if (currentBlockCount > 250) {
        console.log('Blockchain already initialized');
        console.log('Block count: ', currentBlockCount);
        return;
    }
    console.log('Generating blocks...');
    // Generate the first block utxo payments to the faucet. If you send too many to the address you can't query the utxos for funding.
    await wallet.provider.sandshrew.bitcoindRpc.generateToAddress(faucetBlockCount, exports.REGTEST_FAUCET.nativeSegwit.address);
    await wallet.provider.sandshrew.bitcoindRpc.generateToAddress(addressBlockCount, address);
    // Generate the remaining blocks to a random address
    const transaction = await wallet.provider.sandshrew.bitcoindRpc.generateToAddress(totalBlockCount - faucetBlockCount - addressBlockCount, exports.RANDOM_ADDRESS);
    await (0, utils_1.timeout)(8000);
    const newBlockCount = await wallet.provider.sandshrew.bitcoindRpc.getBlockCount();
    console.log(transaction);
    console.log('Blockchain initialized');
    console.log('Block count: ', newBlockCount);
    console.log('Faucet address: ', exports.REGTEST_FAUCET.nativeSegwit.address);
    console.log(`${address} has been funded with ${addressBlockCount} utxos`);
});
//# sourceMappingURL=regtest.js.map