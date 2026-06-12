// === Resolução de credenciais (server-only) ===
// Espelha o _load_mcp_env() do server.py: prefere process.env e, em dev,
// faz fallback lendo o ../.mcp.json do projeto. Para o Google, lê o arquivo
// apontado por GOOGLE_APPLICATION_CREDENTIALS (authorized_user) para extrair
// client_id / client_secret / refresh_token.
import fs from "node:fs";
import path from "node:path";

interface McpServer {
  env?: Record<string, string>;
}
interface McpJson {
  mcpServers?: Record<string, McpServer>;
}

let _mcpEnv: Record<string, string> | null = null;

function loadMcpEnv(): Record<string, string> {
  if (_mcpEnv) return _mcpEnv;
  const merged: Record<string, string> = {};
  // dashboard-next/ está dentro do projeto; .mcp.json fica um nível acima.
  const candidates = [
    path.join(process.cwd(), "..", ".mcp.json"),
    path.join(process.cwd(), ".mcp.json"),
  ];
  for (const p of candidates) {
    try {
      const raw = fs.readFileSync(p, "utf8");
      const mcp: McpJson = JSON.parse(raw);
      for (const server of Object.values(mcp.mcpServers ?? {})) {
        for (const [k, v] of Object.entries(server.env ?? {})) {
          if (merged[k] === undefined) merged[k] = v;
        }
      }
      break;
    } catch {
      // arquivo ausente — segue para o próximo candidato
    }
  }
  _mcpEnv = merged;
  return merged;
}

/** Lê uma variável preferindo process.env, com fallback no .mcp.json. */
function cfg(key: string, fallback = ""): string {
  if (process.env[key] !== undefined && process.env[key] !== "") {
    return process.env[key] as string;
  }
  const mcp = loadMcpEnv();
  return mcp[key] ?? fallback;
}

// ── Meta ──────────────────────────────────────────────────────────────
export const META = {
  get token() {
    return cfg("META_ACCESS_TOKEN");
  },
  get account() {
    return cfg("META_AD_ACCOUNT_ID", "act_438086148409254");
  },
  graphVersion: "v21.0",
};

// ── Salesforce ────────────────────────────────────────────────────────
export const SF = {
  get instance() {
    return cfg("SF_INSTANCE_URL", "https://caveo.my.salesforce.com");
  },
  get clientId() {
    return cfg("SF_CLIENT_ID");
  },
  get clientSecret() {
    return cfg("SF_CLIENT_SECRET");
  },
  get refreshToken() {
    return cfg("SF_REFRESH_TOKEN");
  },
  get accessToken() {
    return cfg("SF_ACCESS_TOKEN");
  },
  apiVersion: "v63.0",
};

// ── Google Ads ────────────────────────────────────────────────────────
interface GoogleUserCreds {
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  type?: string;
}

let _gCreds: GoogleUserCreds | null = null;

function googleCreds(): GoogleUserCreds {
  if (_gCreds) return _gCreds;
  // 1) credenciais diretas via env (caminho Vercel)
  const direct: GoogleUserCreds = {
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    type: "authorized_user",
  };
  if (direct.client_id && direct.client_secret && direct.refresh_token) {
    _gCreds = direct;
    return direct;
  }
  // 2) arquivo authorized_user (caminho local)
  const credsPath = cfg("GOOGLE_APPLICATION_CREDENTIALS");
  if (credsPath) {
    try {
      const resolved = path.isAbsolute(credsPath)
        ? credsPath
        : path.join(process.cwd(), "..", credsPath);
      _gCreds = JSON.parse(fs.readFileSync(resolved, "utf8"));
      return _gCreds as GoogleUserCreds;
    } catch {
      // ignora — retorna vazio abaixo
    }
  }
  _gCreds = {};
  return _gCreds;
}

export const GOOGLE = {
  get devToken() {
    return cfg("GOOGLE_ADS_DEVELOPER_TOKEN");
  },
  get loginCustomerId() {
    return cfg("GOOGLE_ADS_LOGIN_CUSTOMER_ID", "5029399396").replace(/-/g, "");
  },
  get targetCustomerId() {
    return cfg("GOOGLE_ADS_TARGET_CUSTOMER_ID", "3921127876").replace(/-/g, "");
  },
  get apiVersion() {
    return cfg("GOOGLE_ADS_API_VERSION", "v21");
  },
  get creds(): GoogleUserCreds {
    return googleCreds();
  },
  get credsPath() {
    return cfg("GOOGLE_APPLICATION_CREDENTIALS");
  },
};

// ── Presença de credenciais ───────────────────────────────────────────
// Distingue "sem credenciais" (→ mock) de "credenciais OK porém zero
// atividade no período" (→ mostrar zeros reais). É a chave para os dados
// baterem com os filtros aplicados.
export const HAS_META = (): boolean => !!META.token;
export const HAS_GOOGLE = (): boolean => !!(GOOGLE.devToken && GOOGLE.creds.refresh_token);
export const HAS_SF = (): boolean => !!(SF.refreshToken || SF.accessToken);
export const HAS_ANY_CREDS = (): boolean => HAS_META() || HAS_GOOGLE() || HAS_SF();
