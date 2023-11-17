import * as bitcoin from 'bitcoinjs-lib'
import { ECPairInterface } from 'ecpair'
import bitcore from 'bitcore-lib'
import { isTaprootInput } from 'bitcoinjs-lib/src/psbt/bip371'
import { EventEmitter } from 'events'
import { tweakSigner, ECPair } from '../shared/utils'
import Mnemonic from 'bitcore-mnemonic'

const hdPathString = "m/86'/0'/0'/0"

export interface HDKeyringOption {
  hdPath?: string
  mnemonic?: any
  activeIndexes?: number[]
  passphrase?: string
}

export class HdKeyring extends EventEmitter {
  mnemonic: any = null
  passphrase: string
  network: bitcoin.Network = bitcoin.networks.bitcoin
  hdPath: string
  root: bitcore.HDPrivateKey = null
  hdWallet?: Mnemonic
  wallets: ECPairInterface[] = []
  private _index2wallet: Record<number, [string, ECPairInterface]> = {}
  activeIndexes: number[] = []

  /**
   * Initializes a new instance of the HdKeyring class.
   * @param {HDKeyringOption} opts - HD Keyring options.
   */
  constructor(opts?: HDKeyringOption) {
    super(null)
    this.deserialize(opts)
  }

  /**
   * Serializes the HDKeyring instance to a JSON object.
   * @returns {Promise<HDKeyringOption>} A promise that resolves to an object with the HDKeyring properties.
   */
  async serialize(): Promise<HDKeyringOption> {
    return {
      mnemonic: this.mnemonic,
      activeIndexes: this.activeIndexes,
      hdPath: this.hdPath,
      passphrase: this.passphrase,
    }
  }

  /**
   * Deserializes options to a HDKeyring instance.
   * @param {HDKeyringOption} _opts - The HDKeyring options object.
   * @returns {HdKeyring} The instance of the HDKeyring.
   */
  deserialize(_opts: HDKeyringOption = {}): HdKeyring {
    if (this.root) {
      throw new Error('Btc-Hd-Keyring: Secret recovery phrase already provided')
    }
    let opts = _opts as HDKeyringOption
    this.wallets = []
    this.mnemonic = null
    this.root = null
    this.hdPath = opts.hdPath || hdPathString

    if (opts.passphrase) {
      this.passphrase = opts.passphrase
    }

    if (opts.mnemonic) {
      this.initFromMnemonic(opts.mnemonic)
    }

    if (opts.activeIndexes) {
      this.activeAccounts(opts.activeIndexes)
    }

    return this
  }

  /**
   * Initializes the HD keyring from a mnemonic phrase.
   * @param {string} mnemonic - The mnemonic phrase to use for initialization.
   */
  initFromMnemonic(mnemonic: string) {
    if (this.root) {
      throw new Error('Btc-Hd-Keyring: Secret recovery phrase already provided')
    }

    this.mnemonic = mnemonic
    this._index2wallet = {}

    this.hdWallet = new Mnemonic(mnemonic)
    this.root = this.hdWallet
      .toHDPrivateKey(
        this.passphrase,
        this.network == bitcoin.networks.bitcoin ? 'livenet' : 'testnet'
      )
      .deriveChild(this.hdPath)
    //console.log("root", this.root)
  }

  /**
   * Changes the HD path used by the keyring and reinitializes accounts.
   * @param {string} hdPath - The new HD path to be used.
   */
  changeHdPath(hdPath: string) {
    this.hdPath = hdPath

    this.root = this.hdWallet
      .toHDPrivateKey(
        this.passphrase,
        this.network == bitcoin.networks.bitcoin ? 'livenet' : 'testnet'
      )
      .deriveChild(this.hdPath)

    const indexes = this.activeIndexes
    this._index2wallet = {}
    this.activeIndexes = []
    this.wallets = []
    this.activeAccounts(indexes)
  }

  /**
   * Retrieves an account's address by its HD path and index.
   * @param {string} hdPath - The HD path to derive the account from.
   * @param {number} index - The index of the account.
   * @returns {string} The account address as a string.
   */
  getAccountByHdPath(hdPath: string, index: number) {
    const root = this.hdWallet
      .toHDPrivateKey(
        this.passphrase,
        this.network == bitcoin.networks.bitcoin ? 'livenet' : 'testnet'
      )
      .deriveChild(hdPath)
    const child = root!.deriveChild(index)
    const ecpair = ECPair.fromPrivateKey(child.privateKey.toBuffer())
    const address = ecpair.publicKey.toString('hex')
    return address
  }

