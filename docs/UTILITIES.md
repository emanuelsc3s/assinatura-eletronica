# Utilitários - Documentação

Este documento detalha todas as funções utilitárias disponíveis no projeto.

---

## Organização

Os utilitários estão organizados em módulos:

```
src/utils/
├── index.ts      # Re-exports
├── cpf.ts        # Validação e formatação de CPF
├── hash.ts       # Geração de hash SHA-256
├── device.ts     # Gerenciamento de Device ID
└── storage.ts    # Persistência em LocalStorage
```

---

## 1. CPF (cpf.ts)

### `validateCPF(cpf: string): boolean`

Valida um CPF brasileiro usando o algoritmo oficial.

```typescript
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');

  // CPF deve ter 11 dígitos
  if (cleanCPF.length !== 11) {
    return false;
  }

  // Verifica padrões inválidos (todos dígitos iguais)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }

  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleanCPF.charAt(9))) {
    return false;
  }

  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleanCPF.charAt(10))) {
    return false;
  }

  return true;
}
```

**Exemplos:**
```typescript
validateCPF('123.456.789-09');  // true (CPF válido)
validateCPF('12345678909');     // true (CPF válido sem formatação)
validateCPF('111.111.111-11');  // false (todos iguais)
validateCPF('123.456.789-00');  // false (dígitos inválidos)
```

---

### `normalizeCPF(cpf: string): string`

Remove formatação e retorna apenas dígitos.

```typescript
export function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}
```

**Exemplos:**
```typescript
normalizeCPF('123.456.789-09');  // '12345678909'
normalizeCPF('12345678909');     // '12345678909'
```

---

### `formatCPF(cpf: string): string`

Formata CPF no padrão brasileiro (XXX.XXX.XXX-XX).

```typescript
export function formatCPF(cpf: string): string {
  const clean = normalizeCPF(cpf);
  if (clean.length !== 11) return cpf;
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
```

**Exemplos:**
```typescript
formatCPF('12345678909');       // '123.456.789-09'
formatCPF('123.456.789-09');    // '123.456.789-09'
```

---

### `normalizeName(name: string): string`

Normaliza nome: trim, colapsa espaços múltiplos, uppercase.

```typescript
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toUpperCase();
}
```

**Exemplos:**
```typescript
normalizeName('  João   da   Silva  ');  // 'JOÃO DA SILVA'
normalizeName('maria santos');            // 'MARIA SANTOS'
```

---

## 2. Hash (hash.ts)

### `generateSHA256(data: string | Uint8Array): Promise<string>`

Gera hash SHA-256 de qualquer dado.

```typescript
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
```

**Exemplos:**
```typescript
await generateSHA256('Hello World');
// 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'

const bytes = new Uint8Array([1, 2, 3]);
await generateSHA256(bytes);
// '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81'
```

---

### `generateSignatureHash(...): Promise<string>`

Gera hash de assinatura combinando PDF e dados do assinante.

```typescript
export async function generateSignatureHash(
  pdfBytes: Uint8Array,
  signerName: string,
  signerCPF: string,
  deviceId: string,
  timestamp: string
): Promise<string> {
  const signerPayload = `|NAME:${signerName}|CPF:${signerCPF}|DEVICE:${deviceId}|TIME:${timestamp}|`;
  const signerBytes = new TextEncoder().encode(signerPayload);
  
  const combinedBytes = new Uint8Array(pdfBytes.length + signerBytes.length);
  combinedBytes.set(pdfBytes, 0);
  combinedBytes.set(signerBytes, pdfBytes.length);
  
  return generateSHA256(combinedBytes);
}
```

**Exemplo:**
```typescript
const hash = await generateSignatureHash(
  pdfBytes,
  'JOÃO DA SILVA',
  '12345678909',
  'device-uuid',
  '2024-01-15T10:30:00.000Z'
);
// '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'
```

---

### `abbreviateHash(hash: string, length?: number): string`

Abrevia hash para exibição.

```typescript
export function abbreviateHash(hash: string, length: number = 8): string {
  if (hash.length <= length * 2 + 3) return hash;
  return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
}
```

**Exemplos:**
```typescript
abbreviateHash('a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e');
// 'a591a6d4...ad9f146e'

abbreviateHash('a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e', 12);
// 'a591a6d40bf4...57b277d9ad9f146e'
```

---

## 3. Device (device.ts)

### `generateUUID(): string`

Gera um UUID v4 usando a API nativa.

```typescript
export function generateUUID(): string {
  return crypto.randomUUID();
}
```

**Exemplo:**
```typescript
generateUUID();  // '550e8400-e29b-41d4-a716-446655440000'
```

---

### `getOrCreateDeviceId(): string`

Obtém Device ID do localStorage ou cria um novo.

```typescript
export function getOrCreateDeviceId(): string {
  const DEVICE_ID_KEY = 'pdf_signature_device_id';
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}
```

**Comportamento:**
- Primeira chamada: cria e salva novo UUID
- Chamadas subsequentes: retorna UUID existente
- Persistente entre sessões

---

### `getDeviceId(): string | null`

Obtém Device ID sem criar um novo.

```typescript
export function getDeviceId(): string | null {
  return localStorage.getItem('pdf_signature_device_id');
}
```

---

## 4. Storage (storage.ts)

### Constantes

```typescript
const STORAGE_KEYS = {
  DEVICE_ID: 'pdf_signature_device_id',
  CURRENT_LOG: 'pdf_signature_current_log',
} as const;
```

---

### `saveSignatureLog(log: SignatureLog): void`

Salva log de assinaturas no localStorage.

```typescript
export function saveSignatureLog(log: SignatureLog): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_LOG, JSON.stringify(log));
  } catch (error) {
    console.error('Error saving signature log to localStorage:', error);
    throw new Error('Não foi possível salvar o log. O armazenamento pode estar cheio.');
  }
}
```

---

### `loadSignatureLog(): SignatureLog | null`

Carrega log de assinaturas do localStorage.

```typescript
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
```

---

### `clearSignatureLog(): void`

Remove log de assinaturas do localStorage.

```typescript
export function clearSignatureLog(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_LOG);
}
```

---

### `createSignatureLog(pdfMetadata: PDFMetadata): SignatureLog`

Cria novo log de assinaturas.

```typescript
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
```

**Exemplo:**
```typescript
const log = createSignatureLog({
  fileName: 'contrato.pdf',
  fileSize: 1048576,
  lastModified: Date.now(),
});
// { documentId: 'uuid...', pdfMetadata: {...}, signatures: [], ... }
```

---

### `addSignatureToLog(log, signature): SignatureLog`

Adiciona assinatura ao log (imutável).

```typescript
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
```

**Exemplo:**
```typescript
const newLog = addSignatureToLog(existingLog, newSignature);
// Retorna novo objeto, não modifica o original
```

---

### `isPDFMatchingLog(log, metadata): boolean`

Verifica se metadados do PDF correspondem ao log.

```typescript
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
```

**Uso:**
- Detectar se usuário está carregando o mesmo documento
- Permitir continuar assinando documento anterior

---

## Resumo de Exports

```typescript
// src/utils/index.ts
export * from './cpf';
export * from './hash';
export * from './device';
export * from './storage';
```

**Funções disponíveis via import:**

```typescript
import {
  // CPF
  validateCPF,
  normalizeCPF,
  formatCPF,
  normalizeName,
  
  // Hash
  generateSHA256,
  generateSignatureHash,
  abbreviateHash,
  
  // Device
  generateUUID,
  getOrCreateDeviceId,
  getDeviceId,
  
  // Storage
  saveSignatureLog,
  loadSignatureLog,
  clearSignatureLog,
  createSignatureLog,
  addSignatureToLog,
  isPDFMatchingLog,
} from '@/utils';
```
