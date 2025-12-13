# Guia de Implementação

Este documento descreve como implementar o sistema de assinatura eletrônica em outro projeto.

---

## 1. Dependências Necessárias

```bash
# Manipulação de PDF
npm install pdf-lib

# Visualização de PDF (opcional)
npm install pdfjs-dist react-pdf

# Validação de formulários
npm install react-hook-form zod @hookform/resolvers

# UI (opcional - use sua própria UI)
npm install lucide-react
```

### package.json (dependências mínimas)

```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-hook-form": "^7.68.0",
    "zod": "^4.1.13",
    "@hookform/resolvers": "^5.2.2"
  }
}
```

---

## 2. Estrutura de Arquivos Essenciais

Crie a seguinte estrutura mínima:

```
src/
├── services/
│   └── pdf.ts          # Manipulação de PDF
├── utils/
│   ├── cpf.ts          # Validação de CPF
│   ├── hash.ts         # Geração de hash
│   ├── device.ts       # Device ID
│   └── storage.ts      # Persistência
├── types/
│   └── index.ts        # Tipos TypeScript
└── schemas/
    └── signer.ts       # Schema de validação
```

---

## 3. Tipos TypeScript Necessários

```typescript
// types/index.ts

export interface SignatureData {
  id: string;           // UUID único da assinatura
  name: string;         // Nome do assinante (normalizado)
  cpf: string;          // CPF (apenas dígitos)
  deviceId: string;     // ID único do dispositivo
  timestamp: string;    // ISO timestamp
  hash: string;         // Hash SHA-256 da assinatura
}

export interface PDFMetadata {
  fileName: string;     // Nome do arquivo
  fileSize: number;     // Tamanho em bytes
  lastModified: number; // Timestamp de modificação
}

export interface SignatureLog {
  documentId: string;           // UUID do documento
  pdfMetadata: PDFMetadata;     // Metadados do PDF
  signatures: SignatureData[];  // Lista de assinaturas
  createdAt: string;            // Data de criação
  updatedAt: string;            // Última atualização
}
```

---

## 4. Implementação Passo a Passo

### Passo 1: Configurar Device ID

```typescript
// utils/device.ts

export function getOrCreateDeviceId(): string {
  const DEVICE_ID_KEY = 'pdf_signature_device_id';
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}
```

### Passo 2: Implementar Geração de Hash

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
  // Payload combinado: PDF bytes + dados do assinante
  const signerPayload = `|NAME:${signerName}|CPF:${signerCPF}|DEVICE:${deviceId}|TIME:${timestamp}|`;
  const signerBytes = new TextEncoder().encode(signerPayload);
  
  // Combina bytes do PDF com payload
  const combinedBytes = new Uint8Array(pdfBytes.length + signerBytes.length);
  combinedBytes.set(pdfBytes, 0);
  combinedBytes.set(signerBytes, pdfBytes.length);
  
  return generateSHA256(combinedBytes);
}
```

### Passo 3: Serviço de PDF

```typescript
// services/pdf.ts

import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';

// Carregar PDF
export async function loadPDF(pdfBytes: Uint8Array): Promise<PDFDocument> {
  return await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
}

// Validar PDF
export async function validatePDF(pdfBytes: Uint8Array): Promise<boolean> {
  try {
    await loadPDF(pdfBytes);
    return true;
  } catch {
    return false;
  }
}

// Finalizar PDF com protocolo (ver PDF_SERVICE.md para código completo)
export async function finalizePDFWithProtocol(
  pdfBytes: Uint8Array,
  signatureLog: SignatureLog
): Promise<Uint8Array> {
  // ... implementação completa no PDF_SERVICE.md
}
```

### Passo 4: Fluxo de Assinatura

```typescript
// Exemplo de fluxo completo

