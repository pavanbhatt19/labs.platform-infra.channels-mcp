"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtlassianClient = void 0;
const https_1 = __importDefault(require("https"));
class AtlassianClient {
    constructor() {
        this.connected = false;
        this.host = process.env.ATLASSIAN_HOST || "https://sophos.atlassian.net";
        this.email = process.env.ATLASSIAN_EMAIL || "";
        this.token = process.env.ATLASSIAN_API_TOKEN || "";
    }
    async connect() {
        if (this.connected)
            return;
        if (!this.email || !this.token) {
            throw new Error("ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN not configured.");
        }
        this.connected = true;
    }
    async searchJira(jql, maxResults = 10) {
        const result = await this.apiCall(`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,created,resolution,assignee`);
        return result.issues || [];
    }
    async createIssue(projectKey, issueType, summary, description) {
        const body = { fields: { project: { key: projectKey }, issuetype: { name: issueType }, summary, description: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: description }] }] } } };
        return await this.apiCall("/rest/api/3/issue", "POST", body);
    }
    async addComment(issueKey, comment) {
        const body = { body: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }] } };
        await this.apiCall(`/rest/api/3/issue/${issueKey}/comment`, "POST", body);
    }
    async searchConfluence(cql) {
        const result = await this.apiCall(`/wiki/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=10`);
        return result.results || [];
    }
    async apiCall(path, method = "GET", body) {
        const urlObj = new URL(`${this.host}${path}`);
        const auth = Buffer.from(`${this.email}:${this.token}`).toString("base64");
        const options = {
            hostname: urlObj.hostname, port: 443, path: `${urlObj.pathname}${urlObj.search}`, method,
            headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", Accept: "application/json" },
            rejectUnauthorized: true,
        };
        const bodyStr = body ? JSON.stringify(body) : undefined;
        if (bodyStr)
            options.headers["Content-Length"] = Buffer.byteLength(bodyStr);
        return new Promise((resolve, reject) => {
            const req = https_1.default.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => { try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(new Error(`Failed to parse Atlassian response`));
                } });
            });
            req.on("error", reject);
            if (bodyStr)
                req.write(bodyStr);
            req.end();
        });
    }
}
exports.AtlassianClient = AtlassianClient;
