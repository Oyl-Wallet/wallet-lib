import { mnemonicToAccount, Account, generateMnemonic } from '.'

function isAccount(obj: any): obj is Account {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.taproot === 'object' &&
    typeof obj.taproot.pubkey === 'string' &&
    typeof obj.taproot.pubKeyXOnly === 'string' &&
    typeof obj.taproot.address === 'string' &&
    typeof obj.nativeSegwit === 'object' &&
    typeof obj.nativeSegwit.pubkey === 'string' &&
    typeof obj.nativeSegwit.address === 'string' &&
    typeof obj.nestedSegwit === 'object' &&
    typeof obj.nestedSegwit.pubkey === 'string' &&
    typeof obj.nestedSegwit.address === 'string' &&
    typeof obj.legacy === 'object' &&
    typeof obj.legacy.pubkey === 'string' &&
    typeof obj.legacy.address === 'string' &&
    typeof obj.spendStrategy === 'object' &&
    Array.isArray(obj.spendStrategy.addressOrder) &&
    typeof obj.spendStrategy.utxoSortGreatestToLeast === 'boolean' &&
    typeof obj.spendStrategy.changeAddress === 'string' &&
    typeof obj.network === 'object' &&
    typeof obj.network.messagePrefix === 'string' &&
    typeof obj.network.bech32 === 'string' &&
    typeof obj.network.bip32 === 'object' &&
    typeof obj.network.bip32.public === 'number' &&
    typeof obj.network.bip32.private === 'number' &&
    typeof obj.network.pubKeyHash === 'number' &&
    typeof obj.network.scriptHash === 'number' &&
    typeof obj.network.wif === 'number'
  )
}

describe('Account Tests', () => {
  it('Generate accurate Account object', () => {
    expect(
      isAccount(
        mnemonicToAccount({
          mnemonic:
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        })
      )
    ).toBe(true)
  })

  it('Generate 12 word mnemonic', () => {
    const countWords = (str: string): number => {
      return str
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length
    }
    const mnemonic = generateMnemonic()
    expect(countWords(mnemonic)).toBe(12)
  })
})
