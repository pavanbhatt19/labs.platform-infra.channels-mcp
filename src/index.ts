#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SSHManager } from "./ssh";
import { ZabbixClient } from "./zabbix";
import { AtlassianClient } from "./atlassian";
import { CHANNEL_SERVERS, INVESTIGATION_PATTERNS } from "./constants";

const server = new Server(
  { name: "channels-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const ssh = new SSHManager();
const zabbix = new ZabbixClient();
const atlassian = new AtlassianClient();

// See full source in the repository
console.error("Channels MCP server - see src/index.ts for full implementation");
