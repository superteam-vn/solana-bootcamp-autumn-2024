use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface,transfer_checked, TransferChecked}
};

use crate::{error::MyErrorCode, Pool, StakeInfo, STAKEINFO_SEED};

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
      has_one = stake_mint @MyErrorCode::InvalidStakeMintAccount,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
      mint::token_program = stake_token_program,
    )]
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
      init_if_needed,
      payer = signer,
      seeds = [STAKEINFO_SEED, pool.key().as_ref(), signer.key().as_ref()], 
      space = 8 + StakeInfo::INIT_SPACE,
      bump
    )]
    pub stake_info: Account<'info, StakeInfo>,
    #[account(
      mut,
      associated_token::mint = stake_mint,
      associated_token::authority = signer,
      associated_token::token_program = stake_token_program,
    )]
    pub staker_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
      init_if_needed,
      payer = signer,
      associated_token::mint = stake_mint,
      associated_token::authority = stake_info,
      associated_token::token_program = stake_token_program,
    )]
    pub stake_info_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    pub stake_token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Stake<'info> {
    pub fn handler(&mut self, amount: u64) -> Result<()> { 
      // deposit amount to stake_info_ata
      self.deposit(amount)?;
      // update stake_info
      self.update_stake_info(amount)?;
      Ok(())
    }

    fn update_stake_info(&mut self, amount: u64) -> Result<()> {
      if self.stake_info.amount.gt(&0) {
        self.stake_info.reward = self.pool.calculate_reward(self.stake_info.last_deposit_slot, Clock::get()?.slot);
        self.stake_info.amount = self.stake_info.amount.checked_add(amount).ok_or(MyErrorCode::Overflow)?;
      } else {
        self.stake_info.amount = amount;
        self.stake_info.reward = 0;
      }

      self.stake_info.staker = self.signer.to_account_info().key();
      self.stake_info.last_deposit_slot = Clock::get()?.slot;
      Ok(())
    }

    fn deposit(&mut self, amount: u64) -> Result<()> {
      require_gt!(amount, 0, MyErrorCode::InvalidDepositAmount);

      transfer_checked(CpiContext::new(self.stake_token_program.to_account_info(), TransferChecked {
        authority: self.signer.to_account_info(),
        from: self.staker_ata.to_account_info(),
        to: self.stake_info_ata.to_account_info(),
        mint: self.stake_mint.to_account_info(),
      }),amount, self.stake_mint.decimals)?;

      Ok(())
    }


}