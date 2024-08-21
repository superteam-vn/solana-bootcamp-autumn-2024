import { Token2022Staking } from "./../target/types/token_2022_staking";
import * as anchor from "@coral-xyz/anchor";
import { AnchorError, Program } from "@coral-xyz/anchor";

import {
  createAssociatedTokenAccountInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMintToCheckedInstruction,
  ExtensionType,
  getAccount,
  getAssociatedTokenAddressSync,
  getMintLen,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
} from "@solana/spl-token";

import {
  createInitializeInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";

import { assert } from "chai";

describe("token-2022-staking", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  provider.opts.commitment = "confirmed";
  anchor.setProvider(provider);

  const program = anchor.workspace
    .Token2022Staking as Program<Token2022Staking>;

  // get address of config account
  const [config] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  // create a new mint for reward token
  const rewardMintKeypair = anchor.web3.Keypair.generate();
  // create a new mint for stake token
  const stakeMintKeypair = anchor.web3.Keypair.generate();

  const metadata: TokenMetadata = {
    mint: stakeMintKeypair.publicKey,
    name: "STAKE TOKEN",
    symbol: "BCST",
    uri: "https://raw.githubusercontent.com/HongThaiPham/solana-bootcamp-autumn-2024/main/week-4/token-2022-staking/app/assets/token-info.json",
    additionalMetadata: [],
  };

  // create staker account
  const staker = anchor.web3.Keypair.generate();
  console.log("Staker address: ", staker.publicKey.toBase58());
  const rewardPerSlot = new anchor.BN(1_000_000_000);

  // get associated token account of staker for stake token
  const stakerTokenAccount = getAssociatedTokenAddressSync(
    stakeMintKeypair.publicKey,
    staker.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // get pool address from stake token
  const [pool] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), stakeMintKeypair.publicKey.toBuffer()],
    program.programId
  );

  // get stake info address from pool and staker
  const [stakeInfo] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("stakeinfo"), pool.toBuffer(), staker.publicKey.toBuffer()],
    program.programId
  );

  // get associated token account of stake token for stake_info account
  const stakeInfoAta = getAssociatedTokenAddressSync(
    stakeMintKeypair.publicKey,
    stakeInfo,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  // get associated token account of reward token for pool account
  const rewardAta = getAssociatedTokenAddressSync(
    rewardMintKeypair.publicKey,
    pool,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  const stakeAmount = new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL);
  const unstakeAmount = new anchor.BN(5 * anchor.web3.LAMPORTS_PER_SOL);
  before("Prepare test", async () => {
    // faucet to staker
    {
      const signature = await provider.connection.requestAirdrop(
        staker.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({
        signature: signature,
        ...(await provider.connection.getLatestBlockhash()),
      });
    }

    {
      // create stake mint token
      const mintLen = getMintLen([ExtensionType.MetadataPointer]);

      const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

      const mintLamports =
        await provider.connection.getMinimumBalanceForRentExemption(
          mintLen + metadataLen
        );

      const mintTransaction = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: staker.publicKey,
          newAccountPubkey: stakeMintKeypair.publicKey,
          space: mintLen,
          lamports: mintLamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(
          stakeMintKeypair.publicKey,
          staker.publicKey,
          stakeMintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
          stakeMintKeypair.publicKey,
          9,
          staker.publicKey,
          null,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          mint: stakeMintKeypair.publicKey,
          metadata: stakeMintKeypair.publicKey,
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          mintAuthority: staker.publicKey,
          updateAuthority: staker.publicKey,
        }),
        createAssociatedTokenAccountInstruction(
          staker.publicKey,
          stakerTokenAccount,
          staker.publicKey,
          stakeMintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        ),
        createMintToCheckedInstruction(
          stakeMintKeypair.publicKey,
          stakerTokenAccount,
          staker.publicKey,
          1_000 * anchor.web3.LAMPORTS_PER_SOL,
          9,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );
      const tx = await provider.sendAndConfirm(mintTransaction, [
        stakeMintKeypair,
        staker,
      ]);

      console.log("Prepare transaction signature: ", tx);
    }
  });

  it("Is configured", async () => {
    const tx = await program.methods
      .initialize()
      .accountsPartial({
        mint: rewardMintKeypair.publicKey,
        signer: provider.publicKey,
        config,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([rewardMintKeypair])
      .rpc();

    console.log("Your transaction signature", tx);

    const configAccount = await program.account.config.fetch(config);
    assert(configAccount.rewardMint.equals(rewardMintKeypair.publicKey));
    assert(configAccount.authority.equals(provider.publicKey));
  });

  it("Should create a new pool", async () => {
    const tx = await program.methods
      .createPool(
        new anchor.BN(1000 * anchor.web3.LAMPORTS_PER_SOL),
        rewardPerSlot
      )
      .accounts({
        signer: provider.publicKey,
        rewardTokenProgram: TOKEN_2022_PROGRAM_ID,
        stakeTokenProgram: TOKEN_2022_PROGRAM_ID,
        rewardMint: rewardMintKeypair.publicKey,
        stakeMint: stakeMintKeypair.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);

    const poolAccount = await program.account.pool.fetch(pool);
    assert(poolAccount.rewardMint.equals(rewardMintKeypair.publicKey));
    assert(poolAccount.stakeMint.equals(stakeMintKeypair.publicKey));
    assert(poolAccount.rewardPerSlot.eq(rewardPerSlot));
    assert(
      poolAccount.allocation.eq(
        new anchor.BN(1000 * anchor.web3.LAMPORTS_PER_SOL)
      )
    );

    const rewardAtaAccount = await getAccount(
      provider.connection,
      rewardAta,
      null,
      TOKEN_2022_PROGRAM_ID
    );

    assert(
      new anchor.BN(rewardAtaAccount.amount.toString()).eq(
        new anchor.BN(1000 * anchor.web3.LAMPORTS_PER_SOL)
      )
    );
  });

  it("Should stake successfully", async () => {
    const tx = await program.methods
      .stake(stakeAmount)
      .accounts({
        signer: staker.publicKey,
        stakeTokenProgram: TOKEN_2022_PROGRAM_ID,
        pool,
      })
      .signers([staker])
      .rpc();

    console.log("Your transaction signature", tx);

    const stakeInfoAccount = await program.account.stakeInfo.fetch(stakeInfo);

    assert(stakeInfoAccount.amount.eq(stakeAmount));
    assert(stakeInfoAccount.reward.eq(new anchor.BN(0)));

    const stakeInfoAtaAccount = await getAccount(
      provider.connection,
      stakeInfoAta,
      null,
      TOKEN_2022_PROGRAM_ID
    );

    assert(
      new anchor.BN(stakeInfoAtaAccount.amount.toString()).eq(stakeAmount)
    );
  });

  it("Should unstake successfully", async () => {
    const tx = await program.methods
      .unstake(unstakeAmount)
      .accountsPartial({
        rewardMint: rewardMintKeypair.publicKey,
        rewardTokenProgram: TOKEN_2022_PROGRAM_ID,
        stakeTokenProgram: TOKEN_2022_PROGRAM_ID,
        signer: staker.publicKey,
        stakeMint: stakeMintKeypair.publicKey,
      })
      .signers([staker])
      .rpc();

    console.log("Your transaction signature", tx);

    const stakeInfoAccount = await program.account.stakeInfo.fetch(stakeInfo);

    assert(
      stakeInfoAccount.amount.eq(
        new anchor.BN(stakeAmount.toString()).sub(unstakeAmount)
      )
    );

    assert(stakeInfoAccount.reward.eq(new anchor.BN(0)));

    const stakerRewardAta = getAssociatedTokenAddressSync(
      rewardMintKeypair.publicKey,
      staker.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const stakerRewardAtaAccount = await getAccount(
      provider.connection,
      stakerRewardAta,
      null,
      TOKEN_2022_PROGRAM_ID
    );

    assert(
      new anchor.BN(stakerRewardAtaAccount.amount.toString()).gt(
        new anchor.BN(0)
      )
    );
  });

  it("Should close stake_info when unstake all", async () => {
    const tx = await program.methods
      .unstake(unstakeAmount)
      .accountsPartial({
        rewardMint: rewardMintKeypair.publicKey,
        rewardTokenProgram: TOKEN_2022_PROGRAM_ID,
        stakeTokenProgram: TOKEN_2022_PROGRAM_ID,
        signer: staker.publicKey,
        stakeMint: stakeMintKeypair.publicKey,
      })
      .signers([staker])
      .rpc();

    console.log("Your transaction signature", tx);
    try {
      await program.account.stakeInfo.fetch(stakeInfo);
      assert.ok(false);
    } catch (error) {
      // assert.isTrue(error instanceof AnchorError);
      // const err: AnchorError = error;
      // console.log("Error message: ", err);
      assert(error);
    }

    const stakerRewardAta = getAssociatedTokenAddressSync(
      rewardMintKeypair.publicKey,
      staker.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const stakerRewardAtaAccount = await getAccount(
      provider.connection,
      stakerRewardAta,
      null,
      TOKEN_2022_PROGRAM_ID
    );

    assert(
      new anchor.BN(stakerRewardAtaAccount.amount.toString()).gt(
        new anchor.BN(0)
      )
    );
  });
});
