import { ClipboardCopy, Check, FileSignature } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SignatureData } from '@/types';
import { formatCPF, abbreviateHash } from '@/utils';
import { cn } from '@/lib/utils';

interface SignatureLogProps {
  signatures: SignatureData[];
  className?: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-6 px-2 text-xs"
      aria-label={label}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 mr-1 text-green-500" />
          Copiado
        </>
      ) : (
        <>
          <ClipboardCopy className="h-3 w-3 mr-1" />
          Copiar
        </>
      )}
    </Button>
  );
}

function SignatureItem({ signature, index }: { signature: SignatureData; index: number }) {
  const formattedDate = new Date(signature.timestamp).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            #{index + 1}
          </Badge>
          <span className="font-medium">{signature.name}</span>
        </div>
        <Badge variant="success" className="text-xs">
          Assinado
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">CPF: </span>
          <span className="font-mono">{formatCPF(signature.cpf)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Data: </span>
          <span>{formattedDate}</span>
        </div>
      </div>

      <div className="text-sm">
        <span className="text-muted-foreground">Device ID: </span>
        <span className="font-mono text-xs">
          {signature.deviceId.substring(0, 18)}...
        </span>
        <CopyButton text={signature.deviceId} label="Copiar Device ID" />
      </div>

      <div className="text-sm flex items-center gap-1">
        <span className="text-muted-foreground">Hash: </span>
        <span className="font-mono text-xs">{abbreviateHash(signature.hash, 12)}</span>
        <CopyButton text={signature.hash} label="Copiar Hash completo" />
      </div>
    </div>
  );
}

export function SignatureLog({ signatures, className }: SignatureLogProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSignature className="h-5 w-5" />
          Registro de Assinaturas
        </CardTitle>
        <CardDescription>
          {signatures.length === 0
            ? 'Nenhuma assinatura registrada'
            : `${signatures.length} assinatura${signatures.length > 1 ? 's' : ''} registrada${signatures.length > 1 ? 's' : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {signatures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileSignature className="h-12 w-12 mb-3 opacity-50" />
            <p>Assine o documento para ver o registro aqui</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {signatures.map((signature, index) => (
              <div key={signature.id}>
                <SignatureItem signature={signature} index={index} />
                {index < signatures.length - 1 && (
                  <Separator className="mt-3" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
