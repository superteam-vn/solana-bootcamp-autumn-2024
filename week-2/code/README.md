## Bootcamp Week 2: Tokens & NFTs

- Slides: https://docs.google.com/presentation/d/1UdOBE3z1lwJenJqP-tPtwvN9wW1LE6UC_ndzss4e2Q4/edit?usp=sharing

## Getting Started

1. Clone repository

```bash
git clone git@github.com:superteam-vn/solana-bootcamp-autumn-2024.git
```

2. Install the dependencies

```bash
cd solana-bootcamp-autumn-2024/week-2/code

yarn install
```

3. Copy rename the `example.env` file to be named `.env`
4. Update the `RPC_URL` variable to be the cluster URL of a supporting RPC provider

If you have the Solana CLI installed locally: update the `LOCAL_PAYER_JSON_ABSPATH` environment
variable to be the **_absolute path_** of your local testing wallet keypair JSON file.

## Recommended flow to explore this repo

After setting up locally, I recommend exploring the code of the following files (in order):

- [`1.createTokenWithMetadata.ts`](./scripts/`1.createTokenWithMetadata.ts)
- [`2.mintTokens.ts`](./scripts/2.mintTokens.ts)
- [`3.updateMetadata.ts`](./scripts/3.updateMetadata.ts)
- [`4.createNFTs.ts`](./scripts/4.createNFTs.ts)

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

#### `1.createTokenWithMetadata.ts`

Demonstrates how to create a SPL token and store it's metadata on chain (using the Metaplex MetaData
program)

#### `2.mintTokens.ts`

Demonstrates how to create new SPL tokens (aka "minting tokens") into an existing SPL Token Mint

#### `3.updateMetadata.ts`

Demonstrates how to update the metadata for an SPL token, using the Metaplex MetadataProgram

#### `4.createNFTs.ts`

Demonstrates how to mint NFTs and store their metadata on chain using the Metaplex MetadataProgram

> **Note:** We use some code from https://github.com/solana-developers/pirate-bootcamp for
> educational purposes.