  /**
   * Adds a specified number of new accounts to the keyring.
   * @param {number} numberOfAccounts - The number of new accounts to add. Defaults to 1 if not specified.
   * @returns {Promise<string[]>} A promise that resolves to an array of new account addresses in hex format.
   */
  addAccounts(numberOfAccounts = 1) {
    if (!this.root) {
      this.initFromMnemonic(new Mnemonic().toString())
    }

    let count = numberOfAccounts
    let currentIdx = 0

    if (this.activeIndexes.length > 1) {
      currentIdx = this.activeIndexes[this.activeIndexes.length - 1]
    }
    const newWallets: ECPairInterface[] = []

    while (count) {
      const [, wallet] = this._addressFromIndex(currentIdx)
      if (this.wallets.includes(wallet)) {
        currentIdx++
      } else {
        this.wallets.push(wallet)
        newWallets.push(wallet)
        this.activeIndexes.push(currentIdx)
        count--
      }
    }

    const hexWallets = newWallets.map((w) => {
      return w.publicKey.toString('hex')
    })

    return Promise.resolve(hexWallets)
  }

  /**
   * Activates a list of accounts by their indexes.
   * @param {number[]} indexes - An array of account indexes to activate.
   * @returns An array of activated account addresses in hex format.
   */
  activeAccounts(indexes: number[]) {
    const accounts: string[] = []
    for (const index of indexes) {
      const [address, wallet] = this._addressFromIndex(index)
      this.wallets.push(wallet)
      this.activeIndexes.push(index)

      accounts.push(address)
    }

    return accounts
  }

  /**
   * Retrieves a list of addresses within a specified index range.
   * @param {number} start - The start index of the range.
   * @param {number} end - The end index of the range.
   * @returns {{ address: string; index: number }[]} An array of objects with address and index properties.
   */
  getAddresses(start: number, end: number) {
    const from = start
    const to = end
    const accounts: { address: string; index: number }[] = []
    for (let i = from; i < to; i++) {
      const [address] = this._addressFromIndex(i)
      accounts.push({
        address,
        index: i + 1,
      })
    }
    return accounts
  }

  /**
   * Gets the hex string representations of public keys for all accounts.
   * @returns {string[]} An array of account addresses in hex format.
   */
  getAccounts() {
    return this.wallets.map((w) => {
      return w.publicKey.toString('hex')
    })
  }

  /**
   * Retrieves the private key for the given public key.
   * @param {string} publicKey - The public key to retrieve the private key for.
   * @returns {ECPairInterface} The corresponding private key.
   * @private
   */
  private _getPrivateKeyFor(publicKey: string) {
    if (!publicKey) {
      throw new Error('Must specify publicKey.')
    }
    const wallet = this._getWalletForAccount(publicKey)
    return wallet
  }

  /**
   * Retrieves the wallet for a given account's public key.
   * @param {string} publicKey - The public key of the account to retrieve the wallet for.
   * @returns {ECPairInterface} The wallet corresponding to the given public key.
   * @private
   */
  private _getWalletForAccount(publicKey: string) {
    let wallet = this.wallets.find(
      (wallet) => wallet.publicKey.toString('hex') == publicKey
    )
    if (!wallet) {
      throw new Error('Simple Keyring - Unable to find matching publicKey.')
    }
    return wallet
  }

  /**
   * Signs a PSBT (Partially Signed Bitcoin Transaction) using the private keys managed by this keyring.
   * @param {bitcoin.Psbt} psbt - The PSBT to sign.
   * @param {{ index: number; publicKey: string; sighashTypes?: number[] }[]} inputs - The inputs to sign, with their index, public key, and optional sighash types.
   * @param opts - Additional options.
   * @returns {Promise<bitcoin.Psbt>} A promise that resolves to the signed PSBT.
   */
  async signTransaction(
    psbt: bitcoin.Psbt,
    inputs: { index: number; publicKey: string; sighashTypes?: number[] }[],
    opts?: any
  ) {
    inputs.forEach(({ index, publicKey, sighashTypes }) => {
      const keyPair = this._getPrivateKeyFor(publicKey)
      const input = psbt.data.inputs[index]
      if (isTaprootInput(input)) {
        const tweakedSigner = tweakSigner(keyPair, {
          network: bitcoin.networks['bitcoin'],
        })

        const signer =
          input.witnessUtxo?.script &&
          input.tapInternalKey &&
          !input.tapLeafScript
            ? tweakedSigner
            : keyPair

        psbt.signInput(index, signer, sighashTypes)
      } else {
        psbt.signInput(index, keyPair, sighashTypes)
      }
    })
    return psbt
  }

  /**
   * Retrieves the address and corresponding ECPair object from a given index.
   * @param {number} i - The index to derive the address from.
   * @returns {[string, ECPairInterface]} A tuple containing the address and the ECPair object.
   */
  private _addressFromIndex(i: number): [string, ECPairInterface] {
    if (!this._index2wallet[i]) {
      const child = this.root!.deriveChild(i)
      const ecpair = ECPair.fromPrivateKey(child.privateKey.toBuffer())
      const address = ecpair.publicKey.toString('hex')
      this._index2wallet[i] = [address, ecpair]
    }

    return this._index2wallet[i]
  }
}
