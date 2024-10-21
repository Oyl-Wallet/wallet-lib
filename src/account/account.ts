import * as bitcoin from 'bitcoinjs-lib'
import ecc from '@bitcoinerlab/secp256k1'
import { BIP32Factory } from 'bip32'
const bip32 = BIP32Factory(ecc)
import * as bip39 from 'bip39'
bitcoin.initEccLib(ecc)
import * as dotenv from 'dotenv'
dotenv.config()

export type Account = {
  taproot: {
    pubkey: string
    pubKeyXOnly: string
    address: string
  }
  nativeSegwit: {
    pubkey: string
    address: string
  }
  nestedSegwit: {
    pubkey: string
    address: string
  }
  legacy: {
    pubkey: string
    address: string
  }
  spendStrategy: SpendStrategy
  network: bitcoin.Network
}

export type AddressKey = 'nativeSegwit' | 'taproot' | 'nestedSegwit' | 'legacy'

export interface SpendStrategy {
  addressOrder: AddressKey[]
  utxoSortGreatestToLeast: boolean
  changeAddress: AddressKey
}
export interface MnemonicToAccountOptions {
  network?: bitcoin.networks.Network
  index?: number
  spendStrategy?: SpendStrategy
}
export const generateMnemonic = () => {
  return bip39.generateMnemonic()
}
export const validateMnemonic = (mnemonic: string) => {
  return bip39.validateMnemonic(mnemonic)
}
export const mnemonicToAccount = ({
  mnemonic = generateMnemonic(),
  opts,
}: {
  mnemonic?: string
  opts?: MnemonicToAccountOptions
}) => {
  const options = {
    network: opts?.network ? opts.network : bitcoin.networks.bitcoin,
    index: opts?.index ? opts.index : 0,
    spendStrategy: {
      addressOrder: opts?.spendStrategy?.addressOrder
        ? opts.spendStrategy.addressOrder
        : ([
            'nativeSegwit',
            'nestedSegwit',
            'legacy',
            'taproot',
          ] as AddressKey[]),
      utxoSortGreatestToLeast:
        opts?.spendStrategy?.utxoSortGreatestToLeast !== undefined
          ? opts.spendStrategy.utxoSortGreatestToLeast
          : true,
      changeAddress: opts?.spendStrategy?.changeAddress
        ? opts?.spendStrategy?.changeAddress
        : 'nativeSegwit',
    },
  }

  const account = generateWallet({
    mnemonic,
    opts: options,
  })
  return account as Account
}

export const generateWallet = ({
  mnemonic,
  opts,
}: {
  mnemonic?: string
  opts: MnemonicToAccountOptions
}) => {
  const toXOnly = (pubKey: Buffer) =>
    pubKey.length === 32 ? pubKey : pubKey.slice(1, 33)

  if (!mnemonic) {
    throw Error('mnemonic not given')
  }

  let pathLegacy = `m/44'/0'/0'/0/${opts.index}`
  let pathSegwitNested = `m/49'/0'/0'/0/${opts.index}`
  let pathSegwit = `m/84'/0'/0'/0/${opts.index}`
  let pathTaproot = `m/86'/0'/0'/0/${opts.index}`
  //unisat accomadation
  if (opts.network === bitcoin.networks.testnet) {
    pathLegacy = `m/44'/1'/0'/0/${opts.index}`
    pathSegwitNested = `m/49'/1'/0'/0/${opts.index}`
    pathSegwit = `m/84'/1'/0'/0/${opts.index}`
    pathTaproot = `m/86'/1'/0'/0/${opts.index}`
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const root = bip32.fromSeed(seed)

  // Legacy
  const childLegacy = root.derivePath(pathLegacy)
  const pubkeyLegacy = childLegacy.publicKey
  const addressLegacy = bitcoin.payments.p2pkh({
    pubkey: pubkeyLegacy,
    network: opts.network,
  })
  const legacy = {
    pubkey: pubkeyLegacy.toString('hex'),
    address: addressLegacy.address,
  }

  // Nested Segwit
  const childSegwitNested = root.derivePath(pathSegwitNested)
  const pubkeySegwitNested = childSegwitNested.publicKey
  const addressSegwitNested = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2wpkh({
      pubkey: pubkeySegwitNested,
      network: opts.network,
    }),
  })
  const nestedSegwit = {
    pubkey: pubkeySegwitNested.toString('hex'),
    address: addressSegwitNested.address,
  }

  // Native Segwit
  const childSegwit = root.derivePath(pathSegwit)
  const pubkeySegwit = childSegwit.publicKey
  const addressSegwit = bitcoin.payments.p2wpkh({
    pubkey: pubkeySegwit,
    network: opts.network,
  })
  const nativeSegwit = {
    pubkey: pubkeySegwit.toString('hex'),
    address: addressSegwit.address,
  }

  // Taproot
  const childTaproot = root.derivePath(pathTaproot)
  const pubkeyTaproot = childTaproot.publicKey
  const pubkeyTaprootXOnly = toXOnly(pubkeyTaproot)

  const addressTaproot = bitcoin.payments.p2tr({
    internalPubkey: pubkeyTaprootXOnly,
    network: opts.network,
  })
  const taproot = {
    pubkey: pubkeyTaproot.toString('hex'),
    pubKeyXOnly: pubkeyTaprootXOnly.toString('hex'),
    address: addressTaproot.address,
  }

  return {
    taproot,
    nativeSegwit,
    nestedSegwit,
    legacy,
    spendStrategy: opts.spendStrategy,
    network: opts.network,
  }
}

export const getWalletPrivateKeys = ({
  mnemonic,
  opts,
}: {
  mnemonic: string
  opts?: MnemonicToAccountOptions
}) => {
  const options = {
    network: opts?.network ? opts.network : bitcoin.networks.bitcoin,
    index: opts?.index ? opts.index : 0,
  }

  let pathLegacy = `m/44'/0'/0'/0/${options.index}`
  let pathSegwitNested = `m/49'/0'/0'/0/${options.index}`
  let pathSegwit = `m/84'/0'/0'/0/${options.index}`
  let pathTaproot = `m/86'/0'/0'/0/${options.index}`
  //unisat accomadation
  if (options.network === bitcoin.networks.testnet) {
    pathLegacy = `m/44'/1'/0'/0/${options.index}`
    pathSegwitNested = `m/49'/1'/0'/0/${options.index}`
    pathSegwit = `m/84'/1'/0'/0/${options.index}`
    pathTaproot = `m/86'/1'/0'/0/${options.index}`
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const root = bip32.fromSeed(seed)

  // Legacy
  const childLegacy = root.derivePath(pathLegacy)
  const privateKeyLegacy = childLegacy.privateKey!
  const legacy = {
    privateKey: privateKeyLegacy.toString('hex'),
  }

  // Nested Segwit
  const childSegwitNested = root.derivePath(pathSegwitNested)
  const privateKey = childSegwitNested.privateKey!
  const nestedSegwit = {
    privateKey: privateKey.toString('hex'),
  }

  // Native Segwit
  const childSegwit = root.derivePath(pathSegwit)
  const privateKeySegwit = childSegwit.privateKey!

  const nativeSegwit = {
    privateKey: privateKeySegwit.toString('hex'),
  }

  // Taproot
  const childTaproot = root.derivePath(pathTaproot)
  const privateKeyTaproot = childTaproot.privateKey!

  const taproot = {
    privateKey: privateKeyTaproot.toString('hex'),
  }

  return {
    taproot,
    nativeSegwit,
    nestedSegwit,
    legacy,
  }
}
