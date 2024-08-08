/**
 * Demonstrates how to mint NFTs and store their metadata on chain using the Metaplex MetadataProgram
 */

import { Keypair } from "@solana/web3.js";
import { Metaplex, bundlrStorage, keypairIdentity } from "@metaplex-foundation/js";

import { payer, connection } from "@/lib/vars";
import { explorerURL, printConsoleSeparator } from "@/lib/helpers";

(async () => {
  console.log("Payer address:", payer.publicKey.toBase58());

  /**
   * define our ship's JSON metadata
   */
  const metadata = {
    name: "Solana Bootcamp Autumn 2024",
    symbol: "SBS",
    description: "Solana Bootcamp Autumn 2024",
    image:
      "https://github.com/trankhacvy/solana-bootcamp-autumn-2024/blob/main/assets/logo.png?raw=true",
  };

  /**
   * Use the Metaplex sdk to handle most NFT actions
   */

  // create an instance of Metaplex sdk for use
  const metaplex = Metaplex.make(connection)
    // set our keypair to use, and pay for the transaction
    .use(keypairIdentity(payer))
    // define a storage mechanism to upload with
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      }),
    );

  console.log("Uploading metadata...");

  // upload the JSON metadata
  const { uri } = await metaplex.nfts().uploadMetadata(metadata);

  console.log("Metadata uploaded:", uri);

  printConsoleSeparator("NFT details");

  console.log("Creating NFT using Metaplex...");

  const tokenMint = Keypair.generate();

  // create a new nft using the metaplex sdk
  const { nft, response } = await metaplex.nfts().create({
    uri,
    name: metadata.name,
    symbol: metadata.symbol,
    useNewMint: tokenMint,

    // `sellerFeeBasisPoints` is the royalty that you can define on nft
    sellerFeeBasisPoints: 500, // Represents 5.00%.

    //
    isMutable: true,
  });

  console.log(nft);

  printConsoleSeparator("NFT created:");
  console.log(explorerURL({ txSignature: response.signature }));

  /**
   *
   */

  printConsoleSeparator("Find by mint:");

  // you can also use the metaplex sdk to retrieve info about the NFT's mint
  const mintInfo = await metaplex.nfts().findByMint({
    mintAddress: tokenMint.publicKey,
  });
  console.log(mintInfo);
})();
