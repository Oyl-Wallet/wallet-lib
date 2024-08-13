/**
 *
 * @param message
 * @returns Bip322 Message Hash
 *
 */
export declare function bip0322Hash(message: any): string;
export declare const signBip322Message: ({ message, network, privateKey, signatureAddress, }: {
    message: any;
    network: any;
    privateKey: any;
    signatureAddress: any;
}) => Promise<string>;
