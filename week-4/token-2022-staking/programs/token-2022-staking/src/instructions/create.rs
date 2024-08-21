use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface, mint_to, MintTo}
};

use crate::{error::MyErrorCode, Config, Pool, CONFIG_SEED, POOL_SEED};

#[derive(Accounts)]
pub struct CreatePool<'info> {
    // account that signs the transaction
    #[account(
        mut,
        address = config.authority // check if the signer is the authority of the config account
    )]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED], // just one config account, so we use one string for the seed
        bump
    )]
    pub config: Account<'info, Config>,
    // the mint of the token to be staked in the pool
    #[account(
        mint::token_program = stake_token_program, //check token program of the mint must be the same as the stake_token_program
    )]
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    // create a pool account for pool information
    #[account(
        init,
        payer = signer,
        space = 8 + Pool::INIT_SPACE,
        seeds = [POOL_SEED, stake_mint.key().as_ref()], // because we will have multi pool for multi mint, so we use a string and the mint key as the seed
        bump
    )]
    pub pool: Account<'info, Pool>,
    // the mint of the token to be rewarded
    #[account(
        mut,
        address = config.reward_mint, // reward mint must be the same as the reward mint in the config account
        mint::token_program = reward_token_program, // check token program of the mint must be the same as the reward_token_program
        mint::authority = config, // check authority of the mint must be config account
    )]
    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,
    // create a associated token account to keep the reward token for the pool
    #[account(
        init,
        payer = signer,
        associated_token::mint = reward_mint,
        associated_token::authority = pool, 
        associated_token::token_program = reward_token_program,   
    )]
    pub reward_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub reward_token_program: Interface<'info, TokenInterface>,
    pub stake_token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreatePool<'info> {
    pub fn handler(&mut self, allocation: u64,reward_per_second:u64, bumps: CreatePoolBumps) -> Result<()> {
        require_gt!(allocation, 0, MyErrorCode::AllocationMustBeGreaterThanZero);
        require_gt!(reward_per_second, 0, MyErrorCode::RewardPerSecondMustBeGreaterThanZero);
        self.pool.set_inner(Pool { 
            authority: self.signer.to_account_info().key(), 
            stake_mint: self.stake_mint.to_account_info().key(), 
            reward_mint: self.reward_mint.to_account_info().key(), 
            reward_ata: self.reward_ata.to_account_info().key() , 
            allocation ,
            reward_per_slot: reward_per_second
        });
        self.mint_reward(allocation, bumps)?;
        Ok(())
    }

    fn mint_reward(&mut self, amount: u64, bumps: CreatePoolBumps) -> Result<()> {
        msg!("Minting reward tokens");

        let cpi_accounts = MintTo {
            mint: self.reward_mint.to_account_info(),
            to: self.reward_ata.to_account_info(),
            authority: self.config.to_account_info(),
        };
      
        let seeds = &[CONFIG_SEED, &[bumps.config]];
        let signer_seeds = &[&seeds[..]];

        mint_to(CpiContext::new_with_signer(self.reward_token_program.to_account_info(), cpi_accounts, signer_seeds), amount)?;
      
        Ok(())
    }
}
