import * as bitcoin from 'bitcoinjs-lib';
import { UnspentOutput, TxOutput, ToSignInput } from '../shared/interface';
export declare class PSBTTransaction {
    private inputs;
    outputs: TxOutput[];
    private changeOutputIndex;
    private signer;
    private segwitSigner;
    private segwitPubKey;
    private address;
    changedAddress: string;
    private network;
    private feeRate;
    private pubkey;
    private enableRBF;
    /**
     * Creates an instance of PSBTTransaction.
     * @param signer - Signer method bound to the HdKeyring.
     * @param address - Address associated with the transaction.
     * @param pubkey - Public key for the transaction.
     * @param feeRate - The fee rate in satoshis per byte.
     */
    constructor(signer: any, address: any, publicKey: any, feeRate: any, segwitSigner?: any, segwitPubKey?: any);
    /**
     * Sets whether to enable Replace-by-Fee for the transaction.
     * @param {boolean} enable - A boolean to enable or disable RBF.
     */
    setEnableRBF(enable: boolean): void;
    /**
     * Sets the change address for the transaction.
     * @param {string} address - The address to receive the change.
     */
    setChangeAddress(address: string): void;
    /**
     * Adds an input to the transaction.
     * @param {UnspentOutput} utxo - The unspent transaction output to add as an input.
     */
    addInput(utxo: UnspentOutput, isSegwit?: boolean): void;
    getNumberOfInputs(): number;
    /**
     * Calculates the total value of all inputs in the transaction.
     * @returns {number} The total input value in satoshis.
     */
    getTotalInput(): number;
    /**
     * Gets the total output value of the transaction.
     * This method sums up the value of all outputs in the transaction.
     * @returns {number} The total output value in satoshis.
     */
    getTotalOutput(): number;
    /**
     * Gets the unspent amount in the transaction.
     * This method calculates the unspent amount by subtracting the total output
     * value from the total input value.
     * @returns {number} The unspent amount in satoshis.
     */
    getUnspent(): number;
    /**
     * Checks if the transaction fee is sufficient.
     * This method creates a signed PSBT and checks if the actual fee rate of the PSBT
     * meets or exceeds the set fee rate for the transaction.
     * @returns {Promise<boolean>} A promise that resolves to true if the fee is sufficient,
     *                             otherwise false.
     */
    isEnoughFee(): Promise<boolean>;
    /**
     * Calculates the network fee for the transaction.
     * This method creates a signed PSBT and calculates the fee based on the size of
     * the transaction and the set fee rate.
     * @returns {Promise<number>} A promise that resolves to the calculated network fee in satoshis.
     */
    calNetworkFee(): Promise<number>;
    /**
     * Adds an output to the transaction.
     * @param {string} address - The address to send the output to.
     * @param {number}  value - The amount in satoshis to send.
     */
    addOutput(address: string, value: number): void;
    /**
     * Retrieves an output from the transaction by index.
     * @param {number} index - The index of the output to retrieve.
     * @returns {TxOutput | undefined} The output at the specified index, or undefined if not found.
     */
    getOutput(index: number): TxOutput;
    /**
     * Adds a change output to the transaction.
     * @param {number} value - The value in satoshis for the change output.
     */
    addChangeOutput(value: number): void;
    /**
     * Retrieves the change output from the transaction.
     * @returns {TxOutput | undefined}The change output, or undefined if there is no change output.
     */
    getChangeOutput(): TxOutput;
    /**
     * Calculates the change amount of the transaction.
     * @returns {number} The value of the change output in satoshis, or 0 if there is no change output.
     */
    getChangeAmount(): number;
    /**
     * Removes the change output from the transaction.
     */
    removeChangeOutput(): void;
    /**
     * Removes the specified number of most recently added outputs.
     * @param {number} count - The number of outputs to remove from the end of the outputs array.
     */
    removeRecentOutputs(count: number): void;
    /**
     * Formats the inputs for signing based on the given PSBT and whether it is a reveal transaction.
     * @param {string | bitcoin.Psbt} _psbt |  - The PSBT in hex string format or Psbt instance.
     * @param {boolean} isRevealTx - Indicates whether the transaction is a reveal transaction.
     * @returns {Promise<ToSignInput[]>} A promise that resolves to an array of inputs to sign.
     */
    formatOptionsToSignInputs: (_psbt: string | bitcoin.Psbt, isRevealTx?: boolean) => Promise<ToSignInput[]>;
    signInputs(psbt: bitcoin.Psbt, toSignInputs: ToSignInput[]): Promise<void>;
    /**
     * Creates a signed PSBT for the transaction.
     * @returns {Promise<bitcoin.Psbt>} A promise that resolves to the signed and finalized PSBT instance.
     */
    createSignedPsbt(): Promise<bitcoin.Psbt>;
    /**
     * Signs the provided PSBT with the available keys.
     * @param {bitcoin.Psbt} psbt - The PSBT to sign.
     * @param {boolean} autoFinalized - Whether to automatically finalize the inputs after signing.
     * @param {boolean} isRevealTx - Indicates whether the transaction is a reveal transaction.
     * @returns {Promise<bitcoin.Psbt>} A promise that resolves to the signed (and possibly finalized) PSBT.
     */
    signPsbt(psbt: bitcoin.Psbt, autoFinalized?: boolean, isRevealTx?: boolean): Promise<bitcoin.Psbt>;
    /**
     * Generates the raw transaction hex and calculates the fee.
     * @param {boolean} autoAdjust - Whether to automatically adjust output values for the fee.
     * @returns {Promise<{ fee: number, rawtx: string, toSatoshis: number, estimateFee: number }>} A promise that resolves to an object containing the fee,
     *                                                                                                   raw transaction hex, total output value in satoshis,
     *                                                                                                   and the estimated fee.
     */
    generate(autoAdjust: boolean): Promise<{
        fee: number;
        rawtx: string;
        toSatoshis: number;
        estimateFee: number;
    }>;
    /**
     * Dumps the transaction details to the console. Used for debugging.
     * @param psbt - The PSBT object to be dumped.
     */
    dumpTx(psbt: any): Promise<void>;
}
