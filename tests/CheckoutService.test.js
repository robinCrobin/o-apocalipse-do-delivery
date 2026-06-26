const { CheckoutService } = require("../src/services/CheckoutService");
const { PedidoBuilder } = require("./builders/PedidoBuilder");

describe('Teste da classe CheckoutService', () => {
  let gatewayStub;
  let repoMock;
  let emailMock;
  let service;

  beforeEach(() => {
    gatewayStub = {
      cobrar: jest.fn()
    };

    repoMock = {
      salvar: jest.fn(p => Promise.resolve({ ...p, id: 1 }))
    };

    emailMock = {
      enviarConfirmacao: jest.fn()
    };

    service = new CheckoutService(gatewayStub, repoMock, emailMock);
  });

  test('Pagamento aprovado dispara email e salva pedido', async () => {
    gatewayStub.cobrar.mockResolvedValue({ status: 'APROVADO' });

    const pedido = new PedidoBuilder().build();
    const result = await service.processar(pedido);

    expect(result.status).toBe('PROCESSADO');
    expect(repoMock.salvar).toHaveBeenCalled();
    expect(emailMock.enviarConfirmacao).toHaveBeenCalledWith(
      pedido.clienteEmail,
      'Pagamento Aprovado'
    );
  });

  test('Cartão recusado salva pedido e não envia email', async () => {
    gatewayStub.cobrar.mockResolvedValue({ status: 'RECUSADO' });

    const pedido = new PedidoBuilder().build();
    const result = await service.processar(pedido);

    expect(result.status).toBe('FALHOU');
    expect(repoMock.salvar).toHaveBeenCalled();
    expect(emailMock.enviarConfirmacao).not.toHaveBeenCalled();
  });

  test('Retry com sucesso após timeout', async () => {
    gatewayStub.cobrar
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ status: 'APROVADO' });

    const pedido = new PedidoBuilder().build();
    const result = await service.processar(pedido);

    expect(result.status).toBe('PROCESSADO');
    expect(gatewayStub.cobrar).toHaveBeenCalledTimes(2);
  });

  test('Falha total ativa fallback após 3 tentativas', async () => {
    gatewayStub.cobrar.mockRejectedValue(new Error('fail'));

    const pedido = new PedidoBuilder().build();
    const result = await service.processar(pedido);

    expect(result.status).toBe('ERRO_GATEWAY');
    expect(gatewayStub.cobrar).toHaveBeenCalledTimes(3);
    expect(repoMock.salvar).toHaveBeenCalled();
  });

  test('Falha no gateway aciona fallback e marca pedido como ERRO_GATEWAY', async () => {
    gatewayStub.cobrar.mockRejectedValue(new Error('fail'));
    const pedido = new PedidoBuilder().build();
    await service.processar(pedido);
    const result = await service.processar(pedido);

    expect(result.status).toBe('ERRO_GATEWAY');
    expect(gatewayStub.cobrar).toHaveBeenCalledTimes(3);
  });

  test('Retry aguarda 500ms antes das tentativas extras', async () => {
    const spyDelay = jest.spyOn(service, 'delay').mockResolvedValue();

    gatewayStub.cobrar.mockRejectedValue(new Error('fail'));

    const pedido = new PedidoBuilder().build();

    await service.processar(pedido);

    expect(spyDelay).toHaveBeenCalledTimes(2);
    expect(spyDelay).toHaveBeenCalledWith(500);
  });

  test('Pedido sem objeto deve ser inválido', async () => {
    const resultNull = await service.processar(null);
    const resultUndefined = await service.processar(undefined);

    expect(resultNull.status).toBe('INVALIDO');
    expect(resultUndefined.status).toBe('INVALIDO');
    expect(gatewayStub.cobrar).not.toHaveBeenCalled();
    expect(repoMock.salvar).not.toHaveBeenCalled();
    expect(emailMock.enviarConfirmacao).not.toHaveBeenCalled();
  });

  test('Pedido com email inválido deve ser inválido', async () => {
    const pedidoSemEmail = new PedidoBuilder().build();
    delete pedidoSemEmail.clienteEmail;

    const pedidoEmailNull = new PedidoBuilder().build();
    pedidoEmailNull.clienteEmail = null;

    const pedidoEmailVazio = new PedidoBuilder().comEmail('').build();
    const pedidoEmailSemArroba = new PedidoBuilder().comEmail('email_invalido').build();

    expect((await service.processar(pedidoSemEmail)).status).toBe('INVALIDO');
    expect((await service.processar(pedidoEmailNull)).status).toBe('INVALIDO');
    expect((await service.processar(pedidoEmailVazio)).status).toBe('INVALIDO');
    expect((await service.processar(pedidoEmailSemArroba)).status).toBe('INVALIDO');

    expect(gatewayStub.cobrar).not.toHaveBeenCalled();
  });

  test('Pedido com valor inválido deve ser inválido', async () => {
    const pedidoValorZero = new PedidoBuilder().comValor(0).build();
    const pedidoValorNegativo = new PedidoBuilder().comValor(-10).build();

    expect((await service.processar(pedidoValorZero)).status).toBe('INVALIDO');
    expect((await service.processar(pedidoValorNegativo)).status).toBe('INVALIDO');

    expect(gatewayStub.cobrar).not.toHaveBeenCalled();
  });

  test('Pedido sem cartão deve ser inválido', async () => {
    const pedido = new PedidoBuilder().build();
    delete pedido.cartao;

    const result = await service.processar(pedido);

    expect(result.status).toBe('INVALIDO');
    expect(gatewayStub.cobrar).not.toHaveBeenCalled();
  });

  test('delay retorna uma Promise que resolve após o tempo informado', async () => {
    jest.useFakeTimers();

    let resolvido = false;

    const promise = service.delay(500).then(() => {
      resolvido = true;
    });

    await Promise.resolve();

    expect(resolvido).toBe(false);

    jest.advanceTimersByTime(499);

    await Promise.resolve();

    expect(resolvido).toBe(false);

    jest.advanceTimersByTime(1);
    await promise;

    expect(resolvido).toBe(true);

    jest.useRealTimers();
  });

  test('retry não passa de 3 tentativas', async () => {
    service.failures = -10;
    jest.spyOn(service, 'delay').mockResolvedValue();

    gatewayStub.cobrar.mockRejectedValue(new Error('fail'));

    const pedido = new PedidoBuilder().build();
    const result = await service.processar(pedido);

    expect(result.status).toBe('ERRO_GATEWAY');
    expect(gatewayStub.cobrar).toHaveBeenCalledTimes(3);
  });
  
});