import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerMaxmemTools } from "./tools";

export const createMcpServer = () => {
  const server = new McpServer({
    name: "maxmem",
    version: "0.1.12",
  });

  registerMaxmemTools({ server });

  return server;
};

export const runMcpServer = async () => {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
};
