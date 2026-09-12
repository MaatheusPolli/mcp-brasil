import { validarDocumentoHandler } from './handler.js';
import { validarDocumentoShape } from './schema.js';

export const validarDocumentoTool = {
  name: 'validar_documento',
  description:
    'Valida um CPF ou CNPJ brasileiro (dígitos verificadores) e retorna o documento formatado. ' +
    'Detecta automaticamente o tipo pelo número de dígitos. Funciona totalmente offline, sem consultar APIs externas. ' +
    'Use quando precisar checar se um número de documento informado pelo usuário é válido antes de prosseguir com um cadastro.',
  inputSchema: validarDocumentoShape,
  handler: validarDocumentoHandler,
};
