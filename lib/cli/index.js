"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const utxo_1 = require("../utxo");
const btc = tslib_1.__importStar(require("../btc"));
const brc20 = tslib_1.__importStar(require("../brc20"));
const collectible = tslib_1.__importStar(require("../collectible"));
const rune = tslib_1.__importStar(require("../rune"));
require("dotenv/config");
const __1 = require("..");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const __2 = require("..");
const __3 = require("..");
const __4 = require("..");
const errors_1 = require("../errors");
const defaultProvider = {
    bitcoin: new __2.Provider({
        url: 'https://mainnet.sandshrew.io',
        projectId: process.env.SANDSHREW_PROJECT_ID,
        network: bitcoin.networks.bitcoin,
        networkType: 'mainnet',
        apiUrl: 'https://staging-api.oyl.gg',
        //opiUrl: 'https://mainnet-opi.sandshrew.io/v1'
    }),
    regtest: new __2.Provider({
        url: 'http://localhost:3000',
        projectId: 'regtest',
        network: bitcoin.networks.regtest,
        networkType: 'regtest',
        apiUrl: 'https://staging-api.oyl.gg',
        //opiUrl: 'https://mainnet-opi.sandshrew.io/v1'
    }),
};
const program = new commander_1.Command();
program
    .name('default')
    .description('All functionality for oyl-sdk in a cli-wrapper')
    .version('0.0.1');
