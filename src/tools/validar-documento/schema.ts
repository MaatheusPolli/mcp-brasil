import { z } from 'zod';

export const validarDocumentoShape = {
  documento: z
    .string()
    .min(11, 'Documento deve ter ao menos 11 dígitos (CPF) ou 14 (CNPJ)')
    .describe('Número de CPF ou CNPJ, com ou sem máscara (pontos, traço, barra).'),
};

export const validarDocumentoSchema = z.object(validarDocumentoShape);

export type ValidarDocumentoInput = z.infer<typeof validarDocumentoSchema>;
