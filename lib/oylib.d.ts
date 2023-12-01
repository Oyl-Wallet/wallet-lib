import BcoinRpc from './rpclient';
import { SandshrewBitcoinClient } from './rpclient/sandshrew';
import { EsploraRpc } from './rpclient/esplora';
import { SwapBrc, ProviderOptions, Providers, RecoverAccountOptions, TickerDetails, InscribeTransfer } from './shared/interface';
import { OylApiClient } from './apiclient';
export declare class Wallet {
    private mnemonic;
    private wallet;
    sandshrewBtcClient: SandshrewBitcoinClient;
    esploraRpc: EsploraRpc;
    provider: Providers;
    rpcClient: BcoinRpc;
    apiClient: OylApiClient;
    derivPath: String;
    /**
     * Initializes a new instance of the Wallet class.
     */
    constructor();
    /**
     * Connects to a given blockchain RPC client.
     * @param {BcoinRpc} provider - The blockchain RPC client to connect to.
     * @returns {Wallet} - The connected wallet instance.
     */
    static connect(provider: BcoinRpc): Wallet;
    /**
     * Configures the wallet class with a provider from the given options.
     * @param {ProviderOptions} [options] - The options to configure the provider.
     * @returns {ProviderOptions} The applied client options.
     */
    fromProvider(options?: ProviderOptions): {};
    /**
     * Gets a summary of the given address(es).
     * @param {string | string[]} address - A single address or an array of addresses.
     * @returns {Promise<Object[]>} A promise that resolves to an array of address summaries.
     */
    getAddressSummary({ address }: {
        address: any;
    }): Promise<any[]>;
    /**
     * Derives a Taproot address from the given public key.
     * @param {string} publicKey - The public key to derive the address from.
     * @returns {string} A promise that resolves to the derived Taproot address.
     */
    getTaprootAddress({ publicKey }: {
        publicKey: any;
    }): any;
    /**
     * Retrieves details for a specific BRC-20 token associated with the given address.
     * @param {string} address - The address to query BRC-20 token details from.
     * @param {string} ticker - The ticker symbol of the BRC-20 token to retrieve details for.
     * @returns {Promise<TickerDetails>} A promise that resolves to the details of the specified BRC-20 token.
     */
    getSingleBrcTickerDetails(address: string, ticker: string): Promise<TickerDetails>;
    /**
     * Initializes a wallet from a mnemonic phrase with the specified parameters.
     * @param {Object} options - The options object.
     * @param {string} options.mnemonic - The mnemonic phrase used to initialize the wallet.
     * @param {string} [options.type='taproot'] - The type of wallet to create. Options are 'taproot', 'segwit', 'legacy'.
     * @param {string} [options.hdPath=RequiredPath[3]] - The HD path to derive addresses from.
     * @returns {Promise<any>} A promise that resolves to the wallet data including keyring and assets.
     * @throws {Error} Throws an error if initialization fails.
     */
    fromPhrase({ mnemonic, type, hdPath }: {
        mnemonic: any;
        type?: string;
        hdPath?: string;
    }): Promise<any>;
    /**
     * Recovers a wallet using the given options.
     * @param {RecoverAccountOptions} options - Options necessary for account recovery.
     * @returns {Promise<any>} A promise that resolves to the recovered wallet payload.
     * @throws {Error} Throws an error if recovery fails.
     */
    recoverWallet(options: RecoverAccountOptions): Promise<any>;
    /**
     * Adds a new account to the wallet using the given options.
     * @param {RecoverAccountOptions} options - Options describing the account to be added.
     * @returns {Promise<any>} A promise that resolves to the payload of the newly added account.
     * @throws {Error} Throws an error if adding the account fails.
     */
    addAccountToWallet(options: RecoverAccountOptions): Promise<any>;
    /**
     * Initializes a new Oyl account with taproot & segwit HDKeyrings  within the wallet.
     * @returns {Promise<any>} A promise that resolves to the payload of the initialized accounts.
     * @throws {Error} Throws an error if the initialization fails.
     */
    initializeWallet(): Promise<any>;
    /**
     * Derives a SegWit address from a given public key.
     * @param {Object} param0 - An object containing the public key.
     * @param {string} param0.publicKey - The public key to derive the SegWit address from.
     * @returns {Promise<string>} A promise that resolves to the derived SegWit address.
     * @throws {Error} Throws an error if address derivation fails.
     */
    getSegwitAddress({ publicKey }: {
        publicKey: any;
    }): Promise<string>;
    /**
     * Creates a new wallet with an optional specific derivation type.
     * @param {object} param0 - Object containing the type of derivation.
     * @param {string} [param0.type] - Optional type of derivation path.
     * @returns {{keyring: HdKeyring, address: string}} The newly created wallet object.
     */
    createWallet({ type }: {
        type?: String;
    }): any;
    /**
     * Fetches the balance details including confirmed and pending amounts for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address for which to fetch balance details.
     * @returns {Promise<any>} A promise that resolves to an object containing balance and its USD value.
     * @throws {Error} Throws an error if the balance retrieval fails.
     */
    getMetaBalance({ address }: {
        address: any;
    }): Promise<{
        confirm_amount: any;
        pending_amount: any;
        amount: any;
        usd_value: string;
    }>;
    /**
     * Calculates the total value from previous outputs for the given inputs of a transaction.
     * @param {any[]} inputs - The inputs of a transaction which might be missing value information.
     * @param {string} address - The address to filter the inputs.
     * @returns {Promise<number>} A promise that resolves to the total value of the provided inputs.
     * @throws {Error} Throws an error if it fails to retrieve previous transaction data.
     */
    getTxValueFromPrevOut(inputs: any[], address: string): Promise<number>;
    /**
     * Retrieves the transaction history for a given address and processes the transactions.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address for which to fetch transaction history.
     * @returns {Promise<any[]>} A promise that resolves to an array of processed transaction details.
     * @throws {Error} Throws an error if transaction history retrieval fails.
     */
    getTxHistory({ address }: {
        address: any;
    }): Promise<any[]>;
    /******************************* */
    /**
     * Retrieves the fee rates for transactions from the mempool.
     * @returns {Promise<{ High: number; Medium: number; Low: number }>} A promise that resolves with an object containing the fee rates for High, Medium, and Low priority transactions.
     */
    getFees(): Promise<{
        High: number;
        Medium: number;
        Low: number;
    }>;
    getTotalBalance({ batch }: {
        batch: any;
    }): Promise<number>;
    /**
     * Retrieves a list of inscriptions for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address to query for inscriptions.
     * @returns {Promise<Array<any>>} A promise that resolves to an array of inscription details.
     */
    getInscriptions({ address }: {
        address: any;
    }): Promise<any>;
    /**
     * Retrieves UTXO artifacts for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address to query for UTXO artifacts.
     * @returns A promise that resolves to the UTXO artifacts.
     */
    getUtxosArtifacts({ address }: {
        address: any;
    }): Promise<any[]>;
    /**
     * Imports a list of watch-only addresses into the wallet.
     * @param {Object} param0 - An object containing an array of addresses.
     * @param {string} param0.addresses - An array of addresses to be imported as watch-only.
     */
    importWatchOnlyAddress({ addresses }: {
        addresses?: any[];
    }): Promise<void>;
    /**
     * Creates a Partially Signed Bitcoin Transaction (PSBT) for an inscription, signs and broadcasts the tx.
     * @param {Object} params - The parameters for creating the PSBT.
     * @param {string} params.publicKey - The public key associated with the sending address.
     * @param {string} params.fromAddress - The sending address.
     * @param {string} params.toAddress - The receiving address.
     * @param {string} params.changeAddress - The change address.
     * @param {number} params.txFee - The transaction fee.
     * @param {any} params.signer - The bound signer method to sign the transaction.
     * @param {string} params.inscriptionId - The ID of the inscription to include in the transaction.
     * @returns {Promise<Object>} A promise that resolves to an object containing transaction ID and other response data from the API client.
     */
    createOrdPsbtTx({ fromAddress, toAddress, changeAddress, txFee, segwitAddress, taprootPubKey, segwitPubKey, inscriptionId, payFeesWithSegwit, mnemonic, }: {
        fromAddress: string;
        toAddress: string;
        changeAddress: string;
        txFee: number;
        segwitAddress?: string;
        taprootPubKey: string;
        segwitPubKey?: string;
        inscriptionId: string;
        payFeesWithSegwit: boolean;
        mnemonic: string;
    }): Promise<{
        txId: any;
        rawtx: any;
    }>;
    /**
     * Creates a Partially Signed Bitcoin Transaction (PSBT) to send regular satoshis, signs and broadcasts it.
     * @param {Object} params - The parameters for creating the PSBT.
     * @param {string} params.to - The receiving address.
     * @param {string} params.from - The sending address.
     * @param {string} params.amount - The amount to send.
     * @param {number} params.feeRate - The transaction fee rate.
     * @param {any} params.signer - The bound signer method to sign the transaction.
     * @param {string} params.publicKey - The public key associated with the transaction.
     * @returns {Promise<Object>} A promise that resolves to an object containing transaction ID and other response data from the API client.
     */
    createBtcTx({ to, from, amount, feeRate, signer, publicKey, }: {
        to: string;
        from: string;
        amount: number;
        feeRate: number;
        signer: any;
        publicKey: string;
    }): Promise<{
        rawTx: string;
        rawTxBase64: string;
    }>;
    /**
     * Retrieves information about a SegWit address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The SegWit address to validate and get information for.
     * @returns {Promise<Object>} A promise that resolves to an object containing validity status and summary of the address.
     */
    getSegwitAddressInfo({ address }: {
        address: any;
    }): Promise<{
        isValid: boolean;
        summary: any;
    } | {
        isValid: true;
        summary: any[];
    }>;
    /**
     * Retrieves information about a Taproot address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The Taproot address to validate and get information for.
     * @returns {Promise<Object>} A promise that resolves to an object containing validity status and summary of the address.
     */
    getTaprootAddressInfo({ address }: {
        address: any;
    }): Promise<{
        isValid: boolean;
        summary: any;
    } | {
        isValid: true;
        summary: any[];
    }>;
    /**
     * Fetches offers associated with a specific BRC20 ticker.
     * @param {Object} params - The parameters containing the ticker information.
     * @param {string} params.ticker - The ticker symbol to retrieve offers for.
     * @returns {Promise<any>} A promise that resolves to an array of offers.
     */
    getBrcOffers({ ticker }: {
        ticker: any;
    }): Promise<any>;
    /**
     * Initiates and completes a swap on the blockchain resource (BRC) marketplace.
     * @param {SwapBrc} bid - The bid details for the swap.
     * @returns {Promise<string>} A promise that resolves to the transaction ID of the submitted bid.
     */
    swapBrc(bid: SwapBrc): Promise<any>;
    /**
     * Handles the swapping flow logic, including transaction signing.
     * @param {Object} options - The parameters and options for the swap.
     * @returns {Promise<string>} A promise that resolves to the hexadecimal string of the signed PSBT.
     */
    swapFlow(options: any): Promise<string>;
    /**
     * Lists BRC20 tokens associated with an address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The address to list BRC20 tokens for.
     * @returns {Promise<any>} A promise that resolves to an array of BRC20 tokens.
     */
    listBrc20s({ address }: {
        address: string;
    }): Promise<any>;
    /**
     * Lists inscribed collectibles associated with an address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The address to list collectibles for.
     * @returns {Promise<any>} A promise that resolves to an array of collectibles.
     */
    listCollectibles({ address }: {
        address: string;
    }): Promise<any>;
    /**
     * Retrieves a specific inscribed collectible by its ID.
     * @param {string} inscriptionId - The ID of the collectible to retrieve.
     * @returns {Promise<any>} A promise that resolves to the collectible data.
     */
    getCollectibleById(inscriptionId: string): Promise<any>;
    signPsbt(psbtHex: any, fee: any, pubKey: any, signer: any, address: any): Promise<string>;
    signInscriptionPsbt(psbt: any, fee: any, pubKey: any, signer: any, address?: string): Promise<any>;
    sendBRC20(options: InscribeTransfer): Promise<unknown>;
}
