# Guardião multi-IA — tradução e sincronização entre Claude Code, Codex, Hermes e Gemini

Data: 2026-09-06

## Problema

Este projeto é hoje autorado majoritariamente em formato Claude Code
(`CLAUDE.md`, `.claude/agents/*.md`, `.claude/skills/*.md`). Mas o repo
convive com outras 3 ferramentas de IA instaladas na máquina (Codex, Hermes
Agent, Gemini CLI), cada uma com seu próprio arquivo de instruções e formato
de skill/agente. Já existe defasagem real: o `AGENTS.md` da raiz é uma cópia
mecânica e desatualizada do `CLAUDE.md` (não menciona o orquestrador, os 5
agentes atuais, nem `docs/projeto-mapa.md`; tem erros de find-replace tipo
`Codex.ai/code`, `.Codex/skills/`). Toda skill/agente novo criado só existe
pro Claude Code — as outras 3 ferramentas não sabem que ele existe.

Objetivo: garantir que qualquer criação nova (skill, agente, regra de
orquestração) fique disponível, com fidelidade razoável, nas 4 frentes — sem
que isso vire um segundo trabalho manual de manutenção.

## Escopo

**Dentro:**
- Arquivo raiz de instruções: `CLAUDE.md` ↔ `AGENTS.md` ↔ config do Gemini
  pra ler `AGENTS.md`.
- Skills: `.claude/skills/*.md` ↔ `.agents/skills/*/SKILL.md` (Codex + Gemini)
  ↔ `~/.hermes/skills/<categoria>/<nome>/SKILL.md` (Hermes, global).
- Agentes: `.claude/agents/*.md` ↔ `.gemini/agents/*.md` ↔
  `.codex/agents/*.toml` ↔ skill+template `delegate_task` pro Hermes
  (best-effort documentado, sem paridade real).
- Skill `/sync-agentes` + agente `guardiao-multi-ia`, invocados sob demanda.
- O orquestrador (Papel 2, CLAUDE.md) passa a **sugerir** `/sync-agentes`
  toda vez que uma skill/agente/regra nova é criada ou editada na sessão —
  mas a execução em si continua exigindo confirmação, nunca roda sozinha em
  background nem sobrescreve sem aprovação.

**Fora:**
- Sincronia em tempo real / hooks automáticos disparando sem intervenção
  (rejeitado — ver Decisões).
- Paridade completa de Hermes com o mecanismo de sub-agente isolado das
  outras 3 (Hermes não tem esse conceito nativo; documentar a limitação, não
  simular).
- MCPs, dashboard, `config/business-rules.ts` — esses já têm seu próprio
  mecanismo de fonte única (`docs:check`/`docs:rules`) e não são tocados por
  este projeto.
- Extensões do Gemini CLI, Agent2Agent remoto, marketplace de plugins do
  Codex — fora do que este guardião cobre.

## Referência de formatos por ferramenta (validado nesta sessão)

| Ferramenta | Arquivo raiz | Skill | Agente |
|---|---|---|---|
| Claude Code | `CLAUDE.md` | `.claude/skills/<nome>.md` — YAML `name`+`description` + corpo | `.claude/agents/<nome>.md` — YAML `name`/`description`/`tools` + corpo (system prompt) |
| Codex CLI | `AGENTS.md` | `~/.codex/skills/` (global) — mesmo shape mínimo do Claude | `.codex/agents/<nome>.toml` (project, versionável, só carrega se o projeto for "trusted") ou `~/.codex/agents/` — TOML: `name`, `description`, `developer_instructions` (= corpo), opcional `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, `skills.config` |
| Hermes Agent | `AGENTS.md` (mesmo arquivo do Codex) | `~/.hermes/skills/<categoria>/<nome>/SKILL.md` — **só global**, frontmatter mais rígido: `name`, `description` (≤60 chars), `version`, `author`, `license`, `platforms`, `metadata.hermes.{tags,related_skills}` | **não existe** arquivo de agente isolado nativo; só a chamada `delegate_task(goal=..., context=..., toolsets=[...], role="leaf")`. `personalities` troca a voz da sessão inteira, não isola contexto — não é equivalente |
| Gemini CLI | `GEMINI.md`, mas `context.fileName` em `settings.json` pode ser configurado como `["AGENTS.md", ...]` | `.gemini/skills/` ou `.agents/skills/` (alias documentado de interoperabilidade) | `.gemini/agents/<nome>.md` — YAML `name`, `description`, `kind` (local/remote), `tools`, `mcpServers`, `model`, `temperature`, `max_turns`, `timeout_mins` + corpo (system prompt) — estrutura muito próxima da do Claude |

Consequência prática: **3 arquivos-raiz, não 4** — configurar
`.gemini/settings.json` (`context.fileName: ["AGENTS.md","GEMINI.md"]`) evita
manter um `GEMINI.md` redundante. Claude↔Gemini↔Codex mapeiam agente com boa
fidelidade; Hermes é o elo mais fraco e fica marcado como tal.

## Arquitetura

Sem "quinto formato" canônico persistido. O guardião lê as representações
nativas que já existem no disco a cada execução e usa docs de referência
(schemas acima, congelados em arquivo) para traduzir sob demanda — evita
manter um parser/compilador de código por ferramenta, que travaria toda vez
que Gemini/Codex/Hermes mudarem o schema deles (aconteceu inclusive durante a
pesquisa desta sessão: o schema do Codex encontrado é de um blog de
abril/2026, não documentação oficial estável).

## Componentes

1. **`docs/agentic-sync/schemas/{claude,codex,hermes,gemini}.md`** — um
   arquivo de referência por ferramenta com a tabela acima detalhada
   (campos obrigatórios/opcionais, exemplo de frontmatter). O guardião
   consulta esses arquivos em vez de re-pesquisar a cada sync; se encontrar
   um campo desconhecido num arquivo nativo, avisa que a referência pode
   estar desatualizada em vez de ignorar ou inventar.
2. **`docs/agentic-sync/manifest.json`** — hash de conteúdo por
   `(artefato, ferramenta)` desde o último sync aplicado. É o que permite
   diferenciar "só um lado mudou" de "os dois mudaram desde o último sync"
   (conflito real).
3. **Skill `.claude/skills/sync-agentes.md`** — procedimento:
   - Enumera artefatos: arquivo raiz, cada skill em `.claude/skills/`, cada
     agente em `.claude/agents/`, e o espelho correspondente nas outras
     ferramentas (quando existir).
   - Para cada artefato, calcula hash atual dos lados existentes e compara
     com o manifesto.
   - Sem mudança em nenhum lado → nada a fazer.
   - Mudança em um lado só → traduz para os outros usando os schemas de
     referência, mostra um resumo do que vai ser escrito, aplica **após
     aprovação explícita**, atualiza o manifesto.
   - Mudança em dois ou mais lados desde o último sync → **nunca decide
     sozinho**; mostra os lados em conflito lado a lado e pergunta como
     proceder (escolher um lado, ou você funde manualmente).
   - Antes de escrever em `~/.hermes/skills/` (fora do repo, global ao
     usuário): avisa explicitamente que aquilo passa a valer em qualquer
     projeto aberto com Hermes, não só este, e sugere prefixar o nome da
     skill gerada com `caveo-` para ficar identificável/removível depois.
   - Ao final, roda uma checagem de sanidade (frontmatter parseável nos 4
     formatos, nenhum placeholder tipo `Codex.ai/code` sobrando) e reporta
     o resumo do que mudou — mesmo espírito do `npm run docs:check` já
     usado no projeto para `business-rules.ts` → `fundacao-dados.md`.
4. **Agente `.claude/agents/guardiao-multi-ia.md`** — persona que executa a
   skill acima quando o orquestrador aciona.
5. **Comando `.claude/commands/sync-agentes.md`** — invólucro fino que
   invoca a skill, seguindo o padrão já usado pelas outras 15 skills do
   projeto (`docs/projeto-mapa.md`, "um `.md` por skill").
6. **CLAUDE.md (Papel 2, Guardião de organização)** — ganha uma linha nova:
   sempre que uma skill, agente ou regra de orquestração for criada ou
   editada na sessão, sugerir rodar `/sync-agentes` antes de encerrar,
   citando o que mudou. A sugestão é automática; a execução não é.

## Fluxo de dados

**Criação nova:** você (ou o orquestrador) cria/edita algo em `.claude/`. Ao
final da resposta, o orquestrador cita explicitamente: "criei/editei X —
rodar `/sync-agentes` agora?". Você aceita → guardião traduz pros outros
formatos aplicáveis → aplica após você revisar o resumo → atualiza o
manifesto.

**Reconciliação avulsa:** você roda `/sync-agentes` a qualquer momento (ex.:
editou um agente direto em `.gemini/agents/` sem passar pelo Claude).
Guardião detecta que só o lado Gemini mudou, traduz de volta para
`.claude/agents/*.md` e propaga para Codex/Hermes.

## Riscos e limitações assumidas

- **Hermes não tem paridade real de agente isolado** — vira skill + template
  de `delegate_task`, sempre rotulado como aproximação, nunca apresentado
  como equivalente funcional.
- **Skills do Hermes são globais ao usuário, não por projeto** — sincronizar
  gera efeito colateral fora do repo (visível em outros projetos Hermes).
  Mitigado por prefixo `caveo-*` + aviso explícito antes de escrever.
- **Schemas de Codex/Gemini são recentes e podem mudar rápido** (um deles
  veio de blog de terceiro, não doc oficial) — os arquivos de referência em
  `docs/agentic-sync/schemas/` precisam de revisão periódica; o guardião
  sinaliza quando encontra campo desconhecido, mas não garante estar sempre
  atualizado sozinho.
- **`.codex/agents/*.toml` só carrega se o projeto for "trusted"** pelo
  Codex CLI — fora do controle deste guardião; documentar como pré-requisito
  operacional, não tentar automatizar o trust.

## Decisões (registradas durante o brainstorm)

1. Escopo da tradução: raiz **+** skills/agents individuais (não só o
   arquivo raiz).
2. Fonte da verdade: **bidirecional** — qualquer uma das 4 ferramentas pode
   originar uma edição; o guardião reconcilia a partir do que encontra no
   disco, sem uma fonte única fixa.
3. Gatilho: **sob demanda**, nunca automático via hook silencioso; o
   orquestrador sugere a cada criação/edição, mas a execução exige
   confirmação explícita e nunca sobrescreve sozinho em caso de conflito.
4. Tradução de agentes: **mapeamento nativo por ferramenta** (não uma versão
   documental genérica) onde a ferramenta suportar — Hermes é a exceção
   documentada por não ter o conceito nativo.
5. Mecanismo de tradução: **guardião agêntico** (skill que traduz usando
   docs de referência), não um compilador determinístico em código nem um
   modelo de espinha dorsal + overlay.

## Verificação (pós-implementação)

- `docs/agentic-sync/schemas/*.md` existem e batem com o que foi validado
  nesta sessão (tabela acima).
- `AGENTS.md` da raiz deixa de ter o conteúdo genérico desatualizado e passa
  a refletir o `CLAUDE.md` atual (orquestrador, 5 agentes, roteamento).
- `.gemini/settings.json` configurado com `context.fileName` incluindo
  `AGENTS.md`.
- Rodar `/sync-agentes` uma vez do zero deixa o manifesto consistente com o
  estado atual de todos os artefatos existentes (`.claude/skills/`,
  `.claude/agents/`).
- Criar uma skill nova de teste e confirmar que o orquestrador sugere
  `/sync-agentes` ao final da sessão.
- Simular conflito (editar o mesmo artefato em dois lados) e confirmar que o
  guardião para e pede decisão humana em vez de escolher sozinho.
