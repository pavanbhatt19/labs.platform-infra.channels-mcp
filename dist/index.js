#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const ssh_1 = require("./ssh");
const zabbix_1 = require("./zabbix");
const atlassian_1 = require("./atlassian");
const server = new index_js_1.Server({ name: "channels-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
const ssh = new ssh_1.SSHManager();
const zabbix = new zabbix_1.ZabbixClient();
const atlassian = new atlassian_1.AtlassianClient();
// See full source in the repository
console.error("Channels MCP server - see src/index.ts for full implementation");
