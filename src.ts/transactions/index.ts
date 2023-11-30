import fetch from 'node-fetch'
import * as bitcoin from 'bitcoinjs-lib'
import { AddressType, IBlockchainInfoUTXO } from '../shared/interface'

/**
 *
 Returns from https://www.blockchain.com/explorer/api/blockchain_api.
 One way UTXOs can be gotten directly from the node is with RPC command - 'gettxout'
 However this accepts a single transaction as a parameter, making it impratical to use
 directly when getting UTXOs by address/public key. The best idea will be to index the
 all UTXOs from the blockchain in a db (just like with wallets and transactions on bcoin)
 and extend the bcoin RPC server. To return the nodes.
 Also consider - if this is a client wallet that can be run with a custom server, there will
 need to be a default alternative outside Oyl Api (e.g the blockchainApi)
 *
 */

export const getUnspentOutputs = async (address) => {
  try {
    const response = await fetch(
      `https://blockchain.info/unspent?active=${address}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch unspent output for address ${address}`)
    }

    const jsonResponse = await response.json()

    return jsonResponse
  } catch (error) {
    console.log(error)
  }
}

export const getBtcPrice = async () => {
  try {
    const response = await fetch(`https://blockchain.info/ticker`, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch btc price from binance`)
    }

    const jsonResponse = await response.json()

    return jsonResponse
  } catch (error) {
    console.log(Error)
  }
}

export const calculateBalance = function (utxos): number {
  let balance = 0
  for (let utxo = 0; utxo < utxos.length; utxo++) {
    balance += utxos[utxo].value
  }
  return balance / 1e8 // Convert from satoshis to BTC
}

export const convertUsdValue = async (amount) => {
  const pricePayload = await getBtcPrice()
  const btcPrice = parseFloat(pricePayload.USD.last)
  const amountInBTC = parseFloat(amount) * btcPrice
  return amountInBTC.toFixed(2)
}

export const getMetaUtxos = async (
  address: string,
  utxos: IBlockchainInfoUTXO[],
  inscriptions
) => {
  const formattedData = []

  for (const utxo of utxos) {
    const formattedUtxo = {
      txId: utxo.tx_hash_big_endian,
      outputIndex: utxo.tx_output_n,
      satoshis: utxo.value,
      scriptPk: utxo.script,
      addressType: getAddressType(address),
      address: address,
      inscriptions: [],
    }

    for (const inscription of inscriptions) {
      if (inscription.detail.location.includes(utxo.tx_hash_big_endian)) {
        formattedUtxo.inscriptions.push(inscription.detail)
      } else {
      }
    }

    formattedData.push(formattedUtxo)
  }

  return formattedData
}

export function getAddressType(address: string): AddressType | null {
  if (address.startsWith('1')) {
    return 0
  } else if (address.startsWith('bc1p')) {
    return 1
  } else if (address.startsWith('3')) {
    return 2
  } else if (address.startsWith('bc1q')) {
    return 3
  } else {
    return null // If the address doesn't match any known type
  }
}

export const validateTaprootAddress = ({ address, type }) => {
  try {
    const decodedBech32 = bitcoin.address.fromBech32(address)
    if (decodedBech32.version === 1 && decodedBech32.data.length === 32) {
      return type === 'taproot'
    }
  } catch (error) {
    // Address is not in Bech32 format
    return false
  }

  return false
}

export const validateSegwitAddress = ({ address, type }) => {
  try {
    const decodedBech32 = bitcoin.address.fromBech32(address)
    if (decodedBech32.version === 0) {
      return type === 'segwit'
    }
  } catch (error) {
    // Address is not in Bech32 format
    return false
  }

  return false
}
