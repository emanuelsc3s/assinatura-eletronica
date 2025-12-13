# Serviço de PDF - Documentação Completa

Este documento detalha como o PDF é manipulado, assinado e finalizado no projeto.

---

## Bibliotecas Utilizadas

| Biblioteca | Função |
|------------|--------|
| `pdf-lib` | Criar, modificar e gerar PDFs |
| `pdfjs-dist` | Renderizar PDFs para visualização |
| `react-pdf` | Componente React para exibição |

---

## Funções Principais

### 1. `loadPDF(pdfBytes: Uint8Array): Promise<PDFDocument>`

Carrega um PDF a partir de bytes.

```typescript
import { PDFDocument } from 'pdf-lib';

export async function loadPDF(pdfBytes: Uint8Array): Promise<PDFDocument> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,  // Ignora PDFs protegidos
    });
    return pdfDoc;
  } catch (error) {
    console.error('Error loading PDF:', error);
    throw new Error('Não foi possível carregar o PDF. O arquivo pode estar corrompido ou protegido.');
  }
}
```

**Parâmetros:**
- `pdfBytes`: Uint8Array contendo os bytes do arquivo PDF

**Retorno:**
- Instância de `PDFDocument` da pdf-lib

---

### 2. `validatePDF(pdfBytes: Uint8Array): Promise<boolean>`

Valida se os bytes representam um PDF válido.

```typescript
export async function validatePDF(pdfBytes: Uint8Array): Promise<boolean> {
  try {
    await loadPDF(pdfBytes);
    return true;
  } catch {
    return false;
  }
}
```

**Uso:**
```typescript
const isValid = await validatePDF(pdfBytes);
if (!isValid) {
  alert('PDF inválido');
}
```

---

### 3. `finalizePDFWithProtocol(pdfBytes, signatureLog): Promise<Uint8Array>`

**Esta é a função principal que cria o PDF assinado final.**

#### O que ela faz:
1. Carrega o PDF original
2. Gera hash SHA-256 do documento
3. Cria página de protocolo no início
4. Adiciona headers com hash em todas as páginas
5. Retorna o PDF modificado

```typescript
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import type { SignatureLog } from '@/types';

export async function finalizePDFWithProtocol(
  pdfBytes: Uint8Array,
  signatureLog: SignatureLog
): Promise<Uint8Array> {
  // 1. Carregar PDF
  const pdfDoc = await loadPDF(pdfBytes);
  
  // 2. Gerar hash do documento
  const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBytes.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const documentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 3. Embed fonte
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 4. Criar página de protocolo
  await createProtocolPage(pdfDoc, signatureLog, documentHash);

  // 5. Adicionar headers em todas as páginas
  await drawHashHeaderOnAllPages(pdfDoc, documentHash, font);

  // 6. Salvar e retornar
  const modifiedPdfBytes = await pdfDoc.save();
  return new Uint8Array(modifiedPdfBytes);
}
```

---

## Configurações de Layout

### Configuração da Página de Protocolo

```typescript
const PROTOCOL_CONFIG = {
  MARGIN: 50,              // Margem das bordas
  LINE_HEIGHT: 14,         // Altura entre linhas
  SECTION_SPACING: 20,     // Espaço entre seções
  TITLE_FONT_SIZE: 16,     // Título principal
  SUBTITLE_FONT_SIZE: 12,  // Subtítulos de seção
  NORMAL_FONT_SIZE: 9,     // Texto normal
  SMALL_FONT_SIZE: 8,      // Texto pequeno (hashes)
};
```

### Configuração do Header

```typescript
const HEADER_CONFIG = {
  MARGIN_TOP: 15,    // Distância do topo
  FONT_SIZE: 7,      // Tamanho da fonte
  BG_HEIGHT: 18,     // Altura da barra de fundo
};
```

---

## Estrutura da Página de Protocolo

A página de protocolo contém as seguintes seções:

### 1. Cabeçalho
- Título: "Protocolo de Assinaturas"
- Linha divisória

