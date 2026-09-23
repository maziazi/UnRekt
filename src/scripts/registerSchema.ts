// One-off script: register the UNREKT hedge-attestation schema on X Layer's
// EAS SchemaRegistry predeploy. Run once with `npx tsx src/scripts/registerSchema.ts`.
// The resulting schema UID is deterministic (keccak256(schema, resolver, revocable))
// so we compute and print it locally, then paste it as a constant into src/eas.ts.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Interface, solidityPackedKeccak256, ZeroAddress } from "ethers";

const execFileAsync = promisify(execFile);

const SCHEMA_REGISTRY_ADDRESS = "0x4200000000000000000000000000000000000020";
export const HEDGE_SCHEMA = "string asset,uint256 exposureValue,uint256 hedgeSize,string venue,uint256 timestamp";
const RESOLVER = ZeroAddress; // no resolver contract — plain attestation
const REVOCABLE = true;

const registryIface = new Interface([
  "function register(string schema, address resolver, bool revocable) external returns (bytes32)",
]);

async function main() {
  const calldata = registryIface.encodeFunctionData("register", [HEDGE_SCHEMA, RESOLVER, REVOCABLE]);

  const predictedUid = solidityPackedKeccak256(
    ["string", "address", "bool"],
    [HEDGE_SCHEMA, RESOLVER, REVOCABLE]
  );

  console.log("Schema:", HEDGE_SCHEMA);
  console.log("Predicted schema UID:", predictedUid);
  console.log("Calldata:", calldata);
  console.log("\nSending registration tx via onchainos CLI...");

  const { stdout } = await execFileAsync("onchainos", [
    "wallet",
    "contract-call",
    "--to",
    SCHEMA_REGISTRY_ADDRESS,
    "--chain",
    "xlayer",
    "--input-data",
    calldata,
  ]);

  console.log(stdout);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
