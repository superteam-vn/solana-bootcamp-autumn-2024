use anchor_lang::prelude::*;

#[error_code]
pub enum AmmErrorCode {
    #[msg("Invalid fee")]
    InvalidFee,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    Overflow,
    InvalidParams,
    ZeroAmount,
}
