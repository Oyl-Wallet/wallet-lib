declare const Client: any;
interface BcoinRpcOptions {
    [key: string]: any;
}
declare class BcoinRpc extends Client {
    password: string;
    constructor(options: BcoinRpcOptions);
    auth(): Promise<void>;
    execute(name: string, params?: any): Promise<any>;
    getMempool(): Promise<any>;
    getInfo(): Promise<any>;
    getCoinsByAddress(address: string): Promise<any>;
    getCoinsByAddresses(addresses: string[]): Promise<any>;
    getCoin(hash: string, index: number): Promise<any>;
    getTxByAddress(address: string): Promise<any>;
    getTxByAddresses(addresses: string[]): Promise<any>;
    getTX(hash: string): Promise<any>;
    pushTX(hash: string): Promise<any>;
    getBlock(block: string | number): Promise<any>;
    getBlockHeader(block: string | number): Promise<any>;
    getFilter(filter: string | number): Promise<any>;
    broadcast(tx: string): Promise<any>;
    reset(height: number): Promise<any>;
    private watchChain;
    private watchMempool;
    getTip(): Promise<any>;
    getEntry(block: string): Promise<any>;
}
export default BcoinRpc;
