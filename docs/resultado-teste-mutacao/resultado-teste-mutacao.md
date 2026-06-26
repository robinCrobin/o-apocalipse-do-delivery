# Resultado do Teste de Mutação

Como resultados do teste de mutação da classe `CheckoutService`, 61 mutantes foram mortos e 2 mutantes sobreviveram. Ao final, o Mutation Score alcançado foi de 96.88%, como mostra a imagem a seguir. 

![Teste de mutação](./image-teste-mutacao.png)


## Mutantes Sobreviventes: Optional Chaining

Os dois mutantes estão relacionados ao operador de optional chaining (`?.`).

Esses mutantes ocorreram no método `isValid`, responsável por validar se um pedido possui:

- e-mail de cliente válido;
- valor maior que zero;
- cartão informado.

## Código Original

```js
isValid(pedido) {
  return (
    pedido?.clienteEmail?.includes('@') &&
    pedido?.valor > 0 &&
    pedido?.cartao
  );
}
```

## Mutante 1

O primeiro mutante removeu o optional chaining do acesso ao atributo `valor`.

```diff
- pedido?.valor > 0 &&
+ pedido.valor > 0 &&
```

## Mutante 2

O segundo mutante removeu o optional chaining do acesso ao atributo `cartao`.

```diff
- pedido?.cartao
+ pedido.cartao
```

Após uma análise realizada, pode-se afirmar que esses dois mutantes podem ser considerados **mutantes equivalentes**.

Um mutante equivalente é um mutante que altera o código, mas não altera o comportamento observável do programa. Ou seja, mesmo que o código fique escrito de forma diferente, o resultado produzido continua sendo o mesmo para os cenários possíveis.

## Por Que Esses Mutantes São Equivalentes?

O operador `?.`, chamado de optional chaining, é usado para evitar erro quando se tenta acessar uma propriedade de um valor que pode ser `null` ou `undefined`.

Por exemplo:

```js
pedido?.cartao
```

Esse código significa que o JavaScript só tentará acessar `cartao` se `pedido` existir. Caso `pedido` seja `null` ou `undefined`, o resultado será apenas `undefined`, sem lançar erro.

No método `isValid`, porém, a primeira condição já verifica se `pedido` existe:

```js
pedido?.clienteEmail?.includes('@')
```

Se `pedido` for `null` ou `undefined`, essa primeira expressão retorna `undefined`, que é tratado como falso dentro da condição.

Como as expressões estão ligadas pelo operador lógico `&&`, o JavaScript usa curto-circuito. Isso significa que, se a primeira condição for falsa, as próximas condições não são avaliadas.

Portanto, se `pedido` não existir, o código para logo na primeira expressão e não chega a avaliar:

```js
pedido?.valor > 0
```

nem:

```js
pedido?.cartao
```

Por isso, remover o optional chaining dessas duas últimas expressões não muda o comportamento do método.

Na prática, quando o código chega em:

```js
pedido.valor > 0
```

ou em:

```js
pedido.cartao
```

Já existe a garantia de que `pedido` não é `null` nem `undefined`, pois a primeira condição já foi avaliada com sucesso.


## Conclusão

Os dois mutantes sobreviveram aos testes porque os testes não conseguem distinguir o código original do código mutado.

Nesse caso, a sobrevivência dos mutantes não representa necessariamente uma falha nos testes, pois os mutantes são equivalentes.


