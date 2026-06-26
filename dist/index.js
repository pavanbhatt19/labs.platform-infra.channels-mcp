#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const ssh_1 = require("./ssh");
const zabbix_1 = require("./zabbix");
const atlassian_1 = require("./atlassian");
const constants_1 = require("./constants");
const server = new index_js_1.Server({ name: "channels-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
const ssh = new ssh_1.SSHManager();
const zabbix = new zabbix_1.ZabbixClient();
const atlassian = new atlassian_1.AtlassianClient();
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "investigate_server",
            description: "Connect to a channel server, check all status JSONs (chirp, chmedic, chcheck, large_file_alert), read latest chan.logs, and return categorized findings. SAFE: read-only operations only.",
            inputSchema: {
                type: "object",
                properties: {
                    hostname: {
                        type: "string",
                        description: "Channel server hostname (e.g., cha3.abn.green.sophos)",
                    },
                },
                required: ["hostname"],
            },
        },
        {
            name: "check_channel_log",
            description: "Read the latest entries from a specific channel's chan.log on a server. SAFE: read-only.",
            inputSchema: {
                type: "object",
                properties: {
                    hostname: {
                        type: "string",
                        description: "Channel server hostname",
                    },
                    channel_path: {
                        type: "string",
                        description: "Full path to the channel directory (e.g., /home/channel/channels/as/2.7.2.376379/b2/data)",
                    },
                    lines: {
                        type: "number",
                        description: "Number of lines to read (default: 50)",
                    },
                },
                required: ["hostname", "channel_path"],
            },
        },
        {
            name: "check_antispam_publishing",
            description: "Check if there is an active incident for antispam-publishing.labs.sophos. This is the most common root cause for multiple channel alerts.",
            inputSchema: {
                type: "object",
                properties: {},
            },
        },
        {
            name: "get_server_problems",
            description: "Get all active Zabbix problems/alerts for a channel server.",
            inputSchema: {
                type: "object",
                properties: {
                    hostname: {
                        type: "string",
                        description: "Channel server hostname",
                    },
                },
                required: ["hostname"],
            },
        },
        {
            name: "acknowledge_alerts",
            description: "Acknowledge one or more Zabbix alerts with a message and ticket reference.",
            inputSchema: {
                type: "object",
                properties: {
                    event_ids: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of Zabbix event IDs to acknowledge",
                    },
                    message: {
                        type: "string",
                        description: "Acknowledgment message (include ticket reference)",
                    },
                },
                required: ["event_ids", "message"],
            },
        },
        {
            name: "create_linfra_ticket",
            description: "Create a LINFRA Jira ticket with investigation findings.",
            inputSchema: {
                type: "object",
                properties: {
                    summary: {
                        type: "string",
                        description: "Ticket summary/title",
                    },
                    description: {
                        type: "string",
                        description: "Full ticket description with findings",
                    },
                },
                required: ["summary", "description"],
            },
        },
        {
            name: "add_ticket_comment",
            description: "Add a comment to an existing Jira ticket.",
            inputSchema: {
                type: "object",
                properties: {
                    ticket_key: {
                        type: "string",
                        description: "Jira ticket key (e.g., LINFRA-2486, SIM-95347)",
                    },
                    comment: {
                        type: "string",
                        description: "Comment text to add",
                    },
                },
                required: ["ticket_key", "comment"],
            },
        },
        {
            name: "search_related_incidents",
            description: "Search Jira for related past incidents by keyword. Useful for finding if an issue has occurred before.",
            inputSchema: {
                type: "object",
                properties: {
                    keywords: {
                        type: "string",
                        description: "Search keywords (e.g., 'block_repeat_tarballs', 'antispam-publishing')",
                    },
                    project: {
                        type: "string",
                        description: "Jira project to search in (default: SIM)",
                    },
                },
                required: ["keywords"],
            },
        },
        {
            name: "check_large_files",
            description: "Check for large files on a channel server that may trigger the large_file_alert. SAFE: read-only.",
            inputSchema: {
                type: "object",
                properties: {
                    hostname: {
                        type: "string",
                        description: "Channel server hostname",
                    },
                },
                required: ["hostname"],
            },
        },
        {
            name: "list_channel_servers",
            description: "List all channel servers with their roles, Zabbix IDs, and current status.",
            inputSchema: {
                type: "object",
                properties: {},
            },
        },
    ],
}));
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "investigate_server":
                return await handleInvestigateServer(args);
            case "check_channel_log":
                return await handleCheckChannelLog(args);
            case "check_antispam_publishing":
                return await handleCheckAntispamPublishing();
            case "get_server_problems":
                return await handleGetServerProblems(args);
            case "acknowledge_alerts":
                return await handleAcknowledgeAlerts(args);
            case "create_linfra_ticket":
                return await handleCreateLinfraTicket(args);
            case "add_ticket_comment":
                return await handleAddTicketComment(args);
            case "search_related_incidents":
                return await handleSearchRelatedIncidents(args);
            case "check_large_files":
                return await handleCheckLargeFiles(args);
            case "list_channel_servers":
                return await handleListChannelServers();
            default:
                return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
        }
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});
// ============ Tool Handlers ============
async function handleInvestigateServer(args) {
    const { hostname } = args;
    const serverInfo = constants_1.CHANNEL_SERVERS.find((s) => s.hostname === hostname);
    if (!serverInfo) {
        return {
            content: [
                {
                    type: "text",
                    text: `Unknown server: ${hostname}. Use list_channel_servers to see available servers.`,
                },
            ],
        };
    }
    await ssh.connect(hostname);
    const results = [];
    results.push(`## Investigation: ${hostname}`);
    results.push(`Role: ${serverInfo.role} | Priority: ${serverInfo.priority}`);
    results.push("");
    // Check chirp status
    const chirpJson = await ssh.execute(hostname, `sudo python -c "
import json
d=json.load(open('/var/www/html/status/chirp.json'))
print 'epoch:', d.get('epoch','?'), 'time:', d.get('time','?')
for k,v in d.items():
  if isinstance(v,dict) and v.get('exit_status',0)!=0:
    print k, '|', v.get('exit_status'), '|', v.get('output','')[:100]
"`);
    results.push("### Chirp Status (overdue channels)");
    results.push("```");
    results.push(chirpJson || "All channels OK");
    results.push("```");
    results.push("");
    // Check chmedic status
    const chemedicJson = await ssh.execute(hostname, `sudo python -c "
import json
d=json.load(open('/var/www/html/status/chmedic.json'))
for k,v in d.items():
  if isinstance(v,dict) and v.get('exit_status',0)!=0:
    print k, '|', v.get('exit_status'), '|', v.get('output','')[:100]
"`);
    results.push("### Chmedic Status (RPM verification)");
    results.push("```");
    results.push(chemedicJson || "All RPMs OK");
    results.push("```");
    results.push("");
    // Check large_file_alert
    const largeFileJson = await ssh.execute(hostname, `sudo cat /var/www/html/status/large_file_alert.json 2>/dev/null || echo "No large_file_alert.json found"`);
    results.push("### Large File Alert Status");
    results.push("```");
    results.push(largeFileJson);
    results.push("```");
    results.push("");
    // Check chcheck if exists
    const chcheckJson = await ssh.execute(hostname, `sudo python -c "
import json
d=json.load(open('/var/www/html/status/chcheck.json'))
for k,v in d.items():
  if isinstance(v,dict) and v.get('exit_status',0)!=0:
    print k, '|', v.get('exit_status'), '|', v.get('output','')[:80]
" 2>/dev/null || echo "No issues"`);
    results.push("### Chcheck Status");
    results.push("```");
    results.push(chcheckJson || "All OK");
    results.push("```");
    results.push("");
    // Check disk space
    const diskSpace = await ssh.execute(hostname, "df -h /home");
    results.push("### Disk Space (/home)");
    results.push("```");
    results.push(diskSpace);
    results.push("```");
    // Pattern matching
    results.push("");
    results.push("### Pattern Analysis");
    const analysis = analyzeFindings(chirpJson, chemedicJson, largeFileJson, chcheckJson);
    results.push(analysis);
    return { content: [{ type: "text", text: results.join("\n") }] };
}
async function handleCheckChannelLog(args) {
    const { hostname, channel_path, lines = 50 } = args;
    await ssh.connect(hostname);
    const log = await ssh.execute(hostname, `sudo su - channel -c "tail -${lines} ${channel_path}/chan.log"`);
    return { content: [{ type: "text", text: log }] };
}
async function handleCheckAntispamPublishing() {
    await atlassian.connect();
    const results = await atlassian.searchJira('text ~ "antispam-publishing" AND status != Closed ORDER BY created DESC', 5);
    if (!results || results.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active antispam-publishing incidents found. The upstream publishing server appears healthy.",
                },
            ],
        };
    }
    const output = results
        .map((r) => `${r.key} | ${r.fields.status.name} | ${r.fields.summary} | Created: ${r.fields.created}`)
        .join("\n");
    return {
        content: [
            {
                type: "text",
                text: `## Active antispam-publishing incidents:\n${output}\n\nIf these are active, channel alerts are likely a byproduct. Resolve the antispam-publishing issue first (route to HUB team).`,
            },
        ],
    };
}
async function handleGetServerProblems(args) {
    const serverInfo = constants_1.CHANNEL_SERVERS.find((s) => s.hostname === args.hostname);
    if (!serverInfo) {
        return {
            content: [{ type: "text", text: `Unknown server: ${args.hostname}` }],
        };
    }
    await zabbix.connect();
    const problems = await zabbix.getProblems(serverInfo.zabbixId);
    if (!problems || problems.length === 0) {
        return {
            content: [{ type: "text", text: `No active problems on ${args.hostname}` }],
        };
    }
    const output = problems
        .map((p) => `[${p.severity}] ${p.name} | Since: ${p.clock} | Ack: ${p.acknowledged ? "✓" : "✗"} | EventID: ${p.eventid}`)
        .join("\n");
    return {
        content: [
            { type: "text", text: `## Active problems on ${args.hostname} (${problems.length}):\n${output}` },
        ],
    };
}
async function handleAcknowledgeAlerts(args) {
    await zabbix.connect();
    await zabbix.acknowledgeProblems(args.event_ids, args.message);
    return {
        content: [
            {
                type: "text",
                text: `Acknowledged ${args.event_ids.length} event(s) with message: "${args.message}"`,
            },
        ],
    };
}
async function handleCreateLinfraTicket(args) {
    await atlassian.connect();
    const ticket = await atlassian.createIssue("LINFRA", "Task", args.summary, args.description);
    return {
        content: [
            {
                type: "text",
                text: `Created ticket: ${ticket.key} — ${args.summary}\nURL: https://sophos.atlassian.net/browse/${ticket.key}`,
            },
        ],
    };
}
async function handleAddTicketComment(args) {
    await atlassian.connect();
    await atlassian.addComment(args.ticket_key, args.comment);
    return {
        content: [{ type: "text", text: `Comment added to ${args.ticket_key}` }],
    };
}
async function handleSearchRelatedIncidents(args) {
    await atlassian.connect();
    const project = args.project || "SIM";
    const results = await atlassian.searchJira(`text ~ "${args.keywords}" AND project = ${project} ORDER BY created DESC`, 10);
    if (!results || results.length === 0) {
        return {
            content: [{ type: "text", text: `No related incidents found for "${args.keywords}" in ${project}` }],
        };
    }
    const output = results
        .map((r) => `${r.key} | ${r.fields.status.name} | ${r.fields.summary} | ${r.fields.created?.substring(0, 10)}`)
        .join("\n");
    return {
        content: [{ type: "text", text: `## Related incidents for "${args.keywords}":\n${output}` }],
    };
}
async function handleCheckLargeFiles(args) {
    await ssh.connect(args.hostname);
    const files = await ssh.execute(args.hostname, `sudo find /home/channel -type f -size +500M -exec ls -lh {} \\; 2>/dev/null`);
    if (!files || files.trim() === "") {
        return {
            content: [{ type: "text", text: `No files over 500MB found on ${args.hostname}` }],
        };
    }
    return {
        content: [
            {
                type: "text",
                text: `## Large files on ${args.hostname} (>500MB):\n\`\`\`\n${files}\n\`\`\`\n\nNote: large_file_alert threshold is 3GB. Files over 3GB will trigger alerts.`,
            },
        ],
    };
}
async function handleListChannelServers() {
    const output = constants_1.CHANNEL_SERVERS.map((s) => `${s.hostname} | ${s.role} | ${s.priority} | Zabbix ID: ${s.zabbixId}`).join("\n");
    return {
        content: [
            {
                type: "text",
                text: `## Channel Servers:\n| Hostname | Role | Priority | Zabbix ID |\n|----------|------|----------|----------|\n${constants_1.CHANNEL_SERVERS.map((s) => `| ${s.hostname} | ${s.role} | ${s.priority} | ${s.zabbixId} |`).join("\n")}`,
            },
        ],
    };
}
// ============ Analysis Helper ============
function analyzeFindings(chirp, chmedic, largeFile, chcheck) {
    const findings = [];
    // Check for antispam-related overdue
    if (chirp && chirp.includes("2.7.2.376379/b2")) {
        if (chirp.includes("Overdue by") && chirp.match(/Overdue by \d+ minutes/)) {
            const minutes = chirp.match(/Overdue by (\d+) minutes/);
            if (minutes && parseInt(minutes[1]) < 200) {
                findings.push("⚠️ Active antispam channels briefly overdue — likely transient. Check if antispam-publishing.labs.sophos has an active incident.");
            }
            else if (minutes && parseInt(minutes[1]) > 100000) {
                findings.push("🔴 Channels overdue by months/years — likely DECOMMISSIONED. Recommend suppression.");
            }
        }
    }
    if (chirp && chirp.includes("wdx_cred")) {
        findings.push("🔴 wdx_cred channel dead (~3 years). Suppress.");
    }
    if (chirp && chirp.includes("traffix.labs.sophos")) {
        findings.push("🔴 known-ns-ips/uri.d-hologram depend on traffix.labs.sophos (unreachable since Dec 2025). Suppress.");
    }
    if (chmedic && chmedic.includes("eicar.msg")) {
        findings.push("⚠️ Missing eicar.msg — common issue on all servers. RPM from 2021, AV likely deleted it. Suppress (LINFRA-2485).");
    }
    if (chmedic && chmedic.includes("Unexpected extra files")) {
        findings.push("⚠️ Unexpected extra files — usually leftover scripts. Harmless. Suppress.");
    }
    if (largeFile && largeFile.includes('"exit_status" : 1')) {
        findings.push("🔴 Large file alert active! Check which file exceeds 3GB threshold. May need rotation/compression.");
    }
    if (chcheck && chcheck.includes("NOT in a chron file")) {
        findings.push("⚠️ Orphaned channels not in chron.cfg — will never update and perpetually alert. Suppress or add to chron.");
    }
    if (findings.length === 0) {
        findings.push("✅ No known patterns detected. Manual investigation may be needed.");
    }
    return findings.join("\n");
}
// ============ Start Server ============
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Channels MCP server started");
}
main().catch(console.error);