const generateCommand = new commander_1.Command('generate')
    .description('Creates a new account object')
    .option('-m, --mnemonic <mnemonic>', 'mnemonic you want to generate an account from')
    .option('-i, --index <index>', 'index you want to derive your account keys from')
    .option('-n, --network <network>', 'the network you want to derive keys on')
    .action((options) => {
    const account = (0, __1.mnemonicToAccount)({
        mnemonic: options.mnemonic,
        opts: {
            index: options.index,
            network: bitcoin.networks[options.network],
        },
    });
    console.log(account);
});
const privateKeysCommand = new commander_1.Command('privateKeys')
    .description('Returns private keys for an account object')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    .option('-i, --index <index>', 'index you want to derive your account keys from')
    .requiredOption('-n, --network <network>', 'the network you want to derive keys on')
    .action((options) => {
    const privateKeys = (0, __1.getWalletPrivateKeys)({
        mnemonic: options.mnemonic,
        opts: {
            index: options.index,
            network: bitcoin.networks[options.network],
        },
    });
    console.log(privateKeys);
});
const generateMnemonicCommand = new commander_1.Command('generateMnemonic')
    .description('Returns a new mnemonic phrase')
    .action(() => {
    const mnemonic = (0, __1.generateMnemonic)();
    console.log(mnemonic);
});
const signPsbt = new commander_1.Command('sign')
    .requiredOption('-p, --provider <provider>', 'provider to use when signing the network psbt')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    .requiredOption('-f, --finalize <finalize>', 'flag to finalize and push psbt')
    .requiredOption('-e, --extract <finalize>', 'flag to extract transaction')
    .option('-legacy, --legacy <legacy>', 'legacy private key')
    .option('-taproot, --taproot <taproot>', 'taproot private key')
    .option('-nested, --nested-segwit <nestedSegwit>', 'nested segwit private key')
    .option('-native, --native-segwit <nativeSegwit>', 'native segwit private key')
    /* @dev example call
    oyl account sign
    -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    -native '4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3'
    -p regtest
    -f yes
    -e yes
  */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    const signer = new __3.Signer(provider.network, {
        segwitPrivateKey: options.nativeSegwit,
        taprootPrivateKey: options.taproot,
        nestedSegwitPrivateKey: options.nestedSegwit,
        legacyPrivateKey: options.legacy,
    });
    let finalize = options.finalize == 'yes' ? true : false;
    let extract = options.extract == 'yes' ? true : false;
    const { signedHexPsbt } = await signer.signAllInputs({
        rawPsbtHex: process.env.PSBT_HEX,
        finalize,
    });
    if (extract) {
        const extractedTx = bitcoin.Psbt.fromHex(signedHexPsbt).extractTransaction();
        console.log('extracted tx', extractedTx);
        console.log('extracted tx hex', extractedTx.toHex());
    }
    console.log('signed hex psbt', signedHexPsbt);
});
const accountUtxosToSpend = new commander_1.Command('accountUtxos')
    .description('Returns available utxos to spend')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    /* @dev example call
      oyl utxo accountUtxos -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' -p regtest
    */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    const account = (0, __1.mnemonicToAccount)({
        mnemonic: options.mnemonic,
        opts: { network: provider.network },
    });
    console.log(await (0, utxo_1.accountUtxos)({
        account,
        provider,
    }));
});
const accountAvailableBalance = new commander_1.Command('balance')
    .description('Returns available utxos to spend')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    /* @dev example call
      oyl utxo balance -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'  -p regtest
    */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    const account = (0, __1.mnemonicToAccount)({
        mnemonic: options.mnemonic,
        opts: { network: provider.network },
    });
    console.log(await (0, utxo_1.accountBalance)({
        account,
        provider,
    }));
});
const addressBRC20Balance = new commander_1.Command('addressBRC20Balance')
    .description('Returns all BRC20 balances')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-a, --address <address>', 'address you want to get utxos for')
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    console.log((await provider.api.getBrc20sByAddress(options.address)).data);
});
const addressUtxosToSpend = new commander_1.Command('addressUtxos')
    .description('Returns available utxos to spend')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-a, --address <address>', 'address you want to get utxos for')
    /* @dev example call
      oyl utxo addressUtxos -a bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx -p regtest
    */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    console.log(await (0, utxo_1.addressUtxos)({
        address: options.address,
        provider,
    }));
});
const btcSend = new commander_1.Command('send')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    .requiredOption('-amt, --amount <amount>', 'amount you want to send')
    .requiredOption('-t, --to <to>', 'address you want to send to')
    .option('-legacy, --legacy <legacy>', 'legacy private key')
    .option('-taproot, --taproot <taproot>', 'taproot private key')
    .option('-nested, --nested-segwit <nestedSegwit>', 'nested segwit private key')
    .option('-native, --native-segwit <nativeSegwit>', 'native segwit private key')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    /* @dev example call
    oyl btc send
    -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    -native '4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3'
    -p regtest
    -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv
    -amt 1000
    -feeRate 2
  */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    const signer = new __3.Signer(provider.network, {
        segwitPrivateKey: options.nativeSegwit,
        taprootPrivateKey: options.taproot,
        nestedSegwitPrivateKey: options.nestedSegwit,
        legacyPrivateKey: options.legacy,
    });
    const account = (0, __1.mnemonicToAccount)({
        mnemonic: options.mnemonic,
        opts: {
            network: provider.network,
        },
    });
    console.log(await btc.send({
        toAddress: options.to,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
        amount: options.amount,
    }));
});
const brc20Send = new commander_1.Command('send')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    .requiredOption('-amt, --amount <amount>', 'amount you want to send')
    .requiredOption('-t, --to <to>', 'address you want to send to')
    .requiredOption('-tick', '--ticker <ticker>', 'brc20 ticker to send')
    .option('-legacy, --legacy <legacy>', 'legacy private key')
    .option('-taproot, --taproot <taproot>', 'taproot private key')
    .option('-nested, --nested-segwit <nestedSegwit>', 'nested segwit private key')
    .option('-native, --native-segwit <nativeSegwit>', 'native segwit private key')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    /* @dev example call
    oyl brc20 send
    -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    -native 4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3
    -taproot 41f41d69260df4cf277826a9b65a3717e4eeddbeedf637f212ca096576479361
    -p regtest
    -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv
    -tick toyl
    -amt 1000
    -feeRate 2
  */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    const signer = new __3.Signer(provider.network, {
        segwitPrivateKey: options.nativeSegwit,
        taprootPrivateKey: options.taproot,
        nestedSegwitPrivateKey: options.nestedSegwit,
        legacyPrivateKey: options.legacy,
    });
    const account = (0, __1.mnemonicToAccount)({
        mnemonic: options.mnemonic,
        opts: {
            network: provider.network,
        },
    });
    console.log(await brc20.send({
        ticker: options.ticker,
        toAddress: options.to,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
        amount: options.amount,
    }));
});
const collectibleSend = new commander_1.Command('send')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    .requiredOption('-t, --to <to>', 'address you want to send to')
    .requiredOption('-inscId, --inscriptionId <inscriptionId>', 'inscription to send')
    .requiredOption('-inscAdd, --inscriptionAddress <inscriptionAddress>', 'current holder of inscription to send')
    .option('-legacy, --legacy <legacy>', 'legacy private key')
    .option('-taproot, --taproot <taproot>', 'taproot private key')
    .option('-nested, --nested-segwit <nestedSegwit>', 'nested segwit private key')
    .option('-native, --native-segwit <nativeSegwit>', 'native segwit private key')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    /* @dev example call
    oyl collectible send
    -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    -native 4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3
    -taproot 41f41d69260df4cf277826a9b65a3717e4eeddbeedf637f212ca096576479361
    -p regtest
    -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv
    -inscId d0c21b35f27ba6361acd5172fcfafe8f4f96d424c80c00b5793290387bcbcf44i0
    -inscAdd bcrt1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqvg32hk
    -feeRate 2
  */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    const signer = new __3.Signer(provider.network, {
        segwitPrivateKey: options.nativeSegwit,
        taprootPrivateKey: options.taproot,
        nestedSegwitPrivateKey: options.nestedSegwit,
        legacyPrivateKey: options.legacy,
    });
    const account = (0, __1.mnemonicToAccount)({
        mnemonic: options.mnemonic,
        opts: {
            network: provider.network,
        },
    });
    console.log(await collectible.send({
        inscriptionId: options.inscriptionId,
        inscriptionAddress: options.inscriptionAddress,
        toAddress: options.to,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
    }));
});
const runeSend = new commander_1.Command('send')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    .requiredOption('-t, --to <to>', 'address you want to send to')
    .requiredOption('-runeId, --runeId <runeId>', 'runeId to send')
    .requiredOption('-inscAdd, --inscriptionAddress <inscriptionAddress>', 'current holder of inscription to send')
    .requiredOption('-amt, --amount <amount>', 'amount of runes you want to send')
    .option('-legacy, --legacy <legacy>', 'legacy private key')
    .option('-taproot, --taproot <taproot>', 'taproot private key')
    .option('-nested, --nested-segwit <nestedSegwit>', 'nested segwit private key')
    .option('-native, --native-segwit <nativeSegwit>', 'native segwit private key')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    /* @dev example call
    oyl rune send
    -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    -native 4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3
    -taproot 41f41d69260df4cf277826a9b65a3717e4eeddbeedf637f212ca096576479361
    -p regtest
    -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv
    -amt 100
    -runeId 279:1
    -inscAdd bcrt1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqvg32hk
    -feeRate 2
  */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    const signer = new __3.Signer(provider.network, {
        segwitPrivateKey: options.nativeSegwit,
        taprootPrivateKey: options.taproot,
        nestedSegwitPrivateKey: options.nestedSegwit,
        legacyPrivateKey: options.legacy,
    });
    const account = (0, __1.mnemonicToAccount)({
        mnemonic: options.mnemonic,
        opts: {
            network: provider.network,
        },
    });
    console.log(await rune.send({
        runeId: options.runeId,
        amount: options.amount,
        inscriptionAddress: options.inscriptionAddress,
        toAddress: options.to,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
    }));
});
const runeMint = new commander_1.Command('mint')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    .requiredOption('-runeId, --runeId <runeId>', 'runeId to send')
    .requiredOption('-amt, --amount <amount>', 'amount of runes you want to send')
    .option('-legacy, --legacy <legacy>', 'legacy private key')
    .option('-taproot, --taproot <taproot>', 'taproot private key')
    .option('-nested, --nested-segwit <nestedSegwit>', 'nested segwit private key')
    .option('-native, --native-segwit <nativeSegwit>', 'native segwit private key')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    /* @dev example call
    oyl rune mint
    -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    -native 4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3
    -taproot 41f41d69260df4cf277826a9b65a3717e4eeddbeedf637f212ca096576479361
    -p regtest
    -amt 1000
    -runeId 279:1
    -feeRate 2
  */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    const signer = new __3.Signer(provider.network, {
        segwitPrivateKey: options.nativeSegwit,
        taprootPrivateKey: options.taproot,
        nestedSegwitPrivateKey: options.nestedSegwit,
        legacyPrivateKey: options.legacy,
    });
    const account = (0, __1.mnemonicToAccount)({
        mnemonic: options.mnemonic,
        opts: {
            network: provider.network,
        },
    });
    console.log(await rune.mint({
        runeId: options.runeId,
        amount: options.amount,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
    }));
});
const runeEtch = new commander_1.Command('etch')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    .requiredOption('-symbol, --symbol <symbol>', 'symbol for rune to etch')
    .requiredOption('-rune-name, --rune-name <runeName>', 'name of rune to etch')
    .requiredOption('-per-mint-amount, --per-mint-amount <perMintAmount>', 'the amount of runes each mint')
    .option('-legacy, --legacy <legacy>', 'legacy private key')
    .option('-taproot, --taproot <taproot>', 'taproot private key')
    .option('-nested, --nested-segwit <nestedSegwit>', 'nested segwit private key')
    .option('-native, --native-segwit <nativeSegwit>', 'native segwit private key')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    .option('-turbo, --turbo <turbo>', 'use turbo')
    .option('-divisibility, --divisibility <divisibility>', 'divisibility of rune')
    .option('-cap, --cap <cap>', 'cap / total number of rune')
    .option('-pre, --premine <premine>', 'premined amount of rune')
    /* @dev example call
  oyl rune etch -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' -native 4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3 -taproot 41f41d69260df4cf277826a9b65a3717e4eeddbeedf637f212ca096576479361 -p regtest -feeRate 2 -divisibility 3 -cap 100000 -pre 1000 -symbol Z -rune-name OYLTESTER -per-mint-amount 500
  */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    const signer = new __3.Signer(provider.network, {
        segwitPrivateKey: options.nativeSegwit,
        taprootPrivateKey: options.taproot,
        nestedSegwitPrivateKey: options.nestedSegwit,
        legacyPrivateKey: options.legacy,
    });
    const account = (0, __1.mnemonicToAccount)({
        mnemonic: options.mnemonic,
        opts: {
            network: provider.network,
        },
    });
    console.log(await rune.etch({
        symbol: options.symbol,
        premine: options.premine,
        perMintAmount: options.perMintAmount,
        turbo: Boolean(Number(options.turbo)),
        divisibility: Number(options.divisibility),
        runeName: options.runeName,
        cap: options.cap,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
    }));
});
const runeProtoburn = new commander_1.Command('protoburn')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    .requiredOption('-protoTag, --protocolTag <protoTag>', 'Protorune Tag to be set')
    .requiredOption('-rId, --runeId <runeId>', 'name of rune to etch')
    .requiredOption('-ptr, --pointer <pointer>', 'the amount of runes each mint')
    .option('-legacy, --legacy <legacy>', 'legacy private key')
    .option('-taproot, --taproot <taproot>', 'taproot private key')
    .option('-nested, --nested-segwit <nestedSegwit>', 'nested segwit private key')
    .option('-native, --native-segwit <nativeSegwit>', 'native segwit private key')
    .option('-feeRate, --feeRate <feeRate>', 'fee rate')
    .option('-amt, --amount <amt>', 'amount to burn')
    .option('-inscAdd, --inscriptionAddress <inscAdd>', 'address runes live on that you are burning')
    /* @dev example call
  oyl rune protoburn -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' -native 4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3 -taproot 41f41d69260df4cf277826a9b65a3717e4eeddbeedf637f212ca096576479361 -p regtest -feeRate 2 -inscAdd "bc1p..." -amt 100 -protoTag testing -rId 271:1 -ptr 0
  */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    const signer = new __3.Signer(provider.network, {
        segwitPrivateKey: options.nativeSegwit,
        taprootPrivateKey: options.taproot,
        nestedSegwitPrivateKey: options.nestedSegwit,
        legacyPrivateKey: options.legacy,
    });
    const account = (0, __1.mnemonicToAccount)({
        mnemonic: options.mnemonic,
        opts: {
            network: provider.network,
        },
    });
    console.log(await rune.protoburn({
        pointer: Number(options.pointer),
        runeId: options.runeId,
        inscriptionAddress: options.inscAdd,
        amount: Number(options.amt),
        protocolTag: options.protoTag,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
    }));
});
const getRuneByName = new commander_1.Command('getRuneByName')
    .description('Returns rune details based on name provided')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-name, --name <name>', 'name of the rune you want to fetch')
    /* @dev example call
      oyl rune getRuneByName -name ETCHSGSXCUMYO -p regtest
    */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    console.log(await provider.ord.getRuneByName(options.name));
});
const multiCallSandshrewProviderCall = new commander_1.Command('sandShrewMulticall')
    .description('Returns available utxos to spend')
    .requiredOption('-p, --provider <provider>', 'provider to use when querying the network for utxos')
    .requiredOption('-c, --calls <calls>', 'calls in this format: {method: string, params: string[]}')
    /* @dev example call
      oyl provider sandShrewMulticall -c '[{"method":"esplora_tx","params":["688f5c239e4e114af461dc1331d02ad5702e795daf2dcf397815e0b05cd23dbc"]},{"method":"btc_getblockcount", "params":[]}]' -p bitcoin
    */
    .action(async (options) => {
    let isJson = [];
    try {
        isJson = JSON.parse(options.calls);
        const multiCall = isJson.map((call) => {
            return [call.method, call.params];
        });
        const provider = defaultProvider[options.provider];
        console.log(await provider.sandshrew.multiCall(multiCall));
    }
    catch (error) {
        console.log(error);
    }
});
const apiProviderCall = new commander_1.Command('api')
    .description('Returns data based on api method invoked')
    .requiredOption('-p, --provider <provider>', 'provider to use to access the network.')
    .requiredOption('-method, --method <method>', 'name of the method you want to call for the api.')
    .option('-params, --parameters <parameters>', 'parameters for the api method you are calling.')
    /* @dev example call
      oyl provider api -method getUnisatTickerOffers -params '{"ticker":"ordi"}' -p bitcoin
  
      please note the json format if you need to pass an object.
    */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    let isJson;
    try {
        isJson = JSON.parse(options.parameters);
        console.log(await provider.api[options.method](isJson));
    }
    catch (error) {
        console.log(await provider.api[options.method](options.parameters));
    }
});
const ordProviderCall = new commander_1.Command('ord')
    .description('Returns data based on ord method invoked')
    .requiredOption('-p, --provider <provider>', 'provider to use to access the network.')
    .requiredOption('-method, --method <method>', 'name of the method you want to call for the api.')
    .option('-params, --parameters <parameters>', 'parameters for the ord method you are calling.')
    /* @dev example call
      oyl provider ord -method getTxOutput -params '{"ticker":"ordi"}' -p bitcoin
  
      please note the json format if you need to pass an object.
    */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    let isJson;
    try {
        isJson = JSON.parse(options.parameters);
        console.log(await provider.ord[options.method](isJson));
    }
    catch (error) {
        console.log(await provider.ord[options.method](options.parameters));
    }
});
const opiProviderCall = new commander_1.Command('opi')
    .description('Returns data based on opi query')
    .requiredOption('-p, --provider <provider>', 'provider to use to access the network.')
    .requiredOption('-method, --method <method>', 'name of the method you want to call for the api.')
    .option('-params, --parameters <parameters>', 'parameters for the ord method you are calling.')
    /* @dev example call
      oyl provider opi -method getBrc20Balance -params '{"address":"bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv","ticker":"ordi"}' -p bitcoin
  
      please note the json format if you need to pass an object.
    */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    let isJson;
    try {
        isJson = JSON.parse(options.parameters);
        console.log(await provider.opi[options.method](isJson));
    }
    catch (error) {
        console.log(await provider.opi[options.method](options.parameters));
    }
});
const marketPlaceBuy = new commander_1.Command('buy')
    .description('Returns rune details based on name provided')
    .requiredOption('-p, --provider <provider>', 'provider to use to access the network.')
    .requiredOption('-m, --mnemonic <mnemonic>', 'mnemonic you want to get private keys from')
    .requiredOption('-type, --asset-type <assetType>', 'pass BRC20, COLLECTIBLE or RUNE')
    .requiredOption('-feeRate, --feeRate <feeRate>', 'fee rate')
    .requiredOption('-tick --ticker <ticker>', 'Asset ticker to fetch quotes for.')
    .option('-legacy, --legacy <legacy>', 'legacy private key')
    .option('-taproot, --taproot <taproot>', 'taproot private key')
    .option('-nested, --nested-segwit <nestedSegwit>', 'nested segwit private key')
    .option('-native, --native-segwit <nativeSegwit>', 'native segwit private key')
    .option('-receive, --receive-address <receiveAddress>', 'address to receieve the assets.')
    /* @dev example call
      oyl marketplace buy -type BRC20 -tick ordi -feeRate 30 -native <nativePrivateKey> -p bitcoin
  
      please note the json format if you need to pass an object.
    */
    .action(async (options) => {
    const provider = defaultProvider[options.provider];
    const signer = new __3.Signer(provider.network, {
        segwitPrivateKey: options.nativeSegwit,
        taprootPrivateKey: options.taproot,
        nestedSegwitPrivateKey: options.nestedSegwit,
        legacyPrivateKey: options.legacy,
    });
    const account = (0, __1.mnemonicToAccount)({
        mnemonic: options.mnemonic,
        opts: {
            network: provider.network,
            spendStrategy: {
                addressOrder: ['taproot', 'nativeSegwit'],
                utxoSortGreatestToLeast: true,
                changeAddress: 'taproot',
            },
        },
    });
    let quotes;
    switch (options.assetType) {
        case 'BRC20':
            options.assetType = __4.AssetType.BRC20;
            quotes = await provider.api.getBrc20Offers({
                ticker: options.ticker,
            });
            break;
        case 'RUNES':
            options.assetType = __4.AssetType.RUNES;
            quotes = await provider.api.getRuneOffers({
                ticker: options.ticker,
            });
            break;
        case 'COLLECTIBLE':
            options.assetType = __4.AssetType.COLLECTIBLE;
            break;
        default:
            throw new errors_1.OylTransactionError(Error('Incorrect asset type'));
    }
    // const marketplace: Trade = new Trade({
    //   provider: provider,
    //   receiveAddress:
    //     options.receiveAddress === undefined
    //       ? account.taproot.address
    //       : options.receiveAddress,
    //   account: account,
    //   assetType: options.assetType,
    //   signer,
    //   feeRate: Number(options.feeRate),
    // })
    // const offersToBuy = await marketplace.processAllOffers(quotes)
    // const signedTxs = await marketplace.buyMarketPlaceOffers(offersToBuy)
    // console.log(signedTxs)
});
const accountCommand = new commander_1.Command('account')
    .description('Manage accounts')
    .addCommand(generateCommand)
    .addCommand(signPsbt)
    .addCommand(privateKeysCommand)
    .addCommand(generateMnemonicCommand);
