export const projectFields = <T extends Record<string, unknown>>(items: T[], fields: Array<keyof T>): Partial<T>[] =>
  items.map(item =>
    fields.reduce<Partial<T>>((projection, field) => {
      if (Object.hasOwn(item, field)) {
        projection[field] = item[field];
      }
      return projection;
    }, {} as Partial<T>),
  );

export const previewEntity = <T extends Record<string, unknown>>(
  entity: T,
  options?: { bodyField?: keyof T; maxLength?: number },
): T & { _preview: string } => {
  const bodyField = options?.bodyField;
  const maxLength = options?.maxLength ?? 140;
  const raw = bodyField ? entity[bodyField] : (entity.body ?? entity.description ?? '');
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
  return {
    ...entity,
    _preview: text.length > maxLength ? `${text.slice(0, maxLength)}…` : text,
  };
};
