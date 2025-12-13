import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PenTool, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signerFormSchema, type SignerFormSchemaType } from '@/schemas';
import { cn } from '@/lib/utils';

interface SignerFormProps {
  onSubmit: (data: SignerFormSchemaType) => Promise<void>;
  disabled: boolean;
  isLoading: boolean;
  className?: string;
}

export function SignerForm({ onSubmit, disabled, isLoading, className }: SignerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignerFormSchemaType>({
    resolver: zodResolver(signerFormSchema),
    defaultValues: {
      name: '',
      cpf: '',
    },
  });

  const handleFormSubmit = async (data: SignerFormSchemaType) => {
    await onSubmit(data);
    reset();
  };

  // Format CPF as user types
  const formatCPFInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PenTool className="h-5 w-5" />
          Dados do Assinante
        </CardTitle>
        <CardDescription>
          Preencha os dados para assinar o documento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              placeholder="Digite o nome completo"
              {...register('name')}
              disabled={disabled || isLoading}
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              {...register('cpf', {
                onChange: (e) => {
                  e.target.value = formatCPFInput(e.target.value);
                },
              })}
              disabled={disabled || isLoading}
              className={cn(errors.cpf && 'border-destructive')}
              maxLength={14}
            />
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assinando...
              </>
            ) : (
              <>
                <PenTool className="mr-2 h-4 w-4" />
                Assinar Documento
              </>
            )}
          </Button>

          {disabled && !isLoading && (
            <p className="text-sm text-muted-foreground text-center">
              Carregue um PDF para habilitar a assinatura
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
