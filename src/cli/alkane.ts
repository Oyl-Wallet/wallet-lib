import fs from 'fs-extra'
import { gzip as _gzip } from 'node:zlib'
import { promisify } from 'util'

import { Command } from 'commander'
import { Wallet } from './wallet'
import * as alkanes from '../alkanes'
import * as utxo from '../utxo'
import { waitFiveSeconds } from './utils'

/* @dev example calls

oyl alkane factoryDeploy -r "0x0ffe" -c free_mint.wasm

oyl alkane factoryDeploy -r "0x0ffe" -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' -p regtest -feeRate 2

*/

export const alkaneFactoryWasmDeploy = new Command('factoryWasmDeploy')
  .requiredOption(
    '-r, --reserveNumber <reserveNumber>',
    'number to reserve for factory id'
  )
  .requiredOption(
    '-c, --contract <contract>',
    'contract wasm fileto deploy'
  )
  .option(
    '-n, --networkType <networkType>',
    'network type: regtest | mainnet'
  )
  .option(
    '-m, --mnemonic <mnemonic>',
    'mnemonic used for signing transactions'
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')

  .action(async (options) => {
    const wallet = new Wallet({
      mnemonic: options.mnemonic,
      feeRate: options.feeRate,
    });

    const contract = new Uint8Array(
      Array.from(
        await fs.readFile(options.contract)
      )
    )
    const gzip = promisify(_gzip)

    const payload = {
      body: await gzip(contract, { level: 9 }),
      cursed: false,
      tags: { contentType: '' },
    }

    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } =
      await utxo.accountUtxos({ account: wallet.account, provider: wallet. provider })

    const commit = await alkanes.deployCommit({
      payload,
      gatheredUtxos: {
        utxos: accountSpendableTotalUtxos,
        totalAmount: accountSpendableTotalBalance,
      },
      feeRate: wallet.feeRate,
      account: wallet.account,
      signer: wallet.signer,
      provider: wallet.provider,
    })

    const mempool = await wallet.provider.sandshrew.bitcoindRpc.getRawMemPool(true)
    const mempoolTxs = Object.keys(mempool)
    console.log('mempool transactions: ', mempoolTxs)

    const blockHash = await wallet.provider.sandshrew.bitcoindRpc.generateBlock(
      wallet.account.nativeSegwit.address,
      mempoolTxs
    )
    console.log('Processed block: ', blockHash)
    console.log({ mempoolTxs, blockHash })

    waitFiveSeconds()

    const reveal = await alkanes.deployReveal({
      createReserveNumber: options.reserveNumber,
      commitTxId: commit.txId,
      script: commit.script,
      account: wallet.account,
      provider: wallet.provider,
      feeRate: wallet.feeRate,
      signer: wallet.signer,
    })

    console.log({ commit: commit, reveal: reveal })
  })