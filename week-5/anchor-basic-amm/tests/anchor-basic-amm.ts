import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { AnchorBasicAmm } from "../target/types/anchor_basic_amm";
import {
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

describe("anchor-basic-amm", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AnchorBasicAmm as Program<AnchorBasicAmm>;
  const [maker, user1, user2] = [
    web3.Keypair.generate(),
    web3.Keypair.generate(),
    web3.Keypair.generate(),
  ];

  console.table({
    maker: maker.publicKey.toBase58(),
    user1: user1.publicKey.toBase58(),
    user2: user2.publicKey.toBase58(),
  });

  const [mintX, mintY] = [web3.Keypair.generate(), web3.Keypair.generate()];

  console.table({
    mintX: mintX.publicKey.toBase58(),
    mintY: mintY.publicKey.toBase58(),
  });

  const amount_x_deposit = new anchor.BN(10 * web3.LAMPORTS_PER_SOL);
  const amount_y_deposit = new anchor.BN(20 * web3.LAMPORTS_PER_SOL);

  const [pool] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      mintX.publicKey.toBuffer(),
      mintY.publicKey.toBuffer(),
    ],
    program.programId
  );

  const [mintLp] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("lp"), pool.toBuffer()],
    program.programId
  );

  before(async () => {
    {
      await provider.connection.confirmTransaction({
        signature: await provider.connection.requestAirdrop(
          maker.publicKey,
          10 * anchor.web3.LAMPORTS_PER_SOL
        ),
        ...(await provider.connection.getLatestBlockhash()),
      });
      await provider.connection.confirmTransaction({
        signature: await provider.connection.requestAirdrop(
          user1.publicKey,
          10 * anchor.web3.LAMPORTS_PER_SOL
        ),
        ...(await provider.connection.getLatestBlockhash()),
      });
      await provider.connection.confirmTransaction({
        signature: await provider.connection.requestAirdrop(
          user2.publicKey,
          10 * anchor.web3.LAMPORTS_PER_SOL
        ),
        ...(await provider.connection.getLatestBlockhash()),
      });
    }
    {
      // mint X
      await createMint(
        provider.connection,
        maker,
        maker.publicKey,
        null,
        9,
        mintX,
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );
      const maker_x_ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        maker,
        mintX.publicKey,
        maker.publicKey,
        false,
        null,
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );
      await mintTo(
        provider.connection,
        maker,
        mintX.publicKey,
        maker_x_ata.address,
        maker,
        1000 * web3.LAMPORTS_PER_SOL,
        [],
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );

      // mint Y
      await createMint(
        provider.connection,
        maker,
        maker.publicKey,
        null,
        9,
        mintY,
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );
      const maker_y_ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        maker,
        mintY.publicKey,
        maker.publicKey,
        false,
        null,
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );
      await mintTo(
        provider.connection,
        maker,
        mintY.publicKey,
        maker_y_ata.address,
        maker,
        1000 * web3.LAMPORTS_PER_SOL,
        [],
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );

      // mint some X for user1
      const user1_x_ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        maker,
        mintX.publicKey,
        user1.publicKey,
        false,
        null,
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );

      await mintTo(
        provider.connection,
        maker,
        mintX.publicKey,
        user1_x_ata.address,
        maker,
        100 * web3.LAMPORTS_PER_SOL,
        [],
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );

      // mint some X for user2
      const user2_x_ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        maker,
        mintX.publicKey,
        user2.publicKey,
        false,
        null,
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );

      await mintTo(
        provider.connection,
        maker,
        mintX.publicKey,
        user2_x_ata.address,
        maker,
        100 * web3.LAMPORTS_PER_SOL,
        [],
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );

      // mint some Y  for user1

      const user1_y_ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        maker,
        mintY.publicKey,
        user1.publicKey,
        false,
        null,
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );

      await mintTo(
        provider.connection,
        maker,
        mintY.publicKey,
        user1_y_ata.address,
        maker,
        100 * web3.LAMPORTS_PER_SOL,
        [],
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );

      // mint some Y  for user2

      const user2_y_ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        maker,
        mintY.publicKey,
        user2.publicKey,
        false,
        null,
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );

      await mintTo(
        provider.connection,
        maker,
        mintY.publicKey,
        user2_y_ata.address,
        maker,
        100 * web3.LAMPORTS_PER_SOL,
        [],
        {
          commitment: "confirmed",
        },
        TOKEN_2022_PROGRAM_ID
      );
    }
  });
  it("Should init amm susccessfully", async () => {
    const tx = await program.methods
      .initialize(100)
      .accounts({
        signer: provider.publicKey,
      })
      .rpc();

    console.log("Transaction executed. ", tx);
  });

  it("Should create pool susccessfully", async () => {
    const tx = await program.methods
      .createPool()
      .accounts({
        maker: maker.publicKey,
        mintX: mintX.publicKey,
        mintXTokenProgram: TOKEN_2022_PROGRAM_ID,
        mintY: mintY.publicKey,
        mintYTokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    console.log("Transaction executed. ", tx);
  });

  it("Should add liquidity susccessfully", async () => {
    const tx = await program.methods
      .addLiquidity(amount_x_deposit, amount_y_deposit)
      .accounts({
        mintLp,
        mintX: mintX.publicKey,
        mintXTokenProgram: TOKEN_2022_PROGRAM_ID,
        mintY: mintY.publicKey,
        mintYTokenProgram: TOKEN_2022_PROGRAM_ID,
        signer: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    console.log("Transaction executed. ", tx);

    const tx2 = await program.methods
      .addLiquidity(amount_y_deposit, amount_x_deposit)
      .accounts({
        mintLp,
        mintX: mintX.publicKey,
        mintXTokenProgram: TOKEN_2022_PROGRAM_ID,
        mintY: mintY.publicKey,
        mintYTokenProgram: TOKEN_2022_PROGRAM_ID,
        signer: user2.publicKey,
      })
      .signers([user2])
      .rpc();

    console.log("Transaction executed. ", tx2);
  });

  it("Should swap susccessfully", async () => {
    const amount_in = new anchor.BN(1 * web3.LAMPORTS_PER_SOL);
    const minimum_amount_out = new anchor.BN(1 * web3.LAMPORTS_PER_SOL);
    const tx = await program.methods
      .swap(true, amount_in, minimum_amount_out)
      .accounts({
        mintX: mintX.publicKey,
        mintXTokenProgram: TOKEN_2022_PROGRAM_ID,
        mintY: mintY.publicKey,
        mintYTokenProgram: TOKEN_2022_PROGRAM_ID,
        signer: user2.publicKey,
      })
      .signers([user2])
      .rpc();

    console.log("Transaction executed. ", tx);
  });

  it("Should remove liquidity susccessfully", async () => {
    const user1_lp_ata = getAssociatedTokenAddressSync(mintLp, user1.publicKey);
    const user1_lp_ata_account = await getAccount(
      provider.connection,
      user1_lp_ata
    );
    const tx = await program.methods
      .removeLiquidity(new anchor.BN(user1_lp_ata_account.amount.toString()))
      .accounts({
        mintLp,
        mintX: mintX.publicKey,
        mintXTokenProgram: TOKEN_2022_PROGRAM_ID,
        mintY: mintY.publicKey,
        mintYTokenProgram: TOKEN_2022_PROGRAM_ID,
        signer: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    console.log("Transaction executed. ", tx);
  });
});
