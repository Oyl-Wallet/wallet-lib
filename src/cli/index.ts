import { Command } from 'commander'
import { collectibleSend } from './collectible'

import {
  alkaneExecute,
  alkaneContractDeploy,
  alkaneSend,
  alkanesTrace,
  alkaneTokenDeploy,
} from './alkanes'
import { init, genBlocks } from './regtest'
import { runeSend, runeMint, runeEtchCommit, runeEtchReveal } from './rune'
import { brc20Send } from './brc20'
import { btcSend } from './btc'
import {
  accountAvailableBalance,
  accountUtxosToSpend,
  addressBRC20Balance,
  addressUtxosToSpend,
} from './utxo'
import {
  mnemonicToAccountCommand,
  privateKeysCommand,
  generateMnemonicCommand,
  signPsbt,
} from './account'
import {
  alkanesProvider,
  multiCallSandshrewProviderCall,
  ordProviderCall,
} from './provider'

const program = new Command()

program
  .name('default')
  .description('All functionality for oyl-sdk in a cli-wrapper')
  .version('0.0.1')

const regtestCommand = new Command('regtest')
  .description('Regtest commands')
  .addCommand(genBlocks)
  .addCommand(init)

const accountCommand = new Command('account')
  .description('Manage accounts')
  .addCommand(mnemonicToAccountCommand)
  .addCommand(signPsbt)
  .addCommand(privateKeysCommand)
  .addCommand(generateMnemonicCommand)

const utxosCommand = new Command('utxo')
  .description('Examine utxos')
  .addCommand(accountUtxosToSpend)
  .addCommand(addressUtxosToSpend)
  .addCommand(accountAvailableBalance)
  
const btcCommand = new Command('btc')
  .description('Functions for sending bitcoin')
  .addCommand(btcSend)

const brc20Command = new Command('brc20')
  .description('Functions for brc20')
  .addCommand(brc20Send)
  .addCommand(addressBRC20Balance)

const collectibleCommand = new Command('collectible')
  .description('Functions for collectibles')
  .addCommand(collectibleSend)

const runeCommand = new Command('rune')
  .description('Functions for runes')
  .addCommand(runeSend)
  .addCommand(runeMint)
  .addCommand(runeEtchCommit)
  .addCommand(runeEtchReveal)

const alkaneCommand = new Command('alkanes')
  .description('Functions for alkanes')
  .addCommand(alkaneContractDeploy)
  .addCommand(alkaneExecute)
  .addCommand(alkaneTokenDeploy)
  .addCommand(alkanesTrace)
  .addCommand(alkaneSend)

const providerCommand = new Command('provider')
  .description('Functions avaialble for all provider services')
  .addCommand(ordProviderCall)
  .addCommand(multiCallSandshrewProviderCall)
  .addCommand(alkanesProvider)

program.addCommand(regtestCommand)
program.addCommand(alkaneCommand)
program.addCommand(utxosCommand)
program.addCommand(accountCommand)
program.addCommand(btcCommand)
program.addCommand(brc20Command)
program.addCommand(collectibleCommand)
program.addCommand(runeCommand)
program.addCommand(providerCommand)

program.parse(process.argv)
