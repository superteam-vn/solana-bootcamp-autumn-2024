use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{
        burn, close_account, transfer_checked, Burn, CloseAccount, Mint, TokenAccount,
        TokenInterface, TransferChecked,
    },
};

use crate::{error::AmmErrorCode, utils::calculate_x_y_amount_return, Pool, POOL_SEED};

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
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

// dx = X * s / T , dy  = Y * s / T
impl<'info> RemoveLiquidity<'info> {
    pub fn handler(&mut self, shares: u64) -> Result<()> {
        let x = self.pool_x_ata.amount;
        let y = self.pool_y_ata.amount;
        let t = self.mint_lp.supply;
        let (amount_x, amount_y) = calculate_x_y_amount_return(x, y, shares, t)?;

        require_gt!(amount_x, 0, AmmErrorCode::ZeroAmount);
        require_gt!(amount_y, 0, AmmErrorCode::ZeroAmount);

        self.burn_shares(shares)?;
        self.transfer_back_to_user(amount_x, amount_y)?;
        Ok(())
    }

    fn burn_shares(&mut self, shares: u64) -> Result<()> {
        let remain_shares = self.user_lp_ata.amount.checked_sub(shares).unwrap();
        burn(
            CpiContext::new(
                self.token_program.to_account_info(),
                Burn {
                    mint: self.mint_lp.to_account_info(),
                    from: self.user_lp_ata.to_account_info(),
                    authority: self.signer.to_account_info(),
                },
            ),
            shares,
        )?;

        msg!("Burned shares {}", self.user_lp_ata.amount);

        if remain_shares.eq(&0) {
            close_account(CpiContext::new(
                self.token_program.to_account_info(),
                CloseAccount {
                    account: self.user_lp_ata.to_account_info(),
                    destination: self.signer.to_account_info(),
                    authority: self.signer.to_account_info(),
                },
            ))?;
        }

        Ok(())
    }

    fn transfer_back_to_user(&mut self, amount_x: u64, amount_y: u64) -> Result<()> {
        let pool = self.pool.clone();
        let seeds = &[
            POOL_SEED,
            pool.mint_x.as_ref(),
            pool.mint_y.as_ref(),
            &[pool.bump],
        ];

        let signer_seeds = &[&seeds[..]];

        transfer_checked(
            CpiContext::new_with_signer(
                self.mint_x_token_program.to_account_info(),
                TransferChecked {
                    from: self.pool_x_ata.to_account_info(),
                    mint: self.mint_x.to_account_info(),
                    to: self.user_x_ata.to_account_info(),
                    authority: self.pool.to_account_info(),
                },
                signer_seeds,
            ),
            amount_x,
            self.mint_x.decimals,
        )?;

        transfer_checked(
            CpiContext::new_with_signer(
                self.mint_y_token_program.to_account_info(),
                TransferChecked {
                    from: self.pool_y_ata.to_account_info(),
                    mint: self.mint_y.to_account_info(),
                    to: self.user_y_ata.to_account_info(),
                    authority: self.pool.to_account_info(),
                },
                signer_seeds,
            ),
            amount_y,
            self.mint_y.decimals,
        )?;

        Ok(())
    }
}
