"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const collectible_1 = require("./collectible");
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
const { address } = bitcoin.payments.p2tr({
    pubkey: Buffer.from(account.taproot.pubKeyXOnly, 'hex'),
    network: bitcoin.networks.regtest,
});
const { output } = bitcoin.payments.p2tr({
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
jest.spyOn(require('./collectible'), 'findCollectible').mockResolvedValue({
    txId: 'e3c3b1c9e5a45b4f6c7e1a9c3d6e2a7d8f9b0c3a5c7e4f6d7e1a8b9c0a1b2c31',
    voutIndex: 0,
    data: {
        scriptpubkey: '51200d89d702fafc100ab8eae890cbaf40b3547d6f1429564cf5d5f8d517f4caa390',
        scriptpubkey_asm: 'OP_PUSHNUM_1 OP_PUSHBYTES_32 0d89d702fafc100ab8eae890cbaf40b3547d6f1429564cf5d5f8d517f4caa390',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address: address,
        value: 546,
    },
});
describe('collectible sendTx', () => {
    beforeEach(() => {
        jest.resetModules();
    });
    it('creates a transaction successfully', async () => {
        const result = await (0, collectible_1.createPsbt)({
            gatheredUtxos: testFormattedUtxos,
            toAddress: address,
            inscriptionAddress: account.taproot.address,
            inscriptionId: 'testInscriptionId:0',
            feeRate: 3,
            account: account,
            provider: provider,
        });
        expect(result.psbt).toBeDefined();
        expect(collectible_1.findCollectible).toHaveBeenCalledWith({
            address: account.taproot.address,
            provider: provider,
            inscriptionId: 'testInscriptionId:0',
        });
    });
});
//# sourceMappingURL=index.test.js.map