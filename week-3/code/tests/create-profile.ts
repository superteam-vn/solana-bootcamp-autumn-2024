import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TodoApp } from "../target/types/todo_app";
import { assert, expect } from "chai";
import { withErrorTest } from "./utils";

describe("todo-app", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TodoApp as Program<TodoApp>;
  const name = "Khac Vy";

  it("Create profile successfully", async () => {
    const [profile, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), provider.publicKey.toBytes()],
      program.programId
    );

    const tx = await program.methods
      .createProfile(name)
      .accounts({
        creator: provider.publicKey,
        profile,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Your transaction signature", tx);

    const profileAccount = await program.account.profile.fetch(profile);

    expect(profileAccount.key.toBase58()).to.equal(profile.toBase58());
    expect(profileAccount.name).to.equal(name);
    expect(profileAccount.authority.toBase58()).to.equal(
      provider.publicKey.toBase58()
    );
    expect(profileAccount.todoCount).to.equal(0);
  });

  it("Create profile failed", async () => {
    withErrorTest(async () => {
      try {
        const [profile, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("profile"), provider.publicKey.toBytes()],
          program.programId
        );

        const tx = await program.methods
          .createProfile(
            "a very long name a very long name a very long name a very long name a very long name a very long name a very long name a very long name a very long name"
          )
          .accounts({
            creator: provider.publicKey,
            profile,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        assert.ok(false);
      } catch (_err) {
        // console.log(_err);
        assert.isTrue(_err instanceof anchor.AnchorError);
        const err: anchor.AnchorError = _err;
        assert.strictEqual(err.error.errorMessage, "Name is too long");
        assert.strictEqual(err.error.errorCode.number, 6000);
        assert.strictEqual(err.error.errorCode.code, "NameTooLong");
        // assert.strictEqual(err.error.origin, "programs/todo-app/src/lib.rs");
        assert.strictEqual(
          err.program.toString(),
          program.programId.toString()
        );
      }
    });
  });
});
