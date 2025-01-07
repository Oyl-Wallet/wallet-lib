import { Command } from 'commander'
import fs from 'fs-extra'
import { gzip as _gzip } from 'node:zlib'
import { promisify } from 'util'
import path from 'path'

import { Wallet } from './wallet'
import * as alkanes from '../alkanes'
import * as utxo from '../utxo'
import { timeout } from '../shared/utils'

/* @dev example calls
  oyl alkane factoryWasmDeploy -r "0x0ffe" -c free_mint.wasm
*/

export const factoryWasmDeploy = new Command('factoryWasmDeploy')
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
    console.log(`Deploying contract ${options.contract}`)
    const wallet = new Wallet({
      mnemonic: options.mnemonic,
      feeRate: options.feeRate,
    });

    const contract = new Uint8Array(
      Array.from(
        await fs.readFile(path.join(__dirname, './', options.contract))
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

    const { txId: commitTxId, script } = await alkanes.deployCommit({
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

    console.log('Commit txid: ', commitTxId);


    const mempool = await wallet.provider.sandshrew.bitcoindRpc.getRawMemPool(true)
    const mempoolTxs = Object.keys(mempool)
    console.log('mempool transactions: ', mempoolTxs)

    const blockHash = await wallet.provider.sandshrew.bitcoindRpc.generateBlock(
      wallet.account.nativeSegwit.address,
      mempoolTxs
    )

    await timeout(5000)

    const { txId: revealTxId } = await alkanes.deployReveal({
      createReserveNumber: options.reserveNumber,
      commitTxId: commitTxId,
      script: script,
      account: wallet.account,
      provider: wallet.provider,
      feeRate: wallet.feeRate,
      signer: wallet.signer,
    })

    console.log('Reveal txid: ', revealTxId)
  })