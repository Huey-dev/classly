declare module "@noble/hashes/blake2.js" {
  export function blake2b(data: Uint8Array | string, opts?: { dkLen?: number }): Uint8Array;
}

declare module "@noble/hashes/utils.js" {
  export function utf8ToBytes(str: string): Uint8Array;
  export function bytesToHex(arr: Uint8Array): string;
}
