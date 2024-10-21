import { Provider } from '../provider';
import { Account, AddressKey, SpendStrategy } from '../account';
export interface EsploraUtxo {
    txid: string;
    vout: number;
    status: {
        confirmed: boolean;
        block_height?: number;
        block_hash?: string;
        block_time?: number;
    };
    value: number;
}
export interface FormattedUtxo {
    txId: string;
    outputIndex: number;
    satoshis: number;
    scriptPk: string;
    address: string;
    inscriptions: any[];
    confirmations: number;
}
export interface AddressUtxoPortfolio {
    spendableTotalBalance: number;
    spendableUtxos: FormattedUtxo[];
    runeUtxos: FormattedUtxo[];
    ordUtxos: FormattedUtxo[];
    pendingUtxos: FormattedUtxo[];
    pendingTotalBalance: number;
    totalBalance: number;
}
export interface AccountUtxoPortfolio {
    accountTotalBalance: number;
    accountSpendableTotalUtxos: FormattedUtxo[];
    accountSpendableTotalBalance: number;
    accountPendingTotalBalance: number;
    accounts: Record<AddressKey, AddressUtxoPortfolio>;
}
export declare const accountBalance: ({ account, provider, }: {
    account: Account;
    provider: Provider;
}) => Promise<{
    confirmedAmount: number;
    pendingAmount: number;
    amount: number;
}>;
export declare const addressBalance: ({ address, provider, }: {
    address: string;
    provider: Provider;
}) => Promise<{
    confirmedAmount: number;
    pendingAmount: number;
    amount: number;
}>;
export declare const addressSpendableUtxos: ({ address, provider, spendAmount, spendStrategy, }: {
    address: string;
    provider: Provider;
    spendAmount?: number;
    spendStrategy?: SpendStrategy;
}) => Promise<{
    totalAmount: number;
    utxos: FormattedUtxo[];
}>;
export declare const accountSpendableUtxos: ({ account, provider, spendAmount, }: {
    account: Account;
    provider: Provider;
    spendAmount?: number;
}) => Promise<{
    totalAmount: number;
    utxos: FormattedUtxo[];
}>;
export declare const addressUtxos: ({ address, provider, spendStrategy, }: {
    address: string;
    provider: Provider;
    spendStrategy?: SpendStrategy;
}) => Promise<AddressUtxoPortfolio>;
export declare const accountUtxos: ({ account, provider, }: {
    account: Account;
    provider: Provider;
}) => Promise<AccountUtxoPortfolio>;
