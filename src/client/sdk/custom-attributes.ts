import { z } from 'zod';
import type { TeamDynamixFetchClient } from '../client.js';
import { customAttributeIdSchema, customAttributeValueSchema, customAttributeSchema } from '../schemas/index.js';
import { executeSdkRoute } from './request.js';
import type { TicketMutations, AssetMutations } from './types.js';

const nonEmptyIdSchema = z.union([z.string().trim().min(1), z.number().int().nonnegative()]);

/**
 * Creates a custom attribute value object for API submission
 */
export const buildCustomAttributeValue = (
  attributeNameOrId: string | number,
  value: unknown,
): { ID: number | string; Value: unknown } => {
  // Parse the attribute identifier
  const parsedId = customAttributeIdSchema.parse(attributeNameOrId);

  // Parse the value
  const parsedValue = customAttributeValueSchema.parse(value);

  return {
    ID: parsedId,
    Value: parsedValue,
  };
};

/**
 * Creates a custom attribute from a full attribute object
 */
export const buildCustomAttributeFromObject = (
  attribute: { ID?: string | number; Name?: string } & Record<string, unknown>,
  value: unknown,
): { ID: number | string; Value: unknown } => {
  // Use the ID if provided, otherwise use the Name
  const identifier = attribute.ID || attribute.Name;

  if (!identifier) {
    throw new Error('Custom attribute must have either ID or Name');
  }

  return buildCustomAttributeValue(identifier, value);
};

/**
 * Gets a custom attribute value from a response object
 */
export const getCustomAttributeValue = (
  object: Record<string, unknown>,
  attributeNameOrId: string | number,
): unknown => {
  // Parse the attribute identifier
  const parsedId = customAttributeIdSchema.parse(attributeNameOrId);

  // If the object has custom attributes, search through them
  if (object.Attributes && Array.isArray(object.Attributes)) {
    const attribute = object.Attributes.find((attr: any) => {
      return attr.ID === parsedId || attr.Name === parsedId;
    });

    return attribute?.Value;
  }

  return undefined;
};

/**
 * Custom attribute mutation helpers for tickets
 */
export const createTicketCustomAttributes = (client: TeamDynamixFetchClient) => ({
  /**
   * Sets custom attributes on a ticket
   */
  async setTicketCustomAttributes(input: {
    appId: string | number;
    ticketId: string | number;
    attributes: Array<{ ID: string | number; Value: unknown }>;
  }): Promise<unknown> {
    const parsed = z.object({
      appId: z.union([z.string().trim().min(1), z.number().int().nonnegative()]),
      ticketId: nonEmptyIdSchema,
      attributes: z.array(customAttributeSchema),
    }).parse(input);

    return executeSdkRoute(
      client,
      {
        domain: 'tickets',
        methodName: 'updateTicket',
        operationId: 'postAppIdTicketsId',
        path: '/api/{appId}/tickets/{id}',
        httpMethod: 'POST',
        tags: ['Tickets'],
        mutating: true,
        destructive: false,
      },
      {
        params: { path: { appId: parsed.appId, id: parsed.ticketId } },
        body: { Attributes: parsed.attributes },
      },
    );
  },

  /**
   * Gets all custom attributes for a ticket
   */
  async getTicketCustomAttributes(input: {
    appId: string | number;
    ticketId: string | number;
  }): Promise<unknown> {
    const parsed = z.object({
      appId: z.union([z.string().trim().min(1), z.number().int().nonnegative()]),
      ticketId: nonEmptyIdSchema,
    }).parse(input);

    const ticket = await executeSdkRoute(
      client,
      {
        domain: 'tickets',
        methodName: 'getTicket',
        operationId: 'getAppIdTicketsId',
        path: '/api/{appId}/tickets/{id}',
        httpMethod: 'GET',
        tags: ['Tickets'],
        mutating: false,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, id: parsed.ticketId } } },
    );

    return (ticket as any)?.Attributes || [];
  },
});

/**
 * Custom attribute mutation helpers for assets
 */
export const createAssetCustomAttributes = (client: TeamDynamixFetchClient) => ({
  /**
   * Sets custom attributes on an asset
   */
  async setAssetCustomAttributes(input: {
    appId: string | number;
    assetId: string | number;
    attributes: Array<{ ID: string | number; Value: unknown }>;
  }): Promise<unknown> {
    const parsed = z.object({
      appId: z.union([z.string().trim().min(1), z.number().int().nonnegative()]),
      assetId: nonEmptyIdSchema,
      attributes: z.array(customAttributeSchema),
    }).parse(input);

    return executeSdkRoute(
      client,
      {
        domain: 'assets',
        methodName: 'updateAsset',
        operationId: 'patchAppIdAssetsId',
        path: '/api/{appId}/assets/{id}',
        httpMethod: 'PATCH',
        tags: ['Assets'],
        mutating: true,
        destructive: false,
      },
      {
        params: { path: { appId: parsed.appId, id: parsed.assetId } },
        body: { Attributes: parsed.attributes },
      },
    );
  },

  /**
   * Gets all custom attributes for an asset
   */
  async getAssetCustomAttributes(input: {
    appId: string | number;
    assetId: string | number;
  }): Promise<unknown> {
    const parsed = z.object({
      appId: z.union([z.string().trim().min(1), z.number().int().nonnegative()]),
      assetId: nonEmptyIdSchema,
    }).parse(input);

    const asset = await executeSdkRoute(
      client,
      {
        domain: 'assets',
        methodName: 'getAsset',
        operationId: 'getAppIdAssetsId',
        path: '/api/{appId}/assets/{id}',
        httpMethod: 'GET',
        tags: ['Assets'],
        mutating: false,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, id: parsed.assetId } } },
    );

    return (asset as any)?.Attributes || [];
  },
});

/**
 * Helper to get custom attribute definitions from the API
 */
export const createCustomAttributesRegistry = (client: TeamDynamixFetchClient) => ({
  /**
   * Gets custom attribute definitions for tickets
   */
  async getTicketCustomAttributes(input: {
    appId: string | number;
  }): Promise<unknown> {
    const parsed = z.object({
      appId: z.union([z.string().trim().min(1), z.number().int().nonnegative()]),
    }).parse(input);

    return executeSdkRoute(
      client,
      {
        domain: 'tickets',
        methodName: 'getCustomAttributes',
        operationId: 'getAppIdTicketsCustomAttributes',
        path: '/api/{appId}/tickets/customattributes',
        httpMethod: 'GET',
        tags: ['TicketCustomAttributes'],
        mutating: false,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId } } },
    );
  },

  /**
   * Gets custom attribute definitions for assets
   */
  async getAssetCustomAttributes(input: {
    appId: string | number;
  }): Promise<unknown> {
    const parsed = z.object({
      appId: z.union([z.string().trim().min(1), z.number().int().nonnegative()]),
    }).parse(input);

    return executeSdkRoute(
      client,
      {
        domain: 'assets',
        methodName: 'getCustomAttributes',
        operationId: 'getAppIdAssetsCustomAttributes',
        path: '/api/{appId}/assets/customattributes',
        httpMethod: 'GET',
        tags: ['AssetCustomAttributes'],
        mutating: false,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId } } },
    );
  },
});
