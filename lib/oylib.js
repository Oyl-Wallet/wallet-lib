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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = void 0;
const txbuilder_1 = require("./txbuilder");
const constants_1 = require("./shared/constants");
const utils_1 = require("./shared/utils");
const rpclient_1 = __importDefault(require("./rpclient"));
const sandshrew_1 = require("./rpclient/sandshrew");
const esplora_1 = require("./rpclient/esplora");
const transactions = __importStar(require("./transactions"));
const accounts_1 = require("./wallet/accounts");
const wallet_1 = require("./wallet");
const accountsManager_1 = require("./wallet/accountsManager");
const interface_1 = require("./shared/interface");
const apiclient_1 = require("./apiclient");
const bitcoin = __importStar(require("bitcoinjs-lib"));
const utils_2 = require("./shared/utils");
const RequiredPath = [
    "m/44'/0'/0'/0",
    "m/49'/0'/0'/0",
    "m/84'/0'/0'/0",
    "m/86'/0'/0'/0", // P2TR (Taproot)
];
class Wallet {
    /**
     * Initializes a new instance of the Wallet class.
     */
    constructor() {
        this.apiClient = new apiclient_1.OylApiClient({ host: 'https://api.oyl.gg' });
        this.esploraRpc = new esplora_1.EsploraRpc('https://mainnet.sandshrew.io/v1/154f9aaa25a986241357836c37f8d71');
        this.sandshrewBtcClient = new sandshrew_1.SandshrewBitcoinClient('https://sandshrew.io/v1/d6aebfed1769128379aca7d215f0b689');
        this.fromProvider();
        //create wallet should optionally take in a private key
        this.wallet = this.createWallet({});
    }
    /**
     * Connects to a given blockchain RPC client.
     * @param {BcoinRpc} provider - The blockchain RPC client to connect to.
     * @returns {Wallet} - The connected wallet instance.
     */
    static connect(provider) {
        try {
            const wallet = new this();
            wallet.rpcClient = provider;
            return wallet;
        }
        catch (e) {
            throw Error('An error occured: ' + e);
        }
    }
    /**
     * Configures the wallet class with a provider from the given options.
     * @param {ProviderOptions} [options] - The options to configure the provider.
     * @returns {ProviderOptions} The applied client options.
     */
    fromProvider(options) {
        try {
            const clientOptions = {};
            clientOptions['network'] = (options === null || options === void 0 ? void 0 : options.network) || 'main';
            clientOptions['port'] = (options === null || options === void 0 ? void 0 : options.port) || 8332;
            clientOptions['host'] = (options === null || options === void 0 ? void 0 : options.host) || '172.31.17.134';
            clientOptions['apiKey'] = (options === null || options === void 0 ? void 0 : options.auth) || 'oylwell';
            switch (options === null || options === void 0 ? void 0 : options.provider) {
                case interface_1.Providers.bcoin:
                    this.rpcClient = new rpclient_1.default(clientOptions);
                default:
                    this.rpcClient = new rpclient_1.default(clientOptions);
            }
            return clientOptions;
        }
        catch (e) {
            throw Error('An error occured: ' + e);
        }
    }
    /**
     * Gets a summary of the given address(es).
     * @param {string | string[]} address - A single address or an array of addresses.
     * @returns {Promise<Object[]>} A promise that resolves to an array of address summaries.
     */
    getAddressSummary({ address }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof address === 'string') {
                address = [address];
            }
            const addressesUtxo = [];
            for (let i = 0; i < address.length; i++) {
                let utxos = yield transactions.getUnspentOutputs(address[i]);
                addressesUtxo[i] = {};
                addressesUtxo[i]['utxo'] = utxos.unspent_outputs;
                addressesUtxo[i]['balance'] = transactions.calculateBalance(utxos.unspent_outputs);
            }
            return addressesUtxo;
        });
    }
    /**
     * Derives a Taproot address from the given public key.
     * @param {string} publicKey - The public key to derive the address from.
     * @returns {string} A promise that resolves to the derived Taproot address.
     */
    getTaprootAddress({ publicKey }) {
        try {
            const address = (0, accounts_1.publicKeyToAddress)(publicKey, interface_1.AddressType.P2TR);
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
    getSingleBrcTickerDetails(address, ticker) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.apiClient.getBrc20sByAddress(address);
            const tickerDetails = response.data.find((details) => details.ticker.toLowerCase() === ticker.toLowerCase());
            return tickerDetails;
        });
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
    fromPhrase({ mnemonic, type = 'taproot', hdPath = RequiredPath[3] }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let addrType;
                switch (type) {
                    case 'taproot':
                        addrType = interface_1.AddressType.P2TR;
                        break;
                    case 'native-segwit':
                        addrType = interface_1.AddressType.P2WPKH;
                        break;
                    case 'nested-segwit':
                        addrType = interface_1.AddressType.P2SH_P2WPKH;
                        break;
                    case 'legacy':
                        addrType = interface_1.AddressType.P2PKH;
                        break;
                    default:
                        addrType = interface_1.AddressType.P2TR;
                        break;
                }
                const wallet = yield wallet_1.accounts.importMnemonic(mnemonic, hdPath, addrType);
                this.wallet = wallet;
                const meta = yield this.getUtxosArtifacts({ address: wallet['address'] });
                const data = {
                    keyring: wallet,
                    assets: meta,
                };
                this.mnemonic = mnemonic;
                return data;
            }
            catch (err) {
                return err;
            }
        });
    }
    /**
     * Recovers a wallet using the given options.
     * @param {RecoverAccountOptions} options - Options necessary for account recovery.
     * @returns {Promise<any>} A promise that resolves to the recovered wallet payload.
     * @throws {Error} Throws an error if recovery fails.
     */
    recoverWallet(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const wallet = new accountsManager_1.AccountManager(options);
                const walletPayload = yield wallet.recoverAccounts();
                return walletPayload;
            }
            catch (error) {
                return error;
            }
        });
    }
    /**
     * Adds a new account to the wallet using the given options.
     * @param {RecoverAccountOptions} options - Options describing the account to be added.
     * @returns {Promise<any>} A promise that resolves to the payload of the newly added account.
     * @throws {Error} Throws an error if adding the account fails.
     */
    addAccountToWallet(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const wallet = new accountsManager_1.AccountManager(options);
                const walletPayload = yield wallet.addAccount();
                return walletPayload;
            }
            catch (error) {
                return error;
            }
        });
    }
    /**
     * Initializes a new Oyl account with taproot & segwit HDKeyrings  within the wallet.
     * @returns {Promise<any>} A promise that resolves to the payload of the initialized accounts.
     * @throws {Error} Throws an error if the initialization fails.
     */
    initializeWallet() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const wallet = new accountsManager_1.AccountManager();
                const walletPayload = yield wallet.initializeAccounts();
                return walletPayload;
            }
            catch (error) {
                return error;
            }
        });
    }
    /**
     * Derives a SegWit address from a given public key.
     * @param {Object} param0 - An object containing the public key.
     * @param {string} param0.publicKey - The public key to derive the SegWit address from.
     * @returns {Promise<string>} A promise that resolves to the derived SegWit address.
     * @throws {Error} Throws an error if address derivation fails.
     */
    getSegwitAddress({ publicKey }) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = (0, accounts_1.publicKeyToAddress)(publicKey, interface_1.AddressType.P2WPKH);
            return address;
        });
    }
    /**
     * Creates a new wallet with an optional specific derivation type.
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
            const wallet = wallet_1.accounts.createWallet(hdPath, addrType);
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
    getMetaBalance({ address }) {
        return __awaiter(this, void 0, void 0, function* () {
            const addressSummary = yield this.getAddressSummary({ address });
            const confirmAmount = addressSummary.reduce((total, addr) => {
                const confirmedUtxos = addr.utxo.filter((utxo) => utxo.confirmations > 0);
                return (total + confirmedUtxos.reduce((sum, utxo) => sum + utxo.value / 1e8, 0));
            }, 0);
            const pendingAmount = addressSummary.reduce((total, addr) => {
                const unconfirmedUtxos = addr.utxo.filter((utxo) => utxo.confirmations === 0);
                return (total +
                    unconfirmedUtxos.reduce((sum, utxo) => sum + utxo.value / 1e8, 0));
            }, 0);
            const amount = confirmAmount + pendingAmount;
            const usdValue = yield transactions.convertUsdValue(amount);
            const response = {
                confirm_amount: confirmAmount.toFixed(8),
                pending_amount: pendingAmount.toFixed(8),
                amount: amount.toFixed(8),
                usd_value: usdValue,
            };
            return response;
        });
    }
    /**
     * Calculates the total value from previous outputs for the given inputs of a transaction.
     * @param {any[]} inputs - The inputs of a transaction which might be missing value information.
     * @param {string} address - The address to filter the inputs.
     * @returns {Promise<number>} A promise that resolves to the total value of the provided inputs.
     * @throws {Error} Throws an error if it fails to retrieve previous transaction data.
     */
    getTxValueFromPrevOut(inputs, address) {
        return __awaiter(this, void 0, void 0, function* () {
            let totalMissingValue = 0;
            for (const input of inputs) {
                if (!input.coin && input.address === address) {
                    try {
                        const prevTx = yield this.apiClient.getTxByHash(input.prevout.hash);
                        const output = prevTx.outputs[input.prevout.index];
                        if (output && output.value) {
                            totalMissingValue += output.value;
                        }
                    }
                    catch (error) {
                        throw Error(`Error retrieving transaction`);
                    }
                }
            }
            return totalMissingValue;
        });
    }
    /**
     * Retrieves the transaction history for a given address and processes the transactions.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address for which to fetch transaction history.
     * @returns {Promise<any[]>} A promise that resolves to an array of processed transaction details.
     * @throws {Error} Throws an error if transaction history retrieval fails.
     */
    getTxHistory({ address }) {
        return __awaiter(this, void 0, void 0, function* () {
            const history = yield this.apiClient.getTxByAddress(address);
            const processedTxPromises = history
                .map((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const { hash, height, time, outputs, inputs, confirmations, fee, rate, } = tx;
                const output = outputs.find((output) => output.address === address);
                const input = inputs.find((input) => (input.coin ? input.coin.address : input.address) === address);
                const txDetails = {};
                txDetails['hash'] = hash;
                txDetails['confirmations'] = confirmations;
                txDetails['blocktime'] = time;
                txDetails['blockheight'] = height;
                txDetails['fee'] = fee;
                txDetails['feeRate'] = rate / 1000;
                if (input) {
                    txDetails['type'] = 'sent';
                    txDetails['to'] = (_a = outputs.find((output) => output.address != address)) === null || _a === void 0 ? void 0 : _a.address;
                    if (output) {
                        txDetails['amount'] = input.coin
                            ? input.coin.value / 1e8 - output.value / 1e8
                            : (yield this.getTxValueFromPrevOut(inputs, address)) / 1e8 -
                                output.value / 1e8;
                    }
                    else {
                        txDetails['amount'] = input.coin
                            ? input.coin.value / 1e8
                            : (yield this.getTxValueFromPrevOut(inputs, address)) / 1e8;
                    }
                }
                else {
                    if (output) {
                        txDetails['type'] = 'received';
                        txDetails['amount'] = output.value / 1e8;
                        const evalFrom = inputs.find((input) => (input.coin ? input.coin.address : input.address) != address);
                        txDetails['from'] = evalFrom.coin
                            ? evalFrom.coin.address
                            : evalFrom.address;
                    }
                }
                txDetails['symbol'] = 'BTC';
                return txDetails;
            }))
                .filter((transaction) => transaction !== null); // Filter out null transactions
            const processedTransactions = yield Promise.all(processedTxPromises);
            return processedTransactions;
        });
    }
    /******************************* */
    /**
     * Retrieves the fee rates for transactions from the mempool.
     * @returns {Promise<{ High: number; Medium: number; Low: number }>} A promise that resolves with an object containing the fee rates for High, Medium, and Low priority transactions.
     */
    getFees() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.apiClient.getFees();
        });
    }
    getTotalBalance({ batch }) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.getAddressSummary({ address: batch });
            let total = 0;
            res.forEach((element) => {
                total += element.balance;
            });
            return total;
        });
    }
    /**
     * Retrieves a list of inscriptions for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address to query for inscriptions.
     * @returns {Promise<Array<any>>} A promise that resolves to an array of inscription details.
     */
    getInscriptions({ address }) {
        return __awaiter(this, void 0, void 0, function* () {
            const artifacts = yield this.apiClient.getCollectiblesByAddress(address);
            return artifacts.data.map((item) => {
                const { inscription_id, inscription_number, satpoint } = item;
                const detail = {
                    id: inscription_id,
                    address: item.owner_wallet_addr,
                    preview: `https://ordinals.com/preview/${inscription_id}`,
                    content: `https://ordinals.com/content/${inscription_id}`,
                    location: satpoint,
                };
                return {
                    id: inscription_id,
                    inscription_number,
                    detail,
                };
            });
        });
    }
    /**
     * Retrieves UTXO artifacts for a given address.
     * @param {Object} param0 - An object containing the address property.
     * @param {string} param0.address - The address to query for UTXO artifacts.
     * @returns A promise that resolves to the UTXO artifacts.
     */
    getUtxosArtifacts({ address }) {
        return __awaiter(this, void 0, void 0, function* () {
            const utxos = yield transactions.getUnspentOutputs(address);
            const inscriptions = yield this.getInscriptions({ address });
            const utxoArtifacts = yield transactions.getMetaUtxos(address, utxos.unspent_outputs, inscriptions);
            return utxoArtifacts;
        });
    }
    /**
     * Imports a list of watch-only addresses into the wallet.
     * @param {Object} param0 - An object containing an array of addresses.
     * @param {string} param0.addresses - An array of addresses to be imported as watch-only.
     */
    importWatchOnlyAddress({ addresses = [] }) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < addresses.length; i++) {
                yield new Promise((resolve) => setTimeout(resolve, 10000));
                yield this.rpcClient.execute('importaddress', [addresses[i], '', true]);
            }
        });
    }
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
    createOrdPsbtTx({ fromAddress, toAddress, changeAddress, txFee, segwitAddress, taprootPubKey, segwitPubKey, inscriptionId, payFeesWithSegwit, mnemonic, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const segwitSigner = yield (0, utils_1.createSegwitSigner)({
                mnemonic: mnemonic,
                segwitAddress: segwitAddress,
                segwitPubKey: segwitPubKey,
            });
            const taprootSigner = yield (0, utils_1.createTaprootSigner)({
                mnemonic: mnemonic,
                taprootAddress: fromAddress,
            });
            const { data: collectibleData } = yield this.apiClient.getCollectiblesById(inscriptionId);
            const metaOffset = collectibleData.satpoint.charAt(collectibleData.satpoint.length - 1);
            const metaOutputValue = collectibleData.output_value || 10000;
            const minOrdOutputValue = Math.max(metaOffset, constants_1.UTXO_DUST);
            if (metaOutputValue < minOrdOutputValue) {
                throw Error(`OutputValue must be at least ${minOrdOutputValue}`);
            }
            const allUtxos = yield this.getUtxosArtifacts({ address: fromAddress });
            let segwitUtxos;
            if (segwitAddress) {
                segwitUtxos = yield this.getUtxosArtifacts({ address: segwitAddress });
            }
            const feeRate = txFee;
            const psbtTx = new txbuilder_1.PSBTTransaction(taprootSigner, fromAddress, taprootPubKey, feeRate, segwitSigner, segwitPubKey);
            psbtTx.setChangeAddress(changeAddress);
            const finalizedPsbt = yield (0, txbuilder_1.buildOrdTx)({
                psbtTx: psbtTx,
                allUtxos: allUtxos,
                segwitUtxos: segwitUtxos,
                segwitAddress: segwitAddress,
                toAddress: toAddress,
                metaOutputValue: metaOutputValue,
                feeRate: feeRate,
                inscriptionId: inscriptionId,
                payFeesWithSegwit: payFeesWithSegwit,
                taprootAddress: fromAddress,
            });
            //@ts-ignore
            finalizedPsbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = false;
            const rawtx = finalizedPsbt.extractTransaction().toHex();
            // const result = await this.apiClient.pushTx({ transactionHex: rawtx })
            return {
                txId: finalizedPsbt.extractTransaction().getId(),
                rawtx: rawtx,
                // ...result,
            };
        });
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
    createBtcTx({ to, from, amount, feeRate, signer, publicKey, }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const utxos = yield this.getUtxosArtifacts({ address: from });
                const addressType = transactions.getAddressType(from);
                if (addressType == null)
                    throw Error('Invalid Address Type');
                const tx = new txbuilder_1.PSBTTransaction(signer, from, publicKey, addressType, feeRate);
                tx.addOutput(to, amount);
                tx.setChangeAddress(from);
                const outputAmount = tx.getTotalOutput();
                const nonOrdUtxos = [];
                const ordUtxos = [];
                utxos.forEach((v) => {
                    // TODO: figure out why we're getting inscribed utxos as un-inscribed
                    if (v.inscriptions.length > 0 || v.satoshis <= 546) {
                        ordUtxos.push(v);
                    }
                    else {
                        nonOrdUtxos.push(v);
                    }
                });
                let tmpSum = tx.getTotalInput();
                for (let i = 0; i < nonOrdUtxos.length; i++) {
                    const nonOrdUtxo = nonOrdUtxos[i];
                    if (tmpSum < outputAmount) {
                        tx.addInput(nonOrdUtxo);
                        tmpSum += nonOrdUtxo.satoshis;
                        continue;
                    }
                    const vB = tx.getNumberOfInputs() * 149 + 3 * 32 + 12;
                    const fee = vB * feeRate;
                    if (tmpSum < outputAmount + fee) {
                        tx.addInput(nonOrdUtxo);
                        tmpSum += nonOrdUtxo.satoshis;
                    }
                }
                if (nonOrdUtxos.length === 0 ||
                    tx.getTotalOutput() > tx.getTotalInput()) {
                    new Error('Balance not enough');
                }
                const totalUnspentAmount = tx.getUnspent();
                if (totalUnspentAmount === 0) {
                    new Error('Balance not enough to pay network fee.');
                }
                // add dummy output
                tx.addChangeOutput(1);
                const estimatedNetworkFee = yield tx.calNetworkFee();
                if (totalUnspentAmount < estimatedNetworkFee) {
                    new Error(`Not enough balance. Need ${(0, utils_1.satoshisToAmount)(estimatedNetworkFee)} BTC as network fee, but only ${(0, utils_1.satoshisToAmount)(totalUnspentAmount)} BTC is available.`);
                }
                const remainingBalance = totalUnspentAmount - estimatedNetworkFee;
                if (remainingBalance >= constants_1.UTXO_DUST) {
                    // change dummy output to true output
                    tx.getChangeOutput().value = remainingBalance;
                }
                else {
                    // remove dummy output
                    tx.removeChangeOutput();
                }
                const psbt = yield tx.createSignedPsbt();
                // await tx.dumpTx(psbt)
                //@ts-ignore
                psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = false;
                const rawTx = psbt.toHex();
                const rawTxBase64 = psbt.toBase64();
                return {
                    rawTx,
                    rawTxBase64,
                };
            }
            catch (error) {
                console.error(error);
            }
        });
    }
    /**
     * Retrieves information about a SegWit address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The SegWit address to validate and get information for.
     * @returns {Promise<Object>} A promise that resolves to an object containing validity status and summary of the address.
     */
    getSegwitAddressInfo({ address }) {
        return __awaiter(this, void 0, void 0, function* () {
            const isValid = transactions.validateSegwitAddress({
                address,
                type: 'segwit',
            });
            if (!isValid) {
                return { isValid, summary: null };
            }
            const summary = yield this.getAddressSummary({ address });
            return { isValid, summary };
        });
    }
    /**
     * Retrieves information about a Taproot address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The Taproot address to validate and get information for.
     * @returns {Promise<Object>} A promise that resolves to an object containing validity status and summary of the address.
     */
    getTaprootAddressInfo({ address }) {
        return __awaiter(this, void 0, void 0, function* () {
            const isValid = transactions.validateTaprootAddress({
                address,
                type: 'segwit',
            });
            if (!isValid) {
                return { isValid, summary: null };
            }
            const summary = yield this.getAddressSummary({ address });
            return { isValid, summary };
        });
    }
    /**
     * Fetches offers associated with a specific BRC20 ticker.
     * @param {Object} params - The parameters containing the ticker information.
     * @param {string} params.ticker - The ticker symbol to retrieve offers for.
     * @returns {Promise<any>} A promise that resolves to an array of offers.
     */
    getBrcOffers({ ticker }) {
        return __awaiter(this, void 0, void 0, function* () {
            const offers = yield this.apiClient.getTickerOffers({ _ticker: ticker });
            return offers;
        });
    }
    /**
     * Initiates and completes a swap on the blockchain resource (BRC) marketplace.
     * @param {SwapBrc} bid - The bid details for the swap.
     * @returns {Promise<string>} A promise that resolves to the transaction ID of the submitted bid.
     */
    swapBrc(bid) {
        return __awaiter(this, void 0, void 0, function* () {
            const psbt = yield this.apiClient.initSwapBid({
                address: bid.address,
                auctionId: bid.auctionId,
                bidPrice: bid.bidPrice,
                pubKey: bid.pubKey,
            });
            if (psbt.error)
                return psbt;
            const unsignedPsbt = psbt.psbtBid;
            const feeRate = psbt.feeRate;
            const swapOptions = bid;
            swapOptions['psbt'] = unsignedPsbt;
            swapOptions['feeRate'] = feeRate;
            const signedPsbt = yield this.swapFlow(swapOptions);
            const txId = yield this.apiClient.submitSignedBid({
                psbtBid: signedPsbt,
                auctionId: bid.auctionId,
                bidId: psbt.bidId,
            });
            return txId;
        });
    }
    /**
     * Handles the swapping flow logic, including transaction signing.
     * @param {Object} options - The parameters and options for the swap.
     * @returns {Promise<string>} A promise that resolves to the hexadecimal string of the signed PSBT.
     */
    swapFlow(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = options.address;
            const feeRate = options.feeRate;
            const mnemonic = options.mnemonic;
            const pubKey = options.pubKey;
            const psbt = bitcoin.Psbt.fromHex(options.psbt, {
                network: bitcoin.networks.bitcoin,
            });
            const wallet = new Wallet();
            const payload = yield wallet.fromPhrase({
                mnemonic: mnemonic.trim(),
                hdPath: options.hdPath,
                type: options.type,
            });
            const keyring = payload.keyring.keyring;
            const signer = keyring.signTransaction.bind(keyring);
            const from = address;
            const addressType = transactions.getAddressType(from);
            if (addressType == null)
                throw Error('Invalid Address Type');
            const tx = new txbuilder_1.PSBTTransaction(signer, from, pubKey, addressType, feeRate);
            const psbt_ = yield tx.signPsbt(psbt, false);
            return psbt_.toHex();
        });
    }
    /**
     * Lists BRC20 tokens associated with an address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The address to list BRC20 tokens for.
     * @returns {Promise<any>} A promise that resolves to an array of BRC20 tokens.
     */
    listBrc20s({ address }) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.apiClient.getBrc20sByAddress(address);
        });
    }
    /**
     * Lists inscribed collectibles associated with an address.
     * @param {Object} params - The parameters containing the address information.
     * @param {string} params.address - The address to list collectibles for.
     * @returns {Promise<any>} A promise that resolves to an array of collectibles.
     */
    listCollectibles({ address }) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.apiClient.getCollectiblesByAddress(address);
        });
    }
    /**
     * Retrieves a specific inscribed collectible by its ID.
     * @param {string} inscriptionId - The ID of the collectible to retrieve.
     * @returns {Promise<any>} A promise that resolves to the collectible data.
     */
    getCollectibleById(inscriptionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.apiClient.getCollectiblesById(inscriptionId);
            return data;
        });
    }
    signPsbt(psbtHex, fee, pubKey, signer, address) {
        return __awaiter(this, void 0, void 0, function* () {
            const addressType = transactions.getAddressType(address);
            if (addressType == null)
                throw Error('Invalid Address Type');
            const tx = new txbuilder_1.PSBTTransaction(signer, address, pubKey, addressType, fee);
            const signedPsbt = yield tx.signPsbt(psbtHex);
            const rawtx = signedPsbt.extractTransaction().toHex();
            return rawtx;
        });
    }
    signInscriptionPsbt(psbt, fee, pubKey, signer, address = '') {
        return __awaiter(this, void 0, void 0, function* () {
            //INITIALIZE NEW PSBTTransaction INSTANCE
            const wallet = new Wallet();
            const addressType = transactions.getAddressType(address);
            if (addressType == null)
                throw Error('Invalid Address Type');
            const tx = new txbuilder_1.PSBTTransaction(signer, address, pubKey, addressType, fee);
            //SIGN AND FINALIZE THE PSBT
            const signedPsbt = yield tx.signPsbt(psbt, true);
            //@ts-ignore
            psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = false;
            //EXTRACT THE RAW TX
            const rawtx = signedPsbt.extractTransaction().toHex();
            //BROADCAST THE RAW TX TO THE NETWORK
            const result = yield wallet.apiClient.pushTx({ transactionHex: rawtx });
            //GET THE TX_HASH
            const ready_txId = psbt.extractTransaction().getId();
            //CONFIRM TRANSACTION IS CONFIRMED
            return ready_txId;
        });
    }
    sendBRC20(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const isDry = true;
            if (isDry) {
                console.log('DRY!!!!! RUNNING ONE-CLICK BRC20 TRANSFER');
            }
            else {
                console.log('WET!!!!!!! 5');
                yield (0, utils_1.delay)(1000);
                console.log('WET!!!!!!! 4');
                yield (0, utils_1.delay)(1000);
                console.log('WET!!!!!!! 3');
                yield (0, utils_1.delay)(1000);
                console.log('WET!!!!!!! 2');
                yield (0, utils_1.delay)(1000);
                console.log('WET!!!!!!! 1');
                yield (0, utils_1.delay)(1000);
                console.log('LAUNCH!');
                yield (0, utils_1.delay)(1000);
            }
            try {
                // CREATE TRANSFER INSCRIPTION
                yield (0, utils_2.inscribe)({
                    ticker: options.token,
                    amount: options.amount,
                    inputAddress: options.feeFromAddress,
                    outputAddress: options.feeFromAddress,
                    mnemonic: options.mnemonic,
                    taprootPublicKey: options.taprootPublicKey,
                    segwitPublicKey: options.segwitPubkey,
                    segwitAddress: options.segwitAddress,
                    isDry: true,
                });
            }
            catch (err) {
                if (err instanceof Error) {
                    console.error(err);
                    return Error(`Things exploded (${err.message})`);
                }
                console.error(err);
                return err;
            }
        });
    }
}
exports.Wallet = Wallet;
//# sourceMappingURL=oylib.js.map