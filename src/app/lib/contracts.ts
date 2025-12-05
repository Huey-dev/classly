import { Lucid, SpendingValidator, MintingPolicy, Address, PolicyId, Data, validatorToAddress, mintingPolicyToId, Network } from '@lucid-evolution/lucid';

// This creates a type for the resolved instance of a Lucid object
type LucidInstance = Awaited<ReturnType<typeof Lucid>>;

// Export the validator script getter
export async function getEscrowValidator(): Promise<string> {
    return "your_validator_script_here";
}

// Export the NFT policy getter
export async function getNFTPolicy(): Promise<string> {
    return "your_policy_script_here";
}

// Export the reputation validator getter
export async function getReputationValidator(): Promise<string> {
    return "your_validator_script_here";
}

export async function getEscrowAddress(lucid: LucidInstance, network: Network = "Preprod"): Promise<Address> {
  const validatorScript = await getEscrowValidator();
  const validator: SpendingValidator = {
    type: 'PlutusV2',
    script: validatorScript,
  };
  
  return validatorToAddress(network, validator);
}

export async function getNFTPolicyId(lucid: LucidInstance): Promise<PolicyId> {
  const policyScript = await getNFTPolicy();
  const policy: MintingPolicy = {
    type: 'PlutusV2',
    script: policyScript,
  };
  
  return mintingPolicyToId(policy);
}

export async function getReputationAddress(lucid: LucidInstance, network: Network = "Preprod"): Promise<Address> {
  const validatorScript = await getReputationValidator();
  const validator: SpendingValidator = {
    type: 'PlutusV2',
    script: validatorScript,
  };
  
  return validatorToAddress(network, validator);
}

export async function getAllContractAddresses(lucid: LucidInstance, network: Network = "Preprod") {
  const [escrowAddress, nftPolicyId, reputationAddress] = await Promise.all([
    getEscrowAddress(lucid, network),
    getNFTPolicyId(lucid),
    getReputationAddress(lucid, network),
  ]);

  return { escrowAddress, nftPolicyId, reputationAddress };
}