import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PDFMetadata } from '@/types';

interface PDFUploadProps {
  onFileSelect: (file: File, bytes: Uint8Array, metadata: PDFMetadata) => void;
  onClear: () => void;
  currentFile: File | null;
  hasSignatures: boolean;
  className?: string;
}

export function PDFUpload({
  onFileSelect,
  onClear,
  currentFile,
  hasSignatures,
  className,
}: PDFUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.type !== 'application/pdf') {
        setError('Por favor, selecione um arquivo PDF.');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setError('O arquivo PDF deve ter no máximo 50MB.');
        return;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // Basic PDF validation (check magic bytes)
        const header = new TextDecoder().decode(bytes.slice(0, 5));
        if (header !== '%PDF-') {
          setError('O arquivo não parece ser um PDF válido.');
          return;
        }

        const metadata: PDFMetadata = {
          fileName: file.name,
          fileSize: file.size,
          lastModified: file.lastModified,
        };

        onFileSelect(file, bytes, metadata);
      } catch (err) {
        console.error('Error processing file:', err);
        setError('Erro ao processar o arquivo PDF.');
      }
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Documento PDF
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!currentFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'relative border-2 border-dashed rounded-lg p-8 transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50',
              'cursor-pointer'
            )}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Upload PDF"
            />
            <div className="flex flex-col items-center gap-3 text-center">
              <Upload
                className={cn(
                  'h-10 w-10',
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <div>
                <p className="font-medium">
                  {isDragging
                    ? 'Solte o arquivo aqui'
                    : 'Arraste um PDF ou clique para selecionar'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Máximo de 50MB
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate" title={currentFile.name}>
                    {currentFile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(currentFile.size)}
                  </p>
                  {hasSignatures && (
                    <Badge variant="success" className="mt-2">
                      PDF com assinaturas
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                className="flex-shrink-0"
                aria-label="Remover arquivo"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 mt-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
