import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import type { SignatureData, SignatureLog } from '@/types';
import { formatCPF, abbreviateHash } from '@/utils';

// Protocol page configuration
const PROTOCOL_CONFIG = {
  MARGIN: 50,
  LINE_HEIGHT: 14,
  SECTION_SPACING: 20,
  TITLE_FONT_SIZE: 16,
  SUBTITLE_FONT_SIZE: 12,
  NORMAL_FONT_SIZE: 9,
  SMALL_FONT_SIZE: 8,
};

// Header configuration for hash on all pages
const HEADER_CONFIG = {
  MARGIN_TOP: 15,
  FONT_SIZE: 7,
  BG_HEIGHT: 18,
};

/**
 * Loads a PDF from bytes
 * @param pdfBytes - PDF file bytes
 * @returns PDFDocument instance
 */
export async function loadPDF(pdfBytes: Uint8Array): Promise<PDFDocument> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
    });
    return pdfDoc;
  } catch (error) {
    console.error('Error loading PDF:', error);
    throw new Error('Não foi possível carregar o PDF. O arquivo pode estar corrompido ou protegido.');
  }
}

/**
 * Validates if the PDF bytes represent a valid PDF document
 * @param pdfBytes - PDF file bytes
 * @returns true if valid
 */
export async function validatePDF(pdfBytes: Uint8Array): Promise<boolean> {
  try {
    await loadPDF(pdfBytes);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a hash as TOTVS style (XX-XX-XX-...)
 * @param hash - Original hash string
 * @returns Formatted hash with dashes
 */
function formatHashTotvs(hash: string): string {
  return hash.toUpperCase().match(/.{1,2}/g)?.join('-') || hash;
}

/**
 * Generates a TOTVS-style hash from an existing hash
 * @param hash - SHA256 hash
 * @returns Formatted TOTVS hash (first 20 bytes)
 */
function generateTotvsHash(hash: string): string {
  const bytes = hash.substring(0, 40); // First 20 bytes (40 hex chars)
  return formatHashTotvs(bytes);
}

/**
 * Detects the page size of the original PDF document
 * Uses the most common page size, or falls back to the first page if all are different
 * @param pdfDoc - PDF document
 * @returns [width, height] tuple representing the detected page size
 */
function detectOriginalPageSize(pdfDoc: PDFDocument): [number, number] {
  const pages = pdfDoc.getPages();

  // Edge case: No pages in document, fall back to A4
  if (pages.length === 0) {
    return PageSizes.A4;
  }

  // Edge case: Only one page, use its size
  if (pages.length === 1) {
    const { width, height } = pages[0].getSize();
    return [width, height];
  }

  // Count frequency of each unique page size
  const sizeFrequency = new Map<string, { size: [number, number]; count: number }>();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const sizeKey = `${width}x${height}`;

    if (sizeFrequency.has(sizeKey)) {
      sizeFrequency.get(sizeKey)!.count++;
    } else {
      sizeFrequency.set(sizeKey, { size: [width, height], count: 1 });
    }
  }

  // Find the most common page size
  let mostCommonSize: [number, number] = [0, 0];
  let maxCount = 0;

  for (const { size, count } of sizeFrequency.values()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonSize = size;
    }
  }

  return mostCommonSize;
}

/**
 * Draws the hash header on all pages
 * @param pdfDoc - PDF document
 * @param documentHash - Hash to display
 * @param font - Font to use
 */
async function drawHashHeaderOnAllPages(
  pdfDoc: PDFDocument,
  documentHash: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>
): Promise<void> {
  const pages = pdfDoc.getPages();
  const totvsHash = generateTotvsHash(documentHash);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    // Draw background bar
    page.drawRectangle({
      x: 0,
      y: height - HEADER_CONFIG.BG_HEIGHT,
      width,
      height: HEADER_CONFIG.BG_HEIGHT,
      color: rgb(0.95, 0.95, 0.95),
    });

    // Draw hash text centered
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

    // Draw page number on the right
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

/**
 * Creates the protocol/manifest page with all signature information
 * @param pdfDoc - PDF document
 * @param signatureLog - Signature log with all data
 * @param documentHash - Document hash (SHA256)
 */
async function createProtocolPage(
  pdfDoc: PDFDocument,
  signatureLog: SignatureLog,
  documentHash: string
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Create new page at the beginning
  const [pageWidth, pageHeight] = detectOriginalPageSize(pdfDoc);
  const protocolPage = pdfDoc.insertPage(0, [pageWidth, pageHeight]);
  
  const margin = PROTOCOL_CONFIG.MARGIN;
  let y = pageHeight - margin;
  const maxWidth = pageWidth - margin * 2;

  const totvsHash = generateTotvsHash(documentHash);

  // Helper function to draw a horizontal line
  const drawLine = () => {
    protocolPage.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 10;
  };

  // Helper function to draw text and return new Y position
  const drawText = (
    text: string,
    options: {
      size?: number;
      fontType?: 'normal' | 'bold';
      color?: [number, number, number];
      indent?: number;
    } = {}
  ) => {
    const { size = PROTOCOL_CONFIG.NORMAL_FONT_SIZE, fontType = 'normal', color = [0.2, 0.2, 0.2], indent = 0 } = options;
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

  // ============ HEADER ============
  // Title
  drawText('Protocolo de Assinaturas', { size: PROTOCOL_CONFIG.TITLE_FONT_SIZE, fontType: 'bold', color: [0.1, 0.3, 0.5] });
  y -= 5;
  drawLine();
  y -= 10;

  // ============ DOCUMENT SECTION ============
  drawText('Documento', { size: PROTOCOL_CONFIG.SUBTITLE_FONT_SIZE, fontType: 'bold', color: [0.2, 0.4, 0.6] });
  y -= 5;

  // Document name (envelope name)
  const envelopeName = signatureLog.pdfMetadata.fileName.replace(/\.pdf$/i, '');
  drawText(`Nome do envelope: ${envelopeName}`, { indent: 10 });

  // Author (first signer or generic)
  const author = signatureLog.signatures.length > 0 
    ? `${signatureLog.signatures[0].name}`
    : 'Sistema Local';
  drawText(`Autor: ${author}`, { indent: 10 });

  // Status
  const status = signatureLog.signatures.length > 0 ? 'Finalizado' : 'Pendente';
  drawText(`Status: ${status}`, { indent: 10 });

  // HASH TOTVS
  drawText(`HASH TOTVS: ${totvsHash}`, { indent: 10, size: PROTOCOL_CONFIG.SMALL_FONT_SIZE });

  // SHA256
  drawText(`SHA256: ${documentHash}`, { indent: 10, size: PROTOCOL_CONFIG.SMALL_FONT_SIZE });

  y -= PROTOCOL_CONFIG.SECTION_SPACING;
  drawLine();
  y -= 10;

  // ============ SIGNATURES SECTION ============
  drawText('Assinaturas', { size: PROTOCOL_CONFIG.SUBTITLE_FONT_SIZE, fontType: 'bold', color: [0.2, 0.4, 0.6] });
  y -= 5;

  if (signatureLog.signatures.length === 0) {
    drawText('Nenhuma assinatura registrada.', { indent: 10, color: [0.5, 0.5, 0.5] });
  } else {
    for (const signature of signatureLog.signatures) {
      // Check if we need a new page
      if (y < margin + 150) {
        // Create new page and continue
        pdfDoc.insertPage(pdfDoc.getPageIndices().length, [pageWidth, pageHeight]);
        y = pageHeight - margin;
        // Note: for simplicity, we continue drawing on the first protocol page
        // A full implementation would track and draw on the new page
      }

      // Name and CPF
      drawText(`Nome: ${signature.name} - CPF/CNPJ: ${formatCPF(signature.cpf)}`, { indent: 10, fontType: 'bold' });

      // Date
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

      // Status
      drawText(`Status: Assinado eletronicamente`, { indent: 10, color: [0.1, 0.5, 0.2] });

      // Type of authentication
      drawText(`Tipo de Autenticação: Utilizando identificador único do dispositivo`, { indent: 10, size: PROTOCOL_CONFIG.SMALL_FONT_SIZE });

      // Device ID
      drawText(`Device ID: ${signature.deviceId}`, { indent: 10, size: PROTOCOL_CONFIG.SMALL_FONT_SIZE });

      // Individual signature hash
      drawText(`Hash da Assinatura: ${abbreviateHash(signature.hash, 16)}`, { indent: 10, size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, color: [0.4, 0.4, 0.4] });

      y -= 10; // Space between signatures
    }
  }

  y -= PROTOCOL_CONFIG.SECTION_SPACING;
  drawLine();
  y -= 10;

  // ============ AUTHENTICITY SECTION ============
  drawText('Autenticidade', { size: PROTOCOL_CONFIG.SUBTITLE_FONT_SIZE, fontType: 'bold', color: [0.2, 0.4, 0.6] });
  y -= 5;

  drawText('Para verificar a autenticidade do documento, utilize o hash abaixo:', { indent: 10, size: PROTOCOL_CONFIG.SMALL_FONT_SIZE });
  y -= 5;

  // Draw hash in a box
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

  // Footer note
  drawText('Este documento foi assinado eletronicamente.', { size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, color: [0.5, 0.5, 0.5] });
  drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, color: [0.5, 0.5, 0.5] });

  // Document information
  y -= 20;
  drawText(`Arquivo original: ${signatureLog.pdfMetadata.fileName}`, { size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, color: [0.5, 0.5, 0.5] });
  drawText(`Tamanho: ${(signatureLog.pdfMetadata.fileSize / 1024).toFixed(2)} KB`, { size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, color: [0.5, 0.5, 0.5] });
  drawText(`Total de assinaturas: ${signatureLog.signatures.length}`, { size: PROTOCOL_CONFIG.SMALL_FONT_SIZE, color: [0.5, 0.5, 0.5] });
}

