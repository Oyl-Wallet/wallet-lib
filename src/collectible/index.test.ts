import * as bitcoin from 'bitcoinjs-lib'
import { createPsbt, findCollectible } from './collectible'
import { Account, mnemonicToAccount } from '../account/account'
import { Provider } from '../provider/provider'
import { GatheredUtxos } from 'shared/interface'

const provider = new Provider({
  url: '',
  projectId: '',
  network: bitcoin.networks.regtest,
  networkType: 'mainnet',
})

const account: Account = mnemonicToAccount({
  mnemonic:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  opts: { index: 0, network: bitcoin.networks.regtest },
})

const { address } = bitcoin.payments.p2tr({
  pubkey: Buffer.from(account.taproot.pubKeyXOnly, 'hex'),
  network: bitcoin.networks.regtest,
})

const { output } = bitcoin.payments.p2tr({
  address,
  network: bitcoin.networks.regtest,
})
const scriptPk = output.toString('hex')

const testFormattedUtxos: GatheredUtxos = {
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
}

jest.spyOn(require('./collectible'), 'findCollectible').mockResolvedValue({
  txId: 'e3c3b1c9e5a45b4f6c7e1a9c3d6e2a7d8f9b0c3a5c7e4f6d7e1a8b9c0a1b2c31',
  voutIndex: 0,
  data: {
    scriptpubkey:
      '51200d89d702fafc100ab8eae890cbaf40b3547d6f1429564cf5d5f8d517f4caa390',
    scriptpubkey_asm:
      'OP_PUSHNUM_1 OP_PUSHBYTES_32 0d89d702fafc100ab8eae890cbaf40b3547d6f1429564cf5d5f8d517f4caa390',
    scriptpubkey_type: 'v1_p2tr',
    scriptpubkey_address: address,
    value: 546,
  },
})

describe('collectible sendTx', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('creates a transaction successfully', async () => {
    const result = await createPsbt({
      gatheredUtxos: testFormattedUtxos,
      toAddress: address,
      inscriptionAddress: account.taproot.address,
      inscriptionId: 'testInscriptionId:0',
      feeRate: 3,
      account: account,
      provider: provider,
    })
    expect(result.psbt).toBeDefined()
    expect(findCollectible).toHaveBeenCalledWith({
      address: account.taproot.address,
      provider: provider,
      inscriptionId: 'testInscriptionId:0',
    })
  })
})
