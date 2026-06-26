export declare class AtlassianClient {
    private host;
    private email;
    private token;
    private connected;
    constructor();
    connect(): Promise<void>;
    searchJira(jql: string, maxResults?: number): Promise<any[]>;
    createIssue(projectKey: string, issueType: string, summary: string, description: string): Promise<any>;
    addComment(issueKey: string, comment: string): Promise<void>;
    searchConfluence(cql: string): Promise<any[]>;
    private apiCall;
}
