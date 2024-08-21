use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    token_2022::{
        initialize_mint2,
        spl_token_2022::{self, extension::ExtensionType, state::Mint},
        InitializeMint2, Token2022,
    },
    token_2022_extensions::{self},
    token_interface::{
        spl_token_metadata_interface::state::TokenMetadata, TokenMetadataInitialize,
    },
};

use crate::{Config, CONFIG_SEED};
const URI: &str = "https://raw.githubusercontent.com/HongThaiPham/solana-bootcamp-autumn-2024/main/week-4/token-2022-staking/app/assets/token-info.json";
#[derive(Accounts)]
pub struct Initialize<'info> {
    // account that signs the transaction
    #[account(mut)]
    pub signer: Signer<'info>,

    // account save the config of the program
    #[account(
        init,
        payer = signer,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,

    // a account for the mint of the token
    #[account(mut)]
    pub mint: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> Initialize<'info> {
    pub fn handler(&mut self, bumps: InitializeBumps) -> Result<()> {
        self.config.set_inner(Config {
            authority: self.signer.to_account_info().key(),
            reward_mint: self.mint.to_account_info().key(),
        });
        self.create_metadata(bumps)?;
        Ok(())
    }

    pub fn create_metadata(&mut self, bumps: InitializeBumps) -> Result<()> {
        // acquire the seeds to sign the transaction init token metadata
        let seeds = &[CONFIG_SEED, &[bumps.config]];
        let signer_seeds = &[&seeds[..]];

        // calculate the size of the account, because we use extension MetadataPointer, account size is different legacy spl-token account
        let size =
            ExtensionType::try_calculate_account_len::<Mint>(&[ExtensionType::MetadataPointer])
                .unwrap();

        // define the metadata of the token to be created (for simplicity, i hardcode the metadata)
        let metadata = TokenMetadata {
            update_authority:
                anchor_spl::token_interface::spl_pod::optional_keys::OptionalNonZeroPubkey(
                    self.config.to_account_info().key(),
                ),
            mint: self.mint.to_account_info().key(),
            name: "Solana Bootcamp Autumn 2024".to_string(),
            symbol: "SBA".to_string(),
            uri: URI.to_string(),
            additional_metadata: vec![],
        };

        let extension_extra_space = metadata.tlv_size_of().unwrap();
        let lamports = self.rent.minimum_balance(size + extension_extra_space);

        system_program::create_account(
            CpiContext::new(
                self.system_program.to_account_info(),
                system_program::CreateAccount {
                    from: self.signer.to_account_info(),
                    to: self.mint.to_account_info(),
                },
            ),
            lamports,
            size.try_into().unwrap(),
            &spl_token_2022::ID,
        )?;

        token_2022_extensions::metadata_pointer_initialize(
            CpiContext::new(
                self.token_program.to_account_info(),
                token_2022_extensions::MetadataPointerInitialize {
                    token_program_id: self.token_program.to_account_info(),
                    mint: self.mint.to_account_info(),
                },
            ),
            Some(self.config.to_account_info().key()),
            Some(self.mint.to_account_info().key()),
        )?;

        initialize_mint2(
            CpiContext::new(
                self.token_program.to_account_info(),
                InitializeMint2 {
                    mint: self.mint.to_account_info(),
                },
            ),
            9,
            &self.config.to_account_info().key(),
            None,
        )?;

        token_2022_extensions::token_metadata_initialize(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                TokenMetadataInitialize {
                    token_program_id: self.token_program.to_account_info(),
                    mint: self.mint.to_account_info(),
                    metadata: self.mint.to_account_info(),
                    mint_authority: self.config.to_account_info(),
                    update_authority: self.config.to_account_info(),
                },
                signer_seeds,
            ),
            "Summer Bootcamp".to_string(),
            "SBC".to_string(),
            URI.to_string(),
        )?;

        Ok(())
    }
}
