use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct StakeInfo {
    pub staker: Pubkey,
    pub amount: u64,
    pub last_deposit_slot: u64,
    pub reward: u64,
}
