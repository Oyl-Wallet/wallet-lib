import { Command } from 'commander'
import fs from 'fs-extra'
import { gzip as _gzip } from 'node:zlib'
import { promisify } from 'util'
import path from 'path'
import * as alkanes from '../alkanes/alkanes'
import * as utxo from '../utxo'
import { Wallet } from './wallet'
import { contractDeployment } from '../alkanes/contract'
import { send, tokenDeployment } from '../alkanes/token'

export const alkanesTrace = new Command('trace')
  .description('Returns data based on txid and vout of alkanes transaction')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use to access the network.'
  )
  .option(
    '-params, --parameters <parameters>',
    'parameters for the ord method you are calling.'
  )
  /* @dev example call
    oyl alkanes trace -params '{"txid":"abc123...","vout":3}' -p regtest

    please note the json format if you need to pass an object.
  */
  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const provider = wallet.provider
    let isJson: { vout: number; txid: string }
    try {
      isJson = JSON.parse(options.parameters)
      const { vout, txid } = isJson
      console.log(await provider.alkanes.trace({ vout, txid }))
    } catch (error) {
      const { vout, txid } = isJson
      console.log(await provider.alkanes.trace({ vout, txid }))
    }
  })

export const alkaneContractDeploy = new Command('new-contract')
  .requiredOption(
    '-c, --contract <contract>',
    'Relative path to contract wasm file to deploy (e.g., "../alkanes/free_mint.wasm")'
  )
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')
  .requiredOption(
    '-resNumber, --reserveNumber <reserveNumber>',
    'number to reserve for factory id'
  )

  /* @dev example call 
oyl alkanes new-contract -c ./src/alkanes/free_mint.wasm -resNumber 777 -p regtest -feeRate 2
*/

  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const account = wallet.account
    const provider = wallet.provider
    const signer = wallet.signer

    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } =
      await utxo.accountUtxos({ account, provider })

    const contract = new Uint8Array(
      Array.from(
        await fs.readFile(path.resolve(process.cwd(), options.contract))
      )
    )
    const gzip = promisify(_gzip)

    const payload = {
      body: await gzip(contract, { level: 9 }),
      cursed: false,
      tags: { contentType: '' },
    }

    console.log(
      await contractDeployment({
        reserveNumber: options.reserveNumber,
        payload,
        gatheredUtxos: {
          utxos: accountSpendableTotalUtxos,
          totalAmount: accountSpendableTotalBalance,
        },
        feeRate: options.feeRate,
        account,
        signer,
        provider,
      })
    )
  })

export const alkaneTokenDeploy = new Command('new-token')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption(
    '-resNumber, --reserveNumber <reserveNumber>',
    'number to reserve for factory id'
  )
  .requiredOption('-cap, --capacity <cap>', 'the token cap')
  .requiredOption('-name, --token-name <name>', 'the token name')
  .requiredOption('-symbol, --token-symbol <symbol>', 'the token symbol')
  .requiredOption(
    '-amount, --amount-per-mint <amount-per-mint>',
    'amount of tokens minted each time mint is called'
  )
  .option('-pre, --premine <premine>', 'amount to premine')
  .option(
    '-i, --image <image>',
    'Relative path to image file to deploy (e.g., "../alkanes/free_mint.wasm")'
  )

  .option('-feeRate, --feeRate <feeRate>', 'fee rate')

  /* @dev example call 
oyl alkanes new-token -resNumber 777 -p regtest -feeRate 2 -amount 1000 -name "OYL" -symbol "OL" -cap 100000 -pre 5000
*/

  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const account = wallet.account
    const provider = wallet.provider
    const signer = wallet.signer
    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } =
      await utxo.accountUtxos({ account, provider })

    const calldata = [
      BigInt(6),
      BigInt(options.reserveNumber),
      BigInt(0),
      BigInt(6000),
      BigInt(2000),
      BigInt(2000),
      BigInt(
        '0x' +
          Buffer.from("DDD").toString(
            'hex'
          )
      ),
      BigInt(
        '0x' +
          Buffer.from(
            "D"
          ).toString('hex')
      ),
    ]

    console.log(calldata)

    if (options.image) {
      const image = new Uint8Array(
        Array.from(
          await fs.readFile(path.resolve(process.cwd(), options.image))
        )
      )
      const gzip = promisify(_gzip)

      const payload = {
        body: await gzip(image, { level: 9 }),
        cursed: false,
        tags: { contentType: '' },
      }

      console.log(
        await tokenDeployment({
          payload,
          gatheredUtxos: {
            utxos: accountSpendableTotalUtxos,
            totalAmount: accountSpendableTotalBalance,
          },
          feeRate: options.feeRate,
          calldata,
          account,
          signer,
          provider,
        })
      )
      return
    }

    console.log(
      await alkanes.execute({
        gatheredUtxos: {
          utxos: accountSpendableTotalUtxos,
          totalAmount: accountSpendableTotalBalance,
        },
        feeRate: options.feeRate,
        calldata,
        account,
        signer,
        provider,
      })
    )
    return
  })

export const alkaneExecute = new Command('execute')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption(
    '-data, --calldata <calldata>',
    'op code + params to be called on a contract',
    (value, previous) => {
      const items = value.split(',')
      return previous ? previous.concat(items) : items
    },
    []
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')
  /* @dev example call 
oyl alkanes execute -p regtest -feeRate 2 -data '101'
Mint from initial token contract:
oyl alkanes execute -p regtest -feeRate 2 -data '2,1,77'
*/

  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const account = wallet.account
    const provider = wallet.provider
    const signer = wallet.signer
    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } =
      await utxo.accountUtxos({ account, provider })
    const calldata: bigint[] = []
    for (let i = 0; i < options.calldata.length; i++) {
      calldata.push(BigInt(options.calldata[i]))
    }
    console.log(
      await alkanes.execute({
        gatheredUtxos: {
          utxos: accountSpendableTotalUtxos,
          totalAmount: accountSpendableTotalBalance,
        },
        feeRate: options.feeRate,
        calldata,
        account,
        signer,
        provider,
      })
    )
  })

export const alkaneSend = new Command('send')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption('-to, --to <to>')
  .requiredOption('-amt, --amount <amount>')
  .requiredOption('-blk, --block <block>')
  .requiredOption('-tx, --txNum <txNum>')
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')

  /* @dev example call 
oyl alkanes send -p regtest -feeRate 2 -tx '1' -blk '2' -amt 1000 -to bcrt1pkq6ayylfpe5hn05550ry25pkakuf72x9qkjc2sl06dfcet8sg25ql4dm73
*/

  .action(async (options) => {
    const wallet: Wallet = new Wallet({ networkType: options.provider })
    const account = wallet.account
    const provider = wallet.provider
    const signer = wallet.signer
    const { accountSpendableTotalUtxos, accountSpendableTotalBalance } =
      await utxo.accountUtxos({ account, provider })

    console.log(
      await send({
        gatheredUtxos: {
          utxos: accountSpendableTotalUtxos,
          totalAmount: accountSpendableTotalBalance,
        },
        feeRate: options.feeRate,
        alkaneId: { block: options.block, tx: options.txNum },
        toAddress: options.to,
        amount: Number(options.amount),
        account,
        signer,
        provider,
      })
    )
  })
