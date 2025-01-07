
import * as bitcoin from 'bitcoinjs-lib'
import { Provider } from '..'

export const DEFAULT_PROVIDER = {
  bitcoin: new Provider({
    url: 'https://mainnet.sandshrew.io',
    version: 'v2',
    projectId: process.env.SANDSHREW_PROJECT_ID!,
    network: bitcoin.networks.bitcoin,
    networkType: 'mainnet',
    apiUrl: 'https://staging-api.oyl.gg',
  }),
  regtest: new Provider({
    url: 'http://localhost:3000',
    projectId: 'regtest',
    network: bitcoin.networks.regtest,
    networkType: 'regtest',
    apiUrl: 'https://staging-api.oyl.gg',
  }),
}

export const REGTEST_FAUCET = {
  mnemonic: 'hub dinosaur mammal approve riot rebel library legal sick discover loop alter',
  nativeSegwit: {
    address: 'bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv',
    publicKey: '03d3af89f242cc0df1d7142e9a354a59b1cd119c12c31ff226b32fb77fa12acce2'
  },
  taproot: {
    address: 'bcrt1p45un5d47hvfhx6mfezr6x0htpanw23tgll7ppn6hj6gfzu3x3dnsaegh8d',
    publicKey: '022ffc336daa8196f1aa796135a568b1125ba08c2879c22468effea8e4a0c4c8b9',
  }
}

export const TEST_WALLET = {
  mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  nativeSegwit: {
    address: 'bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx',
    publicKey: ''
  },
  taproot: {
    address: 'bcrt1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqvg32hk',
    publicKey: '',
  }
}