import { Utxo } from './txbuilder';
import { SandshrewBitcoinClient } from './rpclient/sandshrew';
import { EsploraRpc } from './rpclient/esplora';
import { AddressType, IBlockchainInfoUTXO, Providers, RecoverAccountOptions, TickerDetails } from './shared/interface';
import { OylApiClient } from './apiclient';
import * as bitcoin from 'bitcoinjs-lib';
import { OrdRpc } from './rpclient/ord';
import { HdKeyring } from './wallet/hdKeyring';
import { Signer } from './signer';
export declare const NESTED_SEGWIT_HD_PATH = "m/49'/0'/0'/0";
export declare const TAPROOT_HD_PATH = "m/86'/0'/0'/0";
export declare const SEGWIT_HD_PATH = "m/84'/0'/0'/0";
export declare const LEGACY_HD_PATH = "m/44'/0'/0'/0";
export declare class Oyl {
    network: bitcoin.Network;
    sandshrewBtcClient: SandshrewBitcoinClient;
    esploraRpc: EsploraRpc;
    ordRpc: OrdRpc;
    provider: Providers;
    apiClient: OylApiClient;
    derivPath: String;
    currentNetwork: 'testnet' | 'main' | 'regtest';
    /**
     * Initializes a new instance of the Wallet class.
     */
    constructor(opts?: import("./shared/interface").NetworkOptions);
    /**
     * Gets a summary of the given address(es).
     * @param {string | string[]} address - A single address or an array of addresses.
     * @returns {Promise<Object[]>} A promise that resolves to an array of address summaries.
     */
    getAddressSummary({ address, includeInscriptions, }: {
        address: string;
        includeInscriptions?: boolean;
    }): Promise<{}>;
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
    fromPhrase({ mnemonic, addrType, hdPath, }: {
        mnemonic: any;
        addrType?: AddressType;
        hdPath?: string;
    }): Promise<any>;
    /**
     * Recovers a wallet using the given options.
     * @param {RecoverAccountOptions} options - Options necessary for account recovery.
     * @returns {Promise<any>} A promise that resolves to the recovered wallet payload.
     * @throws {Error} Throws an error if recovery fails.
     */
    recoverWallet(options: Omit<RecoverAccountOptions, 'network'>): Promise<import("./shared/interface").oylAccounts>;
    /**
     * Adds a new account to the wallet using the given options.
     * @param {RecoverAccountOptions} options - Options describing the account to be added.
     * @returns {Promise<any>} A promise that resolves to the payload of the newly added account.
     * @throws {Error} Throws an error if adding the account fails.
     */
    addAccountToWallet(options: Omit<RecoverAccountOptions, 'network'>): Promise<import("./shared/interface").oylAccounts>;
    /**
     * Initializes a new Oyl account with taproot & segwit HDKeyrings  within the wallet.
     * @returns {Promise<any>} A promise that resolves to the payload of the initialized accounts.
     * @throws {Error} Throws an error if the initialization fails.
     */
    initializeWallet(): Promise<import("./shared/interface").oylAccounts>;
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
     * Creates a new Oyl with an optional specific derivation type.
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
    getTaprootBalance({ address }: {
        address: string;
    }): Promise<any>;
    /**
     * Fetches the balance details including confirmed and pending amounts for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address for which to fetch balance details.
     * @returns {Promise<any>} A promise that resolves to an object containing balance and its USD value.
     * @throws {Error} Throws an error if the balance retrieval fails.
     */
    getAddressBalance({ address }: {
        address: string;
    }): Promise<any>;
    getUtxos(address: string, includeInscriptions?: boolean): Promise<{
        unspent_outputs: IBlockchainInfoUTXO[];
    }>;
    /**
     * Retrieves the transaction history for a given address and processes the transactions.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address for which to fetch transaction history.
     * @returns {Promise<any[]>} A promise that resolves to an array of processed transaction details.
     * @throws {Error} Throws an error if transaction history retrieval fails.
     */
    getTxHistory({ addresses }: {
        addresses: string[];
    }): Promise<{}[]>;
    getTaprootTxHistory({ taprootAddress, totalTxs, }: {
        taprootAddress: string;
        totalTxs?: number;
    }): Promise<any>;
    /**
     * Retrieves a list of inscriptions for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address to query for inscriptions.
     * @returns {Promise<Array<any>>} A promise that resolves to an array of inscription details.
     */
    getInscriptions({ address }: {
        address: string;
    }): Promise<{
        collectibles: any[];
        brc20: any[];
        runes: any[];
    }>;
    /**
     * Retrieves UTXO artifacts for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address to query for UTXO artifacts.
     * @returns A promise that resolves to the UTXO artifacts.
     */
    getUtxosArtifacts({ address }: {
        address: any;
    }): Promise<{
        txId: string;
        outputIndex: number;
        satoshis: number;
        scriptPk: string;
        confirmations: number;
        addressType: number;
        address: string;
        inscriptions: Array<{
            brc20?: {
                id: string;
                address: string;
                content: string;
                location: string;
            };
            runes?: {
                id: string;
                address: string;
                content: string;
                location: string;
            };
            collectible?: {
                id: string;
                address: string;
                content: string;
                location: string;
            };
        }>;
    }[]>;
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
    sendBtc({ toAddress, feeRate, amount, altSpendPubKey, spendAddress, spendPubKey, altSpendAddress, signer, }: {
        toAddress: string;
        feeRate?: number;
        amount: number;
        altSpendPubKey?: string;
        spendAddress: string;
        spendPubKey: string;
        altSpendAddress?: string;
        signer: Signer;
    }): Promise<{
        txId: string;
        rawTx: string;
        size: any;
        weight: any;
        fee: number;
        satsPerVByte: string;
    }>;
    createBtcTx({ toAddress, spendPubKey, feeRate, amount, network, spendUtxos, spendAddress, altSpendAddress, altSpendPubKey, altSpendUtxos, }: {
        toAddress: string;
        spendPubKey: string;
        feeRate: number;
        amount: number;
        network: bitcoin.Network;
        spendUtxos: Utxo[];
        spendAddress: string;
        altSpendAddress?: string;
        altSpendPubKey?: string;
        altSpendUtxos?: Utxo[];
    }): Promise<{
        rawPsbt: string;
        fee: number;
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
        summary: {};
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
        summary: {};
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
     * Fetches aggregated offers associated with a specific BRC20 ticker.
     * @param {Object} params - The parameters containing the ticker information.
     * @param {string} params.ticker - The ticker symbol to retrieve offers for.
     * @param {}
     * @returns {Promise<any>} A promise that resolves to an array of offers.
     */
    getAggregatedBrcOffers({ ticker, limitOrderAmount, }: {
        ticker: string;
        limitOrderAmount: number;
    }): Promise<any>;
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
    getCollectibleById(inscriptionId: string): Promise<{
        address: string;
        children: any[];
        content_length: number;
        content_type: string;
        genesis_fee: number;
        genesis_height: number;
        inscription_id: string;
        inscription_number: number;
        next: string;
        output_value: number;
        parent: any;
        previous: string;
        rune: any;
        sat: number;
        satpoint: string;
        timestamp: number;
    }>;
    signPsbt({ psbtHex, publicKey, address, signer, }: {
        psbtHex: string;
        publicKey: string;
        address: string;
        signer: HdKeyring['signTransaction'];
    }): Promise<{
        psbtHex: string;
    }>;
    pushPsbt({ psbtHex, psbtBase64, }: {
        psbtHex?: string;
        psbtBase64?: string;
    }): Promise<{
        txId: string;
        rawTx: string;
        size: any;
        weight: any;
        fee: number;
        satsPerVByte: string;
    }>;
    finalizePsbtBase64(psbtBase64: any): Promise<any>;
    sendPsbt(txData: string, isDry?: boolean): Promise<{
        sentPsbt: any;
        sentPsbtBase64: string;
    }>;
    createSegwitSigner({ mnemonic, segwitAddress, hdPathWithIndex, }: {
        mnemonic: string;
        segwitAddress: string;
        hdPathWithIndex: string;
    }): Promise<any>;
    createTaprootSigner({ mnemonic, taprootAddress, hdPathWithIndex, }: {
        mnemonic: string;
        taprootAddress: string;
        hdPathWithIndex?: string;
    }): Promise<any>;
    createSigner({ mnemonic, fromAddress, hdPathWithIndex, }: {
        mnemonic: string;
        fromAddress: string;
        hdPathWithIndex: string;
    }): Promise<any>;
    getRuneBalance({ address }: {
        address: string;
    }): Promise<void>;
    getRuneOutpoints({ address }: {
        address: string;
    }): Promise<void>;
    inscriptionCommitTx({ content, spendAddress, spendPubKey, signer, altSpendPubKey, altSpendAddress, feeRate, }: {
        spendPubKey: string;
        altSpendPubKey?: string;
        spendAddress?: string;
        altSpendAddress?: string;
        signer: Signer;
        feeRate?: number;
        content: string;
    }): Promise<{
        commitPsbt: string;
        utxosUsedForFees: string[];
        fee: number;
    }>;
    inscriptionRevealTx({ receiverAddress, signer, content, feeRate, commitTxId, }: {
        receiverAddress: string;
        signer: Signer;
        content: string;
        feeRate: number;
        commitTxId: string;
    }): Promise<{
        revealTx: string;
    }>;
    sendBRC20({ fromAddress, fromPubKey, toAddress, spendPubKey, feeRate, altSpendPubKey, spendAddress, altSpendAddress, signer, token, amount, }: {
        fromAddress: string;
        fromPubKey: string;
        toAddress: string;
        spendPubKey: string;
        altSpendPubKey?: string;
        spendAddress?: string;
        altSpendAddress?: string;
        signer: Signer;
        feeRate: number;
        token?: string;
        amount?: number;
    }): Promise<{
        txId: string;
        rawTxn: string;
        sendBrc20Txids: any[];
        totalFee: number;
        totalSize: number;
        totalWeight: number;
        totalSatsPerVByte: number;
    }>;
    inscriptionSendTx({ toAddress, fromPubKey, spendPubKey, spendAddress, altSpendAddress, altSpendPubKey, feeRate, utxoId, utxosUsedForFees, }: {
        toAddress: string;
        fromPubKey: string;
        altSpendAddress: string;
        altSpendPubKey: string;
        spendAddress: string;
        spendPubKey: string;
        feeRate?: number;
        utxoId: string;
        utxosUsedForFees: string[];
    }): Promise<{
        sentPsbt: string;
    }>;
    sendOrdCollectible({ fromAddress, fromPubKey, toAddress, spendPubKey, feeRate, altSpendPubKey, spendAddress, altSpendAddress, signer, inscriptionId, }: {
        fromAddress: string;
        fromPubKey: string;
        toAddress: string;
        spendPubKey: string;
        feeRate?: number;
        altSpendPubKey?: string;
        spendAddress?: string;
        altSpendAddress?: string;
        signer: Signer;
        inscriptionId: string;
    }): Promise<{
        txId: string;
        rawTx: string;
        size: any;
        weight: any;
        fee: number;
        satsPerVByte: string;
    }>;
    createOrdCollectibleTx({ inscriptionId, fromAddress, fromPubKey, spendPubKey, spendAddress, toAddress, altSpendAddress, altSpendPubKey, feeRate, }: {
        fromAddress?: string;
        fromPubKey: string;
        toAddress: string;
        spendPubKey: string;
        feeRate?: number;
        altSpendPubKey?: string;
        spendAddress?: string;
        altSpendAddress?: string;
        inscriptionId: string;
    }): Promise<{
        rawPsbt: string;
        fee: number;
    }>;
    sendBtcEstimate({ feeRate, amount, altSpendPubKey, spendAddress, spendPubKey, altSpendAddress, }: {
        feeRate?: number;
        amount: number;
        altSpendPubKey?: string;
        spendAddress: string;
        spendPubKey: string;
        altSpendAddress?: string;
    }): Promise<any>;
    sendCollectibleEstimate({ spendAddress, altSpendAddress, feeRate, }: {
        feeRate?: number;
        altSpendAddress?: string;
        spendAddress?: string;
    }): Promise<any>;
    sendRuneEstimate({ spendAddress, altSpendAddress, feeRate, }: {
        feeRate?: number;
        altSpendAddress?: string;
        spendAddress?: string;
    }): Promise<any>;
    sendBrc20Estimate({ spendPubKey, feeRate, altSpendPubKey, spendAddress, altSpendAddress, }: {
        spendPubKey: string;
        altSpendPubKey?: string;
        spendAddress?: string;
        altSpendAddress?: string;
        feeRate?: number;
    }): Promise<any>;
    sendRune({ fromAddress, toAddress, spendPubKey, feeRate, altSpendPubKey, spendAddress, altSpendAddress, signer, runeId, amount, }: {
        fromAddress: string;
        toAddress: string;
        spendPubKey: string;
        altSpendPubKey?: string;
        spendAddress?: string;
        altSpendAddress?: string;
        signer: Signer;
        feeRate?: number;
        runeId?: string;
        amount?: number;
    }): Promise<{
        txId: string;
        rawTxn: string;
        weight: any;
        size: any;
        fee: number;
        satsPerVByte: string;
    }>;
    runeSendTx({ runeId, fromAddress, toAddress, amount, spendAddress, spendPubKey, altSpendPubKey, altSpendAddress, feeRate, }: {
        runeId: string;
        fromAddress: string;
        toAddress: string;
        amount: number;
        spendPubKey: string;
        altSpendPubKey?: string;
        spendAddress?: string;
        altSpendAddress?: string;
        feeRate?: number;
    }): Promise<{
        sendPsbt: string;
    }>;
    mintRune({ toAddress, spendPubKey, feeRate, altSpendPubKey, spendAddress, altSpendAddress, signer, runeId, amount, }: {
        toAddress: string;
        spendPubKey: string;
        altSpendPubKey?: string;
        spendAddress?: string;
        altSpendAddress?: string;
        signer: Signer;
        feeRate?: number;
        runeId?: string;
        amount?: number;
    }): Promise<{
        txId: string;
        rawTxn: string;
    }>;
    runeMintTx({ runeId, toAddress, amount, spendAddress, spendPubKey, altSpendPubKey, altSpendAddress, feeRate, }: {
        runeId: string;
        toAddress: string;
        amount: number;
        spendPubKey: string;
        altSpendPubKey?: string;
        spendAddress?: string;
        altSpendAddress?: string;
        feeRate?: number;
    }): Promise<{
        sendPsbt: string;
    }>;
}
