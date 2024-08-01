use anchor_lang::prelude::*;

#[error_code]
pub enum AppError {
    #[msg("Name is too long")]
    NameTooLong,

    #[msg("Content is too long")]
    ContentTooLong,

    #[msg("Invalid authority")]
    InvalidAuthority,
}
