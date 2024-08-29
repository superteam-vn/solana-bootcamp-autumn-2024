use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    error::AmmErrorCode, utils::calculate_desired_amount_withdraw, AmmConfig, Pool, CONFIG_SEED,
    POOL_SEED,
};

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
      seeds = [POOL_SEED, mint_x.key().as_ref(), mint_y.key().as_ref()],
      bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
      seeds = [CONFIG_SEED],
      bump
    )]
    pub config: Account<'info, AmmConfig>,
    #[account(
      address = pool.mint_x,
      mint::token_program = mint_x_token_program,
    )]
    pub mint_x: Box<InterfaceAccount<'info, Mint>>,
    #[account(
      address = pool.mint_y,
      mint::token_program = mint_y_token_program,
    )]
    pub mint_y: Box<InterfaceAccount<'info, Mint>>,
    #[account(
      init_if_needed,
      payer = signer,
      associated_token::mint = mint_x,
      associated_token::authority = signer,
      associated_token::token_program = mint_x_token_program,
    )]
    pub user_x_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
      init_if_needed,
      payer = signer,
      associated_token::mint = mint_y,
      associated_token::authority = signer,
      associated_token::token_program = mint_y_token_program,
    )]
    pub user_y_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
      mut,
      associated_token::mint = mint_x,
      associated_token::authority = pool,
      associated_token::token_program = mint_x_token_program,
    )]
    pub pool_x_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
      mut,
      associated_token::mint = mint_y,
      associated_token::authority = pool,
      associated_token::token_program = mint_y_token_program,
    )]
    pub pool_y_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    pub mint_x_token_program: Interface<'info, TokenInterface>,
    pub mint_y_token_program: Interface<'info, TokenInterface>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Swap<'info> {
    pub fn handler(
        &mut self,
        x_to_y: bool,
        amount_in: u64,
        min_amount_out: u64,
        _bumps: &SwapBumps,
    ) -> Result<()> {
        let (x, y) = match x_to_y {
            true => (self.pool_x_ata.amount, self.pool_y_ata.amount),
            false => (self.pool_y_ata.amount, self.pool_x_ata.amount),
        };

        self.deposit(x_to_y, amount_in)?;

        let amount_in_minus_fees = amount_in
            .checked_mul(10000_u64.checked_sub(self.config.fee as u64).unwrap())
            .ok_or(AmmErrorCode::Overflow)?
            .checked_div(10000_u64)
            .ok_or(AmmErrorCode::Overflow)?;

        // dy = Y.dx / (X + dx)
        let amount_out = calculate_desired_amount_withdraw(x, y, amount_in_minus_fees)?;

        require_gte!(amount_out, min_amount_out, AmmErrorCode::InvalidParams);

        self.withdraw(x_to_y, amount_out)?;

        Ok(())
    }

    fn withdraw(&mut self, x_to_y: bool, amount: u64) -> Result<()> {
        let pool = self.pool.clone();
        let (mint, decimals, token_program, from, to) = match x_to_y {
            true => (
                self.mint_y.to_account_info(),
                self.mint_y.decimals,
                self.mint_y_token_program.to_account_info(),
                self.pool_y_ata.to_account_info(),
                self.user_y_ata.to_account_info(),
            ),
            false => (
                self.mint_x.to_account_info(),
                self.mint_x.decimals,
                self.mint_x_token_program.to_account_info(),
                self.pool_x_ata.to_account_info(),
                self.user_x_ata.to_account_info(),
            ),
        };

        let seeds = &[
            POOL_SEED,
            pool.mint_x.as_ref(),
            pool.mint_y.as_ref(),
            &[pool.bump],
        ];

        let signer_seeds = &[&seeds[..]];

        transfer_checked(
            CpiContext::new_with_signer(
                token_program,
                TransferChecked {
                    from: from,
                    mint: mint,
                    to: to,
                    authority: self.pool.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
            decimals,
        )?;
        Ok(())
    }

    fn deposit(&mut self, x_to_y: bool, amount_in: u64) -> Result<()> {
        let (deposit_mint, deposit_decimals, deposit_token_program, deposit_from, desposit_to) =
            match x_to_y {
                true => (
                    self.mint_x.to_account_info(),
                    self.mint_x.decimals,
                    self.mint_x_token_program.to_account_info(),
                    self.user_x_ata.to_account_info(),
                    self.pool_x_ata.to_account_info(),
                ),
                false => (
                    self.mint_y.to_account_info(),
                    self.mint_y.decimals,
                    self.mint_y_token_program.to_account_info(),
                    self.user_y_ata.to_account_info(),
                    self.pool_y_ata.to_account_info(),
                ),
            };

        transfer_checked(
            CpiContext::new(
                deposit_token_program,
                TransferChecked {
                    from: deposit_from,
                    mint: deposit_mint,
                    to: desposit_to,
                    authority: self.signer.to_account_info(),
                },
            ),
            amount_in,
            deposit_decimals,
        )?;

        Ok(())
    }
}
