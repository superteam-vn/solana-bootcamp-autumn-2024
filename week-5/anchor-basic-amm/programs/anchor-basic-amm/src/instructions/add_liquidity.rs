use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{
        mint_to, transfer_checked, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
    },
};
use spl_math::uint::U256;

use crate::{error::AmmErrorCode, utils::calculate_desired_amount_deposit, Pool, POOL_SEED};

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
      seeds = [POOL_SEED, mint_x.key().as_ref(), mint_y.key().as_ref()],
      bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,
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
      mut,
      address = pool.mint_lp,
      mint::token_program = token_program,
    )]
    pub mint_lp: Box<InterfaceAccount<'info, Mint>>,
    #[account(
      mut,
      associated_token::mint = mint_x,
      associated_token::authority = signer,
      associated_token::token_program = mint_x_token_program,
    )]
    pub user_x_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
      mut,
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
    #[account(
      init_if_needed,
      payer = signer,
      associated_token::mint = mint_lp,
      associated_token::authority = signer,
      associated_token::token_program = token_program,
    )]
    pub user_lp_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    pub mint_x_token_program: Interface<'info, TokenInterface>,
    pub mint_y_token_program: Interface<'info, TokenInterface>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> AddLiquidity<'info> {
    pub fn handler(&mut self, max_amount_x: u64, max_amount_y: u64) -> Result<()> {
        let user_balance_x = self.user_x_ata.amount;
        let user_balance_y = self.user_y_ata.amount;

        require_gte!(
            user_balance_x,
            max_amount_x,
            AmmErrorCode::InsufficientBalance
        );
        require_gte!(
            user_balance_y,
            max_amount_y,
            AmmErrorCode::InsufficientBalance
        );

        let (amount_x, amount_y) = self.despoit(max_amount_x, max_amount_y)?;

        self.mint_lp(amount_x, amount_y)?;

        Ok(())
    }

    fn mint_lp(&mut self, amount_x: u64, amount_y: u64) -> Result<()> {
        let lp_supply = self.mint_lp.supply;

        let amount_lp_to_mint = match lp_supply.eq(&0) {
            true => {
                // sqrt(dx * dy)
                U256::from(amount_x)
                    .checked_mul(U256::from(amount_y))
                    .ok_or(AmmErrorCode::Overflow)?
                    .integer_sqrt()
                    .as_u64()
            }
            false => {
                // s = dx.T / X = dy.T / Y (T is current supply of LP token)
                let pool_balance_x = self.pool_x_ata.amount;
                U256::from(amount_x)
                    .checked_mul(U256::from(lp_supply))
                    .ok_or(AmmErrorCode::Overflow)?
                    .checked_div(U256::from(pool_balance_x))
                    .ok_or(AmmErrorCode::Overflow)?
                    .as_u64()
            }
        };

        let seeds = &[
            POOL_SEED,
            self.pool.mint_x.as_ref(),
            self.pool.mint_y.as_ref(),
            &[self.pool.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        mint_to(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                MintTo {
                    mint: self.mint_lp.to_account_info(),
                    to: self.user_lp_ata.to_account_info(),
                    authority: self.pool.to_account_info(),
                },
                signer_seeds,
            ),
            amount_lp_to_mint,
        )?;

        Ok(())
    }

    fn despoit(&mut self, max_amount_x: u64, max_amount_y: u64) -> Result<(u64, u64)> {
        let pool_balance_x = self.pool_x_ata.amount;
        let pool_balance_y = self.pool_y_ata.amount;
        let lp_supply = self.mint_lp.supply;

        // if pool have no liquidity, just init with user's input
        let (amount_x, amount_y) = match lp_supply.eq(&0)
            && pool_balance_x.eq(&0)
            && pool_balance_y.eq(&0)
        {
            true => (max_amount_x, max_amount_y),
            false => {
                // dx = X. dy / Y
                let dx =
                    calculate_desired_amount_deposit(pool_balance_x, pool_balance_y, max_amount_y)?;

                if dx.ge(&max_amount_x) {
                    (dx, max_amount_y)
                } else {
                    // dy = Y. dx / X
                    let dy = calculate_desired_amount_deposit(
                        pool_balance_y,
                        pool_balance_x,
                        max_amount_x,
                    )?;

                    (max_amount_x, dy)
                }
            }
        };

        transfer_checked(
            CpiContext::new(
                self.mint_x_token_program.to_account_info(),
                TransferChecked {
                    from: self.user_x_ata.to_account_info(),
                    mint: self.mint_x.to_account_info(),
                    to: self.pool_x_ata.to_account_info(),
                    authority: self.signer.to_account_info(),
                },
            ),
            amount_x,
            self.mint_x.decimals,
        )?;

        transfer_checked(
            CpiContext::new(
                self.mint_y_token_program.to_account_info(),
                TransferChecked {
                    from: self.user_y_ata.to_account_info(),
                    mint: self.mint_y.to_account_info(),
                    to: self.pool_y_ata.to_account_info(),
                    authority: self.signer.to_account_info(),
                },
            ),
            amount_y,
            self.mint_y.decimals,
        )?;

        Ok((amount_x, amount_y))
    }
}
