# Sistema de Agentes + Orquestrador — Design

> Subprojeto 2 de 5 da reformulação do Caveo Analyst AI.
> Depende do subprojeto 1 (Fundação de dados). Data: 2026-07-16

## Contexto

Hoje existe um único agente (`analista-midia-paga-crm`) que menciona 3 "agentes
conectados" (Criativos, Inside Sales, Tracking) que nunca foram criados — são
referências aspiracionais. Não há orquestrador nem contrato de handoff. Este
subprojeto define o elenco real de agentes, um orquestrador (que também é o
"guardião de organização" do projeto), e o formato de passagem de bastão entre
agentes.

## Decisões de escopo

- **Modelo de interação: híbrido.** Tarefas óbvias/de domínio único vão direto
  ao especialista; tarefas ambíguas ou multi-domínio passam pelo orquestrador.
- **Síntese: resposta única.** Quando o orquestrador aciona vários
  especialistas, ele funde os diagnósticos em UMA análise consolidada
  (resolve contradições, prioriza), não devolve blocos separados.
- **Inside Sales/CRM foi fundido no analista de mídia** (não é agente
  separado).
- **Análise de criativo é um modo dentro do analista de mídia**; a
  ideação/criação de conceitos é um agente separado (`criativos`).

## Elenco de agentes (subagentes em `.claude/agents/`)

### analista-midia-paga-crm (expandido)
- **Faz:** mídia paga Meta/Google + CRM/Inside Sales fundidos (funil pós-lead,
  gargalos comerciais) + modo de diagnóstico de criativo (qual criativo
  performa com bom CTR/MQL vs. traz volume ruim/muitas perdas — "linha de
  comunicação boa ou suja").
- **Não faz:** idear criativos novos; análise GA4; configurar tracking.
- **Fundação:** lê canal, estágio, contratante, duas datas, coorte.
- **Handoff:** quando o gargalo é de criativo → emite HANDOFF para `criativos`;
  quando há falha de medição/UTM → HANDOFF para `tracking-conversoes`.

### criativos (novo)
- **Faz:** recebe o diagnóstico do analista e ideia conceitos novos (ângulos,
  dores/desejos RF/MM, copy). Usa os docs existentes: `Dores_Desejos_Publicos`,
  `personas_medico_maduro`, `personas_recem_formados`, `Ideias_Criativos`,
  `Hero_Variacoes_Copy_LP`.
- **Não faz:** analisar dados de performance (parte do diagnóstico recebido).

### tracking-conversoes (novo)
- **Faz:** captura de click IDs, conversões server-side, reconciliação
  (operacionaliza a skill `conversoes-oportunidade`) **+ domínio técnico
  profundo de Google Tag Manager**: implementação e manutenção de variáveis,
  tags e triggers; auditoria da estrutura do container.
- **Não faz:** análise de performance; recomendação de budget; ideação de
  criativo.
- **Ferramentas:** MCP `gtm`, MCP `salesforce`. Lê filtro de canal pago da
  fundação para reconciliação.
- É o agente "técnico de medição": lado server-side (conversões por
  oportunidade) + lado client-side/GTM (o que a LP captura, disparo de tags,
  manutenção de container).

### ga4-analise (novo)
- **Faz:** análise de comportamento no site/LP via GA4.
- **Não faz:** dados de plataforma de anúncio (isso é do analista de mídia).
- **Depende do MCP de GA4** (subprojeto 5).

## Orquestrador (camada raiz — Abordagem 1)

**Realização técnica:** o orquestrador NÃO é um subagente. É o comportamento
da sessão principal (raiz), porque no Claude Code só a raiz dispara subagentes
e sintetiza de forma limpa (subagentes não invocam subagentes bem). Definido
por:
- regras de roteamento no `CLAUDE.md`;
- o manifesto `docs/projeto-mapa.md`.

**Dois modos:**

1. **Análise/roteamento** — recebe a pergunta, decide o(s) especialista(s),
   dispara subagente(s) via ferramenta Agent, sintetiza em resposta única.
2. **Guardião de organização** — quatro responsabilidades:
   - Zelar pela estrutura de pastas/arquivos (novos specs/docs/skills/agentes
     no lugar certo; sinalizar o que está fora do padrão).
   - Manter fundação e docs sincronizados (rodar `docs:check`; avisar quem
     precisa atualizar quando uma regra muda).
   - Registrar decisões e evitar duplicação ("isso já existe em X").
   - Onboarding / mapa vivo do projeto (onde está o quê, como as peças se
     conectam).

### Manifesto `docs/projeto-mapa.md`
Conteúdo:
- Índice de agentes: nome, escopo, quando invocar, o que NÃO faz.
- Índice de skills.
- Convenções de estrutura de pastas (onde vão specs, docs, agentes, config).
- Regras de roteamento: que sinais mandam para qual agente.
- Contém uma seção com o "esqueleto do projeto" (árvore de pastas/arquivos) —
  o mesmo esqueleto pedido para o final da reformulação.

## Contrato de handoff entre agentes

Bloco textual leve que o agente emissor coloca ao final da sua resposta; o
orquestrador (raiz) lê e aciona o agente destino com esse contexto.

Exemplo analista → criativos:
```
HANDOFF → criativos
Criativo: [nome/utm_content] | CTR: 0,6% (🔴) | MQL: baixo | Perdas concentradas: sim
Hipótese: comunicação não conecta com a dor do público MM
```

Exemplo analista → tracking-conversoes (>15% leads sem UTM ou click IDs
faltando): mesmo padrão, campos adaptados (taxa de leads sem UTM, campos de
click ID ausentes, etc.).

## Fora de escopo (outros subprojetos)
- MCP de GA4 → subprojeto 5.
- Reescrita das skills para ler a fundação → subprojeto 4.
- Componente de coorte no dashboard → subprojeto 3.
