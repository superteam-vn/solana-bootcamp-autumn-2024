use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface,transfer_checked, TransferChecked, close_account, CloseAccount}};

use crate::{error::MyErrorCode, Pool, StakeInfo, POOL_SEED, STAKEINFO_SEED};

#[derive(Accounts)]
pub struct Unstake<'info> {
    // signer is the staker
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
      seeds = [POOL_SEED, stake_mint.key().as_ref()],
      bump,
      has_one = stake_mint @MyErrorCode::InvalidStakeMintAccount,  
    )]
    pub pool: Account<'info, Pool>,
    #[account(
      mint::token_program = stake_token_program,
    )]
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
      mut,
      seeds = [STAKEINFO_SEED, pool.key().as_ref(), signer.key().as_ref()], 
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
      mut,
      associated_token::mint = stake_mint,
      associated_token::authority = stake_info,
      associated_token::token_program = stake_token_program,
    )]
    pub stake_info_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
      mut,
      address = pool.reward_mint,
      mint::token_program = reward_token_program,
    )]
    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
      mut,
      associated_token::mint = reward_mint,
      associated_token::authority = pool,
      associated_token::token_program = reward_token_program,   
    )]
    pub reward_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    // associated token account of the staker to receive reward token
    #[account(
      init_if_needed,
      payer = signer,
      associated_token::mint = reward_mint,
      associated_token::authority = signer,
      associated_token::token_program = reward_token_program,   
    )]
    pub staker_reward_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    pub stake_token_program: Interface<'info, TokenInterface>,
    pub reward_token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


impl<'info> Unstake<'info> {
  pub fn handler(&mut self, amount: u64, bumps: &UnstakeBumps) -> Result<()> {
    require_gt!(amount, 0, MyErrorCode::InvalidUnstakeAmount);
    require_gte!(self.stake_info.amount, amount, MyErrorCode::InsufficientStakeAmount );
    // return the staked amount to the staker
    self.back_to_staker(amount, bumps)?;
    // return the reward to the staker
    self.reward_to_staker(bumps)?;
    // update the stake info
    self.update_stake_info(amount,bumps)?;
    Ok(())
  }
  

  fn reward_to_staker(&mut self, bumps: &UnstakeBumps) -> Result<()> {
    let seeds = &[POOL_SEED, self.stake_mint.to_account_info().key.as_ref(), &[bumps.pool]];
    let signer_seeds = &[&seeds[..]];
    let reward_amount = self.stake_info.reward.checked_add(self.pool.calculate_reward(self.stake_info.last_deposit_slot , Clock::get()?.slot)).ok_or(MyErrorCode::Overflow)?; 

    transfer_checked(
      CpiContext::new_with_signer(
        self.reward_token_program.to_account_info(), 
        TransferChecked {
          from: self.reward_ata.to_account_info(),
          to: self.staker_reward_ata.to_account_info(),
          authority: self.pool.to_account_info(),
          mint: self.reward_mint.to_account_info(),
        }, 
        signer_seeds
      ), 
      reward_amount, 
      self.reward_mint.decimals
    )?;

    Ok(())
  }

  fn update_stake_info(&mut self, amount: u64, bumps: &UnstakeBumps) -> Result<()> {
    //calculate the new stake amount
    let new_amount = self.stake_info.amount.checked_sub(amount).ok_or(MyErrorCode::Overflow)?;
    self.stake_info.amount = new_amount;
    self.stake_info.reward = 0;
    self.stake_info.last_deposit_slot = Clock::get()?.slot;

    // check if staker unstake all tokens
    // close the stake_info_ata account and stake_info account
    // return rent fee to the staker
    if new_amount.eq(&0) {
      let seeds = &[STAKEINFO_SEED, self.pool.to_account_info().key.as_ref(), self.signer.to_account_info().key.as_ref(),&[bumps.stake_info]];
      let signer_seeds = &[&seeds[..]];

      // call cpi close spl-token account
      close_account(
        CpiContext::new_with_signer(self.stake_token_program.to_account_info(), 
        CloseAccount { 
            account: self.stake_info_ata.to_account_info(), 
            destination: self.signer.to_account_info(), 
            authority: self.stake_info.to_account_info() 
          },
          signer_seeds
        )
      )?;

      self.stake_info.close(self.signer.to_account_info())?;
    }

    Ok(())
  }

  fn back_to_staker(&mut self, amount: u64,bumps: &UnstakeBumps) -> Result<()> {
    let seeds = &[STAKEINFO_SEED, self.pool.to_account_info().key.as_ref(), self.signer.to_account_info().key.as_ref(),&[bumps.stake_info]];
    let signer_seeds = &[&seeds[..]];

    // transfer the staked amount to the staker
    transfer_checked(
      CpiContext::new_with_signer(
self.stake_token_program.to_account_info(), 
TransferChecked {
          from: self.stake_info_ata.to_account_info(),
          to: self.staker_ata.to_account_info(),
          authority: self.stake_info.to_account_info(),
          mint: self.stake_mint.to_account_info(),
        }, 
       signer_seeds
      ), 
      amount, 
      self.stake_mint.decimals
    )?;
    Ok(())
  }
}