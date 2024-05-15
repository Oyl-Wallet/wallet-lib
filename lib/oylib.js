"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Oyl = exports.LEGACY_HD_PATH = exports.SEGWIT_HD_PATH = exports.TAPROOT_HD_PATH = exports.NESTED_SEGWIT_HD_PATH = void 0;
const constants_1 = require("./shared/constants");
const txbuilder_1 = require("./txbuilder");
const utils_1 = require("./shared/utils");
const transactions = __importStar(require("./transactions"));
const accounts_1 = require("./wallet/accounts");
const wallet_1 = require("./wallet");
const accountsManager_1 = require("./wallet/accountsManager");
const bip341_1 = require("bitcoinjs-lib/src/payments/bip341");
const interface_1 = require("./shared/interface");
const apiclient_1 = require("./apiclient");
const bitcoin = __importStar(require("bitcoinjs-lib"));
const provider_1 = require("./rpclient/provider");
const transactions_1 = require("./transactions");
const errors_1 = require("./errors");
const bip371_1 = require("bitcoinjs-lib/src/psbt/bip371");
exports.NESTED_SEGWIT_HD_PATH = "m/49'/0'/0'/0";
exports.TAPROOT_HD_PATH = "m/86'/0'/0'/0";
exports.SEGWIT_HD_PATH = "m/84'/0'/0'/0";
exports.LEGACY_HD_PATH = "m/44'/0'/0'/0";
const RequiredPath = [
    exports.LEGACY_HD_PATH,
    exports.NESTED_SEGWIT_HD_PATH,
    exports.SEGWIT_HD_PATH,
    exports.TAPROOT_HD_PATH,
];
class Oyl {
    network;
    sandshrewBtcClient;
    esploraRpc;
    ordRpc;
    provider;
    apiClient;
    derivPath;
    currentNetwork;
    /**
     * Initializes a new instance of the Wallet class.
     */
    constructor(opts = constants_1.defaultNetworkOptions.mainnet) {
        const options = {
            ...constants_1.defaultNetworkOptions[opts.network],
            ...opts,
        };
        const apiKey = options.projectId;
        this.apiClient = new apiclient_1.OylApiClient({
            host: 'https://api.oyl.gg',
            testnet: options.network == 'testnet' ? true : null,
            regtest: options.network == 'regtest' ? true : null,
            apiKey: apiKey,
        });
        const rpcUrl = `${options.baseUrl}/${options.version}/${options.projectId}`;
        const provider = new provider_1.Provider(rpcUrl);
        this.network = (0, utils_1.getNetwork)(options.network);
        this.sandshrewBtcClient = provider.sandshrew;
        this.esploraRpc = provider.esplora;
        this.ordRpc = provider.ord;
        this.currentNetwork =
            options.network === 'mainnet' ? 'main' : options.network;
    }
    /**
     * Gets a summary of the given address(es).
     * @param {string | string[]} address - A single address or an array of addresses.
     * @returns {Promise<Object[]>} A promise that resolves to an array of address summaries.
     */
    async getAddressSummary({ address, includeInscriptions, }) {
        const addressesUtxo = {};
        let utxos = await this.getUtxos(address, includeInscriptions);
        addressesUtxo['utxos'] = utxos.unspent_outputs;
        addressesUtxo['balance'] = transactions.calculateBalance(utxos.unspent_outputs);
        return addressesUtxo;
    }
    /**
     * Derives a Taproot address from the given public key.
     * @param {string} publicKey - The public key to derive the address from.
     * @returns {string} A promise that resolves to the derived Taproot address.
     */
    getTaprootAddress({ publicKey }) {
        try {
            const address = (0, accounts_1.publicKeyToAddress)(publicKey, interface_1.AddressType.P2TR, this.network);
            return address;
        }
        catch (err) {
            return err;
        }
    }
    /**
     * Retrieves details for a specific BRC-20 token associated with the given address.
     * @param {string} address - The address to query BRC-20 token details from.
     * @param {string} ticker - The ticker symbol of the BRC-20 token to retrieve details for.
     * @returns {Promise<TickerDetails>} A promise that resolves to the details of the specified BRC-20 token.
     */
    async getSingleBrcTickerDetails(address, ticker) {
        const response = await this.apiClient.getBrc20sByAddress(address);
        const tickerDetails = response.data.find((details) => details.ticker.toLowerCase() === ticker.toLowerCase());
        return tickerDetails;
    }
    /**
     * Initializes a wallet from a mnemonic phrase with the specified parameters.
     * @param {Object} options - The options object.
     * @param {string} options.mnemonic - The mnemonic phrase used to initialize the wallet.
     * @param {string} [options.type='taproot'] - The type of wallet to create. Options are 'taproot', 'segwit', 'legacy'.
     * @param {string} [options.hdPath=RequiredPath[3]] - The HD path to derive addresses from.
     * @returns {Promise<any>} A promise that resolves to the wallet data including keyring and assets.
     * @throws {Error} Throws an error if initialization fails.
     */
    async fromPhrase({ mnemonic, addrType = interface_1.AddressType.P2TR, hdPath = RequiredPath[3], }) {
        try {
            const wallet = await wallet_1.accounts.importMnemonic(mnemonic, hdPath, addrType, this.network);
            const data = {
                keyring: wallet,
            };
            return data;
        }
        catch (err) {
            return err;
        }
    }
    /**
     * Recovers a wallet using the given options.
     * @param {RecoverAccountOptions} options - Options necessary for account recovery.
     * @returns {Promise<any>} A promise that resolves to the recovered wallet payload.
     * @throws {Error} Throws an error if recovery fails.
     */
    async recoverWallet(options) {
        try {
            const wallet = new accountsManager_1.AccountManager({ ...options, network: this.network });
            const walletPayload = await wallet.recoverAccounts();
            return walletPayload;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Adds a new account to the wallet using the given options.
     * @param {RecoverAccountOptions} options - Options describing the account to be added.
     * @returns {Promise<any>} A promise that resolves to the payload of the newly added account.
     * @throws {Error} Throws an error if adding the account fails.
     */
    async addAccountToWallet(options) {
        try {
            const wallet = new accountsManager_1.AccountManager({ ...options, network: this.network });
            const walletPayload = await wallet.addAccount();
            return walletPayload;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Initializes a new Oyl account with taproot & segwit HDKeyrings  within the wallet.
     * @returns {Promise<any>} A promise that resolves to the payload of the initialized accounts.
     * @throws {Error} Throws an error if the initialization fails.
     */
    async initializeWallet() {
        try {
            const wallet = new accountsManager_1.AccountManager({
                network: this.network,
                customPath: this.network == (0, utils_1.getNetwork)('testnet') ? 'testnet' : null,
            });
            const walletPayload = await wallet.initializeAccounts();
            return walletPayload;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Derives a SegWit address from a given public key.
     * @param {Object} param0 - An object containing the public key.
     * @param {string} param0.publicKey - The public key to derive the SegWit address from.
     * @returns {Promise<string>} A promise that resolves to the derived SegWit address.
     * @throws {Error} Throws an error if address derivation fails.
     */
    async getSegwitAddress({ publicKey }) {
        const address = (0, accounts_1.publicKeyToAddress)(publicKey, interface_1.AddressType.P2WPKH, this.network);
        return address;
    }
    /**
     * Creates a new Oyl with an optional specific derivation type.
     * @param {object} param0 - Object containing the type of derivation.
     * @param {string} [param0.type] - Optional type of derivation path.
     * @returns {{keyring: HdKeyring, address: string}} The newly created wallet object.
     */
    createWallet({ type }) {
        try {
            let hdPath;
            let addrType;
            switch (type) {
                case 'taproot':
                    addrType = interface_1.AddressType.P2TR;
                    hdPath = RequiredPath[3];
                    break;
                case 'segwit':
                    addrType = interface_1.AddressType.P2WPKH;
                    hdPath = RequiredPath[2];
                    break;
                case 'nested-segwit':
                    addrType = interface_1.AddressType.P2SH_P2WPKH;
                    hdPath = RequiredPath[1];
                case 'legacy':
                    addrType = interface_1.AddressType.P2PKH;
                    hdPath = RequiredPath[0];
                    break;
                default:
                    addrType = interface_1.AddressType.P2TR;
                    hdPath = RequiredPath[3];
                    break;
            }
            const wallet = wallet_1.accounts.createWallet(hdPath, addrType, this.network);
            return wallet;
        }
        catch (err) {
            return err;
        }
    }
    /**
     * Fetches the balance details including confirmed and pending amounts for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address for which to fetch balance details.
     * @returns {Promise<any>} A promise that resolves to an object containing balance and its USD value.
     * @throws {Error} Throws an error if the balance retrieval fails.
     */
    async getTaprootBalance({ address }) {
        const balance = await this.apiClient.getTaprootBalance(address);
        return balance;
    }
    /**
     * Fetches the balance details including confirmed and pending amounts for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address for which to fetch balance details.
     * @returns {Promise<any>} A promise that resolves to an object containing balance and its USD value.
     * @throws {Error} Throws an error if the balance retrieval fails.
     */
    async getAddressBalance({ address }) {
        const balance = await this.apiClient.getAddressBalance(address);
        return balance;
    }
    async getUtxos(address, includeInscriptions = true) {
        const utxosResponse = await this.esploraRpc.getAddressUtxo(address);
        const formattedUtxos = [];
        let filtered = utxosResponse;
        if (!includeInscriptions) {
            filtered = utxosResponse.filter((utxo) => utxo.value > 546);
        }
        for (const utxo of filtered) {
            if (utxo.txid) {
                const transactionDetails = await this.esploraRpc.getTxInfo(utxo.txid);
                const voutEntry = transactionDetails.vout.find((v) => v.scriptpubkey_address === address);
                formattedUtxos.push({
                    tx_hash_big_endian: utxo.txid,
                    tx_output_n: utxo.vout,
                    value: utxo.value,
                    confirmations: utxo.status.confirmed ? 3 : 0,
                    script: voutEntry.scriptpubkey,
                    tx_index: 0,
                });
            }
        }
        return { unspent_outputs: formattedUtxos };
    }
    /**
     * Retrieves the transaction history for a given address and processes the transactions.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address for which to fetch transaction history.
     * @returns {Promise<any[]>} A promise that resolves to an array of processed transaction details.
     * @throws {Error} Throws an error if transaction history retrieval fails.
     */
    async getTxHistory({ addresses }) {
        try {
            if (addresses.length > 2) {
                throw new Error('Only accepts a max of 2 addresses');
            }
            const utxoPromises = addresses.map((address, index) => this.esploraRpc._call('esplora_address::txs', [address]));
            const currentBlock = await this.esploraRpc._call('esplora_blocks:tip:height', []);
            const resolvedUtxoPromises = await Promise.all(utxoPromises);
            const combinedHistory = resolvedUtxoPromises.flat();
            const removedDuplicatesArray = new Map(combinedHistory.map((item) => [item.txid, item]));
            const finalCombinedHistory = Array.from(removedDuplicatesArray.values());
            const processedTxns = finalCombinedHistory.map((tx) => {
                const { txid, vout, size, vin, status, fee } = tx;
                const blockDelta = currentBlock - status.block_height + 1;
                const confirmations = blockDelta > 0 ? blockDelta : 0;
                const inputAddress = vin.find(({ prevout }) => prevout.scriptpubkey_address === addresses[0] ||
                    prevout.scriptpubkey_address === addresses[1]);
                let vinSum = 0;
                let voutSum = 0;
                for (let input of vin) {
                    if (addresses.includes(input.prevout.scriptpubkey_address)) {
                        vinSum += input.prevout.value;
                    }
                }
                for (let output of vout) {
                    if (addresses.includes(output.scriptpubkey_address)) {
                        voutSum += output.value;
                    }
                }
                const txDetails = {};
                txDetails['txId'] = txid;
                txDetails['confirmations'] = confirmations;
                txDetails['type'] = inputAddress ? 'sent' : 'received';
                txDetails['blockTime'] = status.block_time;
                txDetails['blockHeight'] = status.block_height;
                txDetails['fee'] = fee;
                txDetails['feeRate'] = Math.floor(fee / size);
                txDetails['vinSum'] = vinSum;
                txDetails['voutSum'] = voutSum;
                txDetails['amount'] = inputAddress ? vinSum - voutSum - fee : voutSum;
                txDetails['symbol'] = 'BTC';
                return txDetails;
            });
            return processedTxns;
        }
        catch (error) {
            console.log(error);
            throw new Error('Error fetching txn history');
        }
    }
    async getTaprootTxHistory({ taprootAddress, totalTxs = 20, }) {
        const addressType = (0, transactions_1.getAddressType)(taprootAddress);
        if (addressType === 1) {
            return await this.apiClient.getTaprootTxHistory(taprootAddress, totalTxs);
        }
        else {
            throw new Error('Invalid address type');
        }
    }
    /**
     * Retrieves a list of inscriptions for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address to query for inscriptions.
     * @returns {Promise<Array<any>>} A promise that resolves to an array of inscription details.
     */
    async getInscriptions({ address }) {
        const collectibles = [];
        const brc20 = [];
        const runes = [];
        const allRunes = await this.apiClient.getRuneOutpoints({ address });
        const allOrdinals = (await this.apiClient.getAllInscriptionsByAddress(address)).data;
        const allCollectibles = allOrdinals?.filter((ordinal) => ordinal.mime_type.includes('image'));
        const allBrc20s = allOrdinals?.filter((ordinal) => ordinal.mime_type.includes('text/plain'));
        if (!allBrc20s) {
            throw new Error('Error fetching brc20s');
        }
        if (!allCollectibles) {
            throw new Error('Error fetching collectibles');
        }
        for (const artifact of allCollectibles) {
            const { inscription_id, inscription_number, satpoint } = artifact;
            const content = await this.ordRpc.getInscriptionContent(inscription_id);
            const detail = {
                id: inscription_id,
                address: artifact.owner_wallet_addr,
                content: content,
                location: satpoint,
            };
            collectibles.push({
                id: inscription_id,
                inscription_number,
                detail,
            });
        }
        for (const artifact of allBrc20s) {
            const { inscription_id, inscription_number, satpoint } = artifact;
            const content = await this.ordRpc.getInscriptionContent(inscription_id);
            const decodedContent = atob(content);
            if ((0, utils_1.isValidJSON)(decodedContent) && JSON.parse(decodedContent)) {
                const detail = {
                    id: inscription_id,
                    address: artifact.owner_wallet_addr,
                    content: content,
                    location: satpoint,
                };
                brc20.push({
                    id: inscription_id,
                    inscription_number,
                    detail,
                });
            }
        }
        for (const artifact of allRunes) {
            const { outpoint_id, rune_id, amount } = artifact;
            const { entry } = await this.ordRpc.getRuneById(rune_id);
            const detail = {
                runeId: rune_id,
                outpoint_id: outpoint_id,
                name: entry?.spaced_rune,
                symbol: entry?.symbol,
                divisibility: entry?.divisibility,
                amount: amount,
                mints: entry?.mints,
                burned: entry?.burned,
                terms: entry?.terms,
            };
            runes.push({
                txId: outpoint_id.split(':')[0],
                outputIndex: outpoint_id.split(':')[1],
                detail,
            });
        }
        return { collectibles, brc20, runes };
    }
    /**
     * Retrieves UTXO artifacts for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address to query for UTXO artifacts.
     * @returns A promise that resolves to the UTXO artifacts.
     */
    async getUtxosArtifacts({ address }) {
        const { unspent_outputs } = await this.getUtxos(address, true);
        const inscriptions = await this.getInscriptions({
            address,
        });
        const utxoArtifacts = await transactions.getMetaUtxos(address, unspent_outputs, inscriptions);
        return utxoArtifacts;
    }
    async getSpendableUtxos(address) {
        const addressType = (0, transactions_1.getAddressType)(address);
        const utxosResponse = await this.esploraRpc.getAddressUtxo(address);
        const formattedUtxos = [];
        let filtered = utxosResponse;
        for (const utxo of filtered) {
            const hasInscription = await this.ordRpc.getTxOutput(utxo.txid + ':' + utxo.vout);
            let hasRune = false;
            if (this.currentNetwork != 'regtest') {
                hasRune = await this.apiClient.getOutputRune({
                    output: utxo.txid + ':' + utxo.vout,
                });
            }
            if (hasInscription.inscriptions.length === 0 &&
                hasInscription.runes.length === 0 &&
                hasInscription.value !== 546 &&
                !hasRune?.output) {
                const transactionDetails = await this.esploraRpc.getTxInfo(utxo.txid);
                const blockHeight = await this.sandshrewBtcClient.bitcoindRpc.getBlockCount();
                const voutEntry = transactionDetails.vout.find((v) => v.scriptpubkey_address === address);
                if (utxo.status.confirmed) {
                    formattedUtxos.push({
                        txId: utxo.txid,
                        outputIndex: utxo.vout,
                        satoshis: utxo.value,
                        confirmations: utxo.status.confirmed
                            ? blockHeight - utxo.status.block_height
                            : 0,
                        scriptPk: voutEntry.scriptpubkey,
                        address: address,
                        addressType: addressType,
                        inscriptions: [],
                    });
                }
            }
        }
        if (formattedUtxos.length === 0) {
            return undefined;
        }
        const sortedUtxos = formattedUtxos.sort((a, b) => b.satoshis - a.satoshis);
        return sortedUtxos;
    }
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
    async sendBtc({ toAddress, feeRate, amount, altSpendPubKey, spendAddress, spendPubKey, altSpendAddress, signer, }) {
        const addressType = (0, transactions_1.getAddressType)(toAddress);
        if (utils_1.addressTypeMap[addressType] === 'p2pkh') {
            throw new Error('Sending bitcoin to legacy address is not supported');
        }
        if (utils_1.addressTypeMap[addressType] === 'p2sh') {
            throw new Error('Sending bitcoin to a nested-segwit address is not supported');
        }
        let spendUtxos;
        let altSpendUtxos;
        spendUtxos = await this.getSpendableUtxos(spendAddress);
        if (!spendUtxos && altSpendAddress) {
            altSpendUtxos = await this.getSpendableUtxos(altSpendAddress);
            if (!altSpendUtxos) {
                throw new Error('No utxos to spend available');
            }
        }
        if (!feeRate) {
            feeRate = (await this.esploraRpc.getFeeEstimates())['1'];
        }
        const { rawPsbt } = await this.createBtcTx({
            toAddress,
            spendPubKey,
            feeRate,
            amount,
            network: this.network,
            spendUtxos,
            spendAddress,
            altSpendPubKey,
            altSpendUtxos,
        });
        const { signedPsbt: segwitSigned } = await signer.signAllSegwitInputs({
            rawPsbt: rawPsbt,
            finalize: true,
        });
        const { raw } = await signer.signAllTaprootInputs({
            rawPsbt: segwitSigned,
            finalize: true,
        });
        const fee = Math.ceil(raw.extractTransaction().weight() / 4) * feeRate;
        const { rawPsbt: finalRawPsbt } = await this.createBtcTx({
            toAddress,
            spendPubKey,
            feeRate,
            amount,
            network: this.network,
            spendUtxos,
            spendAddress,
            altSpendPubKey,
            altSpendUtxos,
            fee,
        });
        const { signedPsbt: segwitSigned1 } = await signer.signAllSegwitInputs({
            rawPsbt: finalRawPsbt,
            finalize: true,
        });
        const { signedPsbt: taprootSigned1 } = await signer.signAllTaprootInputs({
            rawPsbt: segwitSigned1,
            finalize: true,
        });
        return this.pushPsbt({ psbtBase64: taprootSigned1 });
    }
    async createBtcTx({ toAddress, spendPubKey, feeRate, amount, network, spendUtxos, spendAddress, altSpendPubKey, altSpendUtxos, fee, }) {
        const psbt = new bitcoin.Psbt({ network: network });
        const addressType = (0, transactions_1.getAddressType)(toAddress);
        if (utils_1.addressTypeMap[addressType] === 'p2pkh') {
            throw new Error('Sending bitcoin to legacy address is not supported');
        }
        if (utils_1.addressTypeMap[addressType] === 'p2sh') {
            throw new Error('Sending bitcoin to a nested-segwit address is not supported');
        }
        let { psbt: updatedPsbt, fee: estimateFee } = await (0, utils_1.addBtcUtxo)({
            spendUtxos,
            psbt: psbt,
            toAddress,
            amount: amount,
            feeRate,
            network,
            spendAddress,
            spendPubKey,
            altSpendPubKey,
            altSpendUtxos,
            fee,
        });
        return {
            rawPsbt: updatedPsbt.toBase64(),
            fee: estimateFee,
        };
    }
    /**
     * Retrieves information about a SegWit address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The SegWit address to validate and get information for.
     * @returns {Promise<Object>} A promise that resolves to an object containing validity status and summary of the address.
     */
    async getSegwitAddressInfo({ address }) {
        const isValid = transactions.validateSegwitAddress({
            address,
            type: 'segwit',
        });
        if (!isValid) {
            return { isValid, summary: null };
        }
        const summary = await this.getAddressSummary({
            address,
        });
        return { isValid, summary };
    }
    /**
     * Retrieves information about a Taproot address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The Taproot address to validate and get information for.
     * @returns {Promise<Object>} A promise that resolves to an object containing validity status and summary of the address.
     */
    async getTaprootAddressInfo({ address }) {
        const isValid = transactions.validateTaprootAddress({
            address,
            type: 'taproot',
        });
        if (!isValid) {
            return { isValid, summary: null };
        }
        const summary = await this.getAddressSummary({
            address,
            includeInscriptions: false,
        });
        return { isValid, summary };
    }
    /**
     * Fetches offers associated with a specific BRC20 ticker.
     * @param {Object} params - The parameters containing the ticker information.
     * @param {string} params.ticker - The ticker symbol to retrieve offers for.
     * @returns {Promise<any>} A promise that resolves to an array of offers.
     */
    async getBrcOffers({ ticker }) {
        const offers = await this.apiClient.getOkxTickerOffers({ ticker: ticker });
        return offers;
    }
    /**
     * Fetches aggregated offers associated with a specific BRC20 ticker.
     * @param {Object} params - The parameters containing the ticker information.
     * @param {string} params.ticker - The ticker symbol to retrieve offers for.
     * @param {}
     * @returns {Promise<any>} A promise that resolves to an array of offers.
     */
    async getAggregatedBrcOffers({ ticker, limitOrderAmount, }) {
        const offers = await this.apiClient.getAggregatedOffers({
            ticker,
            limitOrderAmount,
        });
        return offers;
    }
    /**
     * Lists BRC20 tokens associated with an address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The address to list BRC20 tokens for.
     * @returns {Promise<any>} A promise that resolves to an array of BRC20 tokens.
     */
    async listBrc20s({ address }) {
        const tokens = await this.apiClient.getBrc20sByAddress(address);
        for (let i = 0; i < tokens.data.length; i++) {
            const details = await this.apiClient.getBrc20TokenDetails(tokens.data[i].ticker);
            tokens.data[i]['details'] = details.data;
        }
        return tokens;
    }
    /**
     * Lists inscribed collectibles associated with an address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The address to list collectibles for.
     * @returns {Promise<any>} A promise that resolves to an array of collectibles.
     */
    async listCollectibles({ address }) {
        return await this.apiClient.getCollectiblesByAddress(address);
    }
    /**
     * Retrieves a specific inscribed collectible by its ID.
     * @param {string} inscriptionId - The ID of the collectible to retrieve.
     * @returns {Promise<any>} A promise that resolves to the collectible data.
     */
    async getCollectibleById(inscriptionId) {
        const data = await this.ordRpc.getInscriptionById(inscriptionId);
        return data;
    }
    async signPsbt({ psbtHex, publicKey, address, signer, }) {
        const addressType = (0, transactions_1.getAddressType)(address);
        const tx = new txbuilder_1.OGPSBTTransaction(signer, address, publicKey, addressType, this.network);
        const psbt = bitcoin.Psbt.fromHex(psbtHex, { network: this.network });
        const signedPsbt = await tx.signPsbt(psbt);
        return {
            psbtHex: signedPsbt.toHex(),
        };
    }
    async pushPsbt({ psbtHex, psbtBase64, }) {
        if (!psbtHex && !psbtBase64) {
            throw new Error('Please supply psbt in either base64 or hex format');
        }
        if (psbtHex && psbtBase64) {
            throw new Error('Please select one format of psbt to broadcast');
        }
        let psbt;
        if (psbtHex) {
            psbt = bitcoin.Psbt.fromHex(psbtHex, { network: this.network });
        }
        if (psbtBase64) {
            psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: this.network });
        }
        let extractedTx;
        try {
            extractedTx = psbt.extractTransaction();
        }
        catch (error) {
            throw new Error('Transaction could not be extracted do to invalid Psbt.');
        }
        const txId = extractedTx.getId();
        const rawTx = extractedTx.toHex();
        const [result] = await this.sandshrewBtcClient.bitcoindRpc.testMemPoolAccept([rawTx]);
        if (!result.allowed) {
            throw new Error(result['reject-reason']);
        }
        await this.sandshrewBtcClient.bitcoindRpc.sendRawTransaction(rawTx);
        await (0, utils_1.waitForTransaction)({
            txId,
            sandshrewBtcClient: this.sandshrewBtcClient,
        });
        const txInMemPool = await this.sandshrewBtcClient.bitcoindRpc.getMemPoolEntry(txId);
        const fee = txInMemPool.fees['base'] * 10 ** 8;
        return {
            txId,
            rawTx,
            size: txInMemPool.vsize,
            weight: txInMemPool.weight,
            fee: fee,
            satsPerVByte: (fee / (txInMemPool.weight / 4)).toFixed(2),
        };
    }
    async finalizePsbtBase64(psbtBase64) {
        try {
            const { hex: finalizedPsbtHex } = await this.sandshrewBtcClient._call('btc_finalizepsbt', [`${psbtBase64}`]);
            return finalizedPsbtHex;
        }
        catch (e) {
            console.log(e);
            throw new Error(e);
        }
    }
    async sendPsbt(txData, isDry) {
        try {
            if (isDry) {
                const response = await this.sandshrewBtcClient._call('btc_testmempoolaccept', [`${txData}`]);
                console.log({ response });
            }
            else {
                const { hex: txHex } = await this.sandshrewBtcClient._call('btc_sendrawtransaction', [`${txData}`]);
                return {
                    sentPsbt: txHex,
                    sentPsbtBase64: Buffer.from(txHex, 'hex').toString('base64'),
                };
            }
        }
        catch (e) {
            console.log(e);
            throw new Error(e);
        }
    }
    async createSegwitSigner({ mnemonic, segwitAddress, hdPathWithIndex, }) {
        const segwitAddressType = transactions.getAddressType(segwitAddress);
        if (segwitAddressType == null) {
            throw Error('Unrecognized Address Type');
        }
        const segwitPayload = await this.fromPhrase({
            mnemonic: mnemonic.trim(),
            hdPath: hdPathWithIndex,
            addrType: segwitAddressType,
        });
        const segwitKeyring = segwitPayload.keyring.keyring;
        const segwitSigner = segwitKeyring.signTransaction.bind(segwitKeyring);
        return segwitSigner;
    }
    async createTaprootSigner({ mnemonic, taprootAddress, hdPathWithIndex = accountsManager_1.customPaths['oyl']['taprootPath'], }) {
        const addressType = transactions.getAddressType(taprootAddress);
        if (addressType == null) {
            throw Error('Unrecognized Address Type');
        }
        const tapPayload = await this.fromPhrase({
            mnemonic: mnemonic.trim(),
            hdPath: hdPathWithIndex,
            addrType: addressType,
        });
        const tapKeyring = tapPayload.keyring.keyring;
        const taprootSigner = tapKeyring.signTransaction.bind(tapKeyring);
        return taprootSigner;
    }
    async createSigner({ mnemonic, fromAddress, hdPathWithIndex, }) {
        const addressType = transactions.getAddressType(fromAddress);
        if (addressType == null) {
            throw Error('Unrecognized Address Type');
        }
        const tapPayload = await this.fromPhrase({
            mnemonic: mnemonic.trim(),
            hdPath: hdPathWithIndex,
            addrType: addressType,
        });
        const tapKeyring = tapPayload.keyring.keyring;
        const taprootSigner = tapKeyring.signTransaction.bind(tapKeyring);
        return taprootSigner;
    }
    async getRuneBalance({ address }) {
        await this.apiClient.getRuneBalance({
            address,
        });
    }
    async getRuneOutpoints({ address }) {
        await this.apiClient.getRuneOutpoints({
            address,
        });
    }
    async inscriptionCommitTx({ content, spendAddress, spendPubKey, signer, altSpendPubKey, altSpendAddress, feeRate, fee = 0, }) {
        const commitTxSize = (0, utils_1.calculateTaprootTxSize)(1, 0, 2);
        const feeForCommit = commitTxSize * feeRate < 250 ? 250 : commitTxSize * feeRate;
        const revealTxSize = (0, utils_1.calculateTaprootTxSize)(1, 0, 2);
        const feeForReveal = revealTxSize * feeRate < 250 ? 250 : revealTxSize * feeRate;
        const baseEstimate = Number(feeForCommit) + Number(feeForReveal) + utils_1.inscriptionSats;
        let amountNeededForInscribe = fee !== 0 ? fee + Number(feeForReveal) + utils_1.inscriptionSats : baseEstimate;
        const utxosUsedForFees = [];
        let usingAlt = false;
        let spendUtxos;
        let altSpendUtxos;
        spendUtxos = await this.getSpendableUtxos(spendAddress);
        if (!spendUtxos && altSpendAddress) {
            altSpendUtxos = await this.getSpendableUtxos(altSpendAddress);
            if (!altSpendUtxos) {
                throw new Error('No utxos to spend available');
            }
        }
        const psbt = new bitcoin.Psbt({ network: this.network });
        const script = (0, utils_1.createInscriptionScript)((0, bip371_1.toXOnly)((0, utils_1.tweakSigner)(signer.taprootKeyPair).publicKey), content);
        const outputScript = bitcoin.script.compile(script);
        const inscriberInfo = bitcoin.payments.p2tr({
            internalPubkey: (0, bip371_1.toXOnly)((0, utils_1.tweakSigner)(signer.taprootKeyPair).publicKey),
            scriptTree: { output: outputScript },
            network: this.network,
        });
        psbt.addOutput({
            value: Number(feeForReveal) + utils_1.inscriptionSats,
            address: inscriberInfo.address,
        });
        let utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(spendUtxos, amountNeededForInscribe);
        if (utxosToPayFee?.selectedUtxos.length > 1) {
            const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToPayFee.selectedUtxos.length, 0, 2);
            amountNeededForInscribe = fee
                ? fee + Number(feeForReveal) + utils_1.inscriptionSats
                : Number(txSize * feeRate < 250 ? 250 : txSize * feeRate) +
                    Number(feeForReveal) +
                    utils_1.inscriptionSats;
            utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(spendUtxos, amountNeededForInscribe);
        }
        if (!utxosToPayFee) {
            utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(altSpendUtxos, amountNeededForInscribe);
            if (utxosToPayFee?.selectedUtxos.length > 1) {
                const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToPayFee.selectedUtxos.length, 0, 2);
                amountNeededForInscribe = fee
                    ? fee + Number(feeForReveal) + utils_1.inscriptionSats
                    : Number(txSize * feeRate < 250 ? 250 : txSize * feeRate) +
                        Number(feeForReveal) +
                        utils_1.inscriptionSats;
                utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(altSpendUtxos, amountNeededForInscribe);
                if (!utxosToPayFee) {
                    throw new Error('Insufficient Balance');
                }
                usingAlt = true;
            }
        }
        const feeAmountGathered = (0, utils_1.calculateAmountGatheredUtxo)(utxosToPayFee.selectedUtxos);
        const changeAmount = feeAmountGathered - (fee + utils_1.inscriptionSats + Number(feeForReveal));
        for (let i = 0; i < utxosToPayFee.selectedUtxos.length; i++) {
            utxosUsedForFees.push(utxosToPayFee.selectedUtxos[i].txId);
            psbt.addInput({
                hash: utxosToPayFee.selectedUtxos[i].txId,
                index: utxosToPayFee.selectedUtxos[i].outputIndex,
                witnessUtxo: {
                    value: utxosToPayFee.selectedUtxos[i].satoshis,
                    script: Buffer.from(utxosToPayFee.selectedUtxos[i].scriptPk, 'hex'),
                },
            });
        }
        psbt.addOutput({
            address: spendAddress,
            value: changeAmount,
        });
        const formattedPsbt = await (0, utils_1.formatInputsToSign)({
            _psbt: psbt,
            senderPublicKey: usingAlt ? altSpendPubKey : spendPubKey,
            network: this.network,
        });
        return {
            commitPsbt: formattedPsbt.toBase64(),
            utxosUsedForFees: utxosUsedForFees,
            script: outputScript,
        };
    }
    async inscriptionRevealTx({ receiverAddress, script, signer, commitTxId, fee = 0, feeRate, }) {
        const revealTxSize = (0, utils_1.calculateTaprootTxSize)(1, 0, 2);
        const revealTxBaseFee = revealTxSize * feeRate < 250 ? 250 : revealTxSize * feeRate;
        const revealTxFinalFee = Number(revealTxBaseFee) - fee;
        const commitTxOutput = await (0, utils_1.getOutputValueByVOutIndex)({
            txId: commitTxId,
            vOut: 0,
            esploraRpc: this.esploraRpc,
        });
        if (!commitTxOutput) {
            throw new Error('ERROR GETTING FIRST INPUT VALUE');
        }
        const psbt = new bitcoin.Psbt({ network: this.network });
        const p2pk_redeem = { output: script };
        const { output, witness } = bitcoin.payments.p2tr({
            internalPubkey: (0, bip371_1.toXOnly)((0, utils_1.tweakSigner)(signer.taprootKeyPair).publicKey),
            scriptTree: p2pk_redeem,
            redeem: p2pk_redeem,
            network: this.network,
        });
        psbt.addInput({
            hash: commitTxId,
            index: 0,
            witnessUtxo: {
                value: commitTxOutput.value,
                script: output,
            },
            tapLeafScript: [
                {
                    leafVersion: bip341_1.LEAF_VERSION_TAPSCRIPT,
                    script: p2pk_redeem.output,
                    controlBlock: witness[witness.length - 1],
                },
            ],
        });
        psbt.addOutput({
            value: utils_1.inscriptionSats,
            address: receiverAddress,
        });
        if (revealTxFinalFee > 546) {
            psbt.addOutput({
                value: revealTxFinalFee,
                address: receiverAddress,
            });
        }
        psbt.signInput(0, (0, utils_1.tweakSigner)(signer.taprootKeyPair));
        psbt.finalizeInput(0);
        return {
            revealPsbt: psbt.toBase64(),
            revealRaw: psbt,
        };
    }
    async sendBRC20({ fromAddress, fromPubKey, toAddress, spendPubKey, feeRate, altSpendPubKey, spendAddress, altSpendAddress, signer, token, amount, }) {
        let successTxIds = [];
        try {
            const content = `{"p":"brc-20","op":"transfer","tick":"${token}","amt":"${amount}"}`;
            const { commitPsbt, utxosUsedForFees, script } = await this.inscriptionCommitTx({
                content,
                spendAddress,
                spendPubKey,
                signer,
                altSpendPubKey,
                altSpendAddress,
                feeRate,
            });
            const { signedPsbt: segwitSigned } = await signer.signAllSegwitInputs({
                rawPsbt: commitPsbt,
                finalize: true,
            });
            const { raw } = await signer.signAllTaprootInputs({
                rawPsbt: segwitSigned,
                finalize: true,
            });
            const commitFee = Math.ceil(raw.extractTransaction().weight() / 4) * feeRate;
            const { commitPsbt: finalCommitPsbt } = await this.inscriptionCommitTx({
                content,
                spendAddress,
                spendPubKey,
                signer,
                altSpendPubKey,
                altSpendAddress,
                feeRate,
                fee: commitFee,
            });
            const { signedPsbt: segwitSigned1 } = await signer.signAllSegwitInputs({
                rawPsbt: finalCommitPsbt,
                finalize: true,
            });
            const { signedPsbt: taprootSigned1 } = await signer.signAllTaprootInputs({
                rawPsbt: segwitSigned1,
                finalize: true,
            });
            const { txId: commitTxId } = await this.pushPsbt({
                psbtBase64: taprootSigned1,
            });
            successTxIds.push(commitTxId);
            await (0, utils_1.waitForTransaction)({
                txId: commitTxId,
                sandshrewBtcClient: this.sandshrewBtcClient,
            });
            const { revealRaw } = await this.inscriptionRevealTx({
                receiverAddress: fromAddress,
                signer,
                script,
                commitTxId: commitTxId,
                feeRate,
            });
            const revealFee = Math.ceil(revealRaw.extractTransaction().weight() / 4) * feeRate;
            const { revealPsbt } = await this.inscriptionRevealTx({
                receiverAddress: fromAddress,
                signer,
                script,
                commitTxId: commitTxId,
                fee: revealFee,
                feeRate,
            });
            const { signedPsbt: taprootRevealSigned } = await signer.signAllTaprootInputs({
                rawPsbt: revealPsbt,
                finalize: true,
            });
            const { txId: revealTxId } = await this.pushPsbt({
                psbtBase64: taprootRevealSigned,
            });
            if (!revealTxId) {
                throw new Error('Unable to reveal inscription.');
            }
            successTxIds.push(revealTxId);
            await (0, utils_1.waitForTransaction)({
                txId: revealTxId,
                sandshrewBtcClient: this.sandshrewBtcClient,
            });
            await (0, utils_1.delay)(3000);
            const { sentPsbt: sentRawPsbt } = await this.inscriptionSendTx({
                toAddress,
                fromPubKey,
                spendPubKey,
                spendAddress,
                altSpendAddress,
                altSpendPubKey,
                feeRate,
                utxoId: revealTxId,
                utxosUsedForFees: utxosUsedForFees,
            });
            const { signedPsbt: segwitSendSignedPsbt } = await signer.signAllSegwitInputs({
                rawPsbt: sentRawPsbt,
                finalize: true,
            });
            const { raw: rawSend } = await signer.signAllTaprootInputs({
                rawPsbt: segwitSendSignedPsbt,
                finalize: true,
            });
            const sendFee = Math.ceil(rawSend.extractTransaction().weight() / 4) * feeRate;
            const { sentPsbt: sentRawPsbt1 } = await this.inscriptionSendTx({
                toAddress,
                fromPubKey,
                spendPubKey,
                spendAddress,
                altSpendAddress,
                altSpendPubKey,
                feeRate,
                utxoId: revealTxId,
                utxosUsedForFees: utxosUsedForFees,
                fee: sendFee,
            });
            const { signedPsbt: segwitSendSignedPsbt1 } = await signer.signAllSegwitInputs({
                rawPsbt: sentRawPsbt1,
                finalize: true,
            });
            const { signedPsbt: taprootSendSignedPsbt1 } = await signer.signAllTaprootInputs({
                rawPsbt: segwitSendSignedPsbt1,
                finalize: true,
            });
            const { txId: sentPsbtTxId } = await this.pushPsbt({
                psbtBase64: taprootSendSignedPsbt1,
            });
            return {
                txId: sentPsbtTxId,
                rawTxn: taprootSendSignedPsbt1,
                sendBrc20Txids: [...successTxIds, sentPsbtTxId],
            };
        }
        catch (err) {
            throw new errors_1.OylTransactionError(err, successTxIds);
        }
    }
    async inscriptionSendTx({ toAddress, fromPubKey, spendPubKey, spendAddress, altSpendAddress, altSpendPubKey, feeRate, utxoId, utxosUsedForFees, fee = 0, }) {
        if (!feeRate) {
            feeRate = (await this.esploraRpc.getFeeEstimates())['1'];
        }
        const txSize = (0, utils_1.calculateTaprootTxSize)(2, 0, 2);
        const sendTxFee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
        let finalFee = fee ? fee : sendTxFee;
        let usingAlt = false;
        let spendUtxos;
        let altSpendUtxos;
        spendUtxos = await this.getSpendableUtxos(spendAddress);
        if (!spendUtxos && altSpendAddress) {
            altSpendUtxos = await this.getSpendableUtxos(altSpendAddress);
            if (!altSpendUtxos) {
                throw new Error('No utxos to spend available');
            }
        }
        const utxoInfo = await this.esploraRpc.getTxInfo(utxoId);
        const psbt = new bitcoin.Psbt({ network: this.network });
        psbt.addInput({
            hash: utxoId,
            index: 0,
            witnessUtxo: {
                script: Buffer.from(utxoInfo.vout[0].scriptpubkey, 'hex'),
                value: 546,
            },
        });
        psbt.addOutput({
            address: toAddress,
            value: 546,
        });
        let availableUtxos = spendUtxos.filter((utxo) => !utxosUsedForFees.includes(utxo.txId));
        let utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, finalFee);
        if (utxosToPayFee?.selectedUtxos.length > 1) {
            const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToPayFee.selectedUtxos.length, 0, 2);
            const sendTxFee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
            const finalFee = sendTxFee - fee;
            utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, finalFee);
        }
        if (!utxosToPayFee) {
            let availableUtxos = altSpendUtxos.filter((utxo) => !utxosUsedForFees.includes(utxo.txId));
            utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, finalFee);
            if (utxosToPayFee?.selectedUtxos.length > 1) {
                const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToPayFee.selectedUtxos.length, 0, 2);
                const sendTxFee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
                const finalFee = sendTxFee - fee;
                utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, finalFee);
            }
            if (!utxosToPayFee) {
                throw new Error('Insufficient Balance');
            }
            usingAlt = true;
        }
        const amountGathered = (0, utils_1.calculateAmountGatheredUtxo)(utxosToPayFee.selectedUtxos);
        const changeAmount = amountGathered - finalFee;
        for (let i = 0; i < utxosToPayFee.selectedUtxos.length; i++) {
            psbt.addInput({
                hash: utxosToPayFee.selectedUtxos[i].txId,
                index: utxosToPayFee.selectedUtxos[i].outputIndex,
                witnessUtxo: {
                    value: utxosToPayFee.selectedUtxos[i].satoshis,
                    script: Buffer.from(utxosToPayFee.selectedUtxos[i].scriptPk, 'hex'),
                },
            });
        }
        psbt.addOutput({
            address: spendAddress,
            value: changeAmount,
        });
        const partiallyFormattedPsbtTx = await (0, utils_1.formatInputsToSign)({
            _psbt: psbt,
            senderPublicKey: fromPubKey,
            network: this.network,
        });
        const formattedPsbt = await (0, utils_1.formatInputsToSign)({
            _psbt: partiallyFormattedPsbtTx,
            senderPublicKey: usingAlt ? altSpendPubKey : spendPubKey,
            network: this.network,
        });
        return { sentPsbt: formattedPsbt.toBase64() };
    }
    async sendOrdCollectible({ fromAddress, fromPubKey, toAddress, spendPubKey, feeRate, altSpendPubKey, spendAddress, altSpendAddress, signer, inscriptionId, }) {
        if (!feeRate) {
            feeRate = (await this.esploraRpc.getFeeEstimates())['1'];
        }
        const { rawPsbt } = await this.createOrdCollectibleTx({
            inscriptionId,
            fromAddress,
            fromPubKey,
            spendPubKey,
            spendAddress,
            toAddress,
            altSpendAddress,
            altSpendPubKey,
            feeRate,
        });
        const { signedPsbt: segwitSigned } = await signer.signAllSegwitInputs({
            rawPsbt: rawPsbt,
            finalize: true,
        });
        const { raw } = await signer.signAllTaprootInputs({
            rawPsbt: segwitSigned,
            finalize: true,
        });
        const fee = Math.ceil(raw.extractTransaction().virtualSize()) * feeRate;
        const { rawPsbt: finalRawPsbt } = await this.createOrdCollectibleTx({
            inscriptionId,
            fromAddress,
            fromPubKey,
            spendPubKey,
            spendAddress,
            toAddress,
            altSpendAddress,
            altSpendPubKey,
            feeRate,
            fee,
        });
        const { signedPsbt: segwitSigned1 } = await signer.signAllSegwitInputs({
            rawPsbt: finalRawPsbt,
            finalize: true,
        });
        const { signedPsbt: taprootSigned1 } = await signer.signAllTaprootInputs({
            rawPsbt: segwitSigned1,
            finalize: true,
        });
        return this.pushPsbt({ psbtBase64: taprootSigned1 });
    }
    async createOrdCollectibleTx({ inscriptionId, fromAddress, fromPubKey, spendPubKey, spendAddress, toAddress, altSpendAddress, altSpendPubKey, feeRate, fee, }) {
        const sendTxSize = (0, utils_1.calculateTaprootTxSize)(1, 0, 2);
        const estimate = sendTxSize * feeRate < 250 ? 250 : sendTxSize * feeRate;
        let newEstimate;
        let usingAlt = false;
        let spendUtxos;
        let altSpendUtxos;
        spendUtxos = await this.getSpendableUtxos(spendAddress);
        if (!spendUtxos && altSpendAddress) {
            altSpendUtxos = await this.getSpendableUtxos(altSpendAddress);
            if (!altSpendUtxos) {
                throw new Error('No utxos to spend available');
            }
        }
        const collectibleData = await this.getCollectibleById(inscriptionId);
        if (fromAddress && collectibleData.address !== fromAddress) {
            throw new Error('Inscription does not belong to fromAddress');
        }
        const inscriptionTxId = collectibleData.satpoint.split(':')[0];
        const inscriptionTxVOutIndex = collectibleData.satpoint.split(':')[1];
        const inscriptionUtxoDetails = await this.esploraRpc.getTxInfo(inscriptionTxId);
        const inscriptionUtxoData = inscriptionUtxoDetails.vout[inscriptionTxVOutIndex];
        const isSpentArray = await this.esploraRpc.getTxOutspends(inscriptionTxId);
        const isSpent = isSpentArray[inscriptionTxVOutIndex];
        if (isSpent.spent) {
            throw new Error('Inscription is missing');
        }
        let psbtTx = new bitcoin.Psbt({ network: this.network });
        const { unspent_outputs } = await this.getUtxos(fromAddress, true);
        const inscriptionTx = unspent_outputs.find((utxo) => inscriptionTxId === utxo.tx_hash_big_endian &&
            Number(inscriptionTxVOutIndex) === utxo.tx_output_n);
        psbtTx.addInput({
            hash: inscriptionTxId,
            index: parseInt(inscriptionTxVOutIndex),
            witnessUtxo: {
                script: Buffer.from(inscriptionTx.script, 'hex'),
                value: inscriptionUtxoData.value,
            },
        });
        psbtTx.addOutput({
            address: toAddress,
            value: inscriptionUtxoData.value,
        });
        let utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(spendUtxos, fee ? fee : estimate);
        if (utxosToSend?.selectedUtxos.length > 1) {
            const newTxSize = (0, utils_1.calculateTaprootTxSize)(utxosToSend.selectedUtxos.length, 0, 2);
            newEstimate = newTxSize * feeRate < 250 ? 250 : newTxSize * feeRate;
            utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(spendUtxos, fee ? fee : newEstimate);
        }
        if (!utxosToSend) {
            const txSize = (0, utils_1.calculateTaprootTxSize)(1, 0, 2);
            const estimate = txSize * feeRate < 250 ? 250 : txSize * feeRate;
            utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(altSpendUtxos, fee ? fee : estimate);
            if (utxosToSend?.selectedUtxos.length > 1) {
                const newTxSize = (0, utils_1.calculateTaprootTxSize)(utxosToSend.selectedUtxos.length, 0, 2);
                newEstimate = newTxSize * feeRate < 250 ? 250 : newTxSize * feeRate;
                utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(altSpendUtxos, fee ? fee : newEstimate);
            }
            if (!utxosToSend) {
                throw new Error('Insufficient Balance');
            }
            usingAlt = true;
        }
        const amountGathered = (0, utils_1.calculateAmountGatheredUtxo)(utxosToSend.selectedUtxos);
        for await (const utxo of utxosToSend.selectedUtxos) {
            psbtTx.addInput({
                hash: utxo.txId,
                index: utxo.outputIndex,
                witnessUtxo: {
                    script: Buffer.from(utxo.scriptPk, 'hex'),
                    value: utxo.satoshis,
                },
            });
        }
        const changeAmount = fee
            ? amountGathered - fee
            : amountGathered - (newEstimate ? newEstimate : estimate);
        psbtTx.addOutput({
            address: spendAddress,
            value: changeAmount,
        });
        const partiallyFormattedPsbtTx = await (0, utils_1.formatInputsToSign)({
            _psbt: psbtTx,
            senderPublicKey: fromPubKey,
            network: this.network,
        });
        psbtTx = await (0, utils_1.formatInputsToSign)({
            _psbt: partiallyFormattedPsbtTx,
            senderPublicKey: usingAlt ? altSpendPubKey : spendPubKey,
            network: this.network,
        });
        return { rawPsbt: psbtTx.toBase64() };
    }
    async sendBtcEstimate({ feeRate, amount, altSpendPubKey, spendAddress, spendPubKey, altSpendAddress, }) {
        let spendUtxos;
        let altSpendUtxos;
        spendUtxos = await this.getSpendableUtxos(spendAddress);
        if (!spendUtxos && altSpendAddress) {
            altSpendUtxos = await this.getSpendableUtxos(altSpendAddress);
            if (!altSpendUtxos) {
                throw new Error('No utxos to spend available');
            }
        }
        if (!feeRate) {
            feeRate = (await this.esploraRpc.getFeeEstimates())['1'];
        }
        const { fee } = await this.createBtcTx({
            toAddress: spendAddress,
            spendPubKey,
            feeRate,
            amount,
            network: this.network,
            spendUtxos,
            spendAddress,
            altSpendPubKey,
            altSpendUtxos,
        });
        return { fee: fee };
    }
    async sendCollectibleEstimate({ spendAddress, altSpendAddress, feeRate, }) {
        let spendUtxos;
        let altSpendUtxos;
        spendUtxos = await this.getSpendableUtxos(spendAddress);
        if (!spendUtxos && altSpendAddress) {
            altSpendUtxos = await this.getSpendableUtxos(altSpendAddress);
            if (!altSpendUtxos) {
                throw new Error('No utxos to spend available');
            }
        }
        if (!feeRate) {
            feeRate = (await this.esploraRpc.getFeeEstimates())['1'];
        }
        const sendTxSize = (0, utils_1.calculateTaprootTxSize)(1, 0, 2);
        let fee = sendTxSize * feeRate < 250 ? 250 : sendTxSize * feeRate;
        const availableUtxos = await (0, utils_1.filterTaprootUtxos)({
            taprootUtxos: spendUtxos,
        });
        let utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, fee);
        if (utxosToSend?.selectedUtxos.length > 1) {
            const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToSend.selectedUtxos.length, 0, 2);
            fee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
            utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, fee);
        }
        if (!utxosToSend && altSpendUtxos) {
            const unFilteredAltUtxos = await (0, utils_1.filterTaprootUtxos)({
                taprootUtxos: altSpendUtxos,
            });
            utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(unFilteredAltUtxos, fee);
            if (utxosToSend?.selectedUtxos.length > 1) {
                const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToSend.selectedUtxos.length, 0, 2);
                fee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
                utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(unFilteredAltUtxos, fee);
            }
            if (!utxosToSend) {
                throw new Error('Insufficient Balance');
            }
        }
        const sendTxFee = fee;
        return { fee: sendTxFee };
    }
    async sendRuneEstimate({ spendAddress, altSpendAddress, feeRate, }) {
        let spendUtxos;
        let altSpendUtxos;
        spendUtxos = await this.getSpendableUtxos(spendAddress);
        if (!spendUtxos && altSpendAddress) {
            altSpendUtxos = await this.getSpendableUtxos(altSpendAddress);
            if (!altSpendUtxos) {
                throw new Error('No utxos to spend available');
            }
        }
        if (!feeRate) {
            feeRate = (await this.esploraRpc.getFeeEstimates())['1'];
        }
        const sendTxSize = (0, utils_1.calculateTaprootTxSize)(1, 0, 3);
        let fee = sendTxSize * feeRate < 250 ? 250 : sendTxSize * feeRate;
        const availableUtxos = await (0, utils_1.filterTaprootUtxos)({
            taprootUtxos: spendUtxos,
        });
        let utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, fee);
        if (utxosToSend?.selectedUtxos.length > 1) {
            const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToSend.selectedUtxos.length, 0, 2);
            fee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
            utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, fee);
        }
        if (!utxosToSend && altSpendUtxos) {
            const unFilteredAltUtxos = await (0, utils_1.filterTaprootUtxos)({
                taprootUtxos: altSpendUtxos,
            });
            utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(unFilteredAltUtxos, fee);
            if (utxosToSend?.selectedUtxos.length > 1) {
                const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToSend.selectedUtxos.length, 0, 3);
                fee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
                utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(unFilteredAltUtxos, fee);
            }
            if (!utxosToSend) {
                throw new Error('Insufficient Balance');
            }
        }
        const sendTxFee = fee;
        return { fee: sendTxFee };
    }
    async sendBrc20Estimate({ spendAddress, altSpendAddress, feeRate, }) {
        let spendUtxos;
        let altSpendUtxos;
        spendUtxos = await this.getSpendableUtxos(spendAddress);
        if (!spendUtxos && altSpendAddress) {
            altSpendUtxos = await this.getSpendableUtxos(altSpendAddress);
            if (!altSpendUtxos) {
                throw new Error('No utxos to spend available');
            }
        }
        if (!feeRate) {
            feeRate = (await this.esploraRpc.getFeeEstimates())['1'];
        }
        const sendTxSize = (0, utils_1.calculateTaprootTxSize)(1, 0, 1);
        let fee = sendTxSize * feeRate < 250 ? 250 : sendTxSize * feeRate;
        const commitTxSize = (0, utils_1.calculateTaprootTxSize)(1, 0, 2);
        const feeForCommit = commitTxSize * feeRate < 250 ? 250 : commitTxSize * feeRate;
        const revealTxSize = (0, utils_1.calculateTaprootTxSize)(1, 0, 1);
        const feeForReveal = revealTxSize * feeRate < 250 ? 250 : revealTxSize * feeRate;
        const amountNeededForInscribe = Number(feeForCommit) + Number(feeForReveal) + 546;
        const filteredSpendUtxos = await (0, utils_1.filterTaprootUtxos)({
            taprootUtxos: spendUtxos,
        });
        let utxosForCommitandReveal = (0, txbuilder_1.findUtxosToCoverAmount)(filteredSpendUtxos, amountNeededForInscribe);
        if (utxosForCommitandReveal?.selectedUtxos.length > 1) {
            const txSize = (0, utils_1.calculateTaprootTxSize)(utxosForCommitandReveal.selectedUtxos.length, 0, 2);
            fee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
            utxosForCommitandReveal = (0, txbuilder_1.findUtxosToCoverAmount)(filteredSpendUtxos, amountNeededForInscribe);
        }
        if (!utxosForCommitandReveal && altSpendUtxos) {
            const unFilteredAltUtxos = await (0, utils_1.filterTaprootUtxos)({
                taprootUtxos: altSpendUtxos,
            });
            utxosForCommitandReveal = (0, txbuilder_1.findUtxosToCoverAmount)(unFilteredAltUtxos, amountNeededForInscribe);
            if (utxosForCommitandReveal?.selectedUtxos.length > 1) {
                const txSize = (0, utils_1.calculateTaprootTxSize)(utxosForCommitandReveal.selectedUtxos.length, 0, 2);
                fee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
                utxosForCommitandReveal = (0, txbuilder_1.findUtxosToCoverAmount)(unFilteredAltUtxos, amountNeededForInscribe);
            }
            if (!utxosForCommitandReveal) {
                throw new Error('Insufficient Balance');
            }
        }
        const utxosUsedForFees = utxosForCommitandReveal.selectedUtxos.map((utxo) => {
            return utxo.txId;
        });
        let availableUtxos = filteredSpendUtxos.filter((utxo) => !utxosUsedForFees.includes(utxo.txId));
        let utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, fee);
        if (utxosToSend?.selectedUtxos.length > 1) {
            const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToSend.selectedUtxos.length, 0, 2);
            fee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
            utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, fee);
        }
        if (!utxosToSend && altSpendUtxos) {
            const unFilteredAltUtxos = await (0, utils_1.filterTaprootUtxos)({
                taprootUtxos: altSpendUtxos,
            });
            const availableUtxos = unFilteredAltUtxos.filter((utxo) => !utxosUsedForFees.includes(utxo.txId));
            utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, fee);
            if (utxosToSend?.selectedUtxos.length > 1) {
                const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToSend.selectedUtxos.length, 0, 2);
                fee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
                utxosToSend = (0, txbuilder_1.findUtxosToCoverAmount)(availableUtxos, fee);
            }
            if (!utxosToSend) {
                throw new Error('Insufficient Balance');
            }
        }
        const commitTxFee = utxosForCommitandReveal.totalSatoshis - utxosForCommitandReveal.change;
        return {
            commitAndRevealTxFee: commitTxFee,
            sendTxFee: fee,
            total: commitTxFee + fee,
        };
    }
    async sendRune({ fromAddress, toAddress, spendPubKey, feeRate, altSpendPubKey, spendAddress, altSpendAddress, signer, runeId, amount, }) {
        if (!feeRate) {
            feeRate = (await this.esploraRpc.getFeeEstimates())['1'];
        }
        const runeBalances = await this.apiClient.getRuneBalance({
            address: fromAddress,
        });
        if (runeBalances === undefined || runeBalances.length === 0) {
            throw new Error('No runes found');
        }
        for await (const rune of runeBalances) {
            if (amount > rune.total_balance && runeId === rune.rune_id) {
                throw new Error('Insufficient Balance');
            }
        }
        const { sendPsbt } = await this.runeSendTx({
            runeId,
            fromAddress,
            toAddress,
            amount,
            spendAddress,
            spendPubKey,
            altSpendPubKey,
            altSpendAddress,
            feeRate,
        });
        const { signedPsbt: segwitSigned } = await signer.signAllSegwitInputs({
            rawPsbt: sendPsbt,
            finalize: true,
        });
        const { raw } = await signer.signAllTaprootInputs({
            rawPsbt: segwitSigned,
            finalize: true,
        });
        const fee = Math.ceil(raw.extractTransaction().weight() / 4) * feeRate;
        const { sendPsbt: finalSendPsbt } = await this.runeSendTx({
            runeId,
            fromAddress,
            toAddress,
            amount,
            spendAddress,
            spendPubKey,
            altSpendPubKey,
            altSpendAddress,
            feeRate,
            fee,
        });
        const { signedPsbt: segwitSigned1 } = await signer.signAllSegwitInputs({
            rawPsbt: finalSendPsbt,
            finalize: true,
        });
        const { signedPsbt: taprootSigned1 } = await signer.signAllTaprootInputs({
            rawPsbt: segwitSigned1,
            finalize: true,
        });
        return await this.pushPsbt({
            psbtBase64: taprootSigned1,
        });
    }
    async runeSendTx({ runeId, fromAddress, toAddress, amount, spendAddress, spendPubKey, altSpendPubKey, altSpendAddress, feeRate, fee, }) {
        let usingAlt = false;
        let spendUtxos;
        let altSpendUtxos;
        spendUtxos = await this.getSpendableUtxos(spendAddress);
        altSpendUtxos = await this.getSpendableUtxos(altSpendAddress);
        if (!spendUtxos && !altSpendUtxos) {
            throw new Error('No utxos to spend available');
        }
        const psbt = new bitcoin.Psbt({ network: this.network });
        const runeUtxos = [];
        const runeUtxoOutpoints = await this.apiClient.getRuneOutpoints({
            address: fromAddress,
        });
        for (const rune of runeUtxoOutpoints) {
            const index = rune.rune_ids.indexOf(runeId);
            if (index !== -1) {
                const txSplit = rune.output.split(':');
                const txHash = txSplit[0];
                const txIndex = txSplit[1];
                const txDetails = await this.esploraRpc.getTxInfo(txHash);
                if (!txDetails?.vout || txDetails.vout.length < 1) {
                    throw new Error('Unable to find rune utxo');
                }
                const satoshis = txDetails.vout[txIndex].value;
                runeUtxos.push({
                    script: rune.pkscript,
                    outpointId: rune.output,
                    amount: rune.balances[index],
                    satoshis: satoshis,
                });
            }
        }
        const useableUtxos = (0, utils_1.findRuneUtxosToSpend)(runeUtxos, amount);
        if (!useableUtxos) {
            throw new Error('No utxos with runes attached to them to spend for this address.');
        }
        for (let i = 0; i < useableUtxos.selectedUtxos.length; i++) {
            const txSplit = useableUtxos.selectedUtxos[i].outpointId.split(':');
            const txHash = txSplit[0];
            const txIndex = txSplit[1];
            const script = useableUtxos.selectedUtxos[i].script;
            psbt.addInput({
                hash: txHash,
                index: Number(txIndex),
                witnessUtxo: {
                    value: useableUtxos.selectedUtxos[i].satoshis,
                    script: Buffer.from(script, 'hex'),
                },
            });
        }
        const txSize = (0, utils_1.calculateTaprootTxSize)(1 + psbt.inputCount, 0, 3);
        let feeForSend = fee ? fee : txSize * feeRate < 250 ? 250 : txSize * feeRate;
        let utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(spendUtxos, feeForSend + utils_1.inscriptionSats);
        if (utxosToPayFee?.selectedUtxos.length > 1) {
            const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToPayFee.selectedUtxos.length + psbt.inputCount, 0, 3);
            feeForSend = fee ? fee : txSize * feeRate < 250 ? 250 : txSize * feeRate;
            utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(spendUtxos, feeForSend + utils_1.inscriptionSats);
        }
        if (!utxosToPayFee) {
            const txSize = (0, utils_1.calculateTaprootTxSize)(1 + psbt.inputCount, 0, 3);
            feeForSend = fee ? fee : txSize * feeRate < 250 ? 250 : txSize * feeRate;
            utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(altSpendUtxos, feeForSend + utils_1.inscriptionSats);
            if (utxosToPayFee?.selectedUtxos.length > 1) {
                const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToPayFee.selectedUtxos.length + psbt.inputCount, 0, 3);
                feeForSend = fee ? fee : txSize * feeRate < 250 ? 250 : txSize * feeRate;
                utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(spendUtxos, feeForSend + utils_1.inscriptionSats);
            }
            if (!utxosToPayFee) {
                throw new Error('Insufficient Balance');
            }
            usingAlt = true;
        }
        const feeAmountGathered = (0, utils_1.calculateAmountGatheredUtxo)(utxosToPayFee.selectedUtxos);
        const changeAmount = feeAmountGathered - feeForSend + utils_1.inscriptionSats;
        for (let i = 0; i < utxosToPayFee.selectedUtxos.length; i++) {
            psbt.addInput({
                hash: utxosToPayFee.selectedUtxos[i].txId,
                index: utxosToPayFee.selectedUtxos[i].outputIndex,
                witnessUtxo: {
                    value: utxosToPayFee.selectedUtxos[i].satoshis,
                    script: Buffer.from(utxosToPayFee.selectedUtxos[i].scriptPk, 'hex'),
                },
            });
        }
        psbt.addOutput({
            value: utils_1.inscriptionSats,
            address: fromAddress,
        });
        psbt.addOutput({
            value: utils_1.inscriptionSats,
            address: toAddress,
        });
        psbt.addOutput({
            value: changeAmount + (useableUtxos.totalSatoshis - utils_1.inscriptionSats),
            address: spendAddress,
        });
        const script = (0, utils_1.createRuneSendScript)({
            runeId,
            amount,
            sendOutputIndex: 1,
            pointer: 0,
        });
        const output = { script: script, value: 0 };
        psbt.addOutput(output);
        let fromPubKey = '';
        if (fromAddress === spendAddress) {
            fromPubKey = spendPubKey;
        }
        else if (fromAddress === altSpendAddress) {
            fromPubKey = altSpendPubKey;
        }
        if (fromPubKey === '') {
            throw new Error("No keypair to match sender's address");
        }
        const partiallyFormattedPsbtTx = await (0, utils_1.formatInputsToSign)({
            _psbt: psbt,
            senderPublicKey: fromPubKey,
            network: this.network,
        });
        const formattedPsbt = await (0, utils_1.formatInputsToSign)({
            _psbt: partiallyFormattedPsbtTx,
            senderPublicKey: usingAlt ? altSpendPubKey : spendPubKey,
            network: this.network,
        });
        return {
            sendPsbt: formattedPsbt.toBase64(),
        };
    }
    async mintRune({ toAddress, spendPubKey, feeRate, altSpendPubKey, spendAddress, altSpendAddress, signer, runeId, amount, }) {
        if (!feeRate) {
            feeRate = (await this.esploraRpc.getFeeEstimates())['1'];
        }
        const { mintPsbt } = await this.runeMintTx({
            runeId,
            toAddress,
            amount,
            spendAddress,
            spendPubKey,
            altSpendPubKey,
            altSpendAddress,
            feeRate,
        });
        const { signedPsbt: segwitSigned } = await signer.signAllSegwitInputs({
            rawPsbt: mintPsbt,
            finalize: true,
        });
        const { raw } = await signer.signAllTaprootInputs({
            rawPsbt: segwitSigned,
            finalize: true,
        });
        const fee = Math.ceil(raw.extractTransaction().weight() / 4) * feeRate;
        const { mintPsbt: finalPsbt } = await this.runeMintTx({
            runeId,
            toAddress,
            amount,
            spendAddress,
            spendPubKey,
            altSpendPubKey,
            altSpendAddress,
            feeRate,
            fee,
        });
        const { signedPsbt: segwitSigned1 } = await signer.signAllSegwitInputs({
            rawPsbt: finalPsbt,
            finalize: true,
        });
        const { signedPsbt: taprootSigned } = await signer.signAllTaprootInputs({
            rawPsbt: segwitSigned1,
            finalize: true,
        });
        const { txId } = await this.pushPsbt({
            psbtBase64: taprootSigned,
        });
        return {
            txId: txId,
            rawTxn: taprootSigned,
        };
    }
    async runeMintTx({ runeId, toAddress, amount, spendAddress, spendPubKey, altSpendPubKey, altSpendAddress, feeRate, fee, }) {
        const txSize = (0, utils_1.calculateTaprootTxSize)(1, 0, 3);
        let feeForSend = fee ? fee : txSize * feeRate < 250 ? 250 : txSize * feeRate;
        let usingAlt = false;
        let spendUtxos;
        let altSpendUtxos;
        spendUtxos = await this.getSpendableUtxos(spendAddress);
        if (!spendUtxos && altSpendAddress) {
            altSpendUtxos = await this.getSpendableUtxos(altSpendAddress);
            if (!altSpendUtxos) {
                throw new Error('No utxos to spend available');
            }
        }
        const spendableUtxos = await (0, utils_1.filterTaprootUtxos)({
            taprootUtxos: spendUtxos,
        });
        const psbt = new bitcoin.Psbt({ network: this.network });
        let utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(spendableUtxos, feeForSend + utils_1.inscriptionSats);
        if (utxosToPayFee?.selectedUtxos.length > 1) {
            const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToPayFee.selectedUtxos.length, 0, 3);
            feeForSend = fee ? fee : txSize * feeRate < 250 ? 250 : txSize * feeRate;
            utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(spendableUtxos, feeForSend + utils_1.inscriptionSats);
        }
        if (!utxosToPayFee) {
            const unFilteredAltUtxos = await (0, utils_1.filterTaprootUtxos)({
                taprootUtxos: altSpendUtxos,
            });
            utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(unFilteredAltUtxos, feeForSend + utils_1.inscriptionSats);
            if (utxosToPayFee?.selectedUtxos.length > 1) {
                const txSize = (0, utils_1.calculateTaprootTxSize)(utxosToPayFee.selectedUtxos.length, 0, 3);
                feeForSend = fee ? fee : txSize * feeRate < 250 ? 250 : txSize * feeRate;
                utxosToPayFee = (0, txbuilder_1.findUtxosToCoverAmount)(spendableUtxos, feeForSend + utils_1.inscriptionSats);
            }
            if (!utxosToPayFee) {
                throw new Error('Insufficient Balance');
            }
            usingAlt = true;
        }
        const feeAmountGathered = (0, utils_1.calculateAmountGatheredUtxo)(utxosToPayFee.selectedUtxos);
        const changeAmount = feeAmountGathered - feeForSend - utils_1.inscriptionSats;
        for (let i = 0; i < utxosToPayFee.selectedUtxos.length; i++) {
            psbt.addInput({
                hash: utxosToPayFee.selectedUtxos[i].txId,
                index: utxosToPayFee.selectedUtxos[i].outputIndex,
                witnessUtxo: {
                    value: utxosToPayFee.selectedUtxos[i].satoshis,
                    script: Buffer.from(utxosToPayFee.selectedUtxos[i].scriptPk, 'hex'),
                },
            });
        }
        psbt.addOutput({
            address: spendAddress,
            value: changeAmount,
        });
        psbt.addOutput({
            value: utils_1.inscriptionSats,
            address: toAddress,
        });
        const script = (0, utils_1.createRuneMintScript)({
            runeId,
            amountToMint: amount,
            mintOutPutIndex: 1,
            pointer: 1,
        });
        const output = { script: script, value: 0 };
        psbt.addOutput(output);
        const formattedPsbt = await (0, utils_1.formatInputsToSign)({
            _psbt: psbt,
            senderPublicKey: usingAlt ? altSpendPubKey : spendPubKey,
            network: this.network,
        });
        return {
            mintPsbt: formattedPsbt.toBase64(),
        };
    }
}
exports.Oyl = Oyl;
//# sourceMappingURL=oylib.js.map