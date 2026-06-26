# Channels MCP Server

An MCP (Model Context Protocol) server for investigating and managing Sophos Channel Server incidents. Works with **any AI tool** that supports MCP — Kiro, Claude Desktop, Cursor, Cline, Windsurf, etc.

## Overview

This MCP server enables AI assistants to autonomously investigate channel server incidents by:

1. **Connecting to channel servers via SSH** and reading logs, status files, and system state (read-only, no destructive commands)
2. **Checking Zabbix** for active alerts and acknowledging them with proper ticket references
3. **Searching Jira** for related past incidents and upstream dependencies (e.g., antispam-publishing outages)
4. **Pattern matching** — automatically identifies known root causes:
   - `block_repeat_tarballs` → upstream antispam-publishing server is down
   - `disable_akamai_rsyncs` → intentional DR setup, suppress alert
   - Channels overdue by millions of minutes → decommissioned, suppress
   - `eicar.msg` missing → AV deleted test file from old RPM, suppress
   - `traffix.labs.sophos` unreachable → dead DB dependency, suppress
   - `large_file_alert` → files over 3GB need rotation/compression
5. **Creating LINFRA tickets** with categorized findings and proper documentation
6. **Following SOP** — knows BOS=DR=P4, ABN=Primary=P3, and to check antispam-publishing first when multiple alerts fire

### What problem does this solve?

Channel server alerts often require manual SSH investigation, cross-referencing Jira for past incidents, checking upstream dependencies, and documenting findings. This MCP automates the entire workflow — the AI connects, investigates, correlates, and documents in minutes instead of hours.

## Prerequisites

Before setting up, you need:

1. **SSH access** to channel servers (your key must be authorized on the servers)
2. **Zabbix API token** from https://zabbix.sophosapps.com (User Settings → API Tokens)
3. **Atlassian API token** from https://id.atlassian.com/manage-profile/security/api-tokens
4. **Node.js 18+** installed on your machine

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/pavanbhatt19/labs.platform-infra.channels-mcp.git
cd labs.platform-infra.channels-mcp
npm install
```

No build step needed — `dist/` is pre-built and included in the repo.

### 2. Load your SSH key

```bash
ssh-add ~/.ssh/id_rsa
```

Verify it's loaded: `ssh-add -l`

### 3. Find your SSH_AUTH_SOCK

```bash
echo $SSH_AUTH_SOCK
```

You'll need this value for the MCP config below.

### 4. Add to your AI tool's MCP config

**Kiro** (`~/.kiro/settings/mcp.json`):
```json
{
  "mcpServers": {
    "channels": {
      "command": "node",
      "args": ["/full/path/to/labs.platform-infra.channels-mcp/dist/index.js"],
      "env": {
        "SSH_USERNAME": "your_ssh_username",
        "SSH_AUTH_SOCK": "/var/run/com.apple.launchd.xxx/Listeners",
        "ZABBIX_URL": "https://zabbix.sophosapps.com",
        "ZABBIX_API_TOKEN": "your_zabbix_api_token",
        "ATLASSIAN_HOST": "https://sophos.atlassian.net",
        "ATLASSIAN_EMAIL": "your.name@sophos.com",
        "ATLASSIAN_API_TOKEN": "your_atlassian_api_token"
      }
    }
  }
}
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "channels": {
      "command": "node",
      "args": ["/full/path/to/labs.platform-infra.channels-mcp/dist/index.js"],
      "env": {
        "SSH_USERNAME": "your_ssh_username",
        "SSH_AUTH_SOCK": "/var/run/com.apple.launchd.xxx/Listeners",
        "ZABBIX_URL": "https://zabbix.sophosapps.com",
        "ZABBIX_API_TOKEN": "your_zabbix_api_token",
        "ATLASSIAN_HOST": "https://sophos.atlassian.net",
        "ATLASSIAN_EMAIL": "your.name@sophos.com",
        "ATLASSIAN_API_TOKEN": "your_atlassian_api_token"
      }
    }
  }
}
```

**Cursor/Cline** — same format, add to your MCP settings.

### 5. Test it

Ask your AI: "List all channel servers" or "Investigate cha3.abn.green.sophos"

## Configuration Reference

| Variable | Required | How to get it |
|----------|----------|---------------|
| `SSH_USERNAME` | Yes | Your SSH username for channel servers (e.g., `pavanbhatt`) |
| `SSH_AUTH_SOCK` | Yes | Run `echo $SSH_AUTH_SOCK` in terminal |
| `SSH_PRIVATE_KEY_PATH` | Optional | Alternative to SSH agent: path to your key (e.g., `~/.ssh/id_rsa`) |
| `SSH_PASSPHRASE` | Optional | Passphrase for the private key (if using SSH_PRIVATE_KEY_PATH) |
| `ZABBIX_URL` | Yes | `https://zabbix.sophosapps.com` |
| `ZABBIX_API_TOKEN` | Yes | Zabbix → User Settings → API Tokens → Create |
| `ATLASSIAN_HOST` | Yes | `https://sophos.atlassian.net` |
| `ATLASSIAN_EMAIL` | Yes | Your Sophos email (e.g., `your.name@sophos.com`) |
| `ATLASSIAN_API_TOKEN` | Yes | https://id.atlassian.com/manage-profile/security/api-tokens → Create |

