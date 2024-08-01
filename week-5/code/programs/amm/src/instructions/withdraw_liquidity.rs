use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::Token};

pub fn withdraw_liquidity(_ctx: Context<WithdrawLiquidity>, _amount: u64) -> Result<()> {
    // transfer token A pool A to LP

    // transfer token B pool B to LP

    // Burn LP token of LProvider

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawLiquidity<'info> {
    #[account(mut)]
    depositor: Signer<'info>,

    // more accounts
    
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
}
