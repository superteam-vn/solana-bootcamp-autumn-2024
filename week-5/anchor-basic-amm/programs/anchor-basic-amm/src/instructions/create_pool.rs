use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{Pool, LP_SEED, POOL_SEED};

#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(
      init,
      payer = maker,
      space = 8 + Pool::INIT_SPACE,
      seeds = [POOL_SEED, mint_x.key().as_ref(), mint_y.key().as_ref()],
      bump,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
      mint::token_program = mint_x_token_program,
    )]
    pub mint_x: InterfaceAccount<'info, Mint>,
    #[account(
      mint::token_program = mint_y_token_program,
    )]
    pub mint_y: InterfaceAccount<'info, Mint>,
    #[account(
      init,
      payer = maker,
      seeds = [LP_SEED, pool.key().as_ref()],
      bump,
      mint::decimals = 6,
      mint::authority = pool,
      mint::token_program = token_program,
    )]
    pub mint_lp: InterfaceAccount<'info, Mint>,
    #[account(
      init,
      payer = maker,
      associated_token::mint = mint_x,
      associated_token::authority = pool,
      associated_token::token_program = mint_x_token_program,
    )]
    pub pool_x_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
      init,
      payer = maker,
      associated_token::mint = mint_y,
      associated_token::authority = pool,
      associated_token::token_program = mint_y_token_program,
    )]
    pub pool_y_ata: InterfaceAccount<'info, TokenAccount>,
    pub mint_x_token_program: Interface<'info, TokenInterface>,
    pub mint_y_token_program: Interface<'info, TokenInterface>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreatePool<'info> {
    pub fn handler(&mut self, bumps: &CreatePoolBumps) -> Result<()> {
        self.pool.set_inner(Pool {
            maker: self.maker.to_account_info().key(),
            mint_x: self.mint_x.to_account_info().key(),
            mint_y: self.mint_y.to_account_info().key(),
            mint_lp: self.mint_lp.to_account_info().key(),
            bump: bumps.pool,
        });
        Ok(())
    }
}
