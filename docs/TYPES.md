# Tipos e Interfaces TypeScript

Este documento descreve todos os tipos e interfaces utilizados no projeto.

---

## Interfaces Principais

### `SignatureData`

Representa os dados de uma assinatura individual.

```typescript
export interface SignatureData {
  id: string;           // UUID único da assinatura
  name: string;         // Nome do assinante (normalizado, uppercase)
  cpf: string;          // CPF do assinante (apenas dígitos, 11 chars)
  deviceId: string;     // Identificador único do dispositivo
  timestamp: string;    // Data/hora da assinatura (ISO 8601)
  hash: string;         // Hash SHA-256 da assinatura (64 chars hex)
}
```

**Exemplo:**
```typescript
const signature: SignatureData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'JOÃO DA SILVA',
  cpf: '12345678901',
  deviceId: '123e4567-e89b-12d3-a456-426614174000',
  timestamp: '2024-01-15T10:30:00.000Z',
  hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
};
```

---

### `PDFMetadata`

Metadados do arquivo PDF carregado.

```typescript
export interface PDFMetadata {
  fileName: string;     // Nome do arquivo (ex: "contrato.pdf")
  fileSize: number;     // Tamanho em bytes
  lastModified: number; // Timestamp de última modificação (ms desde epoch)
}
```

**Exemplo:**
```typescript
const metadata: PDFMetadata = {
  fileName: 'contrato.pdf',
  fileSize: 1048576,  // 1MB
  lastModified: 1705312200000,  // 2024-01-15T10:30:00.000Z
};
```

---

### `SignatureLog`

Log completo de assinaturas de um documento.

```typescript
export interface SignatureLog {
  documentId: string;           // UUID único do documento/sessão
  pdfMetadata: PDFMetadata;     // Metadados do PDF original
  signatures: SignatureData[];  // Array de assinaturas aplicadas
  createdAt: string;            // Data de criação do log (ISO 8601)
  updatedAt: string;            // Data da última atualização (ISO 8601)
}
```

**Exemplo:**
```typescript
const signatureLog: SignatureLog = {
  documentId: '789e0123-e89b-12d3-a456-426614174000',
  pdfMetadata: {
    fileName: 'contrato.pdf',
    fileSize: 1048576,
    lastModified: 1705312200000,
  },
  signatures: [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'JOÃO DA SILVA',
      cpf: '12345678901',
      deviceId: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: '2024-01-15T10:30:00.000Z',
      hash: 'a591a6d4...',
    },
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      name: 'MARIA SANTOS',
      cpf: '98765432101',
      deviceId: '456e7890-e89b-12d3-a456-426614174001',
      timestamp: '2024-01-15T10:35:00.000Z',
      hash: 'b692b7e5...',
    },
  ],
  createdAt: '2024-01-15T10:30:00.000Z',
  updatedAt: '2024-01-15T10:35:00.000Z',
};
```

---

### `AppState`

Estado da aplicação (não utilizado diretamente, mas útil para referência).

```typescript
export interface AppState {
  deviceId: string;           // Device ID do navegador atual
  currentLog: SignatureLog | null;  // Log de assinaturas atual
}
```

---

### `SignerFormData`

Dados do formulário de assinatura (tipo básico).

```typescript
export interface SignerFormData {
  name: string;   // Nome digitado pelo usuário
  cpf: string;    // CPF digitado pelo usuário
}
```

---

## Schemas Zod

### `signerFormSchema`

Schema de validação para o formulário de assinatura.

```typescript
import { z } from 'zod';
import { validateCPF } from '@/utils';

export const signerFormSchema = z.object({
  name: z
    .string()
    .min(5, 'Nome deve ter no mínimo 5 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .refine(
      (val) => val.trim().length >= 5, 
      'Nome deve ter no mínimo 5 caracteres'
    ),
  cpf: z
    .string()
    .min(11, 'CPF deve ter 11 dígitos')
    .refine(
      (val) => validateCPF(val), 
      'CPF inválido'
    ),
});

// Tipo inferido do schema
export type SignerFormSchemaType = z.infer<typeof signerFormSchema>;
```

