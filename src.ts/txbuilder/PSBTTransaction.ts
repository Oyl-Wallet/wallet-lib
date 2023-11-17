import { UTXO_DUST } from '../shared/constants'
import * as bitcoin from 'bitcoinjs-lib'
import { assertHex, ECPair, utxoToInput, validator } from '../shared/utils'
import {
  AddressType,
  UnspentOutput,
  TxInput,
  TxOutput,
  ToSignInput,
} from '../shared/interface'
import { address as PsbtAddress } from 'bitcoinjs-lib'

export class PSBTTransaction {
  private inputs: TxInput[] = []
  public outputs: TxOutput[] = []
  private changeOutputIndex = -1
  private signer: any
  private segwitSigner: any
  private segwitPubKey: any
  private address: string
  public changedAddress: string
  private network: bitcoin.Network = bitcoin.networks.bitcoin
  private feeRate: number
  private pubkey: string
  private addressType: AddressType
  private enableRBF = false

  /**
   * Creates an instance of PSBTTransaction.
   * @param signer - Signer method bound to the HdKeyring.
   * @param address - Address associated with the transaction.
   * @param pubkey - Public key for the transaction.
   * @param addressType - The type of address being used.
   * @param feeRate - The fee rate in satoshis per byte.
   */
  constructor(
    signer,
    address,
    publicKey,
    addressType,
    feeRate,
    segwitSigner?,
    segwitPubKey?
  ) {
    this.signer = signer
    this.segwitSigner = segwitSigner
    this.segwitPubKey = segwitPubKey
    this.address = address
    this.pubkey = publicKey
    this.addressType = addressType
    this.feeRate = feeRate || 5
  }

  /**
   * Sets whether to enable Replace-by-Fee for the transaction.
   * @param {boolean} enable - A boolean to enable or disable RBF.
   */
  setEnableRBF(enable: boolean) {
    this.enableRBF = enable
  }

  /**
   * Sets the change address for the transaction.
   * @param {string} address - The address to receive the change.
   */
  setChangeAddress(address: string) {
    this.changedAddress = address
  }

  /**
   * Adds an input to the transaction.
   * @param {UnspentOutput} utxo - The unspent transaction output to add as an input.
   */
  addInput(utxo: UnspentOutput, isSegwit: boolean = false) {
    if (isSegwit) {
      this.inputs.push(utxoToInput(utxo, Buffer.from(this.segwitPubKey, 'hex')))
      return
    }

    this.inputs.push(utxoToInput(utxo, Buffer.from(this.pubkey, 'hex')))
  }
  getNumberOfInputs() {
    return this.inputs.length
  }

  /**
   * Calculates the total value of all inputs in the transaction.
   * @returns {number} The total input value in satoshis.
   */
  getTotalInput() {
    return this.inputs.reduce((pre, cur) => pre + cur.data.witnessUtxo.value, 0)
  }

  /**
   * Gets the total output value of the transaction.
   * This method sums up the value of all outputs in the transaction.
   * @returns {number} The total output value in satoshis.
   */
  getTotalOutput() {
    return this.outputs.reduce((pre, cur) => pre + cur.value, 0)
  }

  /**
   * Gets the unspent amount in the transaction.
   * This method calculates the unspent amount by subtracting the total output
   * value from the total input value.
   * @returns {number} The unspent amount in satoshis.
   */
  getUnspent() {
    return this.getTotalInput() - this.getTotalOutput()
  }

  /**
   * Checks if the transaction fee is sufficient.
   * This method creates a signed PSBT and checks if the actual fee rate of the PSBT
   * meets or exceeds the set fee rate for the transaction.
   * @returns {Promise<boolean>} A promise that resolves to true if the fee is sufficient,
   *                             otherwise false.
   */
  async isEnoughFee() {
    const psbt1 = await this.createSignedPsbt()
    if (psbt1.getFeeRate() >= this.feeRate) {
      return true
    } else {
      return false
    }
  }

  /**
   * Calculates the network fee for the transaction.
   * This method creates a signed PSBT and calculates the fee based on the size of
   * the transaction and the set fee rate.
   * @returns {Promise<number>} A promise that resolves to the calculated network fee in satoshis.
   */
  async calNetworkFee() {
    const psbt = await this.createSignedPsbt()
    let txSize = psbt.extractTransaction(true).toBuffer().length
    psbt.data.inputs.forEach((v) => {
      if (v.finalScriptWitness) {
        txSize -= v.finalScriptWitness.length * 0.75
      }
    })
    const fee = Math.ceil(txSize * this.feeRate)
    return fee
  }

