import { z } from 'zod';
import { validateCPF } from '@/utils';

export const signerFormSchema = z.object({
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

export type SignerFormSchemaType = z.infer<typeof signerFormSchema>;
