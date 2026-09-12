export class DocumentoInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentoInvalidoError';
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
