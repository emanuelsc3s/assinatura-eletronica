import { useState, useEffect, useCallback } from 'react';
import { FileSignature } from 'lucide-react';
import { PDFUpload, PDFPreview, SignerForm, SignatureLog, ActionBar } from '@/components';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { applySignatureStamp, validatePDF, finalizePDFWithProtocol } from '@/services/pdf';
import {
  getOrCreateDeviceId,
  normalizeName,
  normalizeCPF,
  generateSignatureHash,
  saveSignatureLog,
  loadSignatureLog,
  clearSignatureLog,
  createSignatureLog,
  addSignatureToLog,
  isPDFMatchingLog,
} from '@/utils';
import type { PDFMetadata, SignatureData, SignatureLog as SignatureLogType } from '@/types';
import type { SignerFormSchemaType } from '@/schemas';

function App() {
  const { toast } = useToast();
  const [deviceId, setDeviceId] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [signatureLog, setSignatureLog] = useState<SignatureLogType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Initialize device ID and load saved log on mount
  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);

    const savedLog = loadSignatureLog();
    if (savedLog) {
      setSignatureLog(savedLog);
      toast({
        title: 'Log de assinaturas recuperado',
        description: `Encontrado log com ${savedLog.signatures.length} assinatura(s). Faça upload do PDF "${savedLog.pdfMetadata.fileName}" para continuar assinando.`,
      });
    }
  }, [toast]);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: File, bytes: Uint8Array, metadata: PDFMetadata) => {
      try {
        // Validate PDF
        const isValid = await validatePDF(bytes);
        if (!isValid) {
          toast({
            variant: 'destructive',
            title: 'PDF inválido',
            description: 'O arquivo selecionado não é um PDF válido ou está corrompido.',
          });
          return;
        }

        setCurrentFile(file);
        setPdfBytes(bytes);

        // Check if we have a saved log that matches this file
        const savedLog = loadSignatureLog();
        if (savedLog && isPDFMatchingLog(savedLog, metadata)) {
          // File matches saved log - user is continuing with same document
          setSignatureLog(savedLog);
          toast({
            title: 'Documento reconhecido',
            description: `Este documento já possui ${savedLog.signatures.length} assinatura(s) registrada(s). Você pode adicionar mais assinaturas.`,
          });
        } else {
          // New document - create new log
          const newLog = createSignatureLog(metadata);
          setSignatureLog(newLog);
          saveSignatureLog(newLog);

          if (savedLog) {
            toast({
              title: 'Novo documento',
              description: 'O log anterior foi substituído pelo novo documento.',
            });
          }
        }
      } catch (error) {
        console.error('Error processing file:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao processar arquivo',
          description: 'Ocorreu um erro ao processar o arquivo PDF.',
        });
      }
    },
    [toast]
  );

  // Handle signature submission
  const handleSign = useCallback(
    async (data: SignerFormSchemaType) => {
      if (!pdfBytes || !signatureLog) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Carregue um PDF antes de assinar.',
        });
        return;
      }

      setIsLoading(true);

      try {
        const timestamp = new Date().toISOString();
        const normalizedName = normalizeName(data.name);
        const normalizedCPF = normalizeCPF(data.cpf);

        // Generate hash using current PDF bytes
        const hash = await generateSignatureHash(
          pdfBytes,
          normalizedName,
          normalizedCPF,
          deviceId,
          timestamp
        );

        // Create signature data
        const signature: SignatureData = {
          id: crypto.randomUUID(),
          name: normalizedName,
          cpf: normalizedCPF,
          deviceId,
          timestamp,
          hash,
        };

        // Apply stamp to PDF
        const newPdfBytes = await applySignatureStamp(
          pdfBytes,
          signature,
          signatureLog.signatures.length
        );

        // Update state
        setPdfBytes(newPdfBytes);
        const updatedLog = addSignatureToLog(signatureLog, signature);
        setSignatureLog(updatedLog);
        saveSignatureLog(updatedLog);

        toast({
          variant: 'success',
          title: 'Assinatura aplicada!',
          description: `Documento assinado por ${normalizedName}. Hash: ${hash.substring(0, 16)}...`,
        });

        console.log('Assinatura completa:', {
          ...signature,
          hashCompleto: hash,
        });
      } catch (error) {
        console.error('Error signing PDF:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao assinar',
          description: 'Ocorreu um erro ao aplicar a assinatura no PDF.',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pdfBytes, signatureLog, deviceId, toast]
  );

  // Handle PDF download
  const handleDownload = useCallback(async () => {
    if (!pdfBytes || !currentFile || !signatureLog) return;

    setIsDownloading(true);

    try {
      // Finalize PDF with protocol page and hash headers on all pages
      const finalizedPdfBytes = await finalizePDFWithProtocol(pdfBytes, signatureLog);
      
      const blob = new Blob([finalizedPdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Generate filename with suffix
      const originalName = currentFile.name.replace(/\.pdf$/i, '');
      const signatureCount = signatureLog?.signatures.length || 0;
      link.download = `${originalName}_assinado_${signatureCount}x.pdf`;
      link.href = url;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download iniciado',
        description: 'O PDF assinado com protocolo está sendo baixado.',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar',
        description: 'Ocorreu um erro ao baixar o PDF assinado.',
      });
    } finally {
      setIsDownloading(false);
    }
  }, [pdfBytes, currentFile, signatureLog, toast]);

  // Handle clear/reset
  const handleClear = useCallback(() => {
    setCurrentFile(null);
    setPdfBytes(null);
    setSignatureLog(null);
    clearSignatureLog();

    toast({
      title: 'Documento removido',
      description: 'O documento e o log de assinaturas foram limpos.',
    });
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <FileSignature className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Assinatura Eletrônica de PDF
              </h1>
              <p className="text-sm text-muted-foreground">
                MVP - Aplicação 100% Frontend
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Upload & Preview */}
          <div className="space-y-6">
            <PDFUpload
              onFileSelect={handleFileSelect}
              onClear={handleClear}
              currentFile={currentFile}
              hasSignatures={signatureLog?.signatures.length ? signatureLog.signatures.length > 0 : false}
            />
            <PDFPreview pdfBytes={pdfBytes} />
          </div>

          {/* Right Column - Form & Log */}
          <div className="space-y-6">
            <ActionBar
              deviceId={deviceId}
              hasFile={!!currentFile}
              hasSignatures={signatureLog?.signatures.length ? signatureLog.signatures.length > 0 : false}
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
      <footer className="border-t bg-card mt-8">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            MVP - Assinatura Eletrônica de PDF | Sem backend | Device ID substitui IP real
          </p>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}

export default App;
