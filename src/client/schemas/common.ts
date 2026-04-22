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

export type AppId = z.infer<typeof appIdSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
