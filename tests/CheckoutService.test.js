const { CheckoutService } = require('../src/services/CheckoutService');
const { PedidoBuilder } = require('./builders/PedidoBuilder');

describe('CheckoutService - Processamento de Pedidos e Checkout', () => {
  let gatewayPagamentoStub;
  let pedidoRepositoryStub;
  let emailServiceMock;
  let checkoutService;

  beforeEach(() => {
    gatewayPagamentoStub = { cobrar: jest.fn() };
    pedidoRepositoryStub = { salvar: jest.fn(pedido => Promise.resolve(pedido)) };
    emailServiceMock = { enviarConfirmacao: jest.fn() };

    checkoutService = new CheckoutService(
      gatewayPagamentoStub,
      pedidoRepositoryStub,
      emailServiceMock
    );
  });

  describe('Quando o pagamento é aprovado', () => {
    it('Deve aprovar o pagamento, salvar o pedido e disparar e-mail de confirmação', async () => {
      // Arrange (Dado)
      const pedido = new PedidoBuilder().build();
      gatewayPagamentoStub.cobrar.mockResolvedValue({ status: 'APROVADO' });

      // Act (Quando)
      const resultado = await checkoutService.processar(pedido);

      // Assert (Então)
      expect(resultado.status).toBe('PROCESSADO');
      expect(pedidoRepositoryStub.salvar).toHaveBeenCalledWith(expect.objectContaining({ status: 'PROCESSADO' }));
      expect(emailServiceMock.enviarConfirmacao).toHaveBeenCalledWith('cliente@entregasja.com', 'Pagamento Aprovado');
    });
  });

  describe('Quando o pagamento é recusado', () => {
    it('Deve falhar ao recusar o cartão e NÃO disparar e-mail', async () => {
      // Arrange (Dado)
      const pedido = new PedidoBuilder().comCartaoInvalido().build();
      gatewayPagamentoStub.cobrar.mockResolvedValue({ status: 'RECUSADO' });

      // Act (Quando)
      const resultado = await checkoutService.processar(pedido);

      // Assert (Então)
      expect(resultado).toBeNull();
      expect(pedidoRepositoryStub.salvar).toHaveBeenCalledWith(expect.objectContaining({ status: 'FALHOU' }));
      expect(emailServiceMock.enviarConfirmacao).not.toHaveBeenCalled();
    });
  });

  describe('Quando o gateway falha', () => {
    it('Deve realizar retentativa com backoff se houver timeout no gateway', async () => {
      // Arrange (Dado)
      const pedido = new PedidoBuilder().build();
      gatewayPagamentoStub.cobrar
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ status: 'APROVADO' });

      // Act (Quando)
      const resultado = await checkoutService.processar(pedido);

      // Assert (Então)
      expect(gatewayPagamentoStub.cobrar).toHaveBeenCalledTimes(2);
      expect(resultado.status).toBe('PROCESSADO');
    });

    it('Deve esgotar as retentativas (máximo 3) e acionar fallback sem derrubar a aplicação', async () => {
      // Arrange (Dado)
      const pedido = new PedidoBuilder().build();
      gatewayPagamentoStub.cobrar.mockRejectedValue(new Error('Gateway Indisponível'));

      // Act (Quando)
      const resultado = await checkoutService.processar(pedido);

      // Assert (Então)
      expect(gatewayPagamentoStub.cobrar).toHaveBeenCalledTimes(3);
      expect(resultado).toBeNull();
      expect(pedidoRepositoryStub.salvar).toHaveBeenCalledWith(expect.objectContaining({ status: 'ERRO_GATEWAY' }));
    });

    it('Deve falhar rapidamente se o Circuit Breaker estiver aberto (sem chamar o gateway)', async () => {
      // Arrange (Dado)
      const pedido = new PedidoBuilder().build();
      checkoutService.forcarCircuitBreakerAberto(); // Simula o estado do circuito

      // Act (Quando)
      const resultado = await checkoutService.processar(pedido);

      // Assert (Então)
      expect(gatewayPagamentoStub.cobrar).not.toHaveBeenCalled();
      expect(resultado).toBeNull();
      expect(pedidoRepositoryStub.salvar).toHaveBeenCalledWith(expect.objectContaining({ status: 'ERRO_GATEWAY' }));
    });
  });
});