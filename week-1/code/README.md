## Bootcamp Week 1: Introduction to Solana

- Slides: https://docs.google.com/presentation/d/173VEdCNeLUQJEkLWbbImDCCNaF7tSNbCWUwCUo9-Ezw/edit?usp=sharing

## Getting Started

1. Clone repository

```bash
git clone git@github.com:superteam-vn/solana-bootcamp-autumn-2024.git
```

2. Install the dependencies

```bash
cd solana-bootcamp-autumn-2024/week-1/code

yarn install
```

3. Copy rename the `example.env` file to be named `.env`
4. Update the `RPC_URL` variable to be the cluster URL of a supporting RPC provider

If you have the Solana CLI installed locally: update the `LOCAL_PAYER_JSON_ABSPATH` environment
variable to be the **_absolute path_** of your local testing wallet keypair JSON file.

## Recommended flow to explore this repo

After setting up locally, I recommend exploring the code of the following files (in order):

- [`1.simpleTransaction.ts`](./scripts/1.simpleTransaction.ts)
- [`2.complexTransaction.ts`](./scripts/2.complexTransaction.ts)

After reviewing the code in each of these scripts, try running each in order.

> **Note:** Running each of these scripts may save some various bits of data to a `.local_keys`
> folder within this repo for use by the other scripts later in this ordered list. Therefore,
> running them in a different order may result in them not working as written/desired. You have been
> warned :)

### Running the included Scripts

Once setup locally, you will be able to run the scripts included within this repo:

```
yarn execute ./scripts/<script>
```

#### `1.simpleTransaction.ts`

A brief introduction to the Solana web3.js package. Demonstrating how to build and send simple
transactions to the blockchain

#### `2.complexTransaction.ts`

An introduction to more complex transactions using Solana web3.js Demonstrates how to build a more
complex transaction, with multiple instructions.

> **Note:** We use some code from https://github.com/solana-developers/pirate-bootcamp for
> educational purposes.