### 2. Seção do Documento
- **Nome do envelope**: Nome do arquivo sem extensão
- **Autor**: Nome do primeiro assinante ou "Sistema Local"
- **Status**: "Finalizado" se há assinaturas, "Pendente" caso contrário
- **HASH TOTVS**: Hash formatado estilo TOTVS (XX-XX-XX-...)
- **SHA256**: Hash completo

### 3. Seção de Assinaturas
Para cada assinatura:
- **Nome e CPF**: `Nome: FULANO - CPF/CNPJ: 000.000.000-00`
- **Data**: Data/hora formatada em pt-BR
- **Status**: "Assinado eletronicamente" (verde)
- **Tipo de Autenticação**: Identificador único do dispositivo
- **Device ID**: UUID do dispositivo
- **Hash da Assinatura**: Hash SHA-256 abreviado

### 4. Seção de Autenticidade
- Texto explicativo
- Box com HASH TOTVS para verificação
- Rodapé com informações do documento

---

## Formato do Hash TOTVS

O hash é formatado no estilo TOTVS para facilitar leitura e verificação:

```typescript
function formatHashTotvs(hash: string): string {
  // Converte "abc123def456..." para "AB-C1-23-DE-F4-56-..."
  return hash.toUpperCase().match(/.{1,2}/g)?.join('-') || hash;
}

function generateTotvsHash(hash: string): string {
  // Usa apenas os primeiros 20 bytes (40 caracteres hex)
  const bytes = hash.substring(0, 40);
  return formatHashTotvs(bytes);
}
```

**Exemplo:**
- Input: `a1b2c3d4e5f6...`
- Output: `A1-B2-C3-D4-E5-F6-...`

---

## Headers em Todas as Páginas

Cada página do PDF recebe um header com:

1. **Barra de fundo**: Retângulo cinza claro no topo
2. **Hash centralizado**: `HASH: XX-XX-XX-...`
3. **Número da página**: `Página X de Y` (alinhado à direita)

```typescript
async function drawHashHeaderOnAllPages(
  pdfDoc: PDFDocument,
  documentHash: string,
  font: PDFFont
): Promise<void> {
  const pages = pdfDoc.getPages();
  const totvsHash = generateTotvsHash(documentHash);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    // Barra de fundo
    page.drawRectangle({
      x: 0,
      y: height - HEADER_CONFIG.BG_HEIGHT,
      width,
      height: HEADER_CONFIG.BG_HEIGHT,
      color: rgb(0.95, 0.95, 0.95),
    });

    // Hash centralizado
    const hashText = `HASH: ${totvsHash}`;
    const textWidth = font.widthOfTextAtSize(hashText, HEADER_CONFIG.FONT_SIZE);
    const textX = (width - textWidth) / 2;

    page.drawText(hashText, {
      x: textX,
      y: height - HEADER_CONFIG.MARGIN_TOP,
      size: HEADER_CONFIG.FONT_SIZE,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Número da página
    const pageText = `Página ${i + 1} de ${pages.length}`;
    const pageTextWidth = font.widthOfTextAtSize(pageText, HEADER_CONFIG.FONT_SIZE);
    page.drawText(pageText, {
      x: width - pageTextWidth - 10,
      y: height - HEADER_CONFIG.MARGIN_TOP,
      size: HEADER_CONFIG.FONT_SIZE,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
}
```

---

## Criação da Página de Protocolo

### Código Completo