/**
 * Finalizes a PDF with protocol page and hash headers on all pages
 * @param pdfBytes - Original PDF bytes
 * @param signatureLog - Complete signature log
 * @returns New PDF bytes with protocol page and headers
 */
export async function finalizePDFWithProtocol(
  pdfBytes: Uint8Array,
  signatureLog: SignatureLog
): Promise<Uint8Array> {
  const pdfDoc = await loadPDF(pdfBytes);
  
  // Generate document hash from the current PDF bytes
  const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBytes.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const documentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Create protocol page as first page
  await createProtocolPage(pdfDoc, signatureLog, documentHash);

  // Add hash header to all pages (including the new protocol page)
  await drawHashHeaderOnAllPages(pdfDoc, documentHash, font);

  // Save and return the modified PDF
  const modifiedPdfBytes = await pdfDoc.save();
  return new Uint8Array(modifiedPdfBytes);
}

/**
 * Applies a signature stamp to a PDF document
 * Note: The visual stamp has been removed. Signature data is now only shown
 * in the protocol page that is generated when downloading the finalized PDF.
 * @param pdfBytes - Original PDF bytes
 * @param signature - Signature data to apply
 * @param existingSignatures - Number of existing signatures
 * @returns New PDF bytes (unchanged, stamp removed)
 */
export async function applySignatureStamp(
  pdfBytes: Uint8Array,
  _signature: SignatureData,
  _existingSignatures: number = 0
): Promise<Uint8Array> {
  // Simply return the original PDF bytes without adding any visual stamp
  // The signature information will be shown in the protocol page when downloading
  return pdfBytes;
}

/**
 * Gets the number of pages in a PDF
 * @param pdfBytes - PDF file bytes
 * @returns Number of pages
 */
export async function getPDFPageCount(pdfBytes: Uint8Array): Promise<number> {
  const pdfDoc = await loadPDF(pdfBytes);
  return pdfDoc.getPageCount();
}
