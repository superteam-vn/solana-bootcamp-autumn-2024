use anchor_lang::prelude::*;

#[error_code]
pub enum MyErrorCode {
    #[msg("Invalid deposit amount")]
    InvalidDepositAmount,
    #[msg("Invalid stake mint account")]
    InvalidStakeMintAccount,
    #[msg("Allocation must be greater than zero")]
    AllocationMustBeGreaterThanZero,
    #[msg("Reward per second must be greater than zero")]
    RewardPerSecondMustBeGreaterThanZero,
    #[msg("Invalid unstake amount")]
    InvalidUnstakeAmount,
    #[msg("Insufficient stake amount")]
    InsufficientStakeAmount,
    #[msg("Overflow")]
    Overflow,
}
