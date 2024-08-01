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

  const content = "Do Solana bootcamp homework";

  let profile: anchor.web3.PublicKey;

  before(async () => {
    [profile] = anchor.web3.PublicKey.findProgramAddressSync(
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

    console.log("Create profile success", tx);
  });

  it("Create todo successfully", async () => {
    let profileAccount = await program.account.profile.fetch(profile);
    const currentTodoCount = profileAccount.todoCount;

    const [todo] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("todo"), profile.toBytes(), Buffer.from([currentTodoCount])],
      program.programId
    );

    const tx = await program.methods
      .createTodo(content)
      .accounts({
        creator: provider.publicKey,
        profile,
        todo,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Your transaction signature", tx);
    const todoAccount = await program.account.todo.fetch(todo);

    expect(todoAccount.content).to.equal(content);
    expect(todoAccount.profile.toBase58()).to.equal(profile.toBase58());
    expect(todoAccount.completed).to.equal(false);

    profileAccount = await program.account.profile.fetch(profile);
    expect(profileAccount.todoCount).to.equal(currentTodoCount + 1);
  });

  it("Create todo failed", async () => {
    withErrorTest(async () => {
      try {
        let profileAccount = await program.account.profile.fetch(profile);
        const currentTodoCount = profileAccount.todoCount;

        const longContent = `
    Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
    `;

        const [todo] = anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("todo"),
            profile.toBytes(),
            Buffer.from([currentTodoCount]),
          ],
          program.programId
        );

        const tx = await program.methods
          .createTodo(longContent)
          .accounts({
            creator: provider.publicKey,
            profile,
            todo,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        console.log("Your transaction signature", tx);

        assert.ok(false);
      } catch (_err) {
        // console.log(_err);
        assert.isTrue(_err instanceof anchor.AnchorError);
        const err: anchor.AnchorError = _err;
        assert.strictEqual(err.error.errorMessage, "Content is too long");
        assert.strictEqual(err.error.errorCode.number, 6001);
        assert.strictEqual(err.error.errorCode.code, "ContentTooLong");
        // assert.strictEqual(err.error.origin, "programs/todo-app/src/lib.rs");
        assert.strictEqual(
          err.program.toString(),
          program.programId.toString()
        );
      }
    });
  });

  it("Create todo failed by providing invalid creator", async () => {
    const anotherPayer = anchor.web3.Keypair.generate();

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        anotherPayer.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      )
    );

    console.log("anotherPayer", anotherPayer.publicKey.toBase58());

    withErrorTest(async () => {
      try {
        let profileAccount = await program.account.profile.fetch(profile);
        const currentTodoCount = profileAccount.todoCount;

        const content = `
    Lorem Ipsum is simply dummy text of the printing and typesetting industry..
    `;

        const [todo] = anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("todo"),
            profile.toBytes(),
            Buffer.from([currentTodoCount]),
          ],
          program.programId
        );

        const tx = await program.methods
          .createTodo(content)
          .accounts({
            creator: anotherPayer.publicKey,
            profile,
            todo,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([anotherPayer])
          .rpc();

        console.log("Your transaction signature", tx);

        assert.ok(false);
      } catch (_err) {
        // console.log(_err);
        assert.isTrue(_err instanceof anchor.AnchorError);
        const err: anchor.AnchorError = _err;
        assert.strictEqual(err.error.errorMessage, "Invalid authority");
        assert.strictEqual(err.error.errorCode.number, 6002);
        assert.strictEqual(err.error.errorCode.code, "InvalidAuthority");
        assert.strictEqual(
          err.program.toString(),
          program.programId.toString()
        );
      }
    });
  });
});
