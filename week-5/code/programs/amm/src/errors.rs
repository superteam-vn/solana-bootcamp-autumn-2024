use anchor_lang::prelude::*;

#[error_code]
pub enum AppError {
    #[msg("Invalid fee value")]
    InvalidFee,

    #[msg("Invalid mint")]
    InvalidMint,

    #[msg("Deposit too small")]
    DepositTooSmall,

    #[msg("Output too small")]
    OutputTooSmall,

    #[msg("Invariant violated")]
    InvariantViolated,
}
