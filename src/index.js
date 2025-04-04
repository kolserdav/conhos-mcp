/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 */
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import pack from '../package.json' with {type: 'json'}

/**
 * @typedef {(req: Request, res: Response) => Promise<void>} RequestHandler
 */

const server = new McpServer({
  name: pack.name,
  version: pack.version,
});

server.tool('greet', { name: z.string().optional() }, async ({ name }) => ({
  content: [
    {
      type: 'text',
      text: `Hello, ${name}!`,
    },
  ],
}));

// ... set up server resources, tools, and prompts ...

const app = express();

/**
 * @type {{[sessionId: string]: SSEServerTransport}}
 */
const transports = {};

/**
 * @type {RequestHandler}
 */
const sseHandler = async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on('close', () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
};

app.get('/sse', sseHandler);

/**
 * @type {RequestHandler}
 */
const messageHandler = async (req, res) => {
  /** @type {string} */
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';
  if (!sessionId) {
    res.status(400).send('Missing sessionId');
    return;
  }
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
};
app.post('/messages', messageHandler);

app.listen(3018);
