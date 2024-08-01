import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakeProgram } from "../target/types/stake_program";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMintToInstruction,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import { BN } from "bn.js";

describe("stake-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.StakeProgram as Program<StakeProgram>;

  const staker = anchor.web3.Keypair.generate();
  let stakerTokenAccount: anchor.web3.PublicKey;

  // USDC-fake mint
  const usdcMintKp = anchor.web3.Keypair.generate();
  let rewardVault: anchor.web3.PublicKey;
  let stakeInfo: anchor.web3.PublicKey;

  before(async () => {
    // init staker
    {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          staker.publicKey,
          anchor.web3.LAMPORTS_PER_SOL
        )
      );
    }
    // create USDC-fake mint
    {
      const tx = new anchor.web3.Transaction();

      const lamports = await getMinimumBalanceForRentExemptMint(
        provider.connection
      );

      const createMintIx = anchor.web3.SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: usdcMintKp.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      });

      const initMintIx = createInitializeMint2Instruction(
        usdcMintKp.publicKey,
        6,
        provider.publicKey,
        provider.publicKey,
        TOKEN_PROGRAM_ID
      );

      stakerTokenAccount = getAssociatedTokenAddressSync(
        usdcMintKp.publicKey,
        staker.publicKey
      );

      const createStakerTokenAccountIx =
        createAssociatedTokenAccountInstruction(
          staker.publicKey,
          stakerTokenAccount,
          staker.publicKey,
          usdcMintKp.publicKey
        );

      const mintToStakerIx = createMintToInstruction(
        usdcMintKp.publicKey,
        stakerTokenAccount,
        provider.publicKey,
        1000 * 10 ** 6,
        []
      );

      tx.add(
        ...[
          createMintIx,
          initMintIx,
          createStakerTokenAccountIx,
          mintToStakerIx,
        ]
      );

      const ts = await provider.sendAndConfirm(tx, [usdcMintKp, staker]);

      console.log("Your transaction signature", ts);
    }

    rewardVault = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward")],
      program.programId
    )[0];
  });

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        admin: provider.publicKey,
        rewardVault: rewardVault,
        mint: usdcMintKp.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Your transaction signature", tx);

    const rewardVaultAccount = await getAccount(
      provider.connection,
      rewardVault
    );

    expect(rewardVaultAccount.address.toBase58()).to.equal(
      rewardVault.toBase58()
    );
    expect(Number(rewardVaultAccount.amount)).to.equal(0);
  });

  it("Stake successfully", async () => {
    stakeInfo = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("stake_info"), staker.publicKey.toBytes()],
      program.programId
    )[0];

    const vaultTokenAccount = getAssociatedTokenAddressSync(
      usdcMintKp.publicKey,
      stakeInfo,
      true
    );

    const stakeAmount = new BN(100 * 10 ** 6);

    const tx = await program.methods
      .stake(stakeAmount)
      .accounts({
        staker: staker.publicKey,
        mint: usdcMintKp.publicKey,
        stakeInfo: stakeInfo,
        vaultTokenAccount: vaultTokenAccount,
        stakerTokenAccount: stakerTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([staker])
      .rpc();

    console.log("Your transaction signature", tx);

    const stakeInfoAccount = await program.account.stakeInfo.fetch(stakeInfo);

    expect(stakeInfoAccount.staker.toBase58()).to.equal(
      staker.publicKey.toBase58()
    );
    expect(stakeInfoAccount.mint.toBase58()).to.equal(
      usdcMintKp.publicKey.toBase58()
    );
    expect(stakeInfoAccount.isStaked).to.equal(true);
    expect(stakeInfoAccount.amount.toString()).to.equal(stakeAmount.toString());

    const stakerAccount = await getAccount(
      provider.connection,
      stakerTokenAccount
    );

    const vaultAccount = await getAccount(
      provider.connection,
      vaultTokenAccount
    );

    expect(stakerAccount.amount.toString()).to.equal(String(900 * 10 ** 6));
    expect(vaultAccount.amount.toString()).to.equal(String(100 * 10 ** 6));
  });

  it("Unstake successfully", async () => {
    // mint reward token to reward vault
    const mintTx = new anchor.web3.Transaction();

    const mintToRewardVaultIx = createMintToInstruction(
      usdcMintKp.publicKey,
      rewardVault,
      provider.publicKey,
      1000 * 10 ** 6,
      []
    );

    mintTx.add(mintToRewardVaultIx);

    await provider.sendAndConfirm(mintTx);

    const vaultTokenAccount = getAssociatedTokenAddressSync(
      usdcMintKp.publicKey,
      stakeInfo,
      true
    );

    const tx = await program.methods
      .unstake()
      .accounts({
        staker: staker.publicKey,
        mint: usdcMintKp.publicKey,
        stakeInfo: stakeInfo,
        vaultTokenAccount: vaultTokenAccount,
        rewardVault: rewardVault,
        stakerTokenAccount: stakerTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([staker])
      .rpc();

    console.log("Your transaction signature", tx);

    const stakeInfoAccount = await program.account.stakeInfo.fetch(stakeInfo);

    expect(stakeInfoAccount.isStaked).to.equal(false);
    expect(Number(stakeInfoAccount.amount)).to.equal(0);

    const stakerAccount = await getAccount(
      provider.connection,
      stakerTokenAccount
    );

    const rewardVaultAccount = await getAccount(
      provider.connection,
      rewardVault
    );

    const vaultAccount = await getAccount(
      provider.connection,
      vaultTokenAccount
    );

    expect(Number(stakerAccount.amount)).to.greaterThan(1000 * 10 ** 6);
    expect(Number(vaultAccount.amount)).to.equal(0);
    expect(Number(rewardVaultAccount.amount)).to.lessThan(1000 * 10 ** 6);
  });
});
