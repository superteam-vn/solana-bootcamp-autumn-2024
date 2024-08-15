import { Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, createMintToInstruction } from '@solana/spl-token';
import { PROGRAM_ID as METADATA_PROGRAM_ID, createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { Metaplex, bundlrStorage, keypairIdentity } from "@metaplex-foundation/js";
import { payer, connection, STATIC_PUBLICKEY } from "@/lib/vars";
import { explorerURL, printConsoleSeparator } from "@/lib/helpers";

(async() => {
    let allTx = new Transaction();

    // define the assorted token config settings
    const tokenConfig = {
        decimals: 6,
        name: "NB First Token",
        symbol: "NBF",
        uri: "https://github.com/NguyenBao10/solana-bootcamp-autumn-2024/blob/08445054b4484d301e402ca3a97cdf343d527e16/assets/nbf-token.json",
    };

    const mintKeypair = Keypair.generate();

    console.log("Mint address:", mintKeypair.publicKey.toBase58());

    // Create the fungible token
    const tokenMint = await createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      tokenConfig.decimals,
      mintKeypair
    );

    console.log("Fungible token mint:", tokenMint.toBase58());

    // get metadata account
    const metadataAccount = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            METADATA_PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer()
        ],
        METADATA_PROGRAM_ID,
    )[0];
    
    console.log("Metadata address:", metadataAccount.toBase58());

    // create the metadata account for mint
    const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
        {
            metadata: metadataAccount,
            mint: mintKeypair.publicKey,
            mintAuthority: payer.publicKey,
            payer: payer.publicKey,
            updateAuthority: payer.publicKey,
        },
        {
            createMetadataAccountArgsV3: {
                data: {
                    creators: null,
                    name: tokenConfig.name,
                    symbol: tokenConfig.symbol,
                    uri: tokenConfig.uri,
                    sellerFeeBasisPoints: 0,
                    collection: null,
                    uses: null,
                },
                // `collectionDetails` - for non-nft type tokens, normally set to `null` to not have a value set
                collectionDetails: null,
                // should the metadata be updatable?
                isMutable: true,
            },
        },
    );

    allTx.add(createMetadataInstruction);
  
    // Get or create token mint accounts
    const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      tokenMint,
      payer.publicKey
    );
  
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      tokenMint,
      STATIC_PUBLICKEY
    );
  
    // Mint tokens
    let mintToMe = createMintToInstruction(tokenMint, payerTokenAccount.address, payer.publicKey, 100_000_000 );
    let mintToRecipient = createMintToInstruction(tokenMint, recipientTokenAccount.address, payer.publicKey, 10_000_000);

    allTx.add(mintToMe, mintToRecipient);

    // Send and confirm the transaction
    const allTxSignature = await sendAndConfirmTransaction(connection, allTx, [payer]);
  
    // json metadata
    const metadata = {
        name: "NB First Token",
        symbol: "NBF",
        description: "NB First Token",
        image: "https://raw.githubusercontent.com/NguyenBao10/solana-bootcamp-autumn-2024/585715b43a2e6424eda8a88e10231aaf2834126b/assets/test.jpeg",
    };

    // create an instance of Metaplex sdk for use
    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(payer))
        .use(
        bundlrStorage({
            address: "https://devnet.bundlr.network",
            providerUrl: "https://api.devnet.solana.com",
            timeout: 60000,
        }),
    );

    // upload the JSON metadata
    const { uri } = await metaplex.nfts().uploadMetadata(metadata);

    console.log("Metadata uploaded:", uri);

    const tokenNFTMint = Keypair.generate();

    console.log("NFT mint address:", tokenNFTMint.publicKey.toBase58());

    // create a new nft using the metaplex sdk
    const { nft, response } = await metaplex.nfts().create({
        uri,
        name: metadata.name,
        symbol: metadata.symbol,
        useNewMint: tokenNFTMint,
        // `sellerFeeBasisPoints` is the royalty that you can define on nft
        sellerFeeBasisPoints: 1000, // Represents 10.00%.
        isMutable: true,
    });

    console.log("NFT mint:", nft);

    printConsoleSeparator("Completed");
    
    console.log("NFT signature", explorerURL({ txSignature: response.signature }));
    console.log("Transaction signature", explorerURL({ txSignature: allTxSignature }));
})();
  