export interface ToolTextContent {
  type: 'text';
  text: string;
}

export interface ToolResult {
  content: ToolTextContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export function ok(text: string, structuredContent?: Record<string, unknown>): ToolResult {
  const result: ToolResult = { content: [{ type: 'text', text }] };
  if (structuredContent !== undefined) {
    result.structuredContent = structuredContent;
  }
  return result;
}

export function fail(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}
