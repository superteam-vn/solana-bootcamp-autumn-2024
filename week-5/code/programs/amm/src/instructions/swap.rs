use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::Token};

pub fn swap(
    _ctx: Context<Swap>,
    _swap_a: bool,
    _input_amount: u64,
    _min_output_amount: u64,
) -> Result<()> {

    // transfer token A from trader to pool

    // transfer token B from pool to trader

    // transfer fee from trader to pool

    Ok(())
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,

    // more accounts

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