  /**
   * Adds an output to the transaction.
   * @param {string} address - The address to send the output to.
   * @param {number}  value - The amount in satoshis to send.
   */
  addOutput(address: string, value: number) {
    this.outputs.push({
      address,
      value,
    })
  }

  /**
   * Retrieves an output from the transaction by index.
   * @param {number} index - The index of the output to retrieve.
   * @returns {TxOutput | undefined} The output at the specified index, or undefined if not found.
   */
  getOutput(index: number) {
    return this.outputs[index]
  }

  /**
   * Adds a change output to the transaction.
   * @param {number} value - The value in satoshis for the change output.
   */
  addChangeOutput(value: number) {
    this.outputs.push({
      address: this.changedAddress,
      value,
    })
    this.changeOutputIndex = this.outputs.length - 1
  }

  /**
   * Retrieves the change output from the transaction.
   * @returns {TxOutput | undefined}The change output, or undefined if there is no change output.
   */
  getChangeOutput() {
    return this.outputs[this.changeOutputIndex]
  }

  /**
   * Calculates the change amount of the transaction.
   * @returns {number} The value of the change output in satoshis, or 0 if there is no change output.
   */
  getChangeAmount() {
    const output = this.getChangeOutput()
    return output ? output.value : 0
  }

  /**
   * Removes the change output from the transaction.
   */
  removeChangeOutput() {
    this.outputs.splice(this.changeOutputIndex, 1)
    this.changeOutputIndex = -1
  }

  /**
   * Removes the specified number of most recently added outputs.
   * @param {number} count - The number of outputs to remove from the end of the outputs array.
   */
  removeRecentOutputs(count: number) {
    this.outputs.splice(-count)
  }

  /**
   * Formats the inputs for signing based on the given PSBT and whether it is a reveal transaction.
   * @param {string | bitcoin.Psbt} _psbt |  - The PSBT in hex string format or Psbt instance.
   * @param {boolean} isRevealTx - Indicates whether the transaction is a reveal transaction.
   * @returns {Promise<ToSignInput[]>} A promise that resolves to an array of inputs to sign.
   */
  formatOptionsToSignInputs = async (
    _psbt: string | bitcoin.Psbt,
    isRevealTx: boolean = false
  ) => {
    let toSignInputs: ToSignInput[] = []
    const psbtNetwork = bitcoin.networks.bitcoin

    const psbt =
      typeof _psbt === 'string'
        ? bitcoin.Psbt.fromHex(_psbt as string, { network: psbtNetwork })
        : (_psbt as bitcoin.Psbt)

    psbt.data.inputs.forEach((v, index: number) => {
      let script: any = null
      let value = 0
      if (v.witnessUtxo) {
        script = v.witnessUtxo.script
        value = v.witnessUtxo.value
      } else if (v.nonWitnessUtxo) {
        const tx = bitcoin.Transaction.fromBuffer(v.nonWitnessUtxo)
        const output = tx.outs[psbt.txInputs[index].index]
        script = output.script
        value = output.value
      }
      const isSigned = v.finalScriptSig || v.finalScriptWitness
      if (script && !isSigned) {
        const address = PsbtAddress.fromOutputScript(script, psbtNetwork)
        if (isRevealTx || (!isRevealTx && this.address === address)) {
          if (v.tapInternalKey) {
            toSignInputs.push({
              index: index,
              publicKey: this.pubkey,
              sighashTypes: v.sighashType ? [v.sighashType] : undefined,
            })
          }
        } else {
          toSignInputs.push({
            index: index,
            publicKey: this.segwitPubKey,
            sighashTypes: v.sighashType ? [v.sighashType] : undefined,
          })
        }
      }
    })

    return toSignInputs
  }

  /**
   * Creates a signed PSBT for the transaction.
   * @returns {Promise<bitcoin.Psbt>} A promise that resolves to the signed PSBT instance.
   */
  async createSignedPsbt() {
    const psbt = new bitcoin.Psbt({ network: this.network })

    this.inputs.forEach((v, index) => {
      if (v.utxo.addressType === AddressType.P2PKH) {
        //@ts-ignore
        psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = true
      }
      psbt.addInput(v.data)
      if (this.enableRBF) {
        psbt.setInputSequence(index, 0xfffffffd) // support RBF
      }
    })

    this.outputs.forEach((v) => {
      psbt.addOutput(v)
    })

    await this.signPsbt(psbt, true)

    return psbt
  }

