import type { SignatureLog, SignatureData, PDFMetadata } from '@/types';

const STORAGE_KEYS = {
  DEVICE_ID: 'pdf_signature_device_id',
  CURRENT_LOG: 'pdf_signature_current_log',
} as const;

/**
 * Saves the current signature log to localStorage
 * @param log - Signature log to save
 */
export function saveSignatureLog(log: SignatureLog): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_LOG, JSON.stringify(log));
  } catch (error) {
    console.error('Error saving signature log to localStorage:', error);
    throw new Error('Não foi possível salvar o log de assinaturas. O armazenamento local pode estar cheio.');
  }
}

/**
 * Loads the current signature log from localStorage
 * @returns Signature log or null if not found
 */
export function loadSignatureLog(): SignatureLog | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_LOG);
    if (!data) return null;
    return JSON.parse(data) as SignatureLog;
  } catch (error) {
    console.error('Error loading signature log from localStorage:', error);
    return null;
  }
}

/**
 * Clears the current signature log from localStorage
 */
export function clearSignatureLog(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_LOG);
}

/**
 * Creates a new signature log
 * @param pdfMetadata - PDF file metadata
 * @returns New signature log
 */
export function createSignatureLog(pdfMetadata: PDFMetadata): SignatureLog {
  const now = new Date().toISOString();
  return {
    documentId: crypto.randomUUID(),
    pdfMetadata,
    signatures: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Adds a signature to an existing log
 * @param log - Existing signature log
 * @param signature - Signature data to add
 * @returns Updated signature log
 */
export function addSignatureToLog(
  log: SignatureLog,
  signature: SignatureData
): SignatureLog {
  return {
    ...log,
    signatures: [...log.signatures, signature],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Checks if a PDF metadata matches the current log
 * @param log - Signature log
 * @param metadata - PDF metadata to check
 * @returns true if metadata matches
 */
export function isPDFMatchingLog(
  log: SignatureLog,
  metadata: PDFMetadata
): boolean {
  return (
    log.pdfMetadata.fileName === metadata.fileName &&
    log.pdfMetadata.fileSize === metadata.fileSize &&
    log.pdfMetadata.lastModified === metadata.lastModified
  );
}
