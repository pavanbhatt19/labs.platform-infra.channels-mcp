export const CHANNEL_SERVERS = [
  { hostname: "cha1.abn.green.sophos", role: "Primary (ABN)", priority: "P3", zabbixId: "11876" },
  { hostname: "cha2.abn.green.sophos", role: "Primary (ABN)", priority: "P3", zabbixId: "11877" },
  { hostname: "cha3.abn.green.sophos", role: "Primary (ABN)", priority: "P3", zabbixId: "11878" },
  { hostname: "cha3.bos.green.sophos", role: "DR (BOS)", priority: "P4", zabbixId: "11879" },
  { hostname: "cha4.abn.green.sophos", role: "Primary (ABN)", priority: "P3", zabbixId: "11880" },
  { hostname: "cha5.abn.green.sophos", role: "Primary (ABN) - DISABLED", priority: "P3", zabbixId: "11881" },
  { hostname: "cha6.abn.green.sophos", role: "Primary (ABN)", priority: "P3", zabbixId: "11882" },
  { hostname: "cha6.bos.green.sophos", role: "DR (BOS)", priority: "P4", zabbixId: "11883" },
  { hostname: "cha7.abn.green.sophos", role: "Primary (ABN)", priority: "P3", zabbixId: "11884" },
  { hostname: "cha7.bos.green.sophos", role: "DR (BOS)", priority: "P4", zabbixId: "11885" },
  { hostname: "chmetrics.abn.green.sophos", role: "Metrics (ABN)", priority: "P3", zabbixId: "11886" },
  { hostname: "chmetrics.bos.green.sophos", role: "Metrics DR (BOS)", priority: "P4", zabbixId: "11887" },
  { hostname: "pmuedge.abn.green.sophos", role: "PMU Edge (ABN)", priority: "P3", zabbixId: "11901" },
];

export const INVESTIGATION_PATTERNS = {
  BLOCK_REPEAT_TARBALLS: {
    pattern: "repeated tarball",
    exitCode: 9,
    cause: "Upstream publishing not generating new data. Same tarball being pulled repeatedly.",
    rootCause: "antispam-publishing.labs.sophos is likely down",
    action: "Check for active antispam-publishing incident. Route to HUB team.",
  },
  DISABLE_AKAMAI_RSYNCS: {
    pattern: "disable_akamai_rsyncs",
    exitCode: 69,
    cause: "Intentional DR setup. Only one site should upload to Akamai at a time.",
    rootCause: "Expected state on BOS servers",
    action: "Suppress the alert. This is by design.",
  },
  CHRON_LOCK_CONTENTION: {
    pattern: "Can't lock file",
    exitCode: null,
    cause: "chron scheduler hitting lock contention. Multiple cron entries competing.",
    rootCause: "Intermittent issue, channels will catch up",
    action: "Transient - will auto-clear. Consider increasing delay_factor for DR servers.",
  },
  TRAFFIX_DB_UNREACHABLE: {
    pattern: "Can't connect to MySQL server on 'traffix.labs.sophos'",
    exitCode: 107,
    cause: "MySQL DB traffix.labs.sophos is unreachable (decommissioned since Dec 2025)",
    rootCause: "Upstream dependency decommissioned",
    action: "Suppress. Channel is dead.",
  },
  EICAR_MISSING: {
    pattern: "missing.*eicar.msg",
    exitCode: 2,
    cause: "EICAR test file deleted by antivirus scan. RPM from 2021.",
    rootCause: "Known issue on all servers",
    action: "Suppress. Tracked in LINFRA-2485.",
  },
  LARGE_FILE: {
    pattern: "exit_status.*1",
    exitCode: 1,
    cause: "File exceeds 3GB threshold",
    rootCause: "Unbounded file growth (bandwidth-stats.csv, stale chan.logs)",
    action: "Rotate/compress the offending file, then re-run large_file_alert script.",
  },
};

export const SOP_RULES = {
  BOSTON_PRIORITY: "Treat Boston (BOS) server incidents as P4 (next business day). Resolve ABN first.",
  ANTISPAM_FIRST: "If antispam-publishing.labs.sophos has an active alert, resolve that first. Channel alerts are a byproduct.",
  ARCHIVER2_BYPRODUCT: "Archiver2 incidents are usually byproducts of channel issues.",
  ROUTE_TO_HUB: "For antispam-publishing issues, route to HUB team.",
  ROUTE_TO_LABS_INFRA: "For channel-specific issues not covered by SOP, route to Labs Infra.",
};
