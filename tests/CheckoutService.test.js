const { CheckoutService } = require("../src/services/CheckoutService");
const { PedidoBuilder } = require("./builders/PedidoBuilder");


describe('CheckoutService - Gherkin BDD', () => {
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


  // ---------------- CB1 ----------------
  test('Pagamento aprovado dispara email e salva pedido', async () => {
    gatewayStub.cobrar.mockResolvedValue({ status: 'APROVADO' });


    const pedido = new PedidoBuilder().build();


    const result = await service.processar(pedido);


    expect(result.status).toBe('PROCESSADO');
    expect(repoMock.salvar).toHaveBeenCalled();
    expect(emailMock.enviarConfirmacao).toHaveBeenCalledWith(
      pedido.clienteEmail,
      expect.any(String)
    );
  });


  // ---------------- CB2 ----------------
  test('Cartão recusado não envia email', async () => {
    gatewayStub.cobrar.mockResolvedValue({ status: 'RECUSADO' });


    const pedido = new PedidoBuilder().build();


    const result = await service.processar(pedido);


    expect(result.status).toBe('FALHOU');
    expect(repoMock.salvar).toHaveBeenCalled();
    expect(emailMock.enviarConfirmacao).not.toHaveBeenCalled();
  });


  // ---------------- CB3 retry ----------------
  test('Retry com sucesso após timeout', async () => {
    gatewayStub.cobrar
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ status: 'APROVADO' });


    const pedido = new PedidoBuilder().build();


    const result = await service.processar(pedido);


    expect(result.status).toBe('PROCESSADO');
    expect(gatewayStub.cobrar).toHaveBeenCalledTimes(2);
  });


  // ---------------- fallback ----------------
  test('Falha total ativa fallback', async () => {
    gatewayStub.cobrar.mockRejectedValue(new Error('fail'));


    const pedido = new PedidoBuilder().build();


    const result = await service.processar(pedido);


    expect(result.status).toBe('ERRO_GATEWAY');
    expect(gatewayStub.cobrar).toHaveBeenCalledTimes(3);
  });


  // ---------------- circuit breaker ----------------
  test('Circuit breaker impede chamada ao gateway', async () => {
    gatewayStub.cobrar.mockRejectedValue(new Error('fail'));


    const pedido = new PedidoBuilder().build();


    await service.processar(pedido);
    await service.processar(pedido);
    await service.processar(pedido);


    const result = await service.processar(pedido);


    expect(gatewayStub.cobrar).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('ERRO_GATEWAY');
  });


  // ---------------- validação ----------------
  test('Pedido inválido retorna 400 (pré-validação)', async () => {
    const pedido = new PedidoBuilder().comEmail('').build();


    const result = await service.processar(pedido);


    expect(result.status).toBe('INVALIDO');
    expect(gatewayStub.cobrar).not.toHaveBeenCalled();
  });
});

