// === Cache TTL em memória + coalescência de requisições ===
// Dedupe as chamadas externas (Meta/Google/Salesforce) que se repetem entre
// endpoints e entre cargas próximas. Vive no processo do servidor (module-level),
// então é compartilhado por todas as rotas no mesmo runtime.
import "server-only";

interface Entry {
  expires: number;
  value: Promise<unknown>;
}

const store = new Map<string, Entry>();

/**
 * Retorna o valor cacheado para `key` se ainda válido; senão executa `fn`,
 * cacheia a Promise (coalescendo chamadas concorrentes) e a retorna.
 *
 * - `ttlMs`: validade da entrada (default 90s).
 * - `fresh`: ignora o cache e regrava (usado pelo botão "Atualizar" → ?fresh=1).
 *
 * Se `fn` rejeitar, a entrada é removida para não cachear erro.
 */
export function cached<T>(
  key: string,
  fn: () => Promise<T>,
  opts: { ttlMs?: number; fresh?: boolean } = {},
): Promise<T> {
  const { ttlMs = 90_000, fresh = false } = opts;
  const now = Date.now();

  if (!fresh) {
    const hit = store.get(key);
    if (hit && hit.expires > now) return hit.value as Promise<T>;
  }

  const value = fn().catch((err) => {
    // Não persiste falha: remove só se ainda for esta entrada.
    if (store.get(key)?.value === value) store.delete(key);
    throw err;
  });
  store.set(key, { expires: now + ttlMs, value });
  return value as Promise<T>;
}
