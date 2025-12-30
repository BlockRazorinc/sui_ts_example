import { SuiClient, SuiHTTPTransport } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

import {
    CaculateFee,
    AddTip,
} from "blockrazor-sui-sdk";

// Replace with your own private key 
const SUI_PRIVATE_KEY = "suiprivkey1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

// Receiver address
const RECIPIENT = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

// RPC endpoint 
const RPC_URL = "https://blockrazor-rpc-endpoint:PORT";

// Auth token for RPC 
const AUTH_TOKEN = "YOUR_RPC_AUTH_TOKEN";

// Transfer amount (in MIST, 1 SUI = 1e9 MIST)
const SEND_AMOUNT_MIST = 100_000_000n;

// Gas price 
const GAS_PRICE = 5_000;

async function main() {
    // Create Sui RPC client with auth header
    const transport = new SuiHTTPTransport({
        url: RPC_URL,
        rpc: {
            headers: {
                auth_token: AUTH_TOKEN,
            },
        },
    });

    const client = new SuiClient({ transport });

    // Load keypair
    const { secretKey } = decodeSuiPrivateKey(SUI_PRIVATE_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const sender = keypair.getPublicKey().toSuiAddress();

    // Create transaction
    const tx = new Transaction();
    tx.setSender(sender);
    tx.setGasPrice(GAS_PRICE);

    // Split coin and transfer
    const [payCoin] = tx.splitCoins(tx.gas, [
        tx.pure.u64(SEND_AMOUNT_MIST),
    ]);

    tx.transferObjects([payCoin], tx.pure.address(RECIPIENT));

    // === Estimate gas & tip 
    const tipFee = await CaculateFee({
        transaction: tx,
    });

    console.log("tip fee is:", tipFee);

    tx.setGasBudget(tipFee.gasBudget);

    // The required tip must exceed 1,000,000 mist
    // and must exceed 5% of the gas budget
    AddTip(tx, Math.max(Number(tipFee.tipAmount), 1000000));

    // Build transaction
    const builtTx = await tx.build({ client });

    // Sign transaction
    const signed = await keypair.signTransaction(builtTx);

    // Send transaction
    const result = await client.executeTransactionBlock({
        transactionBlock: signed.bytes,
        signature: signed.signature,
        options: {
            showEffects: true,
        },
    })

    console.log("Execution Result:", result);
}

// Run
main().catch((err) => {
    console.error("Execution failed:", err);
    process.exit(1);
});