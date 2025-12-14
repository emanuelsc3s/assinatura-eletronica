# Código de Referência Rápida

Este documento contém snippets de código prontos para copiar e implementar.

---

## 1. Tipos TypeScript

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
```

---

## 2. Validação de CPF

```typescript
// utils/cpf.ts

export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
}

export function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toUpperCase();
}
```

---

## 3. Geração de Hash

```typescript
// utils/hash.ts

export async function generateSHA256(data: string | Uint8Array): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
  } else {
    buffer = data.buffer as ArrayBuffer;
  }
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateSignatureHash(
  pdfBytes: Uint8Array,
  signerName: string,
  signerCPF: string,
  deviceId: string,
  timestamp: string
): Promise<string> {
  const payload = `|NAME:${signerName}|CPF:${signerCPF}|DEVICE:${deviceId}|TIME:${timestamp}|`;
  const payloadBytes = new TextEncoder().encode(payload);
  
  const combined = new Uint8Array(pdfBytes.length + payloadBytes.length);
  combined.set(pdfBytes, 0);
  combined.set(payloadBytes, pdfBytes.length);
  
  return generateSHA256(combined);
}

export function abbreviateHash(hash: string, length: number = 8): string {
  if (hash.length <= length * 2 + 3) return hash;
  return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
}
```

---

## 4. Device ID

```typescript
// utils/device.ts

export function getOrCreateDeviceId(): string {
  const KEY = 'pdf_signature_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
```

---

## 5. Storage

```typescript
// utils/storage.ts

import type { SignatureLog, SignatureData, PDFMetadata } from './types';

const LOG_KEY = 'pdf_signature_current_log';

export function saveSignatureLog(log: SignatureLog): void {
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

export function loadSignatureLog(): SignatureLog | null {
  const data = localStorage.getItem(LOG_KEY);
  return data ? JSON.parse(data) : null;
}

export function clearSignatureLog(): void {
  localStorage.removeItem(LOG_KEY);
}

export function createSignatureLog(metadata: PDFMetadata): SignatureLog {
  const now = new Date().toISOString();
  return {
    documentId: crypto.randomUUID(),
    pdfMetadata: metadata,
    signatures: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function addSignatureToLog(log: SignatureLog, sig: SignatureData): SignatureLog {
  return {
    ...log,
    signatures: [...log.signatures, sig],
    updatedAt: new Date().toISOString(),
  };
}
```

---

## 6. Serviço PDF (pdf-lib)

```typescript
// services/pdf.ts

import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import type { SignatureLog } from './types';

export async function loadPDF(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

export async function validatePDF(bytes: Uint8Array): Promise<boolean> {
  try {
    await loadPDF(bytes);
    return true;
  } catch {
    return false;
  }
}

function formatTotvsHash(hash: string): string {
  const bytes = hash.substring(0, 40).toUpperCase();
  return bytes.match(/.{1,2}/g)?.join('-') || bytes;
}

export async function finalizePDFWithProtocol(
  pdfBytes: Uint8Array,
  log: SignatureLog
): Promise<Uint8Array> {
  const pdfDoc = await loadPDF(pdfBytes);
  
  // Gerar hash do documento
  const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBytes.buffer);
  const docHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Criar página de protocolo
  const [w, h] = PageSizes.A4;
  const page = pdfDoc.insertPage(0, [w, h]);
  
  let y = h - 50;
  const totvsHash = formatTotvsHash(docHash);
  
  // Título
  page.drawText('Protocolo de Assinaturas', {
    x: 50, y, size: 16, font: boldFont, color: rgb(0.1, 0.3, 0.5)
  });
  y -= 30;
  
  // Documento
  page.drawText('Documento', { x: 50, y, size: 12, font: boldFont });
  y -= 18;
  page.drawText(`Nome: ${log.pdfMetadata.fileName}`, { x: 60, y, size: 9, font });
  y -= 14;
  page.drawText(`HASH SICFAR: ${totvsHash}`, { x: 60, y, size: 8, font });
  y -= 14;
  page.drawText(`SHA256: ${docHash}`, { x: 60, y, size: 8, font });
  y -= 25;
  
  // Assinaturas
  page.drawText('Assinaturas', { x: 50, y, size: 12, font: boldFont });
  y -= 18;
  
  for (const sig of log.signatures) {
    page.drawText(`${sig.name} - CPF: ${sig.cpf}`, { x: 60, y, size: 9, font: boldFont });
    y -= 14;
    page.drawText(`Data: ${new Date(sig.timestamp).toLocaleString('pt-BR')}`, { x: 60, y, size: 9, font });
    y -= 14;
    page.drawText(`Device: ${sig.deviceId}`, { x: 60, y, size: 8, font });
    y -= 14;
    page.drawText(`Hash: ${sig.hash.substring(0, 16)}...`, { x: 60, y, size: 8, font });
    y -= 20;
  }
  
  // Headers em todas as páginas
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const { width, height } = p.getSize();
    
    p.drawRectangle({
      x: 0, y: height - 18, width, height: 18, color: rgb(0.95, 0.95, 0.95)
    });
    
    const headerText = `HASH: ${totvsHash}`;
    const textWidth = font.widthOfTextAtSize(headerText, 7);
    p.drawText(headerText, {
      x: (width - textWidth) / 2, y: height - 15, size: 7, font, color: rgb(0.3, 0.3, 0.3)
    });
    
    const pageText = `Página ${i + 1} de ${pages.length}`;
    const pageWidth = font.widthOfTextAtSize(pageText, 7);
    p.drawText(pageText, {
      x: width - pageWidth - 10, y: height - 15, size: 7, font, color: rgb(0.5, 0.5, 0.5)
    });
  }
  
  return new Uint8Array(await pdfDoc.save());
}
```

---

## 7. Fluxo de Assinatura Completo

```typescript
// Exemplo de uso completo

import { validatePDF, finalizePDFWithProtocol } from './services/pdf';
import { generateSignatureHash, normalizeName, normalizeCPF, validateCPF } from './utils';
import { getOrCreateDeviceId, createSignatureLog, addSignatureToLog, saveSignatureLog } from './utils';
import type { SignatureData, SignatureLog, PDFMetadata } from './types';

async function handleFileUpload(file: File): Promise<{ bytes: Uint8Array; log: SignatureLog } | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  
  if (!await validatePDF(bytes)) {
    alert('PDF inválido');
    return null;
  }
  
  const metadata: PDFMetadata = {
    fileName: file.name,
    fileSize: file.size,
    lastModified: file.lastModified,
  };
  
  const log = createSignatureLog(metadata);
  saveSignatureLog(log);
  
  return { bytes, log };
}

async function handleSign(
  pdfBytes: Uint8Array,
  log: SignatureLog,
  name: string,
  cpf: string
): Promise<SignatureLog> {
  if (!validateCPF(cpf)) {
    throw new Error('CPF inválido');
  }
  
  const deviceId = getOrCreateDeviceId();
  const timestamp = new Date().toISOString();
  const normalizedName = normalizeName(name);
  const normalizedCPF = normalizeCPF(cpf);
  
  const hash = await generateSignatureHash(
    pdfBytes, normalizedName, normalizedCPF, deviceId, timestamp
  );
  
  const signature: SignatureData = {
    id: crypto.randomUUID(),
    name: normalizedName,
    cpf: normalizedCPF,
    deviceId,
    timestamp,
    hash,
  };
  
  const updatedLog = addSignatureToLog(log, signature);
  saveSignatureLog(updatedLog);
  
  return updatedLog;
}

async function handleDownload(pdfBytes: Uint8Array, log: SignatureLog): Promise<void> {
  const finalizedPdf = await finalizePDFWithProtocol(pdfBytes, log);
  
  const blob = new Blob([finalizedPdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `${log.pdfMetadata.fileName.replace('.pdf', '')}_assinado.pdf`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
}
```

---

## 8. Schema Zod

```typescript
// schemas/signer.ts

import { z } from 'zod';
import { validateCPF } from './utils/cpf';

export const signerFormSchema = z.object({
  name: z.string()
    .min(5, 'Nome deve ter no mínimo 5 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  cpf: z.string()
    .min(11, 'CPF deve ter 11 dígitos')
    .refine(validateCPF, 'CPF inválido'),
});

export type SignerFormSchemaType = z.infer<typeof signerFormSchema>;
```

---

## 9. Máscara de CPF (Input)

```typescript
const formatCPFInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// Uso no input
<input
  onChange={(e) => {
    e.target.value = formatCPFInput(e.target.value);
  }}
  maxLength={14}
/>
```

---

## 10. Dependências Mínimas

```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1"
  }
}
```

Para validação de formulários:
```json
{
  "dependencies": {
    "zod": "^4.1.13",
    "react-hook-form": "^7.68.0",
    "@hookform/resolvers": "^5.2.2"
  }
}
```

Para visualização de PDF:
```json
{
  "dependencies": {
    "pdfjs-dist": "^5.4.449",
    "react-pdf": "^10.2.0"
  }
}
```
