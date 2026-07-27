# Design: Matriz Poder × Interesse — Stakeholders Caveo

Data: 2026-07-27

## Objetivo

Dar à Boomer uma referência central de como se relacionar com cada
stakeholder-chave do lado do cliente (Caveo): frequência e canal de contato,
tom recomendado, riscos de atenção especial — e manter rastreado como os
papéis mudam ao longo do tempo (a conta já trocou de ponto focal uma vez:
Lucas → Matheus).

Não é um documento de governança do projeto de desenvolvimento (agentes/skills
deste repo) — é sobre o relacionamento comercial/estratégico com a conta
Caveo. Não se conecta a agentes/skills nem é lido em runtime; é referência
humana.

## Localização

- Documento final: `docs/matriz-poder-interesse-caveo.md`
- Segue o mesmo padrão dos outros docs estratégicos do cliente
  (`personas_*.md`, `Dores_Desejos_Publicos_Caveo.md`)
- Referenciado em `docs/projeto-mapa.md`, na lista de docs estratégicos
  (linha ~103, junto de `personas_*, Dores_Desejos, LP_*, Google_Ads_*, ...`)

## Estrutura do documento

1. **Cabeçalho** — propósito do doc + data de última atualização
2. **Matriz visual** — tabela markdown 2×2 (Poder × Interesse) mostrando os
   4 quadrantes e quem está em cada um, para visão rápida
3. **Um card por stakeholder**, cada um com:
   - Nome e cargo atual
   - Quadrante
   - Frequência e canal de contato recomendado
   - Tom/abordagem recomendada
   - Riscos/atenção especial
   - Histórico (mudança de papel, quando houver — campo vazio/omitido se
     não houver histórico relevante)

## Classificação confirmada

| Nome | Cargo | Quadrante |
|---|---|---|
| Matheus | Head de Growth (novo) — ponto focal atual | Gerenciar de Perto (alto poder, alto interesse) |
| Wilgo | CEO | Manter Satisfeito (alto poder, baixo interesse) |
| Pedro | Gerente | Manter Satisfeito (alto poder, baixo interesse) |
| Paolla | Equipe de conteúdo — aprova copy/criativo | Manter Informado (baixo poder formal, alto interesse) |
| Lucas | Ex-ponto focal, migrou p/ engenharia/automação IA | Monitorar (baixo poder, baixo interesse) |

Classificação validada com o usuário via companion visual (matriz 2×2
renderizada em navegador) — Paolla e Pedro confirmados nos quadrantes
inicialmente propostos.

## Conteúdo por stakeholder (rascunho a ser refinado no doc final)

**Matheus — Head de Growth, ponto focal**
- Contato: frequente (semanal), canal direto (WhatsApp/reunião)
- Tom: parceiro operacional próximo — pode entrar em detalhe tático e
  estratégico
- Risco: é novo no cargo — pode não conhecer todo o histórico do projeto;
  nivelar contexto quando relevante
- Histórico: assumiu como ponto focal recentemente, substituindo Lucas

**Wilgo — CEO**
- Contato: esporádico, só em marcos importantes (resultados grandes,
  decisões estratégicas); preferencialmente mediado por Matheus
- Tom: focar em resultado de negócio e impacto, não em detalhe operacional
- Risco: baixo engajamento histórico (1 contato até hoje) — não assumir
  familiaridade com o dia a dia do projeto
- Histórico: —

**Pedro — Gerente**
- Contato: presente em algumas reuniões, mas distante do dia a dia; recebe
  reportes (antes via Lucas, agora via Matheus)
- Tom: reportes objetivos e curtos, focados em números e status
- Risco: pouco contexto acumulado — evitar assumir que acompanhou decisões
  anteriores
- Histórico: —

**Paolla — Equipe de conteúdo**
- Contato: recorrente, ligado ao ciclo de produção de criativos (revisão de
  copy, aprovação antes de subir anúncio)
- Tom: colaborativo, nível de detalhe de conteúdo/copy
- Risco: gargalo de aprovação se o ciclo de revisão não for antecipado
- Histórico: —

**Lucas — Ex-ponto focal**
- Contato: esporádico, sob demanda
- Tom: técnico — pode voltar a ser referência pontual em temas de
  engenharia/automação
- Risco: pode sair do radar completamente; reavaliar se ainda faz sentido
  mantê-lo na matriz em revisões futuras
- Histórico: era o ponto focal do projeto; entrou como "quebra-galho" para
  atender a Boomer; migrou para a área de engenharia e automação com IA;
  Matheus assumiu o papel de ponto focal em seu lugar (2026-07)

## Manutenção

Documento é atualizado manualmente pela Boomer conforme os papéis mudam do
lado da Caveo. Cada mudança de papel deve atualizar o campo "Histórico" do
stakeholder afetado e, se necessário, sua reclassificação de quadrante.