async function signDocument(
  pdfBytes: Uint8Array,
  name: string,
  cpf: string
): Promise<{ signedPdf: Uint8Array; signature: SignatureData }> {
  // 1. Obter Device ID
  const deviceId = getOrCreateDeviceId();
  
  // 2. Gerar timestamp
  const timestamp = new Date().toISOString();
  
  // 3. Normalizar dados
  const normalizedName = name.trim().toUpperCase();
  const normalizedCPF = cpf.replace(/\D/g, '');
  
  // 4. Gerar hash da assinatura
  const hash = await generateSignatureHash(
    pdfBytes,
    normalizedName,
    normalizedCPF,
    deviceId,
    timestamp
  );
  
  // 5. Criar dados da assinatura
  const signature: SignatureData = {
    id: crypto.randomUUID(),
    name: normalizedName,
    cpf: normalizedCPF,
    deviceId,
    timestamp,
    hash,
  };
  
  // 6. Retornar (PDF não é modificado até finalização)
  return { signedPdf: pdfBytes, signature };
}

// Finalizar e baixar
async function downloadSignedPDF(
  pdfBytes: Uint8Array,
  signatureLog: SignatureLog,
  originalFileName: string
): Promise<void> {
  // 1. Finalizar PDF com protocolo
  const finalizedPdf = await finalizePDFWithProtocol(pdfBytes, signatureLog);
  
  // 2. Criar blob e link
  const blob = new Blob([finalizedPdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  // 3. Download
  const link = document.createElement('a');
  link.download = `${originalFileName.replace('.pdf', '')}_assinado.pdf`;
  link.href = url;
  link.click();
  
  // 4. Cleanup
  URL.revokeObjectURL(url);
}
```

---

## 5. Checklist de Implementação

- [ ] Instalar dependências (pdf-lib obrigatório)
- [ ] Copiar tipos TypeScript
- [ ] Implementar Device ID (localStorage)
- [ ] Implementar geração de hash SHA-256
- [ ] Implementar serviço de PDF
- [ ] Implementar validação de CPF
- [ ] Criar UI de upload de PDF
- [ ] Criar formulário de assinatura
- [ ] Implementar log de assinaturas
- [ ] Implementar download do PDF finalizado

---

## 6. Considerações de Produção

### Segurança
- **IP Real**: Em produção, obtenha o IP real via backend
- **Backend**: Para assinaturas legalmente válidas, considere usar um backend
- **Certificado Digital**: Para ICP-Brasil, integre com certificados A1/A3

### Performance
- **Tamanho do PDF**: Limite o tamanho (ex: 50MB)
- **Web Workers**: Para PDFs grandes, processe em worker
- **Lazy Loading**: Carregue pdf-lib sob demanda

### UX
- **Feedback**: Mostre loading durante processamento
- **Validação**: Valide antes de processar
- **Responsivo**: Adapte para mobile

---

## 7. Exemplo Completo de Uso

```tsx
// App.tsx simplificado

import { useState } from 'react';
import { finalizePDFWithProtocol, validatePDF } from './services/pdf';
import { generateSignatureHash, getOrCreateDeviceId } from './utils';

function App() {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const deviceId = getOrCreateDeviceId();

  const handleFileUpload = async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (await validatePDF(bytes)) {
      setPdfBytes(bytes);
    }
  };

  const handleSign = async (name: string, cpf: string) => {
    if (!pdfBytes) return;
    
    const timestamp = new Date().toISOString();
    const hash = await generateSignatureHash(
      pdfBytes, name.toUpperCase(), cpf.replace(/\D/g, ''), deviceId, timestamp
    );
    
    const signature: SignatureData = {
      id: crypto.randomUUID(),
      name: name.toUpperCase(),
      cpf: cpf.replace(/\D/g, ''),
      deviceId,
      timestamp,
      hash,
    };
    
    setSignatures([...signatures, signature]);
  };

  const handleDownload = async () => {
    if (!pdfBytes || signatures.length === 0) return;
    
    const log: SignatureLog = {
      documentId: crypto.randomUUID(),
      pdfMetadata: { fileName: 'documento.pdf', fileSize: pdfBytes.length, lastModified: Date.now() },
      signatures,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const finalizedPdf = await finalizePDFWithProtocol(pdfBytes, log);
    // ... download logic
  };

  return (
    // ... UI
  );
}
```
