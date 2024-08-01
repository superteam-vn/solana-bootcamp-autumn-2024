import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";
import { assert, expect } from "chai";
import {
  ASSOCIATED_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@coral-xyz/anchor/dist/cjs/utils/token";
import { mintToken } from "./utils";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

describe("create-pool", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Amm as Program<Amm>;

  const payer = anchor.web3.Keypair.generate();
  let id: anchor.web3.PublicKey;
  let fee = 100;

  let ammPda: anchor.web3.PublicKey;

  let mintAKp: anchor.web3.Keypair;
  let mintBKp: anchor.web3.Keypair;

  let poolPda: anchor.web3.PublicKey;
  let poolAuthorityPda: anchor.web3.PublicKey;

  let mintLiquidityPda: anchor.web3.PublicKey;

  let poolAccountA: anchor.web3.PublicKey;
  let poolAccountB: anchor.web3.PublicKey;

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        payer.publicKey,
        anchor.web3.LAMPORTS_PER_SOL * 2
      )
    );

    id = anchor.web3.Keypair.generate().publicKey;

    ammPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("amm"), id.toBuffer()],
      program.programId
    )[0];

    const tx = await program.methods
      .createAmm(id, fee)
      .accounts({
        amm: ammPda,
        admin: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    console.log("Your transaction signature", tx);

    mintAKp = anchor.web3.Keypair.generate();
    mintBKp = anchor.web3.Keypair.generate();

    await mintToken({
      connection: provider.connection,
      payer,
      receiver: payer.publicKey,
      mint: mintAKp,
      decimals: 6,
      amount: 1000,
    });

    await mintToken({
      connection: provider.connection,
      payer,
      receiver: payer.publicKey,
      mint: mintBKp,
      decimals: 6,
      amount: 2000,
    });

    poolPda = anchor.web3.PublicKey.findProgramAddressSync(
      [
        ammPda.toBuffer(),
        mintAKp.publicKey.toBuffer(),
        mintBKp.publicKey.toBuffer(),
      ],
      program.programId
    )[0];

    poolAuthorityPda = anchor.web3.PublicKey.findProgramAddressSync(
      [
        ammPda.toBuffer(),
        mintAKp.publicKey.toBuffer(),
        mintBKp.publicKey.toBuffer(),
        Buffer.from("authority"),
      ],
      program.programId
    )[0];

    mintLiquidityPda = anchor.web3.PublicKey.findProgramAddressSync(
      [
        ammPda.toBuffer(),
        mintAKp.publicKey.toBuffer(),
        mintBKp.publicKey.toBuffer(),
        Buffer.from("mint_liquidity"),
      ],
      program.programId
    )[0];

    console.log("mintLiquidityPda: ", mintLiquidityPda.toBase58());

    poolAccountA = getAssociatedTokenAddressSync(
      mintAKp.publicKey,
      poolAuthorityPda,
      true
    );

    poolAccountB = getAssociatedTokenAddressSync(
      mintBKp.publicKey,
      poolAuthorityPda,
      true
    );
  });

  it("create-pool", async () => {
    try {
      const tx = await program.methods
        .createPool()
        .accounts({
          payer: payer.publicKey,
          pool: poolPda,
          poolAuthority: poolAuthorityPda,
          mintLiquidity: mintLiquidityPda,
          amm: ammPda,
          mintA: mintAKp.publicKey,
          mintB: mintBKp.publicKey,
          poolAccountA: poolAccountA,
          poolAccountB: poolAccountB,

          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        })
        .signers([payer])
        .rpc();

      console.log("Your transaction signature", tx);
    } catch (error) {
      console.error(error);
    }

    const poolAccount = await program.account.pool.fetch(poolPda);

    assert(poolAccount.amm.toBase58() === ammPda.toBase58(), "Correct AMM");
    assert(
      poolAccount.mintA.toBase58() === mintAKp.publicKey.toBase58(),
      "Correct mint A"
    );
    assert(
      poolAccount.mintB.toBase58() === mintBKp.publicKey.toBase58(),
      "Correct mint B"
    );
  });
});
