/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 */
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

/**
 * @typedef {(req: Request, res: Response) => Promise<void>} RequestHandler
 */

const server = new McpServer({
  name: 'example-server',
  version: '1.0.0',
});

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
  console.log(1, req.headers);
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
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
};
app.post('/messages', messageHandler);

app.listen(3018);
