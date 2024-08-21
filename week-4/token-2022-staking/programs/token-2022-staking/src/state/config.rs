use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub reward_mint: Pubkey,
}
