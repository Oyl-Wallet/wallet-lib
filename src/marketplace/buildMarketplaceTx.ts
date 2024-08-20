import { assertHex, getSatpointFromUtxo } from '../shared/utils'
import { getAddressType } from '../shared/utils'
import { MarketplaceBuy, AddressType } from '../shared/interface'
import * as bitcoin from 'bitcoinjs-lib'
import { OylApiClient } from 'apiclient'
import { EsploraRpc } from 'rpclient/esplora'
import { SandshrewBitcoinClient } from 'rpclient/sandshrew'

export class BuildMarketplaceTransaction {
  public walletAddress: string
  public pubKey: string
  public api: OylApiClient
  public esplora: EsploraRpc
  public psbtBase64: string
  public orderPrice: number
  public sandshrew: SandshrewBitcoinClient
  public makersAddress: string | null
  public takerScript: string
  public network: bitcoin.Network
  public addressType: AddressType
  public receiveAddress: string

  constructor({
    address,
    pubKey,
    receiveAddress,
    psbtBase64,
    price,
    provider,
  }: MarketplaceBuy) {
    this.walletAddress = address
    this.pubKey = pubKey
    this.receiveAddress = receiveAddress
    this.api = provider.api
    this.esplora = provider.esplora
    this.sandshrew = provider.sandshrew
    this.psbtBase64 = psbtBase64
    this.orderPrice = price
    this.network = provider.network
    this.addressType = getAddressType(this.walletAddress)
    switch (this.addressType) {
      case AddressType.P2TR: {
        const tapInternalKey = assertHex(Buffer.from(this.pubKey, 'hex'))
        const p2tr = bitcoin.payments.p2tr({
          internalPubkey: tapInternalKey,
          network: this.network,
        })
        this.takerScript = p2tr.output?.toString('hex')
        break
      }
      case AddressType.P2WPKH: {
        const p2wpkh = bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(this.pubKey, 'hex'),
          network: this.network,
        })
        this.takerScript = p2wpkh.output?.toString('hex')
        break
      }
    }
  }

  async getUTXOsToCoverAmount(
    amountNeeded: number,
    inscriptionLocs?: string[]
  ) {
    try {
      console.log(
        '=========== Getting Unspents for address in order by value ========'
      )
      const unspentsOrderedByValue =
        await this.getUnspentsForAddressInOrderByValue()
      console.log('unspentsOrderedByValue len:', unspentsOrderedByValue.length)
      console.log(
        '=========== Getting Collectibles for address ' +
          this.walletAddress +
          '========'
      )
      const retrievedIxs = (
        await this.api.getCollectiblesByAddress(this.walletAddress)
      ).data
      console.log('=========== Collectibles:', retrievedIxs.length)
      console.log('=========== Gotten Collectibles, splitting utxos ========')
      const bisInscriptionLocs = retrievedIxs.map(
        (utxo) => utxo.satpoint
      ) as string[]

      if (bisInscriptionLocs.length === 0) {
        inscriptionLocs = []
      } else {
        inscriptionLocs = bisInscriptionLocs
      }

      let sum = 0
      const result: any = []
      for await (let utxo of unspentsOrderedByValue) {
        const currentUTXO = utxo
        const utxoSatpoint = getSatpointFromUtxo(currentUTXO)
        if (
          (inscriptionLocs &&
            inscriptionLocs?.find(
              (utxoLoc: any) => utxoLoc === utxoSatpoint
            )) ||
          currentUTXO.value <= 546
        ) {
          continue
        }
        sum += currentUTXO.value
        result.push(currentUTXO)
        if (sum > amountNeeded) {
          console.log('AMOUNT RETRIEVED: ', sum)
          return result
        }
      }

      return []
    } catch (e: any) {
      throw new Error(e)
    }
  }

  async isWalletPrepared() {
    const allUtxosWorth600 = await this.getAllUTXOsWorthASpecificValue(600)
    if (allUtxosWorth600.length < 2) {
      return false
    }
    return true
  }

  async prepareWallet() {
    const requiredSatoshis = 10000 + 1200
    const retrievedUtxos = await this.getUTXOsToCoverAmount(requiredSatoshis)
    if (retrievedUtxos.length === 0) {
      throw Error('Not enough funds to prepare address utxos')
    }
    const prepareTx = new bitcoin.Psbt({ network: this.network })
    console.log('=========== Retreived Utxos to add: ', retrievedUtxos)
    retrievedUtxos.forEach((utxo) => {
      const input = this.addInputConditionally({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          value: utxo.value,
          script: Buffer.from(this.takerScript, 'hex'),
        },
      })
      prepareTx.addInput(input)
    })
    const amountRetrieved = this.calculateAmountGathered(retrievedUtxos)
    const remainder = amountRetrieved - 30000 - 1200
    prepareTx.addOutput({
      address: this.walletAddress,
      value: 600,
    })
    prepareTx.addOutput({
      address: this.walletAddress,
      value: 600,
    })
    prepareTx.addOutput({
      address: this.walletAddress,
      value: remainder,
    })

    return {
      psbtHex: prepareTx.toHex(),
      psbtBase64: prepareTx.toBase64(),
      remainder,
    }
  }

  async checkAffordability(costEstimate) {
    const retrievedUtxos = await this.getUTXOsToCoverAmount(costEstimate)
    if (retrievedUtxos.length === 0) {
      return false
    }
    return true
  }

  async psbtBuilder() {
    console.log('=========== Decoding PSBT with bitcoinjs ========')
    const marketplacePsbt = bitcoin.Psbt.fromBase64(this.psbtBase64, {
      network: this.network,
    })
    const costPrice = this.orderPrice
    const requiredSatoshis = costPrice + 30000 + 546 + 1200 + 600 + 600
    const retrievedUtxos = await this.getUTXOsToCoverAmount(requiredSatoshis)
    if (retrievedUtxos.length === 0) {
      throw Error('Not enough funds to purchase this offer')
    }

    console.log('=========== Getting UTXOS Worth 600 sats ========')
    const allUtxosWorth600 = await this.getAllUTXOsWorthASpecificValue(600)
    console.log('=========== UTXOs worth 600 sats: ', allUtxosWorth600)
    if (allUtxosWorth600.length < 2) {
      throw Error('not enough padding utxos (600 sat) for marketplace buy')
    }

    console.log("=========== Getting Maker's Address ========")
    await this.getMakersAddress()
    console.log('=========== Makers Address: ', this.makersAddress)
    if (!this.makersAddress) {
      throw Error("Could not resolve maker's address")
    }

    console.log('=========== Creating Inputs ========')
    const swapPsbt = new bitcoin.Psbt({ network: this.network })
    console.log('=========== Adding dummy utxos ========')
    for (let i = 0; i < 2; i++) {
      const input = this.addInputConditionally({
        hash: allUtxosWorth600[i].txid,
        index: allUtxosWorth600[i].vout,
        witnessUtxo: {
          value: allUtxosWorth600[i].value,
          script: Buffer.from(this.takerScript, 'hex'),
        },
      })

      swapPsbt.addInput(input)
    }

    console.log('=========== Fetching Maker Input Data ========')
    const decoded = await this.sandshrew.bitcoindRpc.decodePSBT(this.psbtBase64)
    console.log('maker offer txid', decoded.tx.vin[2].txid)
    const makerInputData = marketplacePsbt.data.inputs[2]
    console.log('=========== Maker Input Data: ', makerInputData)
    swapPsbt.addInput({
      hash: decoded.tx.vin[2].txid,
      index: 0,
      witnessUtxo: {
        value: makerInputData?.witnessUtxo?.value,
        script: makerInputData?.witnessUtxo?.script as Buffer,
      },
      // tapInternalKey: makerInputData.tapInternalKey,
      // tapKeySig: makerInputData.tapKeySig,
      finalScriptWitness: makerInputData.finalScriptWitness,
      sighashType:
        bitcoin.Transaction.SIGHASH_SINGLE |
        bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    })

    console.log(
      '=========== Adding available non ordinal UTXOS as input ========'
    )
    console.log('=========== Retreived Utxos to add: ', retrievedUtxos)
    retrievedUtxos.forEach((utxo) => {
      const input = this.addInputConditionally({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          value: utxo.value,
          script: Buffer.from(this.takerScript, 'hex'),
        },
      })
      swapPsbt.addInput(input)
    })

    console.log('=========== Done Inputs now adding outputs ============')
    swapPsbt.addOutput({
      address: this.walletAddress,
      value: 1200,
    })
    swapPsbt.addOutput({
      address: this.receiveAddress,
      value: 546,
    })
    swapPsbt.addOutput({
      address: this.makersAddress,
      value: costPrice,
    })
    const amountRetrieved = this.calculateAmountGathered(retrievedUtxos)
    const remainder =
      amountRetrieved - costPrice - 30000 - 546 - 1200 - 600 - 600
    swapPsbt.addOutput({
      address: this.walletAddress,
      value: 600,
    })
    swapPsbt.addOutput({
      address: this.walletAddress,
      value: 600,
    })
    swapPsbt.addOutput({
      address: this.walletAddress,
      value: remainder,
    })
    console.log('=========== Returning unsigned PSBT ============')
    return {
      psbtHex: swapPsbt.toHex(),
      psbtBase64: swapPsbt.toBase64(),
      remainder,
    }
  }

  async psbtMultiBuilder(previousOrderTxId, remainingSats: number) {
    const requiredSatoshis = this.orderPrice + 30000 + 546 + 1200
    if (!(remainingSats > requiredSatoshis)) {
      throw new Error('Not enough satoshi to complete purchase')
    }
    const marketplacePsbt = bitcoin.Psbt.fromBase64(this.psbtBase64, {
      network: this.network,
    })
    const swapPsbt = new bitcoin.Psbt({ network: this.network })

    swapPsbt.addInput(
      this.addInputConditionally({
        hash: previousOrderTxId,
        index: 3,
        witnessUtxo: {
          value: 600,
          script: Buffer.from(this.takerScript, 'hex'),
        },
      })
    )
    swapPsbt.addInput(
      this.addInputConditionally({
        hash: previousOrderTxId,
        index: 4,
        witnessUtxo: {
          value: 600,
          script: Buffer.from(this.takerScript, 'hex'),
        },
      })
    )
    console.log("=========== Getting Maker's Address ========")
    await this.getMakersAddress()
    console.log('=========== Makers Address: ', this.makersAddress)
    if (!this.makersAddress) {
      throw Error("Could not resolve maker's address")
    }
    const decoded = await this.sandshrew.bitcoindRpc.decodePSBT(this.psbtBase64)
    const makerInputData = marketplacePsbt.data.inputs[2]
    const neededSats = marketplacePsbt.txOutputs[2].value
    swapPsbt.addInput({
      hash: decoded.tx.vin[2].txid,
      index: 0,
      witnessUtxo: {
        value: makerInputData?.witnessUtxo?.value as number,
        script: makerInputData?.witnessUtxo?.script as Buffer,
      },
      // tapInternalKey: makerInputData.tapInternalKey,
      // tapKeySig: makerInputData.tapKeySig,
      finalScriptWitness: makerInputData.finalScriptWitness,
      sighashType:
        bitcoin.Transaction.SIGHASH_SINGLE |
        bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    })
    swapPsbt.addInput(
      this.addInputConditionally({
        hash: previousOrderTxId,
        index: 5,
        witnessUtxo: {
          value: remainingSats,
          script: Buffer.from(this.takerScript, 'hex'),
        },
        tapInternalKey: assertHex(Buffer.from(this.pubKey, 'hex')),
      })
    )
    swapPsbt.addOutput({
      address: this.walletAddress,
      value: 1200,
    })
    swapPsbt.addOutput({
      address: this.receiveAddress,
      value: 546,
    })
    swapPsbt.addOutput({
      address: this.makersAddress,
      value: neededSats,
    })
    swapPsbt.addOutput({
      address: this.walletAddress,
      value: 600,
    })
    swapPsbt.addOutput({
      address: this.walletAddress,
      value: 600,
    })
    const remainder = remainingSats - neededSats - 30000 - 546 - 1200
    swapPsbt.addOutput({
      address: this.walletAddress,
      value: remainder,
    })
    return {
      psbtHex: swapPsbt.toHex(),
      psbtBase64: swapPsbt.toBase64(),
      remainingSats: remainder,
    }
  }

  async getAllUTXOsWorthASpecificValue(value: number) {
    const unspents = await this.getUnspentsForAddress()
    console.log('=========== Confirmed/Unconfirmed Utxos Len', unspents.length)
    return unspents.filter((utxo) => utxo.value === value)
  }

  calculateAmountGathered(utxoArray: any) {
    return utxoArray?.reduce(
      (prev, currentValue) => prev + currentValue.value,
      0
    )
  }

  async getUnspentsForAddress() {
    try {
      '=========== Getting all confirmed/unconfirmed utxos for ' +
        this.walletAddress +
        ' ============'
      return await this.esplora
        .getAddressUtxo(this.walletAddress)
        .then((unspents) => unspents?.filter((utxo) => utxo.value > 546))
    } catch (e: any) {
      throw new Error(e)
    }
  }

  async getUnspentsForAddressInOrderByValue() {
    const unspents = await this.getUnspentsForAddress()
    console.log('=========== Confirmed Utxos len', unspents.length)
    return unspents.sort((a, b) => b.value - a.value)
  }

  async getMakersAddress() {
    const swapTx = await this.sandshrew.bitcoindRpc.decodePSBT(this.psbtBase64)
    const outputs = swapTx.tx.vout
    console.log('outputs', outputs)
    this.makersAddress = outputs[2].scriptPubKey.address
    // for (var i = 0; i < outputs.length; i++) {
    //   if (outputs[i].value == this.orderPrice / 100000000) {
    //     this.makersAddress = outputs[i].scriptPubKey.address
    //   }
    // }
  }

  addInputConditionally(inputData) {
    if (this.addressType === AddressType.P2TR) {
      inputData['tapInternalKey'] = assertHex(Buffer.from(this.pubKey, 'hex'))
    }
    return inputData
  }
}
