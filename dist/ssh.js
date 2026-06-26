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
            return; // Already connected
        }
        return new Promise((resolve, reject) => {
            const conn = new ssh2_1.Client();
            const config = {
                host: hostname,
                port: 22,
                username: this.username,
                readyTimeout: 15000,
            };
            // Auth method priority: agent > private key > password
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
                // Try default agent
                config.agent = process.env.SSH_AUTH_SOCK;
            }
            conn
                .on("ready", () => {
                this.connections.set(hostname, conn);
                resolve();
            })
                .on("error", (err) => {
                reject(new Error(`SSH connection to ${hostname} failed: ${err.message}. ` +
                    `Ensure your SSH key is loaded (ssh-add) or configure SSH_PRIVATE_KEY_PATH.`));
            })
                .connect(config);
        });
    }
    async execute(hostname, command) {
        if (!this.connections.has(hostname)) {
            await this.connect(hostname);
        }
        const conn = this.connections.get(hostname);
        return new Promise((resolve, reject) => {
            conn.exec(command, (err, stream) => {
                if (err) {
                    reject(new Error(`Command failed on ${hostname}: ${err.message}`));
                    return;
                }
                let stdout = "";
                let stderr = "";
                stream
                    .on("data", (data) => {
                    stdout += data.toString();
                })
                    .stderr.on("data", (data) => {
                    stderr += data.toString();
                });
                stream.on("close", (code) => {
                    // Return stdout, or stderr if stdout is empty
                    resolve(stdout || stderr);
                });
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
        for (const [hostname, conn] of this.connections) {
            conn.end();
        }
        this.connections.clear();
    }
}
exports.SSHManager = SSHManager;
