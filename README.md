[![npm version](https://badge.fury.io/js/angular2-expandable-list.svg)](https://badge.fury.io/js/angular2-expandable-list)

# Oyl Sdk

> A comphrenesive sdk that features easy to use bitcoin functions to build and brodcast btc transactions.

## Table of contents

- [Oyl SDK](#oyl-sdk)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Running the tests](#running-the-tests)
    - [Using the cli](#using-the-cli-version)
  - [Contributing](#contributing)
  - [Versioning](#versioning)
  - [Authors](#authors)
  - [License](#license)

## Installation

To install and set up the library, run:

```sh
$ yarn install
```

## Usage

### Running the tests

```sh
$ yarn test
```

### Using the CLI version

```sh
$ make reset
```

This does a fresh build of the lib directory which the cli uses after all the .ts files are compiled.

The name of the bin for the cli is called "oyl". If you want to invoke it without having the yarn prefix you need to add it globally.
Run this command:

```sh
$ yarn global add oyl
```

You can also link the package so it updates as you make local changes:

```sh
$ yarn link
```

If you want the program to be isolated to only this enviornment use the local script provided to you like this:

```sh
$ yarn oyl --help
```

e.g. `oyl utxos addressUtxos -a bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx -p regtest`.
For more detailed instructions on how to use the cli, refer to the README.md found in the cli directory.

## Contributing

1.  Fork it!
2.  Create your feature branch: `git checkout -b my-new-feature`
3.  Add your changes: `git add .`
4.  Commit your changes: `git commit -m 'Add some feature'`
5.  Push to the branch: `git push origin my-new-feature`
6.  Submit a pull request :sunglasses:

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags).

## Authors

- **Oyl Dynamics**

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

[MIT License]
