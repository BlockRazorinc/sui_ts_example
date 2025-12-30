import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { SuiClient, SuiHTTPTransport, getFullnodeUrl } from "@mysten/sui/client";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

import { CaculateFee, AddTip } from "blockrazor-sui-sdk";



// Replace with your own private key
const SUI_PRIVATE_KEY = "suiprivkey1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

// Receiver address
const RECIPIENT = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

// gRPC endpoint 
const GRPC_ADDR = "your-grpc-host:PORT";

// JSON-RPC endpoint 
const RPC_URL = getFullnodeUrl("mainnet");

// Auth token
const AUTH_TOKEN = "YOUR_AUTH_TOKEN";

// Amount to send (in MIST)
const SEND_AMOUNT_MIST = 100_000_000n;

// Fixed gas price for demo
const GAS_PRICE = 5_000;

/**
 * Local proto root (change this path to match your repo structure)
 */
const PROTO_ROOT = path.resolve("/path/to/your/protos");

/**
 * Proto file for:
 * package sui.rpc.v2;
 * service TransactionExecutionService { rpc ExecuteTransaction(...) ... }
 */
const PROTO_FILE = path.join(
    PROTO_ROOT,
    "sui/rpc/v2/transaction_execution_service.proto"
);

/**
 * Create a gRPC client by loading proto definitions via proto-loader.
 */
function makeGrpcClient() {
    const pkgDef = protoLoader.loadSync(PROTO_FILE, {
        includeDirs: [PROTO_ROOT],
        keepCase: false,
        longs: String,
        enums: String,
        defaults: false,
        oneofs: true,
    });

    const loaded: any = grpc.loadPackageDefinition(pkgDef);
    const Svc = loaded.sui.rpc.v2.TransactionExecutionService;
    return new Svc(GRPC_ADDR, grpc.credentials.createInsecure());
}

/**
 * ExecuteTransaction RPC call with auth metadata.
 */
function grpcExecuteTransaction(
    grpcClient: any,
    req: any,
    authToken: string
): Promise<any> {
    return new Promise((resolve, reject) => {
        const md = new grpc.Metadata();
        md.set("auth_token", authToken);

        grpcClient.ExecuteTransaction(req, md, (err: any, resp: any) => {
            if (err) return reject(err);
            resolve(resp);
        });
    });
}


async function main() {
    const { secretKey } = decodeSuiPrivateKey(SUI_PRIVATE_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const sender = keypair.getPublicKey().toSuiAddress();
    console.log("sender:", sender);

    // Build a simple transfer transaction ---
    const tx = new Transaction();
    tx.setSender(sender);
    tx.setGasPrice(GAS_PRICE);

    // Split gas coin into payment coin, then transfer to recipient
    const [payCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(SEND_AMOUNT_MIST)]);
    tx.transferObjects([payCoin], tx.pure.address(RECIPIENT));

    // JSON-RPC client used for tx.build()
    const httpTransport = new SuiHTTPTransport({
        url: RPC_URL
    });
    const httpClient = new SuiClient({ transport: httpTransport });

    // === Estimate gas & tip 
    const tipFee = await CaculateFee({ transaction: tx });
    console.log("tip fee is:", tipFee);

    tx.setGasBudget(tipFee.gasBudget);

    // The required tip must exceed 1,000,000 mist
    // and must exceed 5% of the gas budget
    AddTip(tx, Math.max(Number(tipFee.tipAmount), 1000000));

    // Build transaction
    const transactionBytes = await tx.build({ client: httpClient });

    // Sign transaction
    const signed = await keypair.signTransaction(transactionBytes);

    const sigBytes = Buffer.from(signed.signature, "base64");

    // Create gRPC client + send ExecuteTransaction request
    const grpcClient = makeGrpcClient();
    const req = {
        transaction: { bcs: { value: Buffer.from(transactionBytes) } },
        signatures: [{ bcs: { value: sigBytes } }],
    };

    // Send transaction
    const resp = await grpcExecuteTransaction(grpcClient, req, AUTH_TOKEN);
    console.log("grpc resp:", resp);
}

main().catch((err) => {
    console.error("Execution failed:", err);
    process.exit(1);
});