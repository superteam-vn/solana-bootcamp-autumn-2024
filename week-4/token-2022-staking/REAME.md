## Token 2022 Staking Contract

This is the staking contract for the Token 2022 project. It is a simple staking contract that allows users to stake their tokens and earn rewards.

### Features

- Init the contract with some configuration parameters
- Create a staking pool with any spl token, support multiple pools with multiple tokens including legacy spl and token 2022 tokens
- Stake tokens in the pool and earn rewards
- Unsake tokens and claim rewards at any time

### How to run

```bash
yarn install
anchor build
anchor test
```

### Create token 2022 with Solana CLI

```bash
spl-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb create-token --enable-metadata --decimals 9
```

initialize metadata inside the mint

```bash
spl-token initialize-metadata <TOKEN_MINT> "Solana Bootcamp Token" "SBT" "https://raw.githubusercontent.com/HongThaiPham/solana-bootcamp-autumn-2024/main/week-4/token-2022-staking/app/assets/token-info.json"
```

create token account for the mint

```bash
spl-token create-account <TOKEN_MINT> --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
```

mint some tokens

```bash
spl-token mint <TOKEN_MINT> 1000000 <TOKEN_ACCOUNT> --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
```
