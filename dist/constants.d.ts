export declare const CHANNEL_SERVERS: {
    hostname: string;
    role: string;
    priority: string;
    zabbixId: string;
}[];
export declare const INVESTIGATION_PATTERNS: {
    BLOCK_REPEAT_TARBALLS: {
        pattern: string;
        exitCode: number;
        cause: string;
        rootCause: string;
        action: string;
    };
    DISABLE_AKAMAI_RSYNCS: {
        pattern: string;
        exitCode: number;
        cause: string;
        rootCause: string;
        action: string;
    };
    CHRON_LOCK_CONTENTION: {
        pattern: string;
        exitCode: null;
        cause: string;
        rootCause: string;
        action: string;
    };
    TRAFFIX_DB_UNREACHABLE: {
        pattern: string;
        exitCode: number;
        cause: string;
        rootCause: string;
        action: string;
    };
    EICAR_MISSING: {
        pattern: string;
        exitCode: number;
        cause: string;
        rootCause: string;
        action: string;
    };
    LARGE_FILE: {
        pattern: string;
        exitCode: number;
        cause: string;
        rootCause: string;
        action: string;
    };
};
export declare const SOP_RULES: {
    BOSTON_PRIORITY: string;
    ANTISPAM_FIRST: string;
    ARCHIVER2_BYPRODUCT: string;
    ROUTE_TO_HUB: string;
    ROUTE_TO_LABS_INFRA: string;
};