  /**
   * Signs the provided PSBT with the available keys.
   * @param {bitcoin.Psbt} psbt - The PSBT to sign.
   * @param {boolean} autoFinalized - Whether to automatically finalize the inputs after signing.
   * @param {boolean} isRevealTx - Indicates whether the transaction is a reveal transaction.
   * @returns {Promise<bitcoin.Psbt>} A promise that resolves to the signed (and possibly finalized) PSBT.
   */
  async signPsbt(
    psbt: bitcoin.Psbt,
    autoFinalized = true,
    isRevealTx: boolean = false
  ) {
    const psbtNetwork = bitcoin.networks.bitcoin

    const toSignInputs: ToSignInput[] = await this.formatOptionsToSignInputs(
      psbt,
      isRevealTx
    )

    psbt.data.inputs.forEach((v, index) => {
      const isNotSigned = !(v.finalScriptSig || v.finalScriptWitness)
      const isP2TR = this.addressType === AddressType.P2TR
      const lostInternalPubkey = !v.tapInternalKey
      if (isNotSigned && isP2TR && lostInternalPubkey) {
        const tapInternalKey = assertHex(Buffer.from(this.pubkey, 'hex'))
        const p2tr = bitcoin.payments.p2tr({
          internalPubkey: tapInternalKey,
          network: psbtNetwork,
        })
        if (
          v.witnessUtxo?.script.toString('hex') == p2tr.output?.toString('hex')
        ) {
          v.tapInternalKey = tapInternalKey
        }
      }
    })
    await this.signer(psbt, [toSignInputs[0]])
    await this.segwitSigner(psbt, [toSignInputs[1]])

    if (autoFinalized) {
      console.log('autoFinalized')
      try {
        psbt.finalizeAllInputs()
      } catch (error) {
        console.log(error, 'Was not finalized')
      }
    }

    return psbt
  }

  /**
   * Generates the raw transaction hex and calculates the fee.
   * @param {boolean} autoAdjust - Whether to automatically adjust output values for the fee.
   * @returns {Promise<{ fee: number, rawtx: string, toSatoshis: number, estimateFee: number }>} A promise that resolves to an object containing the fee,
   *                                                                                                   raw transaction hex, total output value in satoshis,
   *                                                                                                   and the estimated fee.
   */
  async generate(autoAdjust: boolean) {
    // Try to estimate fee
    const unspent = this.getUnspent()
    this.addChangeOutput(Math.max(unspent, 0))
    const psbt1 = await this.createSignedPsbt()
    // this.dumpTx(psbt1);
    this.removeChangeOutput()

    // todo: support changing the feeRate
    const txSize = psbt1.extractTransaction().toBuffer().length
    const fee = txSize * this.feeRate

    if (unspent > fee) {
      const left = unspent - fee
      if (left > UTXO_DUST) {
        this.addChangeOutput(left)
      }
    } else {
      if (autoAdjust) {
        this.outputs[0].value -= fee - unspent
      }
    }
    const psbt2 = await this.createSignedPsbt()
    const tx = psbt2.extractTransaction()

    const rawtx = tx.toHex()
    const toAmount = this.outputs[0].value
    return {
      fee: psbt2.getFee(),
      rawtx,
      toSatoshis: toAmount,
      estimateFee: fee,
    }
  }

  /**
   * Dumps the transaction details to the console. Used for debugging.
   * @param psbt - The PSBT object to be dumped.
   */
  async dumpTx(psbt) {
    const tx = psbt.extractTransaction()
    const size = tx.toBuffer().length
    const feePaid = psbt.getFee()
    const feeRate = (feePaid / size).toFixed(4)

    console.log(`
=============================================================================================
Summary
  txid:     ${tx.getId()}
  Size:     ${tx.byteLength()}
  Fee Paid: ${psbt.getFee()}
  Fee Rate: ${feeRate} sat/B
  Detail:   ${psbt.txInputs.length} Inputs, ${psbt.txOutputs.length} Outputs
----------------------------------------------------------------------------------------------
Inputs
${this.inputs
  .map((input, index) => {
    const str = `
=>${index} ${input.data.witnessUtxo.value} Sats
        lock-size: ${input.data.witnessUtxo.script.length}
        via ${input.data.hash} [${input.data.index}]
`
    return str
  })
  .join('')}
total: ${this.getTotalInput()} Sats
----------------------------------------------------------------------------------------------
Outputs
${this.outputs
  .map((output, index) => {
    const str = `
=>${index} ${output.address} ${output.value} Sats`
    return str
  })
  .join('')}

total: ${this.getTotalOutput()} Sats
=============================================================================================
    `)
  }
}