## Available Tools

| Tool | What it does | Safe? |
|------|-------------|-------|
| `investigate_server` | Full auto-investigation: connects via SSH, reads all status JSONs, pattern matches, returns categorized findings | ✅ Read-only |
| `check_channel_log` | Read latest chan.log entries for a specific channel path | ✅ Read-only |
| `check_antispam_publishing` | Check Jira for active antispam-publishing incidents (most common root cause) | ✅ Read-only |
| `get_server_problems` | Get all active Zabbix alerts for a server | ✅ Read-only |
| `check_large_files` | Find files over 500MB that may trigger large_file_alert | ✅ Read-only |
| `list_channel_servers` | List all 13 channel servers with roles, priorities, Zabbix IDs | ✅ Read-only |
| `search_related_incidents` | Search Jira for past similar incidents | ✅ Read-only |
| `acknowledge_alerts` | Acknowledge Zabbix alerts with a message | ⚠️ Write |
| `create_linfra_ticket` | Create a LINFRA Jira ticket | ⚠️ Write |
| `add_ticket_comment` | Add a comment to an existing Jira ticket | ⚠️ Write |

## Safety

This MCP is designed to be **safe by default**:
- All SSH commands are **read-only** (`tail`, `cat`, `ls`, `stat`, `find`, `grep`, `python` for JSON parsing)
- **NEVER** runs: `yum`, `rpm install`, `rm`, `service restart`, config changes
- Write operations (Zabbix ack, Jira tickets) require explicit tool calls — AI won't do these without your approval

## Usage Examples

Just ask your AI naturally:

- "Investigate cha3.abn.green.sophos — we have alerts firing"
- "Check if antispam-publishing is down"
- "What are the active problems on cha7.bos.green.sophos?"
- "Check the chan.log for /home/channel/channels/as/2.7.2.376379/b2/data on cha3.abn"
- "Are there any large files on pmuedge.abn.green.sophos?"
- "Search for past incidents related to block_repeat_tarballs"
- "Create a LINFRA ticket for the dead channels on cha3.bos"

## Channel Servers

| Server | Role | Priority | Notes |
|--------|------|----------|-------|
| cha1.abn.green.sophos | Primary (ABN) | P3 | |
| cha2.abn.green.sophos | Primary (ABN) | P3 | |
| cha3.abn.green.sophos | Primary (ABN) | P3 | Main AS/antispam server |
| cha3.bos.green.sophos | DR (BOS) | P4 | Next business day |
| cha4.abn.green.sophos | Primary (ABN) | P3 | |
| cha5.abn.green.sophos | Primary (ABN) | P3 | Currently disabled |
| cha6.abn.green.sophos | Primary (ABN) | P3 | Akamai channels |
| cha6.bos.green.sophos | DR (BOS) | P4 | disable_akamai_rsyncs active |
| cha7.abn.green.sophos | Primary (ABN) | P3 | datadir/import channels |
| cha7.bos.green.sophos | DR (BOS) | P4 | disable_akamai_rsyncs active |
| chmetrics.abn.green.sophos | Metrics (ABN) | P3 | |
| chmetrics.bos.green.sophos | Metrics DR (BOS) | P4 | |
| pmuedge.abn.green.sophos | PMU Edge (ABN) | P3 | bandwidth-stats.csv growth |

## SOP Reference

- [SOP: Channels](https://sophos.atlassian.net/wiki/spaces/global/pages/227244933192/SOP+Channels)
- **BOS (Boston) = DR = P4** — next business day, ignore until ABN is resolved
- **Multiple channel alerts?** Check antispam-publishing first — it's almost always the root cause
- **Archiver2 alerts** are byproducts of channel issues

## Troubleshooting

**"SSH connection failed: All authentication methods failed"**
- Load your key: `ssh-add ~/.ssh/id_rsa`
- Verify: `ssh-add -l` should show your key
- Test manually: `ssh your_username@cha3.abn.green.sophos`

**"ZABBIX_API_TOKEN not configured"**
- Create a token: Zabbix → User icon → API Tokens → Create
- Add it to your MCP env config

**"ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN not configured"**
- Create token: https://id.atlassian.com/manage-profile/security/api-tokens
- Use your @sophos.com email as ATLASSIAN_EMAIL

**MCP not showing up in your AI tool?**
- Verify the path to `dist/index.js` is correct and absolute
- Check Node.js is installed: `node --version` (need 18+)
- Restart your AI tool after config changes
