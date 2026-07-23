# Catálogo de Campos — MCPs (Caveo)

> Mapa de campos disponíveis nas fontes externas (Salesforce, Meta, Google;
> GA4 pendente). Duplo uso: **referência** para montar queries (nomes exatos) e
> **mapa de possibilidades analíticas** (coluna "Usado hoje?" → campos que
> existem mas ainda não viram métrica). Mantido manualmente.
>
> Salesforce: levantado via `salesforce_describe` em 2026-07-17. Enriquecer com
> novos describes quando surgir necessidade.

## Salesforce — Opportunity

### Núcleo / funil (usados)
| Campo | Tipo | Descrição | Usado hoje? |
|---|---|---|---|
| `Id` | id | ID da oportunidade | ✅ |
| `Name` | string | Nome | ✅ |
| `StageName` | picklist | Fase do funil | ✅ |
| `Amount` | currency | Valor | ✅ (reconciliação/coorte) |
| `CloseDate` | date | Data de fechamento (prevista) | ⬜ |
| `CreatedDate` | datetime | Criação → entrada do funil (duas datas) | ✅ |
| `LastStageChangeDate` | datetime | Última mudança de fase → fechamento (duas datas) | ✅ |
| `IsWon` | boolean | Ganho (compõe `WON_CLAUSE`) | ✅ |
| `IsClosed` | boolean | Fechado | ⬜ |
| `LeadSource` | picklist | Origem (LP Turbo / LP MM) | ✅ (ponte LP) |
| `AccountId` / `Account.Name` | reference | Conta | ✅ (drill-down) |

### Atribuição — UTM + click ID (usados)
| Campo | Tipo | Descrição | Usado hoje? |
|---|---|---|---|
| `UtmSou__c` | string | UTM source | ✅ |
| `UtmMed__c` | string | UTM medium (cpc) | ✅ |
| `UtmCam__c` | string | UTM campaign | ✅ |
| `UtmCon__c` | string | UTM content (conjunto/criativo) | ✅ (campeões/defeitos) |
| `UtmTer__c` | string | UTM term (keyword) | ⬜ |
| `UrlUtm__c` | url | URL de entrada completa | ⬜ (trunca gclid) |
| `gclid__c` | string | Google Click ID | ✅ (cruzamento) |
| `gbraid__c` | string | Google GBRAID (iOS) | ✅ (cruzamento) |
| `wbraid__c` | string | Google WBRAID (iOS) | ⬜ |
| `fbclid__c` | string | Meta Click ID | ✅ (cruzamento) |
| `fbc__c` | string | Meta `_fbc` | ✅ (cruzamento) |
| `fbp__c` | string | Meta `_fbp` | ⬜ |
| `Consentimento_Marketing__c` | boolean | Consentimento LGPD | ✅ (conversões) |
| `Email_Lead__c` | string | E-mail (enhanced conversions) | ✅ |
| `Telefone_Lead__c` | string | Telefone | ⬜ |

### Segmentação
| Campo | Tipo | Descrição | Usado hoje? |
|---|---|---|---|
| `TipCte__c` | picklist | Segmento: `Formando` / `Médico` / `Revalida` | ✅ |
| `Tempo_de_Formado__c` | picklist | Recência do médico: `Vai se formar` / `Menos de 3 anos` / `Mais de 3 anos`; compõe RF/MM com `TipCte__c` (seção 4 da fundação) | ✅ |
| `MesFor__c` | string | "Mês de formatura" — vale "Já é formado" p/ todo médico; **não** serve de recência | ⬜ |

> **FLS:** `Tempo_de_Formado__c` (criado 21/07/2026) exige Read liberado ao
> usuário de integração do MCP; sem isso o SOQL retorna `INVALID_FIELD`.

