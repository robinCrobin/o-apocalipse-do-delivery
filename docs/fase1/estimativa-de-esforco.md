# Fase 1 — Documento Formal de Estimativa de Esforço de Teste

**Componente:** `CheckoutService` — Microsserviço de Processamento de Pedidos e Checkout
**Técnica de base:** Análise por **Pontos de Caso de Teste (Test Case Points — TCP)**, adaptada para teste de software, com Fator de Ajuste Técnico/Ambiental (TCAF).
**Escopo da estimativa:** esforço necessário para **testar por completo** a funcionalidade (projeto, automação, mutação e caos), conforme exigido na Fase 1.

---

## 1. Método de estimativa adotado

A técnica de **Pontos de Caso de Teste** atribui um peso de complexidade a cada
caso de teste planejado a partir dos requisitos. O total bruto é ajustado por
fatores técnicos/ambientais e convertido em horas-homem por uma taxa de
produtividade da equipe. As etapas são:

1. Levantar os casos de teste a partir dos Requisitos Funcionais e Não-Funcionais
   (DER `docs/especificacao.md`) e dos caminhos-base (GFC, V(G) = 3).
2. Classificar cada caso em **Simples (2)**, **Médio (4)** ou **Complexo (8)**.
3. Somar → **Pontos de Caso de Teste Não Ajustados (PCTNA)**.
4. Aplicar o **TCAF** (Fator de Ajuste de Complexidade Técnica e Ambiental).
5. Multiplicar pela **taxa de produtividade** (horas por ponto).
6. Distribuir o esforço por atividade e montar cronograma e recursos.

### Critério de classificação de complexidade

| Peso | Faixa | Critério (passos, setup, asserções, dependências) |
| :-- | :-- | :-- |
| **2 — Simples** | validação isolada | 1 dependência, sem I/O externo, ≤ 3 passos, 1 asserção |
| **4 — Médio** | fluxo de negócio | 2–3 dependências (stub/mock), I/O simulado, asserção de estado **e** de comportamento |
| **8 — Complexo** | resiliência / SRE | múltiplas dependências, controle de tempo, falhas injetadas, infraestrutura externa (k6/Toxiproxy) |

---

## 2. Inventário e classificação dos casos de teste

| ID | Caso de teste | Origem (RN/Fluxo) | Complexidade | Pontos |
| :-- | :-- | :-- | :-- | :-: |
| TC01 | Pagamento `APROVADO` → `PROCESSADO`, salva e envia e-mail | RN02 / CB1 | Médio | 4 |
| TC02 | Cartão `RECUSADO` → `FALHOU`, **sem** e-mail | RN03 / CB2 | Médio | 4 |
| TC03 | E-mail assíncrono não bloqueia a resposta HTTP | RN02 | Médio | 4 |
| TC04 | Mock: `enviarConfirmacao` chamado **só** no sucesso | RN02/RN03 | Médio | 4 |
| TC05 | Backoff fixo de 500ms entre retentativas | RN06 | Médio | 4 |
| TC06 | Payload sem `clienteEmail` → `400`, não chama gateway | RN01 / CB de contrato | Simples | 2 |
| TC07 | Payload com `valor <= 0` → `400` | RN01 | Simples | 2 |
| TC08 | Payload sem `cartao` → `400` | RN01 | Simples | 2 |
| TC09 | `clienteEmail` em formato inválido → `400` | RN01 | Simples | 2 |
| TC10 | Timeout de 2000ms no `cobrar` aciona retry | RN04/RN05 / CB3 | Complexo | 8 |
| TC11 | Retry recupera na 2ª tentativa → `PROCESSADO` | RN05 / Fluxo 3 | Complexo | 8 |
| TC12 | 3 retentativas esgotadas → `ERRO_GATEWAY` + `500` | RN05/RN07 / CB3 | Complexo | 8 |
| TC13 | Circuit breaker abre (>50% erro) → fallback | RN07 | Complexo | 8 |
| TC14 | Carga k6 (ramp-up/steady/ramp-down) — SLO p95 < 2500ms | RNF / Fase 4 | Complexo | 8 |
| TC15 | Thundering Herd: flush de cache + 10.000 req simultâneas | Fase 4 | Complexo | 8 |
| TC16 | Gateway Lento: +5000ms via Toxiproxy sob carga máxima | Fase 4 | Complexo | 8 |

### Totais por classe

