use anchor_lang::prelude::*;
use spl_math::uint::U256;

use crate::error::AmmErrorCode;

// Calculate the amount of X must deposit to get a of Y
// dx = X. dy / Y
pub fn calculate_desired_amount_deposit(x: u64, y: u64, a: u64) -> Result<u64> {
    Ok(U256::from(x)
        .checked_mul(U256::from(a))
        .ok_or(AmmErrorCode::Overflow)?
        .checked_div(U256::from(y))
        .ok_or(AmmErrorCode::Overflow)?
        .as_u64())
}

// Calculate the desired amount of Y to withdraw a of X
// dy = Y.dx / (X + dx)
pub fn calculate_desired_amount_withdraw(x: u64, y: u64, a: u64) -> Result<u64> {
    Ok(U256::from(y)
        .checked_mul(U256::from(a))
        .ok_or(AmmErrorCode::Overflow)?
        .checked_div(
            U256::from(x)
                .checked_add(U256::from(a))
                .ok_or(AmmErrorCode::Overflow)?,
        )
        .ok_or(AmmErrorCode::Overflow)?
        .as_u64())
}

// Calculate the amount X and Y will receive when burn a of shares
// dx = X * s / T
// dy  = Y * s / T
pub fn calculate_x_y_amount_return(x: u64, y: u64, s: u64, t: u64) -> Result<(u64, u64)> {
    let amount_x = U256::from(x)
        .checked_mul(U256::from(s))
        .ok_or(AmmErrorCode::Overflow)?
        .checked_div(U256::from(t))
        .ok_or(AmmErrorCode::Overflow)?
        .as_u64();
    let amount_y = U256::from(y)
        .checked_mul(U256::from(s))
        .ok_or(AmmErrorCode::Overflow)?
        .checked_div(U256::from(t))
        .ok_or(AmmErrorCode::Overflow)?
        .as_u64();

    Ok((amount_x, amount_y))
}
