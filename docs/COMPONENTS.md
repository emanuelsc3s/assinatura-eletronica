# Componentes React - Documentação

Este documento descreve todos os componentes React do projeto.

---

## Visão Geral

```
src/components/
├── PDFUpload.tsx       # Upload de PDF (drag & drop)
├── PDFPreview.tsx      # Visualização do PDF
├── SignerForm.tsx      # Formulário de assinatura
├── SignatureLog.tsx    # Log de assinaturas
├── ActionBar.tsx       # Barra de ações
├── index.ts            # Re-exports
└── ui/                 # Componentes UI base (shadcn/ui)
```

---

## 1. PDFUpload

Componente para upload de arquivos PDF com suporte a drag & drop.

### Props

```typescript
interface PDFUploadProps {
  onFileSelect: (file: File, bytes: Uint8Array, metadata: PDFMetadata) => void;
  onClear: () => void;
  currentFile: File | null;
  hasSignatures: boolean;
  className?: string;
}
```

### Funcionalidades

- **Drag & Drop**: Arraste arquivos diretamente
- **Click to Select**: Clique para abrir seletor
- **Validação**: Verifica tipo (PDF) e tamanho (max 50MB)
- **Magic Bytes**: Valida header `%PDF-`
- **Estado Visual**: Mostra arquivo selecionado

### Uso

```tsx
<PDFUpload
  onFileSelect={(file, bytes, metadata) => {
    console.log('Arquivo:', file.name);
    console.log('Tamanho:', bytes.length);
    console.log('Metadados:', metadata);
  }}
  onClear={() => console.log('Limpar')}
  currentFile={currentFile}
  hasSignatures={signatures.length > 0}
/>
```

### Validações Realizadas

1. **Tipo MIME**: `application/pdf`
2. **Tamanho máximo**: 50MB
3. **Magic bytes**: Primeiros 5 bytes = `%PDF-`

### Código Relevante

```typescript
const processFile = async (file: File) => {
  // Validar tipo
  if (file.type !== 'application/pdf') {
    setError('Por favor, selecione um arquivo PDF.');
    return;
  }

  // Validar tamanho
  if (file.size > 50 * 1024 * 1024) {
    setError('O arquivo PDF deve ter no máximo 50MB.');
    return;
  }

  // Ler bytes
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Validar magic bytes
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header !== '%PDF-') {
    setError('O arquivo não parece ser um PDF válido.');
    return;
  }

  // Criar metadados
  const metadata: PDFMetadata = {
    fileName: file.name,
    fileSize: file.size,
    lastModified: file.lastModified,
  };

  onFileSelect(file, bytes, metadata);
};
```

---

## 2. PDFPreview

Componente para visualização do PDF carregado.

### Props

```typescript
interface PDFPreviewProps {
  pdfBytes: Uint8Array | null;
  className?: string;
}
```

### Funcionalidades

- **Renderização**: Usa react-pdf + pdfjs-dist
- **Navegação**: Próxima/Anterior página
- **Zoom**: 50% a 200%
- **Loading State**: Indicador durante carregamento

### Uso

```tsx
<PDFPreview pdfBytes={pdfBytes} />
```

### Configuração do PDF.js

```typescript
import { Document, Page, pdfjs } from 'react-pdf';

// Configurar worker
pdfjs.GlobalWorkerOptions.workerSrc = 
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

### Estados

```typescript
const [numPages, setNumPages] = useState<number>(0);
const [pageNumber, setPageNumber] = useState<number>(1);
const [scale, setScale] = useState<number>(1);  // 1 = 100%
const [loading, setLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
```

### Controles de Zoom

```typescript
const zoomIn = () => {
  setScale((prev) => Math.min(prev + 0.25, 2));  // Max 200%
};

const zoomOut = () => {
  setScale((prev) => Math.max(prev - 0.25, 0.5));  // Min 50%
};
```

---

## 3. SignerForm

Formulário para coleta de dados do assinante.

### Props

```typescript
interface SignerFormProps {
  onSubmit: (data: SignerFormSchemaType) => Promise<void>;
  disabled: boolean;
  isLoading: boolean;
  className?: string;
}
```

### Funcionalidades

- **Validação Zod**: Nome (5-100 chars) e CPF
- **Máscara CPF**: Formatação automática XXX.XXX.XXX-XX
- **React Hook Form**: Gerenciamento de estado
- **Loading State**: Bloqueia durante processamento

### Uso

```tsx
<SignerForm
  onSubmit={async (data) => {
    await signDocument(data.name, data.cpf);
  }}
  disabled={!hasFile}
  isLoading={isProcessing}
/>
```

### Validação (Zod Schema)

```typescript
const signerFormSchema = z.object({
  name: z
    .string()
    .min(5, 'Nome deve ter no mínimo 5 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .refine((val) => val.trim().length >= 5, 'Nome deve ter no mínimo 5 caracteres'),
  cpf: z
    .string()
    .min(11, 'CPF deve ter 11 dígitos')
    .refine((val) => validateCPF(val), 'CPF inválido'),
});
```

### Máscara de CPF

```typescript
const formatCPFInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};
```

---

## 4. SignatureLog

Exibe lista de assinaturas aplicadas ao documento.

### Props

```typescript
interface SignatureLogProps {
  signatures: SignatureData[];
  className?: string;
}
```

### Funcionalidades

- **Lista de assinaturas**: Exibe todas as assinaturas
- **Detalhes**: Nome, CPF, Data, Device ID, Hash
- **Copiar**: Botão para copiar Device ID e Hash
- **Scroll**: Lista com scroll quando muitas assinaturas

### Uso

```tsx
<SignatureLog signatures={signatureLog?.signatures || []} />
```

### Subcomponentes

#### `CopyButton`

```typescript
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? <Check /> : <ClipboardCopy />}
      {copied ? 'Copiado' : 'Copiar'}
    </Button>
  );
}
```

#### `SignatureItem`

Renderiza cada assinatura individual com:
- Badge com número (#1, #2, ...)
- Nome e status "Assinado"
- CPF formatado
- Data/hora formatada pt-BR
- Device ID (truncado + botão copiar)
- Hash (abreviado + botão copiar)

---

## 5. ActionBar

Barra de ações com Device ID e botões principais.

### Props

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

### Funcionalidades

- **Device ID**: Exibe e permite copiar
- **Info Box**: Explica modo MVP
- **Download**: Baixar PDF assinado
- **Limpar**: Remover documento e log
- **Warning**: Alerta sobre persistência em memória

### Uso

```tsx
<ActionBar
  deviceId={deviceId}
  hasFile={!!currentFile}
  hasSignatures={signatures.length > 0}
  onDownload={handleDownload}
  onClear={handleClear}
  isDownloading={isDownloading}
