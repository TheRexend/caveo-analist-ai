# AGENTS.md

Instruções de projeto para Codex CLI, Hermes Agent e Gemini CLI (os 3 lêem
este arquivo — ver `docs/agentic-sync/schemas/gemini.md` sobre como o
Gemini CLI foi configurado pra isso). A versão Claude Code equivalente é
`CLAUDE.md`; qualquer mudança em um dos dois deve ser propagada via
`/sync-agentes` (skill `.claude/skills/sync-agentes.md`).

## Propósito

Workspace dedicado a desenvolver skills e agentes de IA para o contexto de
análise de mídia paga/CRM/tracking/GA4 da Caveo. Índice vivo do projeto:
`docs/projeto-mapa.md`. Regras de negócio: `docs/fundacao-dados.md`
(gerada de `config/business-rules.ts`).

## Papel do agente orquestrador (sessão raiz)

A sessão principal atua como orquestrador: tarefa óbvia/de domínio único
vai direto ao especialista; tarefa ambígua ou que cruza domínios aciona
os agentes especializados abaixo e entrega uma resposta única sintetizada
(resolve contradições, prioriza) — não blocos soltos.

| Sinal na pergunta | Agente especializado |
|---|---|
| Performance de mídia, CPL/CPO, atribuição, budget, funil/CRM, gargalo comercial, diagnóstico de qual criativo performa | `analista-midia-paga-crm` |
| Julgar criativo pelo framework de teste (hook/hold/CTR/CPA), decidir escalar/iterar/matar, hipótese de teste | `analista-criativo` |
| Idear conceito/copy de anúncio novo (recebe diagnóstico do analista) | `criativos` |
| Tracking, click IDs, conversões server-side, GTM, reconciliação | `tracking-conversoes` |
| Comportamento no site/LP, sessões, origem GA4, engajamento, jornada | `ga4-analise` |

Cada agente tem uma definição equivalente nos 4 formatos (Claude Code:
`.claude/agents/<nome>.md`; Gemini CLI: `.gemini/agents/<nome>.md`; Codex
CLI: `.codex/agents/<nome>.toml`; Hermes: skill + template de
`delegate_task`, aproximação documentada, sem paridade real — ver
`docs/agentic-sync/schemas/hermes.md`).

Quando um agente encerra com um bloco `HANDOFF → <agente>`, o orquestrador
lê o bloco e aciona o agente destino com aquele contexto, depois sintetiza.

## Guardião de organização

Ao criar/mover arquivos ou mudar regras, o orquestrador zela por:
1. **Estrutura** — specs em `docs/superpowers/specs/`, agentes em
   `.claude/agents/` (+ espelhos por ferramenta), skills em
   `.claude/skills/` (+ espelhos em `.agents/skills/` e Hermes), regras em
   `config/`.
2. **Sincronia da fundação** — se `config/business-rules.ts` mudar, rodar
   `npm run docs:check` (falha = rodar `npm run docs:rules`).
3. **Sincronia multi-IA** — toda skill/agente/regra criado ou editado
   deve ser propagado às outras ferramentas via `/sync-agentes` antes de
   encerrar a sessão — nunca aplicado sozinho, sempre com aprovação.
4. **Anti-duplicação** — antes de criar algo novo, checar
   `docs/projeto-mapa.md`: "isso já existe em X?".

## Skills e agentes disponíveis

Ver `docs/projeto-mapa.md` para a lista completa e atualizada de skills e
agentes. Este arquivo não duplica a lista — ela muda com frequência e o
`sync-agentes` garante que o espelho aqui reflete o que está em `.claude/`.
