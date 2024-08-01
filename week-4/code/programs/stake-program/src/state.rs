use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct StakeInfo {
    pub staker: Pubkey,

    pub mint: Pubkey,

    pub stake_at: u64,

    pub is_staked: bool,

    pub amount: u64,
}
