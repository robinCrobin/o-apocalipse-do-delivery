class PedidoBuilder {
  constructor() {
    this.pedido = {
      clienteEmail: 'cliente@entregasja.com',
      valor: 150,
      cartao: { numero: '4111111111111111' },
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

  comCartao(cartao) {
    this.pedido.cartao = cartao;
    return this;
  }

  build() {
    return { ...this.pedido };
  }
}

module.exports = { PedidoBuilder };
