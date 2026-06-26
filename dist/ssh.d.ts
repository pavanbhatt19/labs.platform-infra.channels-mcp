export declare class SSHManager {
    private connections;
    private username;
    private privateKeyPath?;
    private authSock?;
    constructor();
    connect(hostname: string): Promise<void>;
    execute(hostname: string, command: string): Promise<string>;
    disconnect(hostname: string): Promise<void>;
    disconnectAll(): Promise<void>;
    private static BLOCKED_COMMANDS;
    private static ALLOWED_COMMANDS;
    private enforceChannelUser;
}
