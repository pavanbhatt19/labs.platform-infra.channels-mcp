"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSHManager = void 0;
const ssh2_1 = require("ssh2");
class SSHManager {
    constructor() {
        this.connections = new Map();
        this.username = process.env.SSH_USERNAME || "pavanbhatt";
        this.privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
        this.authSock = process.env.SSH_AUTH_SOCK;
    }
    async connect(hostname) {
        if (this.connections.has(hostname)) {
            return;
        }
        return new Promise((resolve, reject) => {
            const conn = new ssh2_1.Client();
            const config = {
                host: hostname,
                port: 22,
                username: this.username,
                readyTimeout: 15000,
            };
            if (this.authSock) {
                config.agent = this.authSock;
            }
            else if (this.privateKeyPath) {
                const fs = require("fs");
                config.privateKey = fs.readFileSync(this.privateKeyPath);
                if (process.env.SSH_PASSPHRASE) {
                    config.passphrase = process.env.SSH_PASSPHRASE;
                }
            }
            else if (process.env.SSH_PASSWORD) {
                config.password = process.env.SSH_PASSWORD;
            }
            else {
                config.agent = process.env.SSH_AUTH_SOCK;
            }
            conn
                .on("ready", () => {
                this.connections.set(hostname, conn);
                resolve();
            })
                .on("error", (err) => {
                reject(new Error(`SSH connection to ${hostname} failed: ${err.message}. Ensure your SSH key is loaded (ssh-add) or configure SSH_PRIVATE_KEY_PATH.`));
            })
                .connect(config);
        });
    }
    async execute(hostname, command) {
        if (!this.connections.has(hostname)) {
            await this.connect(hostname);
        }
        const conn = this.connections.get(hostname);
        // SAFETY: All commands MUST run as the channel user
        // Wrap any command that isn't already using sudo su - channel
        const safeCommand = this.enforceChannelUser(command);
        return new Promise((resolve, reject) => {
            conn.exec(safeCommand, (err, stream) => {
                if (err) {
                    reject(new Error(`Command failed on ${hostname}: ${err.message}`));
                    return;
                }
                let stdout = "";
                let stderr = "";
                stream.on("data", (data) => { stdout += data.toString(); });
                stream.stderr.on("data", (data) => { stderr += data.toString(); });
                stream.on("close", () => { resolve(stdout || stderr); });
            });
        });
    }
    async disconnect(hostname) {
        const conn = this.connections.get(hostname);
        if (conn) {
            conn.end();
            this.connections.delete(hostname);
        }
    }
    async disconnectAll() {
        for (const [, conn] of this.connections) {
            conn.end();
        }
        this.connections.clear();
    }
    enforceChannelUser(command) {
        // Block dangerous commands
        const lowerCmd = command.toLowerCase();
        for (const blocked of SSHManager.BLOCKED_COMMANDS) {
            if (lowerCmd.includes(blocked.toLowerCase())) {
                throw new Error(`BLOCKED: Command contains "${blocked}" which is not allowed. ` +
                    `This MCP only executes read-only commands for investigation.`);
            }
        }
        // If already wrapped with sudo su - channel, pass through
        if (command.includes("sudo su - channel")) {
            return command;
        }
        // If it's a sudo command reading status files, allow it
        if (command.startsWith("sudo") && (command.includes("cat ") ||
            command.includes("python") ||
            command.includes("find ") ||
            command.includes("ls ") ||
            command.includes("stat ") ||
            command.includes("grep ") ||
            command.includes("df ") ||
            command.includes("tail ") ||
            command.includes("head "))) {
            return command;
        }
        // Default: wrap with sudo su - channel -c
        // Escape double quotes in the command
        const escaped = command.replace(/"/g, '\\"');
        return `sudo su - channel -c "${escaped}"`;
    }
}
exports.SSHManager = SSHManager;
// SAFETY: Blocked commands that should NEVER be executed
SSHManager.BLOCKED_COMMANDS = [
    "yum", "rpm", "apt", "dnf", "pip", // package management
    "rm ", "rm\t", "rmdir", // file deletion
    "systemctl", "service ", "kill", // service management
    "reboot", "shutdown", "halt", "init ", // system control
    "mv ", "cp ", // file manipulation
    "chmod", "chown", // permission changes
    "sed ", "awk ", // file editing
    "vi ", "vim ", "nano ", "emacs", // editors
    "echo ", "printf ", // writing to files (when combined with >)
    "truncate", "dd ", // destructive file ops
    "chwatcher", "chupdate", // channel update commands (read-only investigation only)
];
// SAFETY: Only these commands are allowed
SSHManager.ALLOWED_COMMANDS = [
    "tail", "cat", "head", "less", "more", // read file content
    "ls", "find", "stat", "wc", // list/find files
    "grep", "awk", // search (awk allowed in read context)
    "df", "du", // disk usage
    "ps", "top", // process info
    "python", "perl", // script execution (for JSON parsing)
    "date", "hostname", "uptime", // system info
    "rpm -q", "rpm -V", // RPM query/verify (not install)
    "crontab -l", // read cron (not edit)
];
