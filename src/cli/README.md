## Prerequisite

Please refer to the global README found in the root before attempting to use the CLI.

## CLI Structure

The CLI is invoked with the `oyl` keyword.

```sh
$ oyl
```

From here we specify a namespace that groups like actions.

```sh
$ oyl utxo
```

Next, you give the command/action you want to do

```sh
$ oyl utxo availableBalance
```

Finally, you pass in the parameters you want to be included with your selected command.

`oyl utxo availableBalance -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'  -p regtest`

Some commands have required parameters. To see a list of all options you can add `--help`
to the end of a command, namespace, or the "oyl" keyword to see the help menu.

```sh
$ oyl utxo --help
```

## Available namespaces

- account
- utxo
- btc
- collectible
- brc20
- rune
- provider
- marketplace

The available namespaces list will grow as new protocols are implemented.

## Avaialble commands

- account
  - generate
  - generateMnemonic
  - privateKeys
- utxo
  - availableBalance
  - accountSpendableUtxos
  - addressSpendableUtxos
- btc
  - send
- collectible
  - send
- brc20
  - send
  - mint
- rune
  - send
  - mint
  - getRuneByName
- provider
  - api
  - ord
- marketplace
  - buy

Recommended usage of this CLI is as follows:

1. Generate an account
2. Fund the account by sending BTC or Ordinals to the address you desire
3. Use "utxo" namespace to check balances
4. Use btc 2.0!
