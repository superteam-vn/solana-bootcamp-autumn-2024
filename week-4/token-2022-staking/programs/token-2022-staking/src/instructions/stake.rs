use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface,transfer_checked, TransferChecked}
};

use crate::{error::MyErrorCode, Pool, StakeInfo, STAKEINFO_SEED};

#[derive(Accounts)]
pub struct Stake<'info> {
    // signer is the staker
    #[account(mut)]
    pub signer: Signer<'info>,
    // check pool account valid
    // use has_one to check if pool account has a field stake_mint = stake_mint account, if not, return InvalidStakeMintAccount error
    #[account(
      has_one = stake_mint @MyErrorCode::InvalidStakeMintAccount,
    )]
    pub pool: Account<'info, Pool>,
    // stake_mint token program must be stake_token_program
    #[account(
      mint::token_program = stake_token_program,
    )]
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    // create a stake_info account to keep the staker's stake information
    #[account(
      init_if_needed,
      payer = signer,
      seeds = [STAKEINFO_SEED, pool.key().as_ref(), signer.key().as_ref()], 
      space = 8 + StakeInfo::INIT_SPACE,
      bump
    )]
    pub stake_info: Account<'info, StakeInfo>,
    // associated token account of the staker to transfer token to stake_info_ata
    #[account(
      mut,
      associated_token::mint = stake_mint,
      associated_token::authority = signer,
      associated_token::token_program = stake_token_program,
    )]
    pub staker_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    // associated token account of the stake_info to receive token from staker_ata
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
      // check if the staker has staked before
      // if staker has staked before, calculate the reward and add the amount to the stake_info account
      // then update the stake_info account
      if self.stake_info.amount.gt(&0) {
        self.stake_info.reward = self.pool.calculate_reward(self.stake_info.last_deposit_slot, Clock::get()?.slot);
        self.stake_info.amount = self.stake_info.amount.checked_add(amount).ok_or(MyErrorCode::Overflow)?;
      } else {
        // else, set the amount and reward to the stake_info account
        self.stake_info.amount = amount;
        self.stake_info.reward = 0;
      }

      self.stake_info.staker = self.signer.to_account_info().key();
      // udate the last_deposit_slot to the current slot to keep track reward
      self.stake_info.last_deposit_slot = Clock::get()?.slot;
      Ok(())
    }

    fn deposit(&mut self, amount: u64) -> Result<()> {
      require_gt!(amount, 0, MyErrorCode::InvalidDepositAmount);

      // transfer token from staker_ata to stake_info_ata
      transfer_checked(
          CpiContext::new(
            self.stake_token_program.to_account_info(), 
            TransferChecked {
              authority: self.signer.to_account_info(),
              from: self.staker_ata.to_account_info(),
              to: self.stake_info_ata.to_account_info(),
              mint: self.stake_mint.to_account_info(),
            }
        ), 
        amount, 
        self.stake_mint.decimals
      )?;

      Ok(())
    }


}