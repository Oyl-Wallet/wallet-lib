export declare class OrdRpc {
    ordUrl: string;
    constructor(url: string);
    _call(method: string, params?: any[]): Promise<any>;
    getInscriptionById(inscriptionId: string): Promise<any>;
    getInscriptionContent(inscriptionId: string): Promise<any>;
    getInscriptionByNumber(number: string): Promise<any>;
    getInscriptions(startingNumber?: string): Promise<any>;
    getInscriptionsByBlockHash(blockHash: string): Promise<any>;
    getInscriptionsByBlockHeight(blockHash: string): Promise<any>;
    getInscriptionBySat(satNumber: string): Promise<any>;
    getInscriptionBySatWithIndex(satNumber: string, index?: string): Promise<any>;
    getInscriptionChildren(inscriptionId: string, page?: string): Promise<any>;
    getInscriptionMetaData(inscriptionId: string): Promise<any>;
    getTxOutput(txIdVout: string): Promise<any>;
    getSatByNumber(number: string): Promise<any>;
    getSatByDecimal(decimal: string): Promise<any>;
    getSatByDegree(degree: string): Promise<any>;
    getSatByBase26(base26: string): Promise<any>;
    getSatByPercentage(percentage: string): Promise<any>;
    getRuneByName(runeName: string): Promise<any>;
    getRuneById(runeId: string): Promise<any>;
    getRunes(): Promise<any>;
}
