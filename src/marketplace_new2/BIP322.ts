import * as secp256k1 from 'noble-secp256k1';
import { hex } from '@scure/base';
import * as btc from '@scure/btc-signer';
import { AddressType, getAddressInfo } from 'bitcoin-address-validation';
import { crypto } from 'bitcoinjs-lib';
import { signAsync } from 'bitcoinjs-message';
import { encode } from 'varuint-bitcoin';


const bitcoinMainnet = {
  bech32: 'bc',
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
};

const bitcoinTestnet = {
  bech32: 'tb',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};

const bitcoinNetworks = {
  Mainnet: bitcoinMainnet,
  Testnet: bitcoinTestnet,
};

const getBtcNetwork = (networkType) => {
  return bitcoinNetworks[networkType];
};

/**
 *
 * @param message
 * @returns Bip322 Message Hash
 *
 */
export function bip0322Hash(message) {
  const { sha256 } = crypto;
  const tag = 'BIP0322-signed-message';
  const tagHash = sha256(Buffer.from(tag));
  const result = sha256(Buffer.concat([tagHash, tagHash, Buffer.from(message)]));
  return result.toString('hex');
}

function encodeVarString(b) {
  return Buffer.concat([encode(b.byteLength), b]);
}

const getSigningPk = (type, privateKey) => {
  switch (type) {
    case AddressType.p2tr: {
      return secp256k1.schnorr.getPublicKey(privateKey);
    }
    case AddressType.p2sh: {
      return secp256k1.getPublicKey(privateKey, true);
    }
    case AddressType.p2wpkh: {
      return secp256k1.getPublicKey(privateKey, true);
    }
    default: {
      throw new Error('Unsupported Address Type');
    }
  }
};

const getSignerScript = (type, publicKey, network) => {
  switch (type) {
    case AddressType.p2tr: {
      return btc.p2tr(publicKey, undefined, network);
    }
    case AddressType.p2wpkh: {
      return btc.p2wpkh(publicKey, network);
    }
    case AddressType.p2sh: {
      const p2wph = btc.p2wpkh(publicKey, network);
      return btc.p2sh(p2wph, network);
    }
    default: {
      throw new Error('Unsupported Address Type');
    }
  }
};

export const signBip322Message = async ({
  message,
  network,
  privateKey,
  signatureAddress,
}) => {
  

  const { type } = getAddressInfo(signatureAddress);
    const ecpairPk = privateKey
    const newPk = privateKey.toString('hex');
    if (type === AddressType.p2sh) {
      return (await signAsync(message, ecpairPk, false, { segwitType: 'p2sh(p2wpkh)' })).toString('base64');
    }

 
    const publicKey = getSigningPk(type, newPk);
    const txScript = getSignerScript(type, publicKey, getBtcNetwork(network));
    const inputHash = hex.decode('0000000000000000000000000000000000000000000000000000000000000000');
    const txVersion = 0;
    const inputIndex = 4294967295;
    const sequence = 0;
    const scriptSig = btc.Script.encode(['OP_0', hex.decode(bip0322Hash(message))]);
    // tx-to-spend
    const txToSpend = new btc.Transaction({
      allowUnknownOutputs: true,
      version: txVersion,
    });
    txToSpend.addOutput({
      amount: BigInt(0),
      script: txScript.script,
    });
    txToSpend.addInput({
      txid: inputHash,
      index: inputIndex,
      sequence,
      finalScriptSig: scriptSig,
    });
    // tx-to-sign
    const txToSign = new btc.Transaction({
      allowUnknownOutputs: true,
      version: txVersion,
    });
    txToSign.addInput({
      txid: txToSpend.id,
      index: 0,
      sequence,
      tapInternalKey: type === AddressType.p2tr ? publicKey : undefined,
      witnessUtxo: {
        script: txScript.script,
        amount: BigInt(0),
      },
      redeemScript: AddressType.p2sh ? txScript.redeemScript : Buffer.alloc(0),
    });
    txToSign.addOutput({ script: btc.Script.encode(['RETURN']), amount: BigInt(0) });
    txToSign.sign(hex.decode(newPk));
    txToSign.finalize();

    // formulate-signature
    const firstInput = txToSign.getInput(0);
    if (firstInput.finalScriptWitness?.length) {
      const len = encode(firstInput.finalScriptWitness?.length);
      const result = Buffer.concat([len, ...firstInput.finalScriptWitness.map((w) => encodeVarString(w))]);
      return result.toString('base64');
    } else {
      return '';
    }
}

