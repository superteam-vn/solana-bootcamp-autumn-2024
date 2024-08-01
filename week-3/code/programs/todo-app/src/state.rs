use anchor_lang::prelude::*;

#[account]
pub struct Profile {
    pub key: Pubkey,

    pub name: String, // max len = 100

    pub authority: Pubkey,

    pub todo_count: u8,
}

impl Profile {
    pub const SPACE: usize = 32 + // key
                            (4 + 100) // name
                            + 32 // authority
                            + 1; // todo_count
}

#[account]
#[derive(InitSpace)]
pub struct Todo {
    pub profile: Pubkey,

    #[max_len(200)]
    pub content: String,

    pub completed: bool,
}
