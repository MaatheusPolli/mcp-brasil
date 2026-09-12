function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

function digitosIguais(valor: string): boolean {
  return valor.split('').every((d) => d === valor[0]);
}

function calcularDigitoCpf(base: string, pesoInicial: number): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += Number(base[i]) * (pesoInicial - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

export function validarCpf(valor: string): boolean {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11 || digitosIguais(cpf)) return false;

  const digito1 = calcularDigitoCpf(cpf.slice(0, 9), 10);
  if (digito1 !== Number(cpf[9])) return false;

  const digito2 = calcularDigitoCpf(cpf.slice(0, 10), 11);
  return digito2 === Number(cpf[10]);
}

function calcularDigitoCnpj(base: string): number {
  const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2].slice(-base.length);
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += Number(base[i]) * pesos[i]!;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCnpj(valor: string): boolean {
  const cnpj = apenasDigitos(valor);
  if (cnpj.length !== 14 || digitosIguais(cnpj)) return false;

  const digito1 = calcularDigitoCnpj(cnpj.slice(0, 12));
  if (digito1 !== Number(cnpj[12])) return false;

  const digito2 = calcularDigitoCnpj(cnpj.slice(0, 13));
  return digito2 === Number(cnpj[13]);
}

export function formatarCpf(valor: string): string {
  const cpf = apenasDigitos(valor);
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatarCnpj(valor: string): string {
  const cnpj = apenasDigitos(valor);
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export type TipoDocumento = 'CPF' | 'CNPJ';

export function detectarTipoDocumento(valor: string): TipoDocumento | null {
  const digitos = apenasDigitos(valor);
  if (digitos.length === 11) return 'CPF';
  if (digitos.length === 14) return 'CNPJ';
  return null;
}