```typescript
async function createProtocolPage(
  pdfDoc: PDFDocument,
  signatureLog: SignatureLog,
  documentHash: string
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Criar página A4 no início
  const [pageWidth, pageHeight] = PageSizes.A4;
  const protocolPage = pdfDoc.insertPage(0, [pageWidth, pageHeight]);
  
  const margin = PROTOCOL_CONFIG.MARGIN;
  let y = pageHeight - margin;
  const maxWidth = pageWidth - margin * 2;

  const totvsHash = generateTotvsHash(documentHash);

  // Helper: desenhar linha horizontal
  const drawLine = () => {
    protocolPage.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 10;
  };

  // Helper: desenhar texto
  const drawText = (
    text: string,
    options: {
      size?: number;
      fontType?: 'normal' | 'bold';
      color?: [number, number, number];
      indent?: number;
    } = {}
  ) => {
    const { 
      size = PROTOCOL_CONFIG.NORMAL_FONT_SIZE, 
      fontType = 'normal', 
      color = [0.2, 0.2, 0.2], 
      indent = 0 
    } = options;
    
    const usedFont = fontType === 'bold' ? boldFont : font;
    
    protocolPage.drawText(text, {
      x: margin + indent,
      y,
      size,
      font: usedFont,
      color: rgb(color[0], color[1], color[2]),
    });
    y -= PROTOCOL_CONFIG.LINE_HEIGHT;
  };

  // ========== CABEÇALHO ==========
  drawText('Protocolo de Assinaturas', { 
    size: PROTOCOL_CONFIG.TITLE_FONT_SIZE, 
    fontType: 'bold', 
    color: [0.1, 0.3, 0.5] 
  });
  y -= 5;
  drawLine();
  y -= 10;

  // ========== SEÇÃO DOCUMENTO ==========
  drawText('Documento', { 
    size: PROTOCOL_CONFIG.SUBTITLE_FONT_SIZE, 
    fontType: 'bold', 
    color: [0.2, 0.4, 0.6] 
  });
  y -= 5;

  const envelopeName = signatureLog.pdfMetadata.fileName.replace(/\.pdf$/i, '');
  drawText(`Nome do envelope: ${envelopeName}`, { indent: 10 });

  const author = signatureLog.signatures.length > 0 
    ? signatureLog.signatures[0].name
    : 'Sistema Local';
  drawText(`Autor: ${author}`, { indent: 10 });

  const status = signatureLog.signatures.length > 0 ? 'Finalizado' : 'Pendente';
  drawText(`Status: ${status}`, { indent: 10 });

  drawText(`HASH TOTVS: ${totvsHash}`, { 
    indent: 10, 
    size: PROTOCOL_CONFIG.SMALL_FONT_SIZE 
  });
  drawText(`SHA256: ${documentHash}`, { 
    indent: 10, 
    size: PROTOCOL_CONFIG.SMALL_FONT_SIZE 
  });

  y -= PROTOCOL_CONFIG.SECTION_SPACING;
  drawLine();
  y -= 10;

  // ========== SEÇÃO ASSINATURAS ==========
  drawText('Assinaturas', { 
    size: PROTOCOL_CONFIG.SUBTITLE_FONT_SIZE, 
    fontType: 'bold', 
    color: [0.2, 0.4, 0.6] 
  });
  y -= 5;

  if (signatureLog.signatures.length === 0) {
    drawText('Nenhuma assinatura registrada.', { 
      indent: 10, 
      color: [0.5, 0.5, 0.5] 
    });
  } else {
    for (const signature of signatureLog.signatures) {
      // Nome e CPF
      drawText(
        `Nome: ${signature.name} - CPF/CNPJ: ${formatCPF(signature.cpf)}`, 
        { indent: 10, fontType: 'bold' }
      );

      // Data formatada
      const signDate = new Date(signature.timestamp);
      const formattedDate = signDate.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      drawText(`Data: ${formattedDate}`, { indent: 10 });

      // Status (verde)
      drawText('Status: Assinado eletronicamente', { 
        indent: 10, 
        color: [0.1, 0.5, 0.2] 
      });

      // Tipo de autenticação
      drawText('Tipo de Autenticação: Utilizando identificador único do dispositivo', { 
        indent: 10, 
        size: PROTOCOL_CONFIG.SMALL_FONT_SIZE 
      });

      // Device ID
      drawText(`Device ID: ${signature.deviceId}`, { 
        indent: 10, 
        size: PROTOCOL_CONFIG.SMALL_FONT_SIZE 
      });

      // Hash da assinatura
      drawText(`Hash da Assinatura: ${abbreviateHash(signature.hash, 16)}`, { 
        indent: 10, 
        size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, 
        color: [0.4, 0.4, 0.4] 
      });

      y -= 10;
    }
  }

  y -= PROTOCOL_CONFIG.SECTION_SPACING;
  drawLine();
  y -= 10;

  // ========== SEÇÃO AUTENTICIDADE ==========
  drawText('Autenticidade', { 
    size: PROTOCOL_CONFIG.SUBTITLE_FONT_SIZE, 
    fontType: 'bold', 
    color: [0.2, 0.4, 0.6] 
  });
  y -= 5;

  drawText('Para verificar a autenticidade do documento, utilize o hash abaixo:', { 
    indent: 10, 
    size: PROTOCOL_CONFIG.SMALL_FONT_SIZE 
  });
  y -= 5;

  // Box com hash
  const boxY = y - 25;
  protocolPage.drawRectangle({
    x: margin + 10,
    y: boxY,
    width: maxWidth - 20,
    height: 30,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 1,
    color: rgb(0.97, 0.97, 0.97),
  });

  protocolPage.drawText(`HASH TOTVS: ${totvsHash}`, {
    x: margin + 20,
    y: boxY + 10,
    size: PROTOCOL_CONFIG.SMALL_FONT_SIZE,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  y = boxY - 20;

  // Rodapé
  drawText('Este documento foi assinado eletronicamente.', { 
    size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, 
    color: [0.5, 0.5, 0.5] 
  });
  drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { 
    size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, 
    color: [0.5, 0.5, 0.5] 
  });

  y -= 20;
  drawText(`Arquivo original: ${signatureLog.pdfMetadata.fileName}`, { 
    size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, 
    color: [0.5, 0.5, 0.5] 
  });
  drawText(`Tamanho: ${(signatureLog.pdfMetadata.fileSize / 1024).toFixed(2)} KB`, { 
    size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, 
    color: [0.5, 0.5, 0.5] 
  });
  drawText(`Total de assinaturas: ${signatureLog.signatures.length}`, { 
    size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, 
    color: [0.5, 0.5, 0.5] 
  });
}
```

