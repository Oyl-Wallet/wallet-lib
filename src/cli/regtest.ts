import { Command } from 'commander'
import { Provider } from '..'
import { timeout } from '../shared/utils'
import { Wallet } from './wallet'
import { 
  REGTEST_FAUCET,
  DEFAULT_PROVIDER 
} from './constants'

const RANDOM_ADDRESS = 'bcrt1qz3y37epk6hqlul2pt09hrwgj0s09u5g6kzrkm2'


/* @dev usage
  oyl regtest init
*/
export const init = new Command('init')
  .description('Generate blocks to initialize regtest chain')
  .option(
    '-m, --mnemonic <mnemonic>',
    'mnemonic used for signing transactions (default = abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about)'
  )
  .option(
    '-a, --address <address>',
    'address that will receive initial funds (default = bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx)'
  )
  .action(async (options) => {
    const totalBlockCount = 260
    const faucetBlockCount = 60
    const addressBlockCount = 5

    const provider: Provider = DEFAULT_PROVIDER['regtest']

    const wallet = new Wallet({
      mnemonic: options.mnemonic,
    }); 

    const address = options.address || wallet.account.nativeSegwit.address

    const currentBlockCount = await provider.sandshrew.bitcoindRpc.getBlockCount()

    if (currentBlockCount > 250) {
      console.log('Blockchain already initialized')
      console.log('Block count: ',currentBlockCount)
      return
    }

    console.log('Generating blocks...')

    // Generate the first block utxo payments to the faucet. If you send too many to the address you can't query the utxos for funding.
    await provider.sandshrew.bitcoindRpc.generateToAddress(faucetBlockCount, REGTEST_FAUCET.nativeSegwit.address)

    await provider.sandshrew.bitcoindRpc.generateToAddress(addressBlockCount, address)
    
    // Generate the remaining blocks to a random address
    const transaction = await provider.sandshrew.bitcoindRpc.generateToAddress(totalBlockCount - faucetBlockCount - addressBlockCount, RANDOM_ADDRESS)
    await timeout(8000)
    const newBlockCount = await provider.sandshrew.bitcoindRpc.getBlockCount()
    console.log(transaction)
    console.log('Blockchain initialized');
    console.log('Block count: ',newBlockCount)
    console.log('Faucet address: ', REGTEST_FAUCET.nativeSegwit.address)
    console.log(`${address} has been funded with ${addressBlockCount} utxos`)
  })


  /* @dev example call
    oyl regtest genBlocks -c 2
  */
  export const genBlocks = new Command('genBlocks')
  .description('Generate blocks with transactions in mempool')
  .option('-a, --address <address>', 'address you want to recieve block funding (optional)')
  .option('-c, --count <count>', 'number of blocks (default = 1)', parseInt)
  .action(async (options) => {
    const count = options.count || 1
    const address = options.address || RANDOM_ADDRESS
    const provider: Provider = DEFAULT_PROVIDER['regtest']
    const genBlock = await provider.sandshrew.bitcoindRpc.generateToAddress(count, address)
    console.log('Processed blocks: ', genBlock)
  })
