import {
  Lucid,
  SpendingValidator,
  MintingPolicy,
  Address,
  PolicyId,
  Data,
  validatorToAddress,
  mintingPolicyToId,
  Network,
} from "@lucid-evolution/lucid";

type LucidInstance = Awaited<ReturnType<typeof Lucid>>;

type PlutusValidator = {
  title: string;
  compiledCode: string;
};

type PlutusBundle = {
  validators: PlutusValidator[];
};

const PLUTUS_JSON_PATH = "/plutus.json";
const ESCROW_TITLE = "escrow.escrow.spend";
const NFT_TITLE = "nft.policy";
const REPUTATION_TITLE = "reputation.validator";

let cachedPlutus: PlutusBundle | null = null;

export const EscrowDatumSchema = Data.Object({
  courseId: Data.Bytes(),
  receiver: Data.Bytes(),
  oracle: Data.Bytes(),
  netTotal: Data.Integer(),
  paidCount: Data.Integer(),
  paidOut: Data.Integer(),
  released30: Data.Boolean(),
  released40: Data.Boolean(),
  releasedFinal: Data.Boolean(),
  comments: Data.Integer(),
  ratingSum: Data.Integer(),
  ratingCount: Data.Integer(),
  allWatchMet: Data.Boolean(),
  firstWatch: Data.Integer(),
  disputeBy: Data.Integer(),
});

export type EscrowDatum = Data.Static<typeof EscrowDatumSchema>;

export const EscrowRedeemerSchema = Data.Enum([
  Data.Object({
    AddPayment: Data.Tuple([
      Data.Object({
        net_amount: Data.Integer(),
        watch_met: Data.Boolean(),
        rating_x10: Data.Integer(),
        commented: Data.Boolean(),
        first_watch_at: Data.Integer(),
      }),
    ]),
  }),
  Data.Object({ ReleaseInitial: Data.Tuple([]) }),
  Data.Object({ ReleaseMetrics40: Data.Tuple([]) }),
  Data.Object({ ReleaseFinal: Data.Tuple([]) }),
  Data.Object({ Refund: Data.Tuple([]) }),
  Data.Object({ DisputeHold: Data.Tuple([]) }),
]);

export type EscrowRedeemer = Data.Static<typeof EscrowRedeemerSchema>;

export function calculateNetAmount(gross: bigint): bigint {
  if (gross <= 0n) return 0n;
  // 7% platform fee -> keep 93%
  return (gross * 93n) / 100n;
}

async function loadPlutus(): Promise<PlutusBundle> {
  if (cachedPlutus) return cachedPlutus;

  // Server: read from disk; Client: fetch from public/ root.
  if (typeof window === "undefined") {
    const [{ readFile }, path] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    const raw = await readFile(path.join(process.cwd(), "public", "plutus.json"), "utf8");
    cachedPlutus = JSON.parse(raw) as PlutusBundle;
    return cachedPlutus;
  }

  const res = await fetch(PLUTUS_JSON_PATH);
  if (!res.ok) {
    throw new Error(`Unable to load ${PLUTUS_JSON_PATH}: ${res.status}`);
  }
  cachedPlutus = (await res.json()) as PlutusBundle;
  return cachedPlutus;
}

async function getValidatorScript(title: string): Promise<string> {
  const bundle = await loadPlutus();
  const match = bundle.validators.find((v) => v.title === title);
  if (!match?.compiledCode) {
    throw new Error(`Validator "${title}" not found in plutus.json`);
  }
  return match.compiledCode;
}

export function resolveNetwork(): Network {
  const env = (process.env.NEXT_PUBLIC_NETWORK || "").toLowerCase();
  if (env === "mainnet") return "Mainnet";
  if (env === "preview") return "Preview";
  return "Preprod";
}

export async function getEscrowValidator(): Promise<string> {
  return getValidatorScript(ESCROW_TITLE);
}

export async function getNFTPolicy(): Promise<string> {
  return getValidatorScript(NFT_TITLE);
}

export async function getReputationValidator(): Promise<string> {
  return getValidatorScript(REPUTATION_TITLE);
}

export async function getEscrowAddress(
  _lucid: LucidInstance,
  network: Network = resolveNetwork()
): Promise<Address> {
  // Gets compiled Aiken code for the escrow validator
  const validatorScript = await getEscrowValidator();
  const validator: SpendingValidator = {
    type: "PlutusV3",
    script: validatorScript,
  };
// This creates a DETERMINISTIC address from the validator hash
  return validatorToAddress(network, validator);
}

export async function getNFTPolicyId(): Promise<PolicyId> {
  const policyScript = await getNFTPolicy();
  const policy: MintingPolicy = {
    type: "PlutusV3",
    script: policyScript,
  };

  return mintingPolicyToId(policy);
}

export async function getReputationAddress(
  _lucid: LucidInstance,
  network: Network = resolveNetwork()
): Promise<Address> {
  const validatorScript = await getReputationValidator();
  const validator: SpendingValidator = {
    type: "PlutusV3",
    script: validatorScript,
  };

  return validatorToAddress(network, validator);
}

export async function getAllContractAddresses(
  lucid: LucidInstance,
  network: Network = resolveNetwork()
) {
  const [escrowAddress, nftPolicyId, reputationAddress] = await Promise.all([
    getEscrowAddress(lucid, network),
    getNFTPolicyId(),
    getReputationAddress(lucid, network),
  ]);

  return { escrowAddress, nftPolicyId, reputationAddress };
}
