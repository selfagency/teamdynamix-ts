import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);

export const tenantSchema = nonEmptyString;

export const tokenSchema = nonEmptyString;

export const appIdSchema = z.union([z.string().trim().min(1), z.number().int().nonnegative()]);

export const confirmTrueSchema = z.literal(true);

export const paginationSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(500).optional(),
});

export const searchTextSchema = z.string().trim().min(1).max(500);

export const customAttributeIdSchema = z.union([z.string().trim().min(1), z.number().int().nonnegative()]);

export const customAttributeValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.date(),
  z.array(z.any()),
  z.record(z.string(), z.any()),
]);

export const customAttributeSchema = z.object({
  ID: customAttributeIdSchema,
  Name: nonEmptyString.optional(),
  Value: customAttributeValueSchema.optional(),
});

// Consumers can reconstruct via z.infer<typeof schemaName> as needed.
