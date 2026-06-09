import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

export const server = setupServer();

beforeAll(() => {
  server.listen({
    onUnhandledRequest: req => {
      throw new Error(`Unhandled request: ${req.method} ${req.url}`);
    },
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

export const specPath = `${process.cwd()}/tests/fixtures/openapi-test-spec.json`;
