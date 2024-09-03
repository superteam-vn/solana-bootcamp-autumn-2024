import dotenvx from "@dotenvx/dotenvx";
dotenvx.config();
import express from "express";
import http from "http";
import morgan from "morgan";
import { createTerminus } from "@godaddy/terminus";
import { Connection, PublicKey, SystemProgram, Transaction, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createPostResponse, actionCorsMiddleware } from "@solana/actions";

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const DEFAULT_SOL_ADDRESS = process.env.DEFAULT_SOL_ADDRESS;
const DEFAULT_SOL_AMOUNT = 0.0001;
const connection = new Connection(clusterApiUrl("mainnet-beta"));

const app = express();
app.set("trust proxy", 1);
app.use(morgan("tiny"));
app.use(express.json());

/**
 * The `actionCorsMiddleware` middleware will provide the correct CORS settings for Action APIs
 * so you do not need to use an additional `cors` middleware if you do not require it for other reasons
 */
app.use(actionCorsMiddleware());

// For Blink Action
app.get("/actions.json", getActionsJson);
app.get("/api/actions/transfer-sol", getTransferSol);
app.post("/api/actions/transfer-sol", postTransferSol);

// Route handlers
function getActionsJson(req, res) {
  const payload = {
    rules: [
      { pathPattern: "/*", apiPath: "/api/actions/*" },
      { pathPattern: "/api/actions/**", apiPath: "/api/actions/**" },
    ],
  };
  res.json(payload);
}

async function getTransferSol(req, res) {
  try {
    const { toPubkey } = validatedQueryParams(req.query);
    const baseHref = `${BASE_URL}/api/actions/transfer-sol?to=${toPubkey}`;

    const payload = {
      type: "action",
      title: "Actions Example - Transfer Native SOL",
      icon: "https://solana-actions.vercel.app/solana_devs.jpg",
      description: "Transfer SOL to another Solana wallet",
      links: {
        actions: [
          { label: "Send 0.0001 SOL", href: `${baseHref}&amount=0.0001` },
          { label: "Send 0.0005 SOL", href: `${baseHref}&amount=0.0005` },
          { label: "Send 0.001 SOL", href: `${baseHref}&amount=0.001` },
          {
            label: "Send SOL",
            href: `${baseHref}&amount={amount}`,
            parameters: [
              {
                name: "amount",
                label: "Enter the amount of SOL to send",
                required: true,
              },
            ],
          },
        ],
      },
    };

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err?.message || err });
  }
}

async function postTransferSol(req, res) {
  try {
    const { amount, toPubkey } = validatedQueryParams(req.query);
    const { account } = req.body;

    if (!account) {
      throw new Error('Invalid "account" provided');
    }

    const fromPubkey = new PublicKey(account);

    // create an instruction to transfer native SOL from one wallet to another
    const transferSolInstruction = SystemProgram.transfer({
      fromPubkey: fromPubkey,
      toPubkey: toPubkey,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // create transaction
    const transaction = new Transaction({
      feePayer: fromPubkey,
      blockhash,
      lastValidBlockHeight,
    }).add(transferSolInstruction);

    const payload = await createPostResponse({
      fields: {
        transaction,
        message: `Send ${amount} SOL to ${toPubkey.toBase58()}`,
      },
    });

    res.json(payload);
  } catch (err) {
    res.status(400).json({ error: err.message || "An unknown error occurred" });
  }
}

function validatedQueryParams(query) {
  let toPubkey = DEFAULT_SOL_ADDRESS;
  let amount = DEFAULT_SOL_AMOUNT;

  if (query.to) {
    try {
      toPubkey = new PublicKey(query.to);
    } catch (err) {
      throw new Error("Invalid input query parameter: to");
    }
  }

  try {
    if (query.amount) {
      amount = parseFloat(query.amount);
    }
    if (amount <= 0) throw new Error("amount is too small");
  } catch (err) {
    throw new Error("Invalid input query parameter: amount");
  }

  return { amount, toPubkey };
}

function onHealthCheck() {
  return Promise.resolve();
}

function onSignal() {
  console.log("server is starting cleanup");
  // close db connections, etc
  return Promise.all([
    prisma
      .$disconnect()
      .then(() => console.log("postgres disconnected successfully"))
      .catch((err) => console.error("error during postgres disconnection", err.stack)),
  ]);
}

function onShutdown() {
  console.log("cleanup finished, server is shutting down");
  return Promise.resolve();
}

const terminusOptions = {
  signals: ["SIGINT", "SIGTERM"],
  timeout: 10000,
  healthChecks: { "/": onHealthCheck },
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
  },
  onSignal,
  onShutdown,
};

const server = http.createServer(app);

// graceful shutdown
createTerminus(server, terminusOptions);

server.listen(PORT, () => {
  console.log(`Server is running on port :${PORT}`);
});
