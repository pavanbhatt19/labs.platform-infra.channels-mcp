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

### 3. Add to your AI tool's MCP config

`SSH_AUTH_SOCK` is **auto-detected** on macOS — you don't need to set it manually. The MCP will find your SSH agent socket automatically as long as your key is loaded with `ssh-add`.

**Kiro** (`~/.kiro/settings/mcp.json`):
```json
{
  "mcpServers": {
    "channels": {
      "command": "node",
      "args": ["/full/path/to/labs.platform-infra.channels-mcp/dist/index.js"],
      "env": {
        "SSH_USERNAME": "your_ssh_username",
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

### 4. Test it

Ask your AI: "List all channel servers" or "Investigate cha3.abn.green.sophos"

## Configuration Reference

| Variable | Required | How to get it |
|----------|----------|---------------|
| `SSH_USERNAME` | Yes | Your SSH username for channel servers (e.g., `pavanbhatt`) |
| `SSH_AUTH_SOCK` | No (auto-detected) | Auto-detected on macOS. Only set manually if auto-detection fails. |
| `SSH_PRIVATE_KEY_PATH` | Optional | Alternative to SSH agent: path to your key (e.g., `~/.ssh/id_rsa`) |
| `SSH_PASSPHRASE` | Optional | Passphrase for the private key (if using SSH_PRIVATE_KEY_PATH) |
| `ZABBIX_URL` | Yes | `https://zabbix.sophosapps.com` |
| `ZABBIX_API_TOKEN` | Yes | Zabbix → User Settings → API Tokens → Create |
| `ATLASSIAN_HOST` | Yes | `https://sophos.atlassian.net` |
| `ATLASSIAN_EMAIL` | Yes | Your Sophos email (e.g., `your.name@sophos.com`) |
| `ATLASSIAN_API_TOKEN` | Yes | https://id.atlassian.com/manage-profile/security/api-tokens → Create |

## Important Notes

### SSH Authentication
- `SSH_AUTH_SOCK` is **auto-detected** on macOS — the MCP scans `/var/run/com.apple.launchd.*` to find the agent socket automatically
- You do NOT need to hardcode it in the config (it changes on every reboot anyway)
- Just make sure your key is loaded: `ssh-add ~/.ssh/id_rsa` before using the MCP
- The MCP connects as your SSH user and **all commands run as the `channel` user** via `sudo su - channel -c "..."`

### How Kiro/Claude Desktop starts the MCP
- You do NOT run `npm run dev` or `node dist/index.js` manually
- Your AI tool (Kiro, Claude Desktop, etc.) reads the MCP config and starts the server process itself
- After updating the config, restart your AI tool or reconnect MCP servers (Kiro: command palette → "MCP: Reconnect Servers")
- If the MCP doesn't appear in your tool list, check the MCP server panel for errors

### After `git pull`
If you pull new changes, rebuild the dist:
```bash
git pull
npm run build
```
Then restart your AI tool or reconnect MCP servers.

### Command Safety
All SSH commands are enforced to run as the `channel` user. The following commands are **blocked** and will throw an error:
- Package management: `yum`, `rpm install`, `apt`, `dnf`, `pip`
- File deletion: `rm`, `rmdir`
- Service control: `systemctl`, `service`, `kill`, `reboot`
- File manipulation: `mv`, `cp`, `chmod`, `chown`
- Editors: `vi`, `vim`, `nano`
- Channel updates: `chwatcher`, `chupdate` (investigation only, no modifications)

Read-only commands are allowed: `tail`, `cat`, `ls`, `find`, `stat`, `grep`, `df`, `ps`, `python` (for JSON parsing)

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
- If your key has a passphrase and isn't in the agent, you must `ssh-add` it first
- Test manually: `ssh your_username@cha3.abn.green.sophos`

**"ZABBIX_API_TOKEN not configured"**
- Create a token: Zabbix → User icon → API Tokens → Create
- Add it to your MCP env config

**"ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN not configured"**
- Create token: https://id.atlassian.com/manage-profile/security/api-tokens
- Use your @sophos.com email as ATLASSIAN_EMAIL

**MCP not showing up in your AI tool?**
- Verify the path to `dist/index.js` is correct and **absolute** (e.g., `/Users/yourname/labs.platform-infra.channels-mcp/dist/index.js`)
- Check Node.js is installed: `node --version` (need 18+)
- Do NOT run `npm run dev` manually — the AI tool starts the server itself
- Restart your AI tool after config changes, or reconnect MCP servers
- Check the MCP server panel for error messages

**"BLOCKED: Command contains X which is not allowed"**
- This means the command safety filter caught a dangerous operation
- The MCP is read-only by design — it cannot run yum, rm, service restart, etc.
- If you need to run a blocked command, do it manually via SSH

**Tools appear but SSH fails silently**
- The SSH_AUTH_SOCK is auto-detected on macOS, but if it fails, set it explicitly:
  ```bash
  echo $SSH_AUTH_SOCK   # copy this value
  ```
  Then add `"SSH_AUTH_SOCK": "your_value"` to the env config

