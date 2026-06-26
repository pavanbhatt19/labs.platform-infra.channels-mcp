"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZabbixClient = void 0;
const https_1 = __importDefault(require("https"));
class ZabbixClient {
    constructor() {
        this.connected = false;
        this.url = process.env.ZABBIX_URL || "https://zabbix.sophosapps.com";
        this.token = process.env.ZABBIX_API_TOKEN || "";
    }
    async connect() {
        if (this.connected)
            return;
        if (!this.token) {
            throw new Error("ZABBIX_API_TOKEN not configured. Please set it in your MCP environment variables.");
        }
        await this.apiCall("apiinfo.version", {});
        this.connected = true;
    }
    async getProblems(hostId) {
        const result = await this.apiCall("problem.get", {
            hostids: [hostId], recent: true, sortfield: ["eventid"], sortorder: "DESC", limit: 50, selectAcknowledges: "extend",
        });
        return result.map((p) => ({
            eventid: p.eventid, name: p.name, severity: this.severityName(p.severity),
            clock: new Date(parseInt(p.clock) * 1000).toISOString(), acknowledged: p.acknowledged === "1",
        }));
    }
    async acknowledgeProblems(eventIds, message) {
        await this.apiCall("event.acknowledge", { eventids: eventIds, action: 6, message });
    }
    severityName(severity) {
        const names = { "0": "Not classified", "1": "Information", "2": "Warning", "3": "Average", "4": "High", "5": "Disaster" };
        return names[severity] || "Unknown";
    }
    async apiCall(method, params) {
        const body = JSON.stringify({ jsonrpc: "2.0", method, params, id: 1, auth: this.token });
        return new Promise((resolve, reject) => {
            const urlObj = new URL(`${this.url}/api_jsonrpc.php`);
            const options = {
                hostname: urlObj.hostname, port: 443, path: urlObj.pathname, method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), Authorization: `Bearer ${this.token}` },
                rejectUnauthorized: false,
            };
            const req = https_1.default.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    try {
                        const json = JSON.parse(data);
                        json.error ? reject(new Error(`Zabbix API error: ${json.error.message || json.error.data}`)) : resolve(json.result);
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse Zabbix response`));
                    }
                });
            });
            req.on("error", reject);
            req.write(body);
            req.end();
        });
    }
}
exports.ZabbixClient = ZabbixClient;
