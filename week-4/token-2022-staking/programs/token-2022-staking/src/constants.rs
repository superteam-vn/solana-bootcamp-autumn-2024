use anchor_lang::prelude::*;

#[constant]
pub const CONFIG_SEED: &[u8] = b"config";

#[constant]
pub const POOL_SEED: &[u8] = b"pool";

#[constant]
pub const STAKEINFO_SEED: &[u8] = b"stakeinfo";

#[constant]
pub const MINT_URI: &str = "https://raw.githubusercontent.com/HongThaiPham/solana-bootcamp-autumn-2024/main/week-4/token-2022-staking/app/assets/token-info.json";

#[constant]
pub const MINT_NAME: &str = "Solana Bootcamp Token";

#[constant]
pub const MINT_SYMBOL: &str = "SBT";
