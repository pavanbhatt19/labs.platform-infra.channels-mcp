export declare class ZabbixClient {
    private url;
    private token;
    private connected;
    constructor();
    connect(): Promise<void>;
    getProblems(hostId: string): Promise<any[]>;
    acknowledgeProblems(eventIds: string[], message: string): Promise<void>;
    private severityName;
    private apiCall;
}
