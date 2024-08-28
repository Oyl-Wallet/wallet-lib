import { Provider } from '../provider/provider'
import * as dotenv from 'dotenv'
import * as bitcoin from 'bitcoinjs-lib'
import { Account, mnemonicToAccount } from '../account/account'
import { EsploraUtxo, FormattedUtxo, addressSpendableUtxos } from './utxo'

dotenv.config()

const provider = new Provider({
  url: 'https://mainnet.sandshrew.io',
  projectId: process.env.SANDSHREW_PROJECT_ID!,
  network: bitcoin.networks.bitcoin,
  networkType: 'mainnet',
})

const account: Account = mnemonicToAccount({
  mnemonic:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
})

const testFormattedUtxos: FormattedUtxo[] = [
  {
    txId: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b274',
    outputIndex: 2,
    satoshis: 100000,
    confirmations: 3,
    scriptPk:
      'b7fbbedbe61b51bf4e41e3517b8232f31c64f3b67ffd2d8eecff12fc7db4cae5',
    address: 'bc1pklamaklxrdgm7njpudghhq3j7vwxfuak0l7jmrhvluf0cld5etjsga00nj',
    inscriptions: [],
  },
  {
    txId: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b275',
    outputIndex: 0,
    satoshis: 50000,
    confirmations: 3,
    scriptPk:
      'b7fbbedbe61b51bf4e41e3517b8232f31c64f3b67ffd2d8eecff12fc7db4cae5',
    address: 'bc1pklamaklxrdgm7njpudghhq3j7vwxfuak0l7jmrhvluf0cld5etjsga00nj',
    inscriptions: [],
  },
]

const testEsploraUtxos: EsploraUtxo[] = [
  {
    txid: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b274',
    vout: 2,
    status: {
      confirmed: true,
      block_height: 280,
      block_hash:
        '519a8fa6b439da658a83b231486958a26c76ca92811d1e5cc7bcb94bd574c20f',
      block_time: 1719240702,
    },
    value: 100000,
  },
  {
    txid: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b275',
    vout: 0,
    status: {
      confirmed: true,
      block_height: 280,
      block_hash:
        '519a8fa6b439da658a83b231486958a26c76ca92811d1e5cc7bcb94bd574c20f',
      block_time: 1719240701,
    },
    value: 50000,
  },
  {
    txid: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b276',
    vout: 1,
    status: {
      confirmed: true,
      block_height: 280,
      block_hash:
        '519a8fa6b439da658a83b231486958a26c76ca92811d1e5cc7bcb94bd574c20f',
      block_time: 1719240703,
    },
    value: 25000,
  },
  {
    txid: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b277',
    vout: 1,
    status: {
      confirmed: true,
      block_height: 280,
      block_hash:
        '519a8fa6b439da658a83b231486958a26c76ca92811d1e5cc7bcb94bd574c20f',
      block_time: 1719240704,
    },
    value: 546,
  },
]

