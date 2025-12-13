"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  scriptFromNative,
  mintingPolicyToId,
  fromText,
  toUnit,
  getAddressDetails,
} from "@lucid-evolution/lucid";
import { useLucid } from "../../../../app/context/LucidContext";

// Steps
// eligibility -> payment -> minting -> receipt -> error

type ClaimStep = "eligibility" | "payment" | "minting" | "receipt" | "error";

type ClaimData = {
  claimId?: string;
  fineLovelace?: string;
  estimatedFeeLovelace?: string;
  txHash?: string;
  status?: string;
  assetId?: string;
  policyId?: string;
  assetName?: string;
};

export default function ClaimNftPage() {
  const params = useSearchParams();
  const courseId = params.get("courseId") || "";
  const { lucid, walletAddress, balance, connectWallet, loading: walletLoading, error: walletError } = useLucid();

  const [config, setConfig] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [eligible, setEligible] = useState<boolean>(false);
  const [step, setStep] = useState<ClaimStep>("eligibility");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState({ recipient: "", payer: "" });
  const [claim, setClaim] = useState<ClaimData>({});

  const fineAda = useMemo(() => {
    const fine = BigInt(config?.fineLovelace ?? 0);
    return Number(fine) / 1_000_000;
  }, [config]);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      try {
        setLoading("Loading config...");
        const [cfgRes, courseRes] = await Promise.all([
          fetch(`/api/courses/${courseId}/nft-config`),
          fetch(`/api/courses/${courseId}`),
        ]);
        const cfgData = await cfgRes.json();
        const courseData = await courseRes.json();
        setConfig(cfgData);
        setCourse(courseData);
        setEligible(true); // backend gate will enforce completion on prepare
      } catch (e: any) {
        setError(e?.message || "Unable to load config");
      } finally {
        setLoading(null);
      }
    })();
  }, [courseId]);

  // sync wallet addresses
  useEffect(() => {
    if (walletAddress) {
      setAddresses((a) => ({
        ...a,
        recipient: a.recipient || walletAddress,
        payer: a.payer || walletAddress,
      }));
    }
  }, [walletAddress]);

  const prepareClaim = async () => {
    try {
      setLoading("Preparing claim...");
      setError(null);
      const res = await fetch(`/api/courses/${courseId}/nft-claim/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddress: addresses.recipient,
          payerAddress: addresses.payer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prepare");
      setClaim({
        claimId: data.claimId,
        fineLovelace: data.fineLovelace,
        estimatedFeeLovelace: data.estimatedFeeLovelace,
        status: data.status,
      });
      setStep("payment");
    } catch (e: any) {
      setError(e?.message || "Unable to start claim");
    } finally {
      setLoading(null);
    }
  };

  const buildAndSubmit = async () => {
    if (!lucid) return setError("Wallet not initialized");
    if (!walletAddress) return setError("Connect wallet first");
    if (!claim.claimId) return setError("No claimId");
    if (!course?.author?.walletAddress) return setError("Instructor wallet missing");
    try {
      setLoading("Building transaction...");
      setError(null);

      const payerKeyHash = getAddressDetails(walletAddress).paymentCredential?.hash;
      if (!payerKeyHash) throw new Error("Unable to derive key hash");
      const nativeScript = { type: "sig", keyHash: payerKeyHash } as const;
      const mintingPolicy = scriptFromNative(nativeScript);
      const policyId = mintingPolicyToId(mintingPolicy);

      const assetName = `${course.title} Completion`;
      const assetNameHex = fromText(assetName);
      const unit = toUnit(policyId, assetNameHex);

      const fine = BigInt(claim.fineLovelace ?? config?.fineLovelace ?? 0);
      const metadata = {
        [policyId]: {
          [assetNameHex]: {
            name: assetName,
            image: course.coverImage || "",
            description: `Completion NFT for ${course.title}`,
          },
        },
      };

      const tx = await lucid
        .newTx()
        .attach.MintingPolicy(mintingPolicy)
        .mintAssets({ [unit]: BigInt(1) })
        .attachMetadata(721, metadata)
        .pay.ToAddress(course.author.walletAddress, { lovelace: fine })
        .complete();

      const signed = await tx.sign.withWallet().complete();
      const txHash = await signed.submit();

      setClaim((c) => ({
        ...c,
        txHash,
        policyId,
        assetName: assetNameHex,
        assetId: unit,
        status: "MINTING",
      }));
      setStep("minting");
      setMessage("Transaction submitted. Finalizing claim record...");

      const res = await fetch(`/api/nft-claim/${claim.claimId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, policyId, assetName: assetNameHex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setClaim((c) => ({
        ...c,
        txHash: data.txHash,
        status: data.status,
        assetId: data.assetId,
        policyId: data.policyId,
        assetName: data.assetName,
      }));
      setStep("receipt");
      setMessage("Minted successfully");
    } catch (e: any) {
      setError(e?.message || "Mint failed");
      setStep("error");
    } finally {
      setLoading(null);
    }
  };

  const checkStatus = async () => {
    if (!claim.claimId) return;
    try {
      const res = await fetch(`/api/nft-claim/${claim.claimId}/status`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status failed");
      setClaim((c) => ({
        ...c,
        status: data.status,
        txHash: data.txHash,
        assetId: data.assetId,
      }));
      if (data.status === "MINTED") {
        setStep("receipt");
        setMessage("Minted successfully");
      }
    } catch (e: any) {
      setError(e?.message || "Unable to check status");
      setStep("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Course</p>
            <h1 className="text-3xl font-bold">Claim Completion NFT</h1>
          </div>
          <Link href={`/course/${courseId}`} className="text-blue-600 text-sm">
            Back to course
          </Link>
        </div>

        {loading && <div className="p-3 rounded bg-blue-50 text-blue-700 text-sm">{loading}</div>}
        {(error || walletError) && (
          <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error || walletError}</div>
        )}
        {message && <div className="p-3 rounded bg-emerald-50 text-emerald-700 text-sm">{message}</div>}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow p-5 space-y-4">
            <h2 className="text-lg font-semibold">Eligibility</h2>
            <p className="text-sm text-gray-600">
              Completion is required. Eligibility is enforced on the backend before creating a claim.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${eligible ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span>{eligible ? "Eligible" : "Not eligible"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${walletAddress ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span>{walletAddress ? "Wallet connected" : "Wallet not connected"}</span>
              </div>
              {walletAddress && (
                <div className="text-xs text-gray-500 font-mono break-all">
                  {walletAddress}
                  {balance !== null && ` • Balance: ${balance.toFixed(2)} ADA`}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient address</label>
              <input
                value={addresses.recipient}
                onChange={(e) => setAddresses((a) => ({ ...a, recipient: e.target.value }))}
                placeholder="addr_test1..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <label className="text-sm font-medium">Payer address</label>
              <input
                value={addresses.payer}
                onChange={(e) => setAddresses((a) => ({ ...a, payer: e.target.value }))}
                placeholder="addr_test1..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={connectWallet}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-60"
                disabled={!!walletAddress || walletLoading}
              >
                {walletAddress ? "Wallet Connected" : walletLoading ? "Connecting..." : "Connect Wallet"}
              </button>
              <button
                onClick={prepareClaim}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"
                disabled={!eligible || !walletAddress || !addresses.recipient || !addresses.payer}
              >
                Start Claim
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5 space-y-3">
            <h2 className="text-lg font-semibold">Cost & Status</h2>
            <div className="p-3 rounded border text-sm space-y-1">
              <div className="flex justify-between">
                <span>Fine</span>
                <span>{fineAda.toFixed(2)} ADA</span>
              </div>
              <div className="flex justify-between">
                <span>Est. network fee</span>
                <span>
                  {claim.estimatedFeeLovelace
                    ? (Number(claim.estimatedFeeLovelace) / 1_000_000).toFixed(2)
                    : "0.00"}{" "}
                  ADA
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>
                  {(fineAda + (claim.estimatedFeeLovelace ? Number(claim.estimatedFeeLovelace) / 1_000_000 : 0)).toFixed(2)} ADA
                </span>
              </div>
            </div>
            <div className="p-3 rounded border text-sm space-y-1">
              <div className="flex justify-between">
                <span>Claim</span>
                <span className="font-mono">{claim.claimId || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="font-semibold">{claim.status || "idle"}</span>
              </div>
              <div className="flex justify-between">
                <span>Tx Hash</span>
                <span className="font-mono text-xs">{claim.txHash || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Asset</span>
                <span className="font-mono text-xs">{claim.assetId || "—"}</span>
              </div>
              {claim.txHash && (
                <div className="text-xs text-blue-600">
                  <Link href={`https://preprod.cardanoscan.io/transaction/${claim.txHash}`} target="_blank">
                    View on CardanoScan
                  </Link>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={buildAndSubmit}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-60"
                disabled={step !== "payment" || !!loading}
              >
                Pay Fine & Mint
              </button>
              <button
                onClick={checkStatus}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm disabled:opacity-60"
                disabled={!claim.claimId || !!loading}
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h2 className="text-lg font-semibold">Minting Progress</h2>
          <div className="flex flex-col gap-2 text-sm">
            <ProgressStep label="Eligibility" active />
            <ProgressStep label="Pay fine & build tx" active={step !== "eligibility"} />
            <ProgressStep label="Submit & confirm" active={step === "minting" || step === "receipt"} />
            <ProgressStep label="Receive NFT" active={step === "receipt"} />
          </div>
          {step === "receipt" && (
            <div className="mt-3 p-3 rounded border">
              <p className="font-semibold text-emerald-600">Minted!</p>
              <p className="text-sm">Asset: {claim.assetId || ""}</p>
              <p className="text-sm">Tx: {claim.txHash}</p>
            </div>
          )}
          {step === "error" && (
            <div className="mt-3 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
              Something went wrong. Fix the inputs and try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressStep({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`} />
      <span className={`text-sm ${active ? "text-gray-900" : "text-gray-500"}`}>{label}</span>
    </div>
  );
}
