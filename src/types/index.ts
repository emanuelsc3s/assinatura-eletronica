export interface SignatureData {
  id: string;
  name: string;
  cpf: string;
  deviceId: string;
  timestamp: string;
  hash: string;
}

export interface PDFMetadata {
  fileName: string;
  fileSize: number;
  lastModified: number;
}

export interface SignatureLog {
  documentId: string;
  pdfMetadata: PDFMetadata;
  signatures: SignatureData[];
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  deviceId: string;
  currentLog: SignatureLog | null;
}

export interface SignerFormData {
  name: string;
  cpf: string;
}