const testOrdTxOutputs = [
  {
    address: 'bc1pklamaklxrdgm7njpudghhq3j7vwxfuak0l7jmrhvluf0cld5etjsga00nj',
    indexed: true,
    inscriptions: [],
    runes: [],
    sat_ranges: [[1956902243257152, 1956902243257698]],
    script_pubkey:
      'OP_PUSHNUM_1 OP_PUSHBYTES_32 b7fbbedbe61b51bf4e41e3517b8232f31c64f3b67ffd2d8eecff12fc7db4cae5',
    spent: false,
    transaction:
      '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b275',
    value: 100000,
  },
  {
    address: 'bc1pklamaklxrdgm7njpudghhq3j7vwxfuak0l7jmrhvluf0cld5etjsga00nj',
    indexed: true,
    inscriptions: [],
    runes: [],
    sat_ranges: [[1956902243257152, 1956902243257698]],
    script_pubkey:
      'OP_PUSHNUM_1 OP_PUSHBYTES_32 b7fbbedbe61b51bf4e41e3517b8232f31c64f3b67ffd2d8eecff12fc7db4cae5',
    spent: false,
    transaction:
      '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b276',
    value: 50000,
  },
  {
    address: 'bc1pklamaklxrdgm7njpudghhq3j7vwxfuak0l7jmrhvluf0cld5etjsga00nj',
    indexed: true,
    inscriptions: [
      'e605df4731c8773902dd6f56bfbec815db26d530da00dbdc697e35a992269987i0',
    ],
    runes: [],
    sat_ranges: [[1956902243257152, 1956902243257698]],
    script_pubkey:
      'OP_PUSHNUM_1 OP_PUSHBYTES_32 b7fbbedbe61b51bf4e41e3517b8232f31c64f3b67ffd2d8eecff12fc7db4cae5',
    spent: false,
    transaction:
      '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b277',
    value: 25000,
  },
  {
    address: 'bc1pklamaklxrdgm7njpudghhq3j7vwxfuak0l7jmrhvluf0cld5etjsga00nj',
    indexed: true,
    inscriptions: [],
    runes: [],
    sat_ranges: [[1956902243257152, 1956902243257698]],
    script_pubkey:
      'OP_PUSHNUM_1 OP_PUSHBYTES_32 b7fbbedbe61b51bf4e41e3517b8232f31c64f3b67ffd2d8eecff12fc7db4cae5',
    spent: false,
    transaction:
      '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b277',
    value: 546,
  },
]

const testEsploraTxInfo = [
  {
    txid: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b275',
    version: 2,
    locktime: 0,
    vin: [
      {
        txid: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b274',
        vout: 0,
        prevout: {
          scriptpubkey: '0014c0cebcd6c3d3ca8c75dc5ec62ebe55330ef910e2',
          scriptpubkey_asm:
            'OP_0 OP_PUSHBYTES_20 c0cebcd6c3d3ca8c75dc5ec62ebe55330ef910e2',
          scriptpubkey_type: 'v0_p2wpkh',
          scriptpubkey_address: 'bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx',
          value: 300000,
        },
        scriptsig: '',
        scriptsig_asm: '',
        witness: [
          '3045022100fdddd5d50b61198bedbde29f784ac80b162251b4bc7d7b20f0690b7290b38101022048f2a03454278fd1e66d559630bc8959c3579c067851cd9c168474515cd6f6f101',
          '0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c',
        ],
        is_coinbase: false,
        sequence: 4294967295,
      },
    ],
    vout: [
      {
        scriptpubkey:
          'b7fbbedbe61b51bf4e41e3517b8232f31c64f3b67ffd2d8eecff12fc7db4cae5',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 b7fbbedbe61b51bf4e41e3517b8232f31c64f3b67ffd2d8eecff12fc7db4cae5',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address:
          'bc1pklamaklxrdgm7njpudghhq3j7vwxfuak0l7jmrhvluf0cld5etjsga00nj',
        value: 100000,
      },
      {
        scriptpubkey: '0014c0cebcd6c3d3ca8c75dc5ec62ebe55330ef910e2',
        scriptpubkey_asm:
          'OP_0 OP_PUSHBYTES_20 c0cebcd6c3d3ca8c75dc5ec62ebe55330ef910e2',
        scriptpubkey_type: 'v0_p2wpkh',
        scriptpubkey_address: 'bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx',
        value: 200000,
      },
    ],
    size: 261,
    weight: 714,
    fee: 302,
    status: {
      confirmed: true,
      block_height: 280,
      block_hash:
        '519a8fa6b439da658a83b231486958a26c76ca92811d1e5cc7bcb94bd574c20f',
      block_time: 1719240702,
    },
  },
  {
    txid: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b276',
    version: 2,
    locktime: 0,
    vin: [
      {
        txid: '72e22e25fa587c01cbd0a86a5727090c9cdf12e47126c99e35b24185c395b274',
        vout: 0,
        prevout: {
          scriptpubkey: '0014c0cebcd6c3d3ca8c75dc5ec62ebe55330ef910e2',
          scriptpubkey_asm:
            'OP_0 OP_PUSHBYTES_20 c0cebcd6c3d3ca8c75dc5ec62ebe55330ef910e2',
          scriptpubkey_type: 'v0_p2wpkh',
          scriptpubkey_address: 'bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx',
          value: 200000,
        },
        scriptsig: '',
        scriptsig_asm: '',
        witness: [
          '3045022100fdddd5d50b61198bedbde29f784ac80b162251b4bc7d7b20f0690b7290b38101022048f2a03454278fd1e66d559630bc8959c3579c067851cd9c168474515cd6f6f101',
          '0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c',
        ],
        is_coinbase: false,
        sequence: 4294967295,
      },
    ],
    vout: [
      {
        scriptpubkey:
          'b7fbbedbe61b51bf4e41e3517b8232f31c64f3b67ffd2d8eecff12fc7db4cae5',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 b7fbbedbe61b51bf4e41e3517b8232f31c64f3b67ffd2d8eecff12fc7db4cae5',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address:
          'bc1pklamaklxrdgm7njpudghhq3j7vwxfuak0l7jmrhvluf0cld5etjsga00nj',
        value: 50000,
      },
      {
        scriptpubkey: '0014c0cebcd6c3d3ca8c75dc5ec62ebe55330ef910e2',
        scriptpubkey_asm:
          'OP_0 OP_PUSHBYTES_20 c0cebcd6c3d3ca8c75dc5ec62ebe55330ef910e2',
        scriptpubkey_type: 'v0_p2wpkh',
        scriptpubkey_address: 'bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx',
        value: 150000,
      },
    ],
    size: 261,
    weight: 714,
    fee: 302,
    status: {
      confirmed: true,
      block_height: 280,
      block_hash:
        '519a8fa6b439da658a83b231486958a26c76ca92811d1e5cc7bcb94bd574c20f',
      block_time: 1719240702,
    },
  },
]