| Classe | Qtd. | Peso | Subtotal |
| :-- | :-: | :-: | :-: |
| Simples | 4 | 2 | 8 |
| Médio | 5 | 4 | 20 |
| Complexo | 7 | 8 | 56 |
| **PCTNA (bruto)** | **16** | — | **84** |

---

## 3. Fator de Ajuste de Complexidade Técnica e Ambiental (TCAF)

Cada fator é pontuado de 0 (irrelevante) a 5 (forte influência) e ponderado.
O ajuste segue `TCAF = 0,85 + (0,01 × Σ(peso × grau))`.

| Fator | Peso | Grau (0–5) | Influência |
| :-- | :-: | :-: | :-: |
| Sistema distribuído / I/O-bound | 2 | 5 | 10 |
| Programação assíncrona (Promises/timeouts) | 1 | 5 | 5 |
| Ferramentas novas para a equipe (Stryker, k6, Toxiproxy) | 2 | 4 | 8 |
| Necessidade de ambiente de homologação + proxy | 1 | 4 | 4 |
| Meta rígida de Mutation Score ≥ 90% | 2 | 4 | 8 |
| Injeção de falhas / engenharia do caos | 1 | 5 | 5 |
| **Σ (peso × grau)** | | | **40** |

`TCAF = 0,85 + (0,01 × 40) = 1,25`

> **PCTA (ajustado) = 84 × 1,25 = 105 Pontos de Caso de Teste**

---

## 4. Conversão em horas-homem

A equipe é júnior e adotará várias ferramentas pela primeira vez, elevando a
taxa de produtividade. Adota-se **1,4 hora-homem por Ponto de Caso de Teste
ajustado** (cobrindo projeto, automação, execução, depuração e relatório).

> **Esforço total = 105 PCTA × 1,4 h/ponto = 147 horas-homem (≈ 147 h/h)**

### Distribuição por atividade

| Atividade | % | Horas-homem |
| :-- | :-: | :-: |
| Projeto de casos de teste + especificação Gherkin (BDD) | 15% | 22,0 |
| Automação unitária/integração (ciclo TDD + Builders/Mocks/Stubs) | 30% | 44,1 |
| Teste de mutação (execução Stryker + endurecimento p/ ≥90%) | 20% | 29,4 |
| Teste de carga e desempenho (scripts k6 + thresholds de SLO) | 15% | 22,1 |
| Engenharia do caos (Toxiproxy + cálculo de MTTR) | 12% | 17,6 |
| Análise de resultados, relatórios e vídeo de revisão técnica | 8% | 11,8 |
| **Total** | **100%** | **147,0** |

---

## 5. Recursos necessários

### 5.1 Recursos humanos

| Papel | Pessoas | Alocação | Responsabilidade principal |
| :-- | :-: | :-- | :-- |
| Analista de Testes / QA | 1 | Fase 1 + BDD | GFC, V(G), estimativa, cenários Gherkin |
| Desenvolvedor (TDD) | 1 | Fases 2 e 3 | Redesenho TDD, patterns, mutação |
| Engenheiro SRE | 1 | Fase 4 + resiliência | k6, Toxiproxy, circuit breaker, MTTR |

> Com 3 pessoas, **147 h/h ≈ 49 h por pessoa**, compatível com ~3 semanas em
> regime parcial (~16 h/semana cada).

### 5.2 Ferramentas e ambiente

| Categoria | Item |
| :-- | :-- |
| Execução de testes | Jest (unitário/integração), Cucumber.js (BDD/Gherkin) |
| Teste de mutação | Stryker.js (meta Mutation Score ≥ 90%) |
| Carga e desempenho | k6 ou Autocannon |
| Injeção de falhas | Toxiproxy (latência, queda de cache) |
| Ambiente | Node.js/Express em homologação simulada, Docker para proxies |
| Apoio | Git (repositório base), pipeline de CI, gravação do vídeo (8–12 min) |

---

## 6. Premissas e riscos da estimativa

- **Premissas:** ambiente de homologação disponível; gateway e banco continuam
  mockados; escopo restrito ao `CheckoutService` e à rota `/api/v1/checkout`.
- **Risco alto:** curva de aprendizado de Stryker/k6/Toxiproxy — já absorvida no
  TCAF (1,25). Atraso aqui impacta diretamente as Fases 3 e 4.
- **Risco médio:** mutantes equivalentes podem exigir esforço extra de análise
  para justificar (não para matar) — reservados nas 29,4 h da atividade de mutação.
- **Dependência crítica:** os cenários Gherkin (Fase 1) precisam estar prontos
  cedo, pois alimentam o ciclo TDD da Fase 2.
