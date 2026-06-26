class CheckoutService {
  constructor(gateway, repository, emailService) {
    this.gateway = gateway;
    this.repository = repository;
    this.emailService = emailService;


    this.failures = 0;
    this.circuitOpen = false;
  }


  async processar(pedido) {
    if (!this.isValid(pedido)) {
      return { status: 'INVALIDO' };
    }

    if (this.circuitOpen) {
      return this.fallback(pedido);
    }

    try {
      const resposta = await this.tentarPagamento(pedido);

      return await this.processarResposta(resposta, pedido);
    } catch (err) {
      return await this.handleFailure(pedido, err);
    }
  }

  isValid(pedido) {
    return (
      pedido?.clienteEmail?.includes('@') &&
      pedido?.valor > 0 &&
      pedido?.cartao
    );
  }

  async tentarPagamento(pedido) {
    let lastError;

    for (let i = 0; i < 3; i++) {
      try {
        if (i > 0) await this.delay(500);
        return await this.gateway.cobrar(pedido.valor, pedido.cartao);
      } catch (err) {
        this.failures++;

        if (this.failures >= 3) {
          this.circuitOpen = true;
          throw err;
        }
        lastError = err;
      }
    }

    throw lastError;
  }

  async processarResposta(resposta, pedido) {
    if (resposta.status === 'APROVADO') {
      return await this.sucesso(pedido);
    }
    return await this.negocioFalhou(pedido);
  }


  async sucesso(pedido) {
    pedido.status = 'PROCESSADO';
    const salvo = await this.repository.salvar(pedido);

    await this.emailService.enviarConfirmacao(
      pedido.clienteEmail,
      'Pagamento Aprovado'
    );

    return salvo;
  }

  async negocioFalhou(pedido) {
    pedido.status = 'FALHOU';
    await this.repository.salvar(pedido);
    return pedido;
  }

  async handleFailure(pedido) {
    return this.fallback(pedido);
  }

  async fallback(pedido) {
    pedido.status = 'ERRO_GATEWAY';
    await this.repository.salvar(pedido);
    return pedido;
  }

  delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
}

module.exports = { CheckoutService };