const mockEsploraUtxos = jest.fn().mockResolvedValue(testEsploraUtxos)
const mockOrdTxOutputs = jest
  .fn()
  .mockResolvedValueOnce(testOrdTxOutputs[0])
  .mockResolvedValueOnce(testOrdTxOutputs[1])
  .mockResolvedValueOnce(testOrdTxOutputs[2])
  .mockResolvedValueOnce(testOrdTxOutputs[3])
const mockRuneOutputs = jest
  .fn()
  .mockResolvedValueOnce(testOrdTxOutputs[0])
  .mockResolvedValueOnce(testOrdTxOutputs[1])
  .mockResolvedValueOnce(testOrdTxOutputs[2])
  .mockResolvedValueOnce(testOrdTxOutputs[3])
const mockEsploraTxInfo = jest
  .fn()
  .mockResolvedValueOnce(testEsploraTxInfo[0])
  .mockResolvedValueOnce(testEsploraTxInfo[1])

jest.mock('../provider/provider', () => {
  return {
    Provider: jest.fn().mockImplementation(() => ({
      esplora: {
        getFeeEstimates: jest.fn().mockResolvedValue({ '1': 100 }),
        getAddressUtxo: () => mockEsploraUtxos(),
        getTxInfo: () => mockEsploraTxInfo(),
      },
      ord: {
        getTxOutput: () => mockOrdTxOutputs(),
      },
      api: {
        getOutputRune: () => mockRuneOutputs(),
      },
    })),
  }
})

describe('utxo', () => {
  it('addressSpendableUtxos', async () => {
    const result = await addressSpendableUtxos({
      address: 'bc1pklamaklxrdgm7njpudghhq3j7vwxfuak0l7jmrhvluf0cld5etjsga00nj',
      provider: provider,
    })
    expect(result.utxos).toEqual(testFormattedUtxos)
    expect(result.totalAmount).toEqual(150000)
  })
})
