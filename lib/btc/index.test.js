"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const btc_1 = require("./btc");
const account_1 = require("../account/account");
const provider_1 = require("../provider/provider");
const provider = new provider_1.Provider({
    url: '',
    projectId: '',
    network: bitcoin.networks.regtest,
    networkType: 'mainnet',
});
const account = (0, account_1.mnemonicToAccount)({
    mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    opts: { index: 0, network: bitcoin.networks.regtest },
});
const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(account.nativeSegwit.pubkey, 'hex'),
    network: bitcoin.networks.regtest,
});
const { output } = bitcoin.payments.p2wpkh({
    address,
    network: bitcoin.networks.regtest,
});
const scriptPk = output.toString('hex');
const testFormattedUtxos = {
    utxos: [
        {
            txId: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b274',
            outputIndex: 0,
            satoshis: 100000,
            confirmations: 3,
            scriptPk,
            address: account.nativeSegwit.address,
            inscriptions: [],
        },
        {
            txId: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b275',
            outputIndex: 0,
            satoshis: 100000,
            confirmations: 3,
            scriptPk,
            address: account.nativeSegwit.address,
            inscriptions: [],
        },
    ],
    totalAmount: 200000,
};
describe('btc sendTx', () => {
    it('construct psbt', async () => {
        const result = await (0, btc_1.createPsbt)({
            gatheredUtxos: testFormattedUtxos,
            toAddress: address,
            amount: 3000,
            feeRate: 10,
            account: account,
            provider: provider,
        });
        expect(result.psbt).toBeDefined();
    });
});
//# sourceMappingURL=index.test.js.map