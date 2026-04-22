import { setMaxListeners } from 'node:events';

// MSW and openapi-fetch add multiple abort listeners per request across test suites.
// Raise the default limit to avoid spurious warnings.
setMaxListeners(100);
