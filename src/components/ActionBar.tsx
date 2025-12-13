import { useState, useCallback } from 'react';
import { ClipboardCopy, Check, Download, Trash2, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  deviceId: string;
  hasFile: boolean;
  hasSignatures: boolean;
  onDownload: () => void;
  onClear: () => void;
  isDownloading: boolean;
  className?: string;
}

export function ActionBar({
  deviceId,
  hasFile,
  hasSignatures,
  onDownload,
  onClear,
  isDownloading,
  className,
}: ActionBarProps) {
  const [copiedDeviceId, setCopiedDeviceId] = useState(false);

  const copyDeviceId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(deviceId);
      setCopiedDeviceId(true);
      setTimeout(() => setCopiedDeviceId(false), 2000);
    } catch (err) {
      console.error('Failed to copy device ID:', err);
    }
  }, [deviceId]);

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          {/* Device ID Display */}
          <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="outline" className="shrink-0">
                Device ID
              </Badge>
              <span className="font-mono text-xs truncate" title={deviceId}>
                {deviceId}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyDeviceId}
              className="shrink-0"
            >
              {copiedDeviceId ? (
                <>
                  <Check className="h-4 w-4 mr-1 text-green-500" />
                  Copiado
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-4 w-4 mr-1" />
                  Copiar
                </>
              )}
            </Button>
          </div>

          {/* Info Alert */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-blue-700">
              <span className="font-medium">MVP - Modo Offline:</span> O Device ID substitui o IP 
              real neste MVP. Em produção, o IP será obtido via backend.
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={onDownload}
              disabled={!hasFile || !hasSignatures || isDownloading}
              className="flex-1 min-w-[140px]"
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? 'Baixando...' : 'Baixar PDF Assinado'}
            </Button>
            <Button
              variant="outline"
              onClick={onClear}
              disabled={!hasFile}
              className="flex-1 min-w-[140px]"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Tudo
            </Button>
          </div>

          {/* Warning about persistence */}
          {hasSignatures && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-amber-700">
                <span className="font-medium">Atenção:</span> O PDF assinado é mantido apenas em memória. 
                Ao recarregar a página, faça o download antes ou precisará fazer upload novamente.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
