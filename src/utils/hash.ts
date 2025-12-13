/**
 * Generates a SHA-256 hash from the given data
 * @param data - Data to hash (can be string or Uint8Array)
 * @returns Promise with the hex-encoded hash
 */
export async function generateSHA256(data: string | Uint8Array): Promise<string> {
  let buffer: ArrayBuffer;
  
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    buffer = encoder.encode(data).buffer as ArrayBuffer;
  } else {
    buffer = data.buffer as ArrayBuffer;
  }
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Generates a signature hash based on PDF bytes and signer data
 * @param pdfBytes - The PDF file bytes
 * @param signerName - Normalized signer name
 * @param signerCPF - Normalized CPF (digits only)
 * @param deviceId - Device identifier
 * @param timestamp - ISO timestamp
 * @returns Promise with the hex-encoded hash
 */
export async function generateSignatureHash(
  pdfBytes: Uint8Array,
  signerName: string,
  signerCPF: string,
  deviceId: string,
  timestamp: string
): Promise<string> {
  // Create a combined payload: PDF bytes + signer data
  const signerPayload = `|NAME:${signerName}|CPF:${signerCPF}|DEVICE:${deviceId}|TIME:${timestamp}|`;
  const signerBytes = new TextEncoder().encode(signerPayload);
  
  // Combine PDF bytes and signer payload
  const combinedBytes = new Uint8Array(pdfBytes.length + signerBytes.length);
  combinedBytes.set(pdfBytes, 0);
  combinedBytes.set(signerBytes, pdfBytes.length);
  
  return generateSHA256(combinedBytes);
}

/**
 * Abbreviates a hash for display purposes
 * @param hash - Full hash string
 * @param length - Number of characters to show at start and end (default: 8)
 * @returns Abbreviated hash like "abc12345...xyz98765"
 */
export function abbreviateHash(hash: string, length: number = 8): string {
  if (hash.length <= length * 2 + 3) return hash;
  return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
}