const utxosCommand = new commander_1.Command('utxo')
    .description('Examine utxos')
    .addCommand(accountUtxosToSpend)
    .addCommand(addressUtxosToSpend)
    .addCommand(accountAvailableBalance);
const btcCommand = new commander_1.Command('btc')
    .description('Functions for sending bitcoin')
    .addCommand(btcSend);
const brc20Command = new commander_1.Command('brc20')
    .description('Functions for brc20')
    .addCommand(brc20Send)
    .addCommand(addressBRC20Balance);
const collectibleCommand = new commander_1.Command('collectible')
    .description('Functions for collectibles')
    .addCommand(collectibleSend);
const runeCommand = new commander_1.Command('rune')
    .description('Functions for runes')
    .addCommand(runeSend)
    .addCommand(runeMint)
    .addCommand(runeEtch)
    .addCommand(getRuneByName);
const providerCommand = new commander_1.Command('provider')
    .description('Functions avaialble for all provider services')
    .addCommand(apiProviderCall)
    .addCommand(ordProviderCall)
    .addCommand(opiProviderCall)
    .addCommand(multiCallSandshrewProviderCall);
const marketPlaceCommand = new commander_1.Command('marketplace')
    .description('Functions for marketplace')
    .addCommand(marketPlaceBuy);
program.addCommand(utxosCommand);
program.addCommand(accountCommand);
program.addCommand(btcCommand);
program.addCommand(brc20Command);
program.addCommand(collectibleCommand);
program.addCommand(runeCommand);
program.addCommand(providerCommand);
program.addCommand(marketPlaceCommand);
program.parse(process.argv);
//# sourceMappingURL=index.js.map