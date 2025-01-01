import * as bitcoin from 'bitcoinjs-lib'
import {  
  mnemonicToAccount,
  getWalletPrivateKeys,
  Provider,
  Account,
  Signer
} from '..'

const defaultMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

export const defaultProvider = {
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

export type NetworkType = 'mainnet' | 'regtest'

export interface WalletOptions {
  mnemonic?: string
  networkType?: NetworkType
  feeRate?: number
}

export class Wallet {
  mnemonic: string
  networkType: string
  provider: Provider
  account: Account
  signer: Signer
  feeRate: number

  constructor(options?: WalletOptions) {

    this.mnemonic = options?.mnemonic ? options?.mnemonic : defaultMnemonic;
    this.networkType = options?.networkType ? options?.networkType : 'regtest';
    this.provider = defaultProvider[this.networkType];

    this.account = mnemonicToAccount({
      mnemonic: this.mnemonic,
      opts: {
        network: this.provider.network
      }
    })

    const privateKeys = getWalletPrivateKeys({
      mnemonic: this.mnemonic,
      opts: {
        network: this.account.network
      }
    })

    this.signer = new Signer(this.account.network, {
        taprootPrivateKey: privateKeys.taproot.privateKey,
        segwitPrivateKey: privateKeys.nativeSegwit.privateKey,
        nestedSegwitPrivateKey: privateKeys.nestedSegwit.privateKey,
        legacyPrivateKey: privateKeys.legacy.privateKey
      })

      this.feeRate = options?.feeRate ? options?.feeRate : 2

  }
}