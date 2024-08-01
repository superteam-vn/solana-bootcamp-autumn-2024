use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn create_amm(ctx: Context<CreateAmm>, id: Pubkey, fee: u16) -> Result<()> {
    let amm = &mut ctx.accounts.amm;

    amm.id = id;
    amm.fee = fee;
    amm.admin = ctx.accounts.admin.key();

    Ok(())
}

#[derive(Accounts)]
#[instruction(id: Pubkey, fee: i16)]
pub struct CreateAmm<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Amm::INIT_SPACE,
        seeds = [b"amm", id.as_ref()],
        bump,
        constraint = fee < 10000 @ AppError::InvalidFee
    )]
    pub amm: Account<'info, Amm>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}