/>
```

### Botões

| Botão | Ação | Condição |
|-------|------|----------|
| Baixar PDF | Download | hasFile && hasSignatures |
| Limpar Tudo | Reset | hasFile |

---

## 6. Componentes UI (shadcn/ui)

Componentes base importados/customizados do shadcn/ui:

```
ui/
├── badge.tsx      # Labels/tags
├── button.tsx     # Botões
├── card.tsx       # Cards com header/content
├── input.tsx      # Inputs de texto
├── label.tsx      # Labels de formulário
├── separator.tsx  # Divisores
├── toast.tsx      # Toasts de notificação
├── toaster.tsx    # Container de toasts
└── use-toast.ts   # Hook de toast
```

### Toast Hook

```typescript
import { useToast } from '@/components/ui/use-toast';

function Component() {
  const { toast } = useToast();

  const showSuccess = () => {
    toast({
      variant: 'success',
      title: 'Sucesso!',
      description: 'Operação concluída.',
    });
  };

  const showError = () => {
    toast({
      variant: 'destructive',
      title: 'Erro',
      description: 'Algo deu errado.',
    });
  };
}
```

---

## Estrutura do App.tsx

O componente principal orquestra todos os componentes:

```tsx
function App() {
  const { toast } = useToast();
  const [deviceId, setDeviceId] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [signatureLog, setSignatureLog] = useState<SignatureLog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header>...</header>

      {/* Main Content - 2 colunas */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Coluna Esquerda */}
          <div className="space-y-6">
            <PDFUpload
              onFileSelect={handleFileSelect}
              onClear={handleClear}
              currentFile={currentFile}
              hasSignatures={...}
            />
            <PDFPreview pdfBytes={pdfBytes} />
          </div>

          {/* Coluna Direita */}
          <div className="space-y-6">
            <ActionBar
              deviceId={deviceId}
              hasFile={!!currentFile}
              hasSignatures={...}
              onDownload={handleDownload}
              onClear={handleClear}
              isDownloading={isDownloading}
            />
            <SignerForm
              onSubmit={handleSign}
              disabled={!currentFile}
              isLoading={isLoading}
            />
            <SignatureLog signatures={signatureLog?.signatures || []} />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer>...</footer>

      <Toaster />
    </div>
  );
}
```

---

## Fluxo de Dados

```
┌─────────────────┐
│   PDFUpload     │ ──onFileSelect──> setPdfBytes, setCurrentFile
└─────────────────┘                   setSignatureLog

┌─────────────────┐
│   PDFPreview    │ <──pdfBytes────── state
└─────────────────┘

┌─────────────────┐
│   SignerForm    │ ──onSubmit──────> handleSign
└─────────────────┘                   ↓
                                      generateSignatureHash
                                      ↓
                                      addSignatureToLog
                                      ↓
                                      saveSignatureLog

┌─────────────────┐
│  SignatureLog   │ <──signatures──── signatureLog.signatures
└─────────────────┘

┌─────────────────┐
│    ActionBar    │ ──onDownload───> handleDownload
└─────────────────┘                   ↓
                                      finalizePDFWithProtocol
                                      ↓
                                      download blob
```

---

## Re-exports (index.ts)

```typescript
// src/components/index.ts
export { PDFUpload } from './PDFUpload';
export { PDFPreview } from './PDFPreview';
export { SignerForm } from './SignerForm';
export { SignatureLog } from './SignatureLog';
export { ActionBar } from './ActionBar';
```

**Uso:**
```typescript
import { PDFUpload, PDFPreview, SignerForm, SignatureLog, ActionBar } from '@/components';
```
