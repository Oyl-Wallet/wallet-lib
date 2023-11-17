/*
*
*
The  parent key should be able to be derived sequentially. The UI can select/change
the path parameters (e.g "44"/"49"/"86")
// */
import * as bitcoin from 'bitcoinjs-lib'
import { HdKeyring } from './hdKeyring'
import { AddressType } from '../shared/interface'

export function createWallet(hdPathString: string, type: AddressType) {
  // Create a new instance of HdKeyring with the provided hdPathString
  const keyring = new HdKeyring({ hdPath: hdPathString })
  // Add a single account to the keyring
  keyring.addAccounts(1)
  // Get the first account public key
  const accounts = keyring.getAccounts()
  const pubkey = accounts[0]
  const address = publicKeyToAddress(pubkey, type)
  if (address == null) throw Error('Invalid publickey or address type')
  const fullPayload = {}
  fullPayload['keyring'] = keyring
  fullPayload['address'] = address
  //TO-DO - check return value of fullPayload so you dont have wallet.keyring.keyring
  return fullPayload
}

export function publicKeyToAddress(publicKey: string, type: AddressType) {
  const network = bitcoin.networks.bitcoin
  if (!publicKey) return null
  const pubkey = Buffer.from(publicKey, 'hex')
  if (type === AddressType.P2PKH) {
    const { address } = bitcoin.payments.p2pkh({
      pubkey,
      network,
    })
    return address || null
  } else if (type === AddressType.P2WPKH) {
    const { address } = bitcoin.payments.p2wpkh({
      pubkey,
      network,
    })
    return address || null
  } else if (type === AddressType.P2SH_P2WPKH) {
    const { address } = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey: pubkey }),
    })
    return address || null
  } else if (type === AddressType.P2TR) {
    const { address } = bitcoin.payments.p2tr({
      internalPubkey: pubkey.slice(1, 33),
      network,
    })
    return address || null
  } else {
    return null
  }
}

export function isValidAddress(
  address: string,
  network: bitcoin.Network = bitcoin.networks.bitcoin
) {
  let error
  try {
    bitcoin.address.toOutputScript(address, network)
  } catch (e) {
    error = e
  }
  if (error) {
    return false
  } else {
    return true
  }
}

export async function importMnemonic(
  mnemonic: string,
  path: string,
  type: AddressType
) {
  const keyring = await new HdKeyring({ mnemonic: mnemonic, hdPath: path })
  // Add a single account to the keyring
  await keyring.addAccounts(1)
  // Get the first account public key
  const accounts = await keyring.getAccounts()
  //console.log(accounts);
  const pubkey = accounts[0]
  const address = publicKeyToAddress(pubkey, type)
  if (address == null) throw Error('Invalid publickey or address type')
  const fullPayload = {}
  fullPayload['keyring'] = keyring
  fullPayload['address'] = address
  return fullPayload
}
