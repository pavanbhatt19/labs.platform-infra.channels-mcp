import { Client } from "ssh2";

export class SSHManager {
  private connections: Map<string, Client> = new Map();
  private username: string;
  private privateKeyPath?: string;
  private authSock?: string;

  constructor() {
    this.username = process.env.SSH_USERNAME || "pavanbhatt";
    this.privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
    this.authSock = process.env.SSH_AUTH_SOCK;
  }

  async connect(hostname: string): Promise<void> {
    if (this.connections.has(hostname)) {
      return;
    }

    return new Promise((resolve, reject) => {
      const conn = new Client();
      const config: any = {
        host: hostname,
        port: 22,
        username: this.username,
        readyTimeout: 15000,
      };

      if (this.authSock) {
        config.agent = this.authSock;
      } else if (this.privateKeyPath) {
        const fs = require("fs");
        config.privateKey = fs.readFileSync(this.privateKeyPath);
        if (process.env.SSH_PASSPHRASE) {
          config.passphrase = process.env.SSH_PASSPHRASE;
        }
      } else if (process.env.SSH_PASSWORD) {
        config.password = process.env.SSH_PASSWORD;
      } else {
        config.agent = process.env.SSH_AUTH_SOCK;
      }

      conn
        .on("ready", () => {
          this.connections.set(hostname, conn);
          resolve();
        })
        .on("error", (err: Error) => {
          reject(new Error(
            `SSH connection to ${hostname} failed: ${err.message}. Ensure your SSH key is loaded (ssh-add) or configure SSH_PRIVATE_KEY_PATH.`
          ));
        })
        .connect(config);
    });
  }

  async execute(hostname: string, command: string): Promise<string> {
    if (!this.connections.has(hostname)) {
      await this.connect(hostname);
    }
    const conn = this.connections.get(hostname)!;

    return new Promise((resolve, reject) => {
      conn.exec(command, (err, stream) => {
        if (err) {
          reject(new Error(`Command failed on ${hostname}: ${err.message}`));
          return;
        }
        let stdout = "";
        let stderr = "";
        stream.on("data", (data: Buffer) => { stdout += data.toString(); });
        stream.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
        stream.on("close", () => { resolve(stdout || stderr); });
      });
    });
  }

  async disconnect(hostname: string): Promise<void> {
    const conn = this.connections.get(hostname);
    if (conn) { conn.end(); this.connections.delete(hostname); }
  }

  async disconnectAll(): Promise<void> {
    for (const [, conn] of this.connections) { conn.end(); }
    this.connections.clear();
  }
}
