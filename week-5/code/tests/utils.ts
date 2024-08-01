import * as anchor from "@coral-xyz/anchor";
import {
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

export const mintToken = async ({
  connection,
  payer,
  receiver,
  mint,
  decimals,
  amount,
}: {
  connection: anchor.web3.Connection;
  payer: anchor.web3.Keypair;
  receiver: anchor.web3.PublicKey;
  mint: anchor.web3.Keypair;
  decimals: number;
  amount: number;
}) => {
  await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    decimals,
    mint
  );

  await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint.publicKey,
    receiver
  );

  await mintTo(
    connection,
    payer,
    mint.publicKey,
    getAssociatedTokenAddressSync(mint.publicKey, receiver),
    payer.publicKey,
    amount * 10 ** decimals
  );
};

export const expectRevert = async (promise: Promise<any>) => {
  try {
    await promise;
    throw new Error("Expected a revert");
  } catch {
    return;
  }
};