---

## Função de Stamp (Desativada)

A função `applySignatureStamp` está presente mas desativada. As informações de assinatura aparecem apenas na página de protocolo:

```typescript
export async function applySignatureStamp(
  pdfBytes: Uint8Array,
  _signature: SignatureData,
  _existingSignatures: number = 0
): Promise<Uint8Array> {
  // Retorna PDF sem modificação - informações vão na página de protocolo
  return pdfBytes;
}
```

---

## Uso Completo

```typescript
// 1. Upload e validação
const file = /* File do input */;
const arrayBuffer = await file.arrayBuffer();
const pdfBytes = new Uint8Array(arrayBuffer);

const isValid = await validatePDF(pdfBytes);
if (!isValid) {
  throw new Error('PDF inválido');
}

// 2. Criar log de assinaturas
const signatureLog: SignatureLog = {
  documentId: crypto.randomUUID(),
  pdfMetadata: {
    fileName: file.name,
    fileSize: file.size,
    lastModified: file.lastModified,
  },
  signatures: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 3. Adicionar assinaturas (loop para múltiplas)
const signature: SignatureData = {
  id: crypto.randomUUID(),
  name: 'NOME DO ASSINANTE',
  cpf: '00000000000',
  deviceId: 'uuid-do-dispositivo',
  timestamp: new Date().toISOString(),
  hash: 'sha256-hash...',
};
signatureLog.signatures.push(signature);

// 4. Finalizar PDF
const finalizedPdf = await finalizePDFWithProtocol(pdfBytes, signatureLog);

// 5. Download
const blob = new Blob([finalizedPdf], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.download = 'documento_assinado.pdf';
link.href = url;
link.click();
URL.revokeObjectURL(url);
```