### Campos NÃO usados de alto valor analítico (oportunidades)
| Campo | Tipo | Descrição | Ideia de uso |
|---|---|---|---|
| `MotPer__c` | picklist | Motivo Perda | análise de perdas por motivo × canal |
| `Canal_Origem__c` | string | Canal de Origem | validação cruzada da atribuição |
| `OriMac__c` | string | Origem macro | agrupamento de origem macro |
| `DesSer__c` | picklist | Serviço | mix de produto por campanha |
| `regime_tributario__c` | picklist | Regime Tributário | perfil fiscal do lead |
| `profissao__c` | picklist | Profissão | segmentação fina de público |
| `CgcMed__c` | picklist | Possui CNPJ médico? | qualificação PJ médico |
| `RenMen__c` | currency | Faturamento Mensal | valor/ticket potencial por origem |
| `Estado__c` | picklist | Estado | geografia do pipeline |
| `Porte__c` | picklist | Porte | porte da empresa |
| `jornadapj__c` | picklist | Jornada PJ | estágio de maturidade PJ |
| `Data_reuniao__c` / `StaReu__c` | date / picklist | Reunião e status | funil comercial (inside sales) |
| `Probability` | percent | Probabilidade | ponderação de pipeline |
| `Type` | picklist | Tipo de oportunidade | new vs. renovação |
| `AgeInDays` / `LastStageChangeInDays` | int | Idade / dias em fase | velocidade do funil |

> Campos operacionais internos (Nitzap/Sofia/CRM ops: `NitzapWhatsappId__c`,
> `Modo_Sofia__c`, `RegSof__c`, `GruWpp__c`, alterações contábeis, etc.) omitidos
> — baixo valor analítico de mídia.

## Salesforce — Lead
Espelha os campos UTM da Opportunity (`UtmSou__c`, `UtmMed__c`, `UtmCam__c`,
`UtmCon__c`, `UtmTer__c`, `UrlUtm__c`) + `Status`, `LeadSource`, `CreatedDate`,
`IsConverted`, `ConvertedDate`. Rodar `salesforce_describe Lead` para o
levantamento completo quando necessário.

## Meta Ads — `get_insights`
| Campo | Formato | Descrição | Usado hoje? |
|---|---|---|---|
| `spend` | float | Investimento | ✅ |
| `impressions` | int | Impressões | ✅ |
| `reach` | int | Alcance | ✅ (semanal) |
| `frequency` | float | Frequência média | ✅ (semanal) |
| `clicks` / `link_clicks` | int | Cliques (via `actions`) | ✅ |
| `ctr` | float | CTR | ✅ |
| `cpm` | float | CPM | ✅ |
| `cpc` | float | CPC | ⬜ |
| `actions[lead]` | array | Leads | ✅ |
| `actions[complete_registration]` | array | Cadastros completos | ✅ (KPI 2ário) |
| `actions[page_fan_add]` | array | Seguidores (Awareness KA) | ✅ (KA) |
| `cost_per_action_type` | array | Custo por ação | ⬜ |
| `campaign_name` / `adset_name` / `ad_name` | string | Nomes | ✅ |
| breakdown `publisher_platform` / `platform_position` | — | Placement | ✅ (KA/cruzamento) |

## Google Ads — `campaign` / `metrics`
| Campo | Formato | Descrição | Usado hoje? |
|---|---|---|---|
| `campaign.name` / `campaign.status` | — | Campanha | ✅ |
| `campaign.advertising_channel_type` | enum | Search/PMax/etc. | ✅ (KA) |
| `metrics.cost_micros` | int (÷1e6=BRL) | Investimento | ✅ |
| `metrics.impressions` / `clicks` / `ctr` | num | Volume | ✅ |
| `metrics.average_cpc` | int (÷1e6) | CPC médio | ✅ (semanal) |
| `metrics.conversions` | float | Conversões | ✅ |
| `metrics.cost_per_conversion` | int (÷1e6) | Custo/conversão | ⬜ |
| `metrics.search_impression_share` | ratio | Share de impressão (só Search) | ✅ (semanal) |
| `keyword_view` → `ad_group_criterion.keyword.text` | string | Keyword | ⬜ |

## GA4 — pendente
A levantar no subprojeto 3/5 (integração `lib/integrations/ga4.ts` + MCP GA4):
usuários, sessões, novos usuários, origem/canal, engajamento, tempo médio,
conversões, páginas, LP (tráfego/conversão/tempo por LP).
