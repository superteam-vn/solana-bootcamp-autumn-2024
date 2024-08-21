use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub authority: Pubkey,
    pub stake_mint: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_ata: Pubkey,
    pub allocation: u64,
    pub reward_per_slot: u64,
}

impl Pool {
    pub fn calculate_reward(&self, from_slot: u64, to_slot: u64) -> u64 {
        let elapsed = to_slot - from_slot;
        elapsed * self.reward_per_slot
    }
}
