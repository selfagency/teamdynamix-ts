/**
 * Type definitions for the OpenAPI parser
 */

export interface ParsedEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description?: string;
  operationId?: string;
  parameters: ParsedParameter[];
  requestBody?: ParsedRequestBody;
  responses: Record<string, ParsedResponse>;
  tags?: string[];
  security?: string[];
  rawUrl?: string;
}

export interface ParsedParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  schema: ParsedSchema;
}

export interface ParsedRequestBody {
  required: boolean;
  content: {
    'application/json': {
      schema: ParsedSchema;
    };
  };
}

export interface ParsedResponse {
  description: string;
  content?: {
    'application/json': {
      schema: ParsedSchema;
    };
  };
  headers?: Record<string, ParsedHeader>;
}

export interface ParsedHeader {
  description?: string;
  schema: ParsedSchema;
}

export interface ParsedSchema {
  type?: string;
  $ref?: string;
  items?: ParsedSchema;
  properties?: Record<string, ParsedSchema>;
  required?: string[];
  description?: string;
  enum?: (string | number)[];
  format?: string;
  default?: unknown;
  readOnly?: boolean;
  writeOnly?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ParsedType {
  namespace: string;
  name: string;
  fullName: string;
  description?: string;
  baseType?: string;
  properties: ParsedTypeProperty[];
  isEnum?: boolean;
  enumValues?: Array<{ name: string; value: string | number }>;
  variants?: string[];
  isSearch?: boolean;
  isCreate?: boolean;
  isUpdate?: boolean;
}

export interface ParsedTypeProperty {
  name: string;
  description?: string;
  type: string;
  required: boolean;
  editable: boolean;
  readOnly: boolean;
  format?: string;
  enum?: (string | number)[];
  default?: unknown;
}

export interface CrossReferenceMap {
  types: Map<string, ParsedType>;
  typeFiles: Map<string, string>; // fullName -> filepath
  endpoints: ParsedEndpoint[];
  sections: Map<string, string[]>; // section name -> endpoint descriptions
}

export interface ParserResult {
  endpoints: ParsedEndpoint[];
  types: ParsedType[];
  crossReferences: CrossReferenceMap;
  errors: ParserError[];
  stats: ParserStats;
}

export interface ParserError {
  level: 'error' | 'warning';
  file: string;
  message: string;
}

export interface ParserStats {
  totalFilesProcessed: number;
  totalEndpointsParsed: number;
  totalTypesParsed: number;
  errorCount: number;
  warningCount: number;
  processingTimeMs: number;
}
