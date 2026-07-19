# Higiene e Limpeza do Projeto — Design

> Subprojeto 6 de 6 da reformulação do Caveo Analyst AI.
> Executado junto com a implementação da reforma. Data: 2026-07-16

## Contexto

A auditoria inicial identificou componentes ativos, mas não fez uma varredura
sistemática de código morto / arquivos órfãos. Este subprojeto documenta os
candidatos a remoção/reorganização, encontrados numa varredura dedicada
(grep de imports, call sites, deps, tamanhos de pasta). **Nada é apagado sem
confirmação**; este spec é a lista de candidatos, classificada por confiança.

## Achados por confiança

### Alta confiança — código morto claro
| Item | Evidência | Ação |
|---|---|---|
| Funções `fetchMetrics`, `fetchDashboard`, `fetchCampaigns` em `lib/api-client.ts` | Não têm call site em `app/` nem `components/` | remover |
| Rotas `/api/metrics`, `/api/funnel`, `/api/timeline`, `/api/campaigns` | Só alcançadas pelas funções mortas acima | remover |
| `package-lock.json` | Projeto usa pnpm (`pnpm-workspace.yaml`, DEPLOY.md); ter os dois lockfiles confunde o gerenciador | remover (manter `pnpm-lock.yaml`) |
| `.codex/agents/analista-midia-paga-crm.toml` | Cópia espelhada do agente p/ Codex; duas fontes da verdade | remover se o projeto não usa mais Codex |

### Média confiança — verificar antes de remover
| Item | Evidência | Verificar |
|---|---|---|
| dep `date-fns` | `imports=0` no código-fonte | confirmar que `react-day-picker` v10 não a exige como peer antes de remover do `package.json` |
| `scratch/` (5,1 MB) | JSONs de query ad-hoc + script Python | confirmar que não são referência de nada; provável descarte/arquivar |
| `.superpowers/` (144 KB) | Artefatos de sessão de brainstorm antiga (mockups do dashboard) | descartável se aquela sessão está encerrada |
| MCP `supabase` no `.mcp.json` | Sem uso em skill/agente encontrado | remover após confirmar (ver subprojeto 5) |

### Organização — mover, não deletar
| Item | Ação |
|---|---|
| `Handoff*.docx` + `handoff-captura-click-ids.md` na raiz | mover para `docs/handoffs/` |
| `outputs/**/work/pptx/` (dezenas de XMLs de .pptx descompactado) | manter só o `.pptx` final; limpar as árvores `work/` intermediárias |

### Não mexer — regenerável ou necessário
| Item | Motivo |
|---|---|
| `.next/` (235 MB) | build cache, gitignored, regenerável (limpável, mas volta no próximo build) |
| `.agents/` (372 KB) | skills vendorizadas (shadcn, supabase, brainstorming, grilling) — dependências |
| `/api/opportunities`, `/api/goals`, `/api/health`, `/api/debug` | vivos (drill-down, metas, health, verificação pós-deploy) |

## Método de verificação usado
- Componentes: `grep -rl components/<nome>` — todos com ≥1 ref (nenhum órfão).
- Lib: `grep -rl lib/<arquivo>` — todos com ≥1 ref.
- Endpoints: call sites via `api-client.ts` → distingue vivo de morto.
- Deps: `grep -rl <dep>` em app/components/lib.
- Tamanhos: `du -sh` das pastas candidatas.

## Escopo de execução
- Fase de limpeza roda **junto** com a implementação (não antes): remover as
  rotas legadas faz parte do subprojeto 3; remover `supabase` faz parte do
  subprojeto 5; os demais itens (lockfile, codex, handoffs, scratch,
  date-fns) são limpeza pura deste subprojeto.
- Cada remoção de alta confiança pode ser feita direto; cada item de média
  confiança exige a verificação da coluna correspondente antes.

## Correção registrada
Este subprojeto corrigiu um erro do spec do dashboard (subprojeto 3): o
`/api/opportunities` havia sido listado como legado, mas está **vivo** no
drill-down do funil. O spec do dashboard foi atualizado.
