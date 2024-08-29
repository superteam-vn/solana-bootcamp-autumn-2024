use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AmmConfig {
    pub authority: Pubkey,
    pub fee: u16,
    pub bump: u8,
}
