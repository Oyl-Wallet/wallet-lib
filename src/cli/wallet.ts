import {  
  mnemonicToAccount,
  getWalletPrivateKeys,
  Provider,
  Account,
  Signer
} from '..'
import { 
  TEST_WALLET,
  DEFAULT_PROVIDER
} from './constants'


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

    this.mnemonic = options?.mnemonic || TEST_WALLET.mnemonic;
    this.networkType = options?.networkType || 'regtest';
    this.provider = DEFAULT_PROVIDER[this.networkType];

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