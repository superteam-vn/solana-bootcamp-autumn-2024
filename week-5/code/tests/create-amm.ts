import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";
import { assert } from "chai";
import { expectRevert } from "./utils";

describe("create-amm", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Amm as Program<Amm>;

  let id: anchor.web3.PublicKey;
  let fee = 100;

  let ammPda: anchor.web3.PublicKey;

  beforeEach(() => {
    id = anchor.web3.Keypair.generate().publicKey;

    ammPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("amm"), id.toBuffer()],
      program.programId
    )[0];
  });

  it("create-amm", async () => {
    // Add your test here.
    const tx = await program.methods
      .createAmm(id, fee)
      .accounts({
        amm: ammPda,
        admin: provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Your transaction signature", tx);

    const ammAccount = await program.account.amm.fetch(ammPda);

    assert(id.toBase58() === ammAccount.id.toBase58(), "Correct id");
    assert(fee === ammAccount.fee, "Correct fee");
    assert(
      provider.publicKey.toBase58() === ammAccount.admin.toBase58(),
      "Correct admin"
    );
  });

  it("invalid fee", async () => {
    fee = 10000;

    await expectRevert(
      program.methods
        .createAmm(id, fee)
        .accounts({
          amm: ammPda,
          admin: provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc()
    );
  });
});
