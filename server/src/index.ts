// Local development server. On Vercel, api/index.ts exports the same handler.
import { createServer } from 'node:http';
import { handler } from './handler';

export const server = createServer(handler);
if (process.argv[1]?.endsWith('index.ts')) server.listen(Number(process.env.PORT || 8787), () => console.log('Idealizator server on', process.env.PORT || 8787));