**Tipo resultante:**
```typescript
type SignerFormSchemaType = {
  name: string;
  cpf: string;
}
```

---

## Props de Componentes

### `PDFUploadProps`

```typescript
interface PDFUploadProps {
  onFileSelect: (file: File, bytes: Uint8Array, metadata: PDFMetadata) => void;
  onClear: () => void;
  currentFile: File | null;
  hasSignatures: boolean;
  className?: string;
}
```

### `PDFPreviewProps`

```typescript
interface PDFPreviewProps {
  pdfBytes: Uint8Array | null;
  className?: string;
}
```

### `SignerFormProps`

```typescript
interface SignerFormProps {
  onSubmit: (data: SignerFormSchemaType) => Promise<void>;
  disabled: boolean;
  isLoading: boolean;
  className?: string;
}
```

### `SignatureLogProps`

```typescript
interface SignatureLogProps {
  signatures: SignatureData[];
  className?: string;
}
```

### `ActionBarProps`

```typescript
interface ActionBarProps {
  deviceId: string;
  hasFile: boolean;
  hasSignatures: boolean;
  onDownload: () => void;
  onClear: () => void;
  isDownloading: boolean;
  className?: string;
}
```

---

## Tipos Auxiliares

### Constantes de Storage

```typescript
const STORAGE_KEYS = {
  DEVICE_ID: 'pdf_signature_device_id',
  CURRENT_LOG: 'pdf_signature_current_log',
} as const;

// Tipo derivado
type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
// = 'pdf_signature_device_id' | 'pdf_signature_current_log'
```

---

## Uso com React

### Estado do Componente Principal

```typescript
function App() {
  // Estados tipados
  const [deviceId, setDeviceId] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [signatureLog, setSignatureLog] = useState<SignatureLog | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  
  // ...
}
```

---

## Tipos de Retorno de Funções

### Serviço de PDF

```typescript
// Carregar PDF
function loadPDF(pdfBytes: Uint8Array): Promise<PDFDocument>

// Validar PDF
function validatePDF(pdfBytes: Uint8Array): Promise<boolean>

// Finalizar PDF
function finalizePDFWithProtocol(
  pdfBytes: Uint8Array,
  signatureLog: SignatureLog
): Promise<Uint8Array>

// Aplicar stamp (retorna bytes sem modificação)
function applySignatureStamp(
  pdfBytes: Uint8Array,
  signature: SignatureData,
  existingSignatures?: number
): Promise<Uint8Array>

// Contar páginas
function getPDFPageCount(pdfBytes: Uint8Array): Promise<number>
```

### Utilitários

```typescript
// Hash
function generateSHA256(data: string | Uint8Array): Promise<string>
function generateSignatureHash(
  pdfBytes: Uint8Array,
  signerName: string,
  signerCPF: string,
  deviceId: string,
  timestamp: string
): Promise<string>
function abbreviateHash(hash: string, length?: number): string

// Device
function generateUUID(): string
function getOrCreateDeviceId(): string
function getDeviceId(): string | null

// CPF
function validateCPF(cpf: string): boolean
function normalizeCPF(cpf: string): string
function formatCPF(cpf: string): string
function normalizeName(name: string): string

// Storage
function saveSignatureLog(log: SignatureLog): void
function loadSignatureLog(): SignatureLog | null
function clearSignatureLog(): void
function createSignatureLog(pdfMetadata: PDFMetadata): SignatureLog
function addSignatureToLog(log: SignatureLog, signature: SignatureData): SignatureLog
function isPDFMatchingLog(log: SignatureLog, metadata: PDFMetadata): boolean
```

---

## Arquivo Completo de Tipos

```typescript
// types/index.ts

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
```
