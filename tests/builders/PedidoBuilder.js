class PedidoBuilder {
  constructor() {
    this.pedido = {
      clienteEmail: 'cliente@entregasja.com',
      valor: 150.00,
      cartao: '1234-5678-9012-3456',
      status: 'PENDENTE'
    };
  }

  comEmail(email) {
    this.pedido.clienteEmail = email;
    return this;
  }

  comValor(valor) {
    this.pedido.valor = valor;
    return this;
  }

  comCartaoInvalido() {
    this.pedido.cartao = '0000';
    return this;
  }

  build() {
    return { ...this.pedido };
  }
}

module.exports = { PedidoBuilder };