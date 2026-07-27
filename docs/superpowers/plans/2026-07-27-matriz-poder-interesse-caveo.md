# Matriz Poder-Interesse Stakeholders Caveo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o documento de referência da matriz poder-interesse dos stakeholders da Caveo e linká-lo no mapa do projeto.

**Architecture:** Duas edições de markdown — um novo doc de referência em `docs/` e uma linha adicionada ao índice existente `docs/projeto-mapa.md`. Sem código, sem dependências de runtime.

**Tech Stack:** Markdown, git.

## Global Constraints

- Documento final em `docs/matriz-poder-interesse-caveo.md` (spec: `docs/superpowers/specs/2026-07-27-matriz-poder-interesse-caveo-design.md`)
- Segue o padrão de nomenclatura de `personas_*.md`, `Dores_Desejos_Publicos_Caveo.md`
- Referenciado em `docs/projeto-mapa.md`, na linha de docs estratégicos (~linha 103)
- Cada stakeholder tem: nome/cargo, quadrante, contato (frequência/canal), tom, risco, histórico
- Classificação já validada com o usuário: Matheus = Gerenciar de Perto; Wilgo e Pedro = Manter Satisfeito; Paolla = Manter Informado; Lucas = Monitorar

---

### Task 1: Criar `docs/matriz-poder-interesse-caveo.md`

**Files:**
- Create: `docs/matriz-poder-interesse-caveo.md`

**Interfaces:**
- Produces: arquivo markdown standalone, sem dependências de código. Task 2 referencia este arquivo pelo path `docs/matriz-poder-interesse-caveo.md`.

- [ ] **Step 1: Escrever o arquivo com o conteúdo completo**

Conteúdo integral do arquivo:

```markdown
# Matriz Poder × Interesse — Stakeholders Caveo

> Documento de referência para a Boomer sobre como se relacionar com os
> principais stakeholders do lado do cliente (Caveo): frequência e canal de
> contato, tom recomendado, riscos de atenção e histórico de mudança de
> papel.
>
> Última atualização: 2026-07-27

## Matriz

| | Baixo Interesse | Alto Interesse |
|---|---|---|
| **Alto Poder** | **Manter Satisfeito** — Wilgo (CEO), Pedro (Gerente) | **Gerenciar de Perto** — Matheus (Head de Growth) |
| **Baixo Poder** | **Monitorar** — Lucas (ex-ponto focal) | **Manter Informado** — Paolla (Conteúdo) |

## Stakeholders

### Matheus — Head de Growth (ponto focal)
- **Quadrante:** Gerenciar de Perto (alto poder, alto interesse)
- **Contato:** frequente (semanal), canal direto — WhatsApp/reunião
- **Tom:** parceiro operacional próximo; pode entrar em detalhe tático e estratégico
- **Risco:** é novo no cargo — pode não conhecer todo o histórico do projeto; nivelar contexto quando relevante
- **Histórico:** assumiu como ponto focal recentemente (2026-07), substituindo Lucas

### Wilgo — CEO
- **Quadrante:** Manter Satisfeito (alto poder, baixo interesse)
- **Contato:** esporádico, só em marcos importantes (resultados grandes, decisões estratégicas); preferencialmente mediado por Matheus
- **Tom:** foco em resultado de negócio e impacto, não em detalhe operacional
- **Risco:** baixo engajamento histórico (1 contato até hoje) — não assumir familiaridade com o dia a dia do projeto
- **Histórico:** —

### Pedro — Gerente
- **Quadrante:** Manter Satisfeito (alto poder, baixo interesse)
- **Contato:** presente em algumas reuniões, mas distante do dia a dia; recebe reportes (antes via Lucas, agora via Matheus)
- **Tom:** reportes objetivos e curtos, focados em números e status
- **Risco:** pouco contexto acumulado — evitar assumir que acompanhou decisões anteriores
- **Histórico:** —

### Paolla — Equipe de Conteúdo
- **Quadrante:** Manter Informado (baixo poder formal, alto interesse)
- **Contato:** recorrente, ligado ao ciclo de produção de criativos (revisão de copy, aprovação antes de subir anúncio)
- **Tom:** colaborativo, nível de detalhe de conteúdo/copy
- **Risco:** gargalo de aprovação se o ciclo de revisão não for antecipado
- **Histórico:** —

### Lucas — Ex-ponto focal
- **Quadrante:** Monitorar (baixo poder, baixo interesse)
- **Contato:** esporádico, sob demanda
- **Tom:** técnico — pode voltar a ser referência pontual em temas de engenharia/automação
- **Risco:** pode sair do radar completamente; reavaliar se ainda faz sentido mantê-lo na matriz em revisões futuras
- **Histórico:** era o ponto focal do projeto; entrou como "quebra-galho" para atender a Boomer; migrou para a área de engenharia e automação com IA; Matheus assumiu o papel de ponto focal em seu lugar (2026-07)

## Manutenção

Atualizar manualmente conforme os papéis mudam do lado da Caveo: revisar
quadrante, contato e adicionar entrada em "Histórico" do stakeholder
afetado.
```

- [ ] **Step 2: Verificar a formatação**

Run: `grep -c '^|' docs/matriz-poder-interesse-caveo.md`
Expected: `3` (as 3 linhas da tabela da matriz — cabeçalho, separador, 2 linhas de dados na verdade são 3: header + separator + 2 data rows = 4). Conferir manualmente que a tabela tem 4 linhas iniciadas com `|` (1 cabeçalho + 1 separador + 2 linhas de dados) e que todas as 5 seções `###` de stakeholder estão presentes:

Run: `grep -c '^### ' docs/matriz-poder-interesse-caveo.md`
Expected: `5`

- [ ] **Step 3: Commit**

```bash
git add docs/matriz-poder-interesse-caveo.md
git commit -m "docs(caveo): adiciona matriz poder-interesse dos stakeholders do cliente"
```

---

### Task 2: Referenciar o novo doc em `docs/projeto-mapa.md`

**Files:**
- Modify: `docs/projeto-mapa.md:103`

**Interfaces:**
- Consumes: `docs/matriz-poder-interesse-caveo.md` (produzido na Task 1) — apenas o nome do arquivo é citado, sem parsing.

- [ ] **Step 1: Editar a linha de docs estratégicos**

A linha atual (dentro do bloco de árvore de pastas, seção `docs/`):

```
│   └── (estratégicos: personas_*, Dores_Desejos, LP_*, Google_Ads_*, ...)
```

Substituir por:

```
│   └── (estratégicos: personas_*, Dores_Desejos, LP_*, Google_Ads_*, matriz-poder-interesse-caveo, ...)
```

- [ ] **Step 2: Conferir o diff**

Run: `git diff docs/projeto-mapa.md`
Expected: uma única linha modificada, adicionando `matriz-poder-interesse-caveo` à lista, sem nenhuma outra alteração no arquivo.

- [ ] **Step 3: Commit**

```bash
git add docs/projeto-mapa.md
git commit -m "docs(mapa): referencia a matriz poder-interesse de stakeholders Caveo"
```
