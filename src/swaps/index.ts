import {
    getAddressType,
    AddressType,
    getNetwork,
    timeout,
    getSatpointFromUtxo,
    assertHex,
  } from '..'
  import { BuildMarketplaceTransaction } from './buildMarketplaceTx'
  import * as bitcoin from 'bitcoinjs-lib'
  import {
    AssetType,
    ExternalSwap,
    MarketplaceAccount,
    MarketplaceOffer,
    OkxBid,
    SignedBid,
    SwapPayload,
  } from '../shared/interface'
  import { Signer } from '../signer'
  import {
    genSignedBuyingPSBTWithoutListSignature,
    networks,
    BuyingData,
  } from '@okxweb3/coin-bitcoin'
  import { signBip322Message } from './BIP322'
  import { OylTransactionError } from '../errors'
  import { Provider } from 'provider/provider'
  import { Account } from '@account/account'
  
  export class Trade {
    private provider: Provider
    private receiveAddress: string
    private selectedSpendAddress: string | null
    private selectedSpendPubkey: string | null
    private account: Account
    private signer: Signer
    public assetType: AssetType
    public feeRate: number
    public txIds: string[]
    public takerScript: string
    public addressesBound: boolean = false
  
    constructor(options: MarketplaceAccount) {
      this.provider = options.provider
      this.receiveAddress = options.receiveAddress
      this.account = options.account
      this.assetType = options.assetType
      this.signer = options.signer
      this.feeRate = options.feeRate
    }
  
    /**
     * Should estimate the total amount of satoshi required to execute offers including fees
     **/
    async getOffersCostEstimate(offers: MarketplaceOffer[]) {
      let costEstimate = 0
      for (let i = 0; i < offers.length; i++) {
        let offerPrice = offers[i]?.price
          ? offers[i].price
          : offers[i]?.totalPrice
        costEstimate += (offerPrice + parseInt((482 * this.feeRate).toFixed(0)))
      }
      const totalCost = costEstimate
      return totalCost
    }
  
    getScriptPubKey() {
      const addressType = getAddressType(this.selectedSpendAddress)
      switch (addressType) {
        case AddressType.P2TR: {
          const tapInternalKey = assertHex(Buffer.from(this.selectedSpendPubkey, 'hex'))
          const p2tr = bitcoin.payments.p2tr({
            internalPubkey: tapInternalKey,
            network: this.provider.network,
          })
          this.takerScript = p2tr.output?.toString('hex')
          break
        }
        case AddressType.P2WPKH: {
          const p2wpkh = bitcoin.payments.p2wpkh({
            pubkey: Buffer.from(this.selectedSpendPubkey, 'hex'),
            network: this.provider.network,
          })
          this.takerScript = p2wpkh.output?.toString('hex')
          break
        }
      }
    }
  
  
    async selectSpendAddress(offers: MarketplaceOffer[]) {
      const estimatedCost = await this.getOffersCostEstimate(offers)
      for (let i = 0; i < this.account.spendStrategy.addressOrder.length; i++) {
        if (
          this.account.spendStrategy.addressOrder[i] === 'taproot' ||
          this.account.spendStrategy.addressOrder[i] === 'nativeSegwit'
        ) {
          const address =
            this.account[this.account.spendStrategy.addressOrder[i]].address
          let pubkey: string =
            this.account[this.account.spendStrategy.addressOrder[i]].pubkey
          if (await this.canAddressAffordOffers(address, estimatedCost)) {
            this.selectedSpendAddress = address
            this.selectedSpendPubkey = pubkey
            this.getScriptPubKey();
            break
          }
        }
        if (i === this.account.spendStrategy.addressOrder.length - 1) {
          throw new OylTransactionError(
            new Error(
              'Not enough (confirmed) satoshis available to buy marketplace offers, need  ' +
              estimatedCost +
              ' sats'
            ),
            this.txIds
          )
        }
      }
    }
  
    async processMultipleBuys(
      orders,
      previousOrderTxId: string,
      remainingSats: number,
      index = 1,
      psbtBase64s: string[] = [],
      psbtHexs = [],
      txIds: string[]
    ) {
      if (index >= orders.length) {
        return { txIds, psbtHexs, psbtBase64s }
      }
      try {
        const order = orders[index]
        const marketPlaceBuy = new BuildMarketplaceTransaction({
          address: this.selectedSpendAddress,
          pubKey: this.selectedSpendPubkey,
          receiveAddress: this.receiveAddress,
          psbtBase64: order.psbtBase64,
          price: order.price,
          provider: this.provider,
          feeRate: this.feeRate
        })
        const {
          psbtBase64: filledOutBase64,
          remainingSats: updatedRemainingSats,
        } = await marketPlaceBuy.psbtMultiBuilder(
          previousOrderTxId,
          remainingSats
        )
        const psbtPayload = await this.signMarketplacePsbt(filledOutBase64, true)
        const result = await this.provider.sandshrew.bitcoindRpc.finalizePSBT(
          psbtPayload.signedPsbt
        )
        const txPayload =
          await this.provider.sandshrew.bitcoindRpc.decodeRawTransaction(
            result.hex
          )
        const txId = txPayload.txid
  
        psbtHexs.push(result.hex)
        txIds.push(txId)
  
        return await this.processMultipleBuys(
          orders,
          txId,
          updatedRemainingSats,
          index + 1,
          psbtBase64s,
          psbtHexs,
          txIds
        )
      } catch (error) {
        //skip to the next if an error occurs
        return await this.processMultipleBuys(
          orders,
          previousOrderTxId,
          remainingSats,
          index + 1,
          psbtBase64s,
          psbtHexs,
          txIds
        )
      }
    }
  
    async signMarketplacePsbt(psbt: string, finalize: boolean = false) {
      const payload = await this.signer.signAllInputs({
        rawPsbt: psbt,
        finalize,
      })
      return payload
    }
  
    async processAllOffers(offers: MarketplaceOffer[]) {
      const processedOffers = []
      this.txIds = []
      await this.selectSpendAddress(offers)
      let externalSwap = false
      const testnet = this.provider.network == getNetwork('testnet')
      for (const offer of offers) {
        if (offer.marketplace == 'omnisat') {
          let newOffer = await this.provider.api.getOmnisatOfferPsbt({
            offerId: offer.offerId,
            ticker: offer.ticker,
          })
          if (newOffer != false) {
            processedOffers.push(newOffer)
          }
        } else if (offer.marketplace == 'unisat') {
          let txId = await this.externalSwap({
            auctionId: offer.offerId,
            bidPrice: offer.totalPrice,
          })
          if (txId != null) {
            this.txIds.push(txId)
            processedOffers.push(txId)
          }
          externalSwap = true
          await timeout(10000)
        } else if (offer.marketplace == 'okx' && !testnet) {
          if (this.assetType != AssetType.RUNES) {
            const offerPsbt = await this.provider.api.getOkxOfferPsbt({
              offerId: offer.offerId,
            })
            const signedPsbt = await this.createOkxSignedPsbt(
              offerPsbt.data.sellerPsbt,
              offer.totalPrice
            )
            const payload: OkxBid = {
              ticker: offer.ticker,
              price: offer.totalPrice,
              amount: parseInt(offer.amount),
              fromAddress: this.selectedSpendAddress,
              toAddress: offer.address,
              inscriptionId: offer.inscriptionId,
              buyerPsbt: signedPsbt,
              orderId: offer.offerId,
              brc20: this.assetType == AssetType.BRC20 ? true : false
            }
            const tx = await this.provider.api.submitOkxBid(payload)
            let txId = tx?.data
            if (txId != null) {
              this.txIds.push(txId)
              processedOffers.push(txId)
            }
          } else {
            const offerPsbt = await this.provider.api.getOkxOfferPsbt({
              offerId: offer.offerId,
              rune: true
            })
            const signedPsbt = await this.buildOkxRunesPsbt(
              offerPsbt.data.sellerPsbt,
              offer.totalPrice,
              offer.address
            )
            const payload = {
              fromAddress: this.selectedSpendAddress,
              psbt: signedPsbt,
              orderId: offer.offerId,
            }
            const tx = await this.provider.api.submitOkxRuneBid(payload)
            let txId = tx?.data
            if (txId != null) {
              this.txIds.push(txId)
              processedOffers.push(txId)
            }
          }
          externalSwap = true
          await timeout(10000)
        }
      }
      if (processedOffers.length < 1) {
        throw new OylTransactionError(
          new Error('Offers  unavailable'),
          this.txIds
        )
      }
      return {
        processed: externalSwap,
        processedOffers,
      }
    }
  
    async getAssetPsbtPath(payload: SwapPayload) {
      switch (this.assetType) {
        case AssetType.BRC20:
          return await this.provider.api.initSwapBid(payload)
  
        case AssetType.RUNES:
          return await this.provider.api.initRuneSwapBid(payload)
  
        case AssetType.COLLECTIBLE:
          return await this.provider.api.initCollectionSwapBid(payload)
      }
    }
  
    async getSubmitAssetPsbtPath(payload: SignedBid) {
      switch (this.assetType) {
        case AssetType.BRC20:
          return await this.provider.api.submitSignedBid(payload)
  
        case AssetType.RUNES:
          return await this.provider.api.submitSignedRuneBid(payload)
  
        case AssetType.COLLECTIBLE:
          return await this.provider.api.submitSignedCollectionBid(payload)
  
      }
    }
  
    async externalSwap(bid: ExternalSwap) {
      const payload: SwapPayload = {
        address: this.selectedSpendAddress,
        auctionId: bid.auctionId,
        bidPrice: bid.bidPrice,
        pubKey: this.selectedSpendPubkey,
        receiveAddress: this.receiveAddress,
        feerate: this.feeRate,
      }
      if (
        this.selectedSpendAddress != this.receiveAddress &&
        !this.addressesBound
      ) {
        console.log('getting new signature')
        const signature = await this.getSignatureForBind()
        payload['signature'] = signature
        this.addressesBound = true
      }
      const psbt = await this.getAssetPsbtPath(payload)
      console.log('psbt from initiate swap', psbt)
  
      if (!psbt?.error) {
        const unsignedPsbt = psbt.psbtBid
  
        const swapOptions = bid
        swapOptions['psbt'] = unsignedPsbt
        console.log('swap-Options before signing', swapOptions)
        const signedPsbt = await this.externalSign(swapOptions)
        console.log('psbt after signing', signedPsbt)
        const data = await this.getSubmitAssetPsbtPath({
          psbtBid: signedPsbt,
          auctionId: bid.auctionId,
          bidId: psbt.bidId,
        })
        if (data.txid) return data.txid
      }
      return null
    }
  
    async buyMarketPlaceOffers(pOffers) {
      if (pOffers.processed) {
        return { txIds: this.txIds }
      }
      const offers = pOffers.processedOffers
      if (offers.length < 1)
        throw new OylTransactionError(new Error('No offers to buy'), this.txIds)
  
      const marketPlaceBuy = new BuildMarketplaceTransaction({
        address: this.selectedSpendAddress,
        pubKey: this.selectedSpendPubkey,
        receiveAddress: this.receiveAddress,
        psbtBase64: offers[0].psbtBase64,
        price: offers[0].price,
        provider: this.provider,
        feeRate: this.feeRate
      })
  
      const preparedWallet = await this.prepareAddress(marketPlaceBuy)
      await timeout(30000)
      if (!preparedWallet) {
        throw new OylTransactionError(
          new Error('Address not prepared to buy marketplace offers'),
          this.txIds
        )
      }
  
      const { psbtBase64, remainder } = await marketPlaceBuy.psbtBuilder()
      const psbtPayload = await this.signMarketplacePsbt(psbtBase64, true)
      const result = await this.provider.sandshrew.bitcoindRpc.finalizePSBT(
        psbtPayload.signedPsbt
      )
      const [broadcast] =
        await this.provider.sandshrew.bitcoindRpc.testMemPoolAccept([result.hex])
  
      if (!broadcast.allowed) {
        console.log('in buyMarketPlaceOffers', broadcast)
        throw new OylTransactionError(result['reject-reason'], this.txIds)
      }
      await this.provider.sandshrew.bitcoindRpc.sendRawTransaction(result.hex)
      const txPayload =
        await this.provider.sandshrew.bitcoindRpc.decodeRawTransaction(result.hex)
      const txId = txPayload.txid
      let remainingSats = remainder
      const multipleBuys = await this.processMultipleBuys(
        offers,
        txId,
        remainingSats,
        1,
        [],
        [],
        this.txIds
      )
  
      this.txIds.push(txId)
  
      for (let i = 0; i < multipleBuys.psbtHexs.length; i++) {
        await timeout(30000)
        const [broadcast] =
          await this.provider.sandshrew.bitcoindRpc.testMemPoolAccept([
            multipleBuys.psbtHexs[i],
          ])
        if (!broadcast.allowed) {
          console.log('Error in broadcasting tx: ' + multipleBuys.txIds[i])
          console.log(broadcast)
          console.log(result['reject-reason'])
          throw new OylTransactionError(result['reject-reason'], this.txIds)
        }
        await this.provider.sandshrew.bitcoindRpc.sendRawTransaction(
          multipleBuys.psbtHexs[i]
        )
        this.txIds.push(multipleBuys.txIds[i])
      }
      return {
        txIds: this.txIds,
      }
    }
  
    async prepareAddress(
      marketPlaceBuy: BuildMarketplaceTransaction
    ): Promise<Boolean> {
      try {
        const prepared = await marketPlaceBuy.isWalletPrepared()
        if (!prepared) {
          const { psbtBase64 } = await marketPlaceBuy.prepareWallet()
          const psbtPayload = await this.signMarketplacePsbt(psbtBase64, true)
          const result = await this.provider.sandshrew.bitcoindRpc.finalizePSBT(
            psbtPayload.signedPsbt
          )
          const [broadcast] =
            await this.provider.sandshrew.bitcoindRpc.testMemPoolAccept([
              result.hex,
            ])
  
          if (!broadcast.allowed) {
            console.log('in prepareAddress', broadcast)
            throw new OylTransactionError(result['reject-reason'], this.txIds)
          }
          await this.provider.sandshrew.bitcoindRpc.sendRawTransaction(result.hex)
          const txPayload =
            await this.provider.sandshrew.bitcoindRpc.decodeRawTransaction(
              result.hex
            )
          const txId = txPayload.txid
          this.txIds.push(txId)
          return true
        }
        return true
      } catch (err) {
        throw new OylTransactionError(
          new Error(
            'An error occured while preparing address for marketplace buy'
          ),
          this.txIds
        )
      }
    }
  
    async canAddressAffordOffers(address: string, estimatedCost: number) {
      const retrievedUtxos = await this.getUTXOsToCoverAmount(
        address,
        estimatedCost,
        [],
        true
      )
      return retrievedUtxos.length > 0
    }
  
    async externalSign(options) {
      const psbt = bitcoin.Psbt.fromHex(options.psbt, {
        network: this.provider.network,
      })
      const psbtPayload = await this.signMarketplacePsbt(psbt.toBase64(), false)
      console.log('psbt payload', psbtPayload)
      return psbtPayload.signedHexPsbt
    }
  
    async getUnspentsForAddress(address: string) {
      try {
        '=========== Getting all confirmed/unconfirmed utxos for ' +
          address +
          ' ============'
        return await this.provider.esplora
          .getAddressUtxo(address)
          .then((unspents) => unspents?.filter((utxo) => utxo.value > 546))
      } catch (e: any) {
        throw new OylTransactionError(e, this.txIds)
      }
    }
  
    addInputConditionally(inputData) {
      const addressType = getAddressType(this.selectedSpendAddress)
      if (addressType === AddressType.P2TR) {
        inputData['tapInternalKey'] = assertHex(Buffer.from(this.selectedSpendPubkey, 'hex'))
      }
      return inputData
    }
    async getUnspentsForAddressInOrderByValue(address: string) {
      const unspents = await this.getUnspentsForAddress(address)
      console.log('=========== Confirmed Utxos len', unspents.length)
      return unspents.sort((a, b) => b.value - a.value)
    }
  
    async getUTXOsToCoverAmount(
      address: string,
      amountNeeded: number,
      excludedUtxos = [],
      insistConfirmedUtxos: boolean = false,
      inscriptionLocs?: string[]
    ) {
      try {
        console.log(
          '=========== Getting Unspents for address in order by value ========'
        )
        const unspentsOrderedByValue =
          await this.getUnspentsForAddressInOrderByValue(address)
        console.log('unspentsOrderedByValue len:', unspentsOrderedByValue.length)
        console.log(
          '=========== Getting Collectibles for address ' + address + '========'
        )
        const retrievedIxs = (
          await this.provider.api.getCollectiblesByAddress(address)
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
          if (this.isExcludedUtxo(utxo, excludedUtxos)) {
            // Check if the UTXO should be excluded
            continue
          }
          if (insistConfirmedUtxos && utxo.status.confirmed != true) {
            continue
          }
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
        throw new OylTransactionError(e, this.txIds)
      }
    }
  
    async getAllUTXOsWorthASpecificValue(value: number) {
      const unspents = await this.getUnspentsForAddress(this.selectedSpendAddress)
      console.log('=========== Confirmed/Unconfirmed Utxos Len', unspents.length)
      return unspents.filter((utxo) => utxo.value === value)
    }
  
    async buildDummyAndPaymentUtxos(orderPrice: number) {
      const allUtxosWorth600 = await this.getAllUTXOsWorthASpecificValue(600)
      if (allUtxosWorth600.length < 2) {
        throw new OylTransactionError(
          new Error('not enough padding utxos (600 sat) for marketplace buy'),
          this.txIds
        )
      }
  
      const dummyUtxos = []
      for (let i = 0; i < 2; i++) {
        dummyUtxos.push({
          txHash: allUtxosWorth600[i].txid,
          vout: allUtxosWorth600[i].vout,
          coinAmount: allUtxosWorth600[i].value,
        })
      }
  
      const requiredSatoshis = orderPrice + parseInt((482 * this.feeRate).toFixed(0))
      const retrievedUtxos = await this.getUTXOsToCoverAmount(
        this.selectedSpendAddress,
        requiredSatoshis,
        dummyUtxos
      )
      if (retrievedUtxos.length === 0) {
        throw new OylTransactionError(
          new Error('Not enough funds to purchase this offer'),
          this.txIds
        )
      }
  
      const paymentUtxos = []
      retrievedUtxos.forEach((utxo) => {
        paymentUtxos.push({
          txHash: utxo.txid,
          vout: utxo.vout,
          coinAmount: utxo.value,
        })
      })
  
      return {
        dummyUtxos,
        paymentUtxos,
      }
    }
  
    async buildOkxRunesPsbt(psbt: string, orderPrice: number, sellerAddress: string) {
      const sellerPsbt = bitcoin.Psbt.fromBase64(psbt, { network: this.provider.network })
      const dummyUtxos = []
      const requiredSatoshis = orderPrice + parseInt((482 * this.feeRate).toFixed(0))
  
      const allUtxosWorth600 = await this.getAllUTXOsWorthASpecificValue(600)
      if (allUtxosWorth600.length >= 2) {
        for (let i = 0; i < 2; i++) {
          dummyUtxos.push({
            txHash: allUtxosWorth600[i].txid,
            vout: allUtxosWorth600[i].vout,
            coinAmount: allUtxosWorth600[i].value,
          })
        }
      }
  
      const retrievedUtxos = await this.getUTXOsToCoverAmount(
        this.selectedSpendAddress,
        requiredSatoshis,
        dummyUtxos
      )
      if (retrievedUtxos.length === 0) {
        throw new OylTransactionError(
          new Error('Not enough funds to purchase this offer'),
          this.txIds
        )
      }
  
      const buyerPsbt = new bitcoin.Psbt({ network: this.provider.network });
  
      const sellerInputData = sellerPsbt.data.inputs[1]
      const decoded = await this.provider.sandshrew.bitcoindRpc.decodePSBT(psbt)
  
  
      // Add the first UTXO from retrievedUtxos as input index 0
      buyerPsbt.addInput(this.addInputConditionally({
        hash: retrievedUtxos[0].txid,
        index: retrievedUtxos[0].vout,
        witnessUtxo: {
          value: retrievedUtxos[0].value,
          script: Buffer.from(this.takerScript, 'hex')
        }
      }));
  
      const sellerUtxo = {
        hash: decoded.tx.vin[1].txid,
        index: decoded.tx.vin[1].vout,
        witnessUtxo: {
          value: sellerInputData.witnessUtxo.value,
          script: sellerInputData.witnessUtxo.script,
        },
        sighashType: bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY,
      }
  
      if ( sellerInputData?.tapInternalKey != null){
        sellerUtxo["tapInternalKey"] = sellerInputData?.tapInternalKey
      }
      // Add seller UTXO as input index 1
      buyerPsbt.addInput(sellerUtxo);
  
      for (let i = 1; i < retrievedUtxos.length; i++) {
        buyerPsbt.addInput(this.addInputConditionally({
          hash: retrievedUtxos[i].txid,
          index: retrievedUtxos[i].vout,
          witnessUtxo: {
            value: retrievedUtxos[i].value,
            script: Buffer.from(this.takerScript, 'hex')
          }
        }));
      }
  
      buyerPsbt.addOutput({
        address: this.receiveAddress, // Buyer's receiving address at index 0
        value: sellerInputData.witnessUtxo.value,
      });
  
      buyerPsbt.addOutput({
        address: sellerAddress, // Seller's output address at index 1
        value: orderPrice,
      });
  
      const amountRetrieved = retrievedUtxos?.reduce(
        (prev, currentValue) => prev + currentValue.value,
        0
      )
  
      const remainder = amountRetrieved - requiredSatoshis;
  
      if (remainder > 0) {
        buyerPsbt.addOutput({
          address: this.selectedSpendAddress,
          value: remainder,
        });
      }
      const { signedPsbt } = await this.signMarketplacePsbt(buyerPsbt.toBase64(), false)
      return signedPsbt;
    }
  
    async createOkxSignedPsbt(sellerPsbt: string, orderPrice: number) {
      const marketPlaceBuy = new BuildMarketplaceTransaction({
        address: this.selectedSpendAddress,
        pubKey: this.selectedSpendPubkey,
        receiveAddress: this.receiveAddress,
        psbtBase64: '',
        price: 0,
        feeRate: this.feeRate,
        provider: this.provider,
      })
      const preparedWallet = await this.prepareAddress(marketPlaceBuy)
      await timeout(30000)
      if (!preparedWallet) {
        throw new OylTransactionError(
          new Error('Address not prepared to buy marketplace offers'),
          this.txIds
        )
      }
      const keyPair =
        getAddressType(this.selectedSpendAddress) == AddressType.P2WPKH
          ? this.signer.segwitKeyPair
          : this.signer.taprootKeyPair
      const privateKey = keyPair.toWIF()
      const data = (await this.buildDummyAndPaymentUtxos(orderPrice)) as any
      data['receiveNftAddress'] = this.receiveAddress
      data['paymentAndChangeAddress'] = this.selectedSpendAddress
      data['feeRate'] = this.feeRate
      data['sellerPsbts'] = [sellerPsbt]
      const buyingData: BuyingData = data
  
      const buyerPsbt = genSignedBuyingPSBTWithoutListSignature(
        buyingData,
        privateKey,
        networks.bitcoin
      )
      return buyerPsbt
    }
  
  
    isExcludedUtxo(utxo, excludedUtxos) {
      return excludedUtxos.some(
        (excluded) => excluded.txHash === utxo.txid && excluded.vout === utxo.vout
      )
    }
  
    async getSignatureForBind() {
      const testnet = this.provider.network == getNetwork('testnet')
      const message = `Please confirm that\nPayment Address: ${this.selectedSpendAddress}\nOrdinals Address: ${this.receiveAddress}`
      if (getAddressType(this.receiveAddress) == AddressType.P2WPKH) {
        const keyPair = this.signer.segwitKeyPair
        const privateKey = keyPair.privateKey
        const signature = await signBip322Message({
          message,
          network: testnet ? 'testnet' : 'mainnet',
          privateKey,
          signatureAddress: this.receiveAddress,
        })
        return signature
      } else if (getAddressType(this.receiveAddress) == AddressType.P2TR) {
        const keyPair = this.signer.taprootKeyPair
        const privateKey = keyPair.privateKey
        const signature = await signBip322Message({
          message,
          network: testnet ? 'testnet' : 'mainnet',
          privateKey,
          signatureAddress: this.receiveAddress,
        })
        return signature
      }
    }
  }
  