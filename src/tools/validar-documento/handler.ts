import {
  detectarTipoDocumento,
  formatarCnpj,
  formatarCpf,
  validarCnpj,
  validarCpf,
} from '../../domain/documentos.js';
import { fail, ok, type ToolResult } from '../types.js';
import type { ValidarDocumentoInput } from './schema.js';

export function validarDocumentoHandler({ documento }: ValidarDocumentoInput): ToolResult {
  const tipo = detectarTipoDocumento(documento);

  if (!tipo) {
    return fail(
      `Documento "${documento}" não tem tamanho válido para CPF (11 dígitos) nem CNPJ (14 dígitos).`,
    );
  }

  const valido = tipo === 'CPF' ? validarCpf(documento) : validarCnpj(documento);
  const formatado = tipo === 'CPF' ? formatarCpf(documento) : formatarCnpj(documento);

  const texto = valido
    ? `${tipo} ${formatado} é válido.`
    : `${tipo} ${formatado} é inválido (dígito verificador não confere).`;

  return ok(texto, { tipo, documento: formatado, valido });
}
