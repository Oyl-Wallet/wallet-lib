import { AddressType, IBlockchainInfoUTXO } from '../shared/interface';
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
export declare const getUnspentOutputs: (address: any) => Promise<any>;
export declare const getBtcPrice: () => Promise<any>;
export declare const calculateBalance: (utxos: any) => number;
export declare const convertUsdValue: (amount: any) => Promise<string>;
export declare const getMetaUtxos: (address: string, utxos: IBlockchainInfoUTXO[], inscriptions: any) => Promise<any[]>;
export declare function getAddressType(address: string): AddressType | null;
export declare const validateTaprootAddress: ({ address, type }: {
    address: any;
    type: any;
}) => boolean;
export declare const validateSegwitAddress: ({ address, type }: {
    address: any;
    type: any;
}) => boolean;
