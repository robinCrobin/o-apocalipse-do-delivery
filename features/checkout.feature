# language: pt

Funcionalidade: Processamento de Pedidos e Checkout
  Como a plataforma EntregasJá
  Quero processar o pagamento dos pedidos de forma resiliente
  Para garantir que a Black Friday não derrube o sistema por exaustão de threads

  Contexto:
    Dado um pedido válido com e-mail "cliente@entregasja.com", valor 150.00 e um cartão preenchido

  # ---------------------------------------------------------------------------
  # CB1 — Caminho feliz (V(G): caminho-base 1)
  # ---------------------------------------------------------------------------
  Cenário: Pagamento aprovado dispara confirmação por e-mail
    Dado que o gateway de pagamento responde "APROVADO"
    Quando o pedido for processado
    Então o status do pedido deve ser "PROCESSADO"
    E o pedido deve ser salvo no repositório
    E um e-mail de confirmação deve ser enviado para "cliente@entregasja.com"
    E a resposta HTTP deve ser "200"

  # ---------------------------------------------------------------------------
  # CB2 — Falha de negócio: cartão recusado (caminho-base 2)
  # ---------------------------------------------------------------------------
  Cenário: Cartão recusado não dispara e-mail de confirmação
    Dado que o gateway de pagamento responde "RECUSADO"
    Quando o pedido for processado
    Então o status do pedido deve ser "FALHOU"
    E o pedido deve ser salvo no repositório
    Mas nenhum e-mail de confirmação deve ser enviado
    E a resposta HTTP deve ser "500"

  # ---------------------------------------------------------------------------
  # CB3 — Falha de infraestrutura e resiliência (caminho-base 3 + RN04/05/06/07)
  # ---------------------------------------------------------------------------
  Cenário: Timeout do gateway aciona retentativa com sucesso
    Dado que a primeira chamada ao gateway excede o timeout de 2000ms
    E que a segunda tentativa responde "APROVADO"
    Quando o pedido for processado
    Então o sistema deve aguardar 500ms de backoff antes da retentativa
    E o status do pedido deve ser "PROCESSADO"
    E a resposta HTTP deve ser "200"

  Cenário: Caos total esgota as retentativas e aciona o fallback
    Dado que o gateway de pagamento falha em todas as tentativas
    Quando o pedido for processado
    Então o sistema deve tentar a cobrança no máximo 3 vezes
    E o status do pedido deve ser "ERRO_GATEWAY"
    E o pedido deve ser salvo no repositório
    E nenhuma exceção não tratada deve derrubar o processo
    E a resposta HTTP deve ser "500"

  Cenário: Circuit breaker aberto responde em fallback sem chamar o gateway
    Dado que o circuit breaker está aberto por taxa de erro acima de 50%
    Quando o pedido for processado
    Então o gateway de pagamento não deve ser chamado
    E o status do pedido deve ser "ERRO_GATEWAY"
    E a resposta HTTP deve ser "500"

  # ---------------------------------------------------------------------------
  # RN01 — Validação de entrada (caminho de contrato, retorna 400)
  # ---------------------------------------------------------------------------
  Esquema do Cenário: Payload inválido é rejeitado antes de processar
    Dado um pedido com o campo "<campo>" igual a "<valor>"
    Quando o pedido for processado
    Então a resposta HTTP deve ser "400"
    E o gateway de pagamento não deve ser chamado
    E o repositório de pedidos não deve ser acessado

    Exemplos:
      | campo        | valor   |
      | clienteEmail |         |
      | clienteEmail | semarroba |
      | valor        | 0       |
      | valor        | -10     |
      | cartao       |         |
