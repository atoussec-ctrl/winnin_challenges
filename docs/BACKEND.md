# Desafio Backend - Sistema de Pedidos

## Introdução

A empresa _fictícia_ está crescendo rapidamente e precisa de uma API eficiente para gerenciar seus pedidos. Eles querem uma solução moderna, usando GraphQL, e precisam garantir que o banco de dados seja otimizado para consultas rápidas e seguras.

Seu desafio é construir essa API!

#### A API deve permitir:

- Cadastrar usuários
- Listar usuários e seus pedidos
- Cadastrar produtos
- Listar produtos
- Emitir ordens de compra de produtos

Além disso:

- O sistema deve garantir que pedidos simultâneos sejam processados corretamente, mantendo a integridade do estoque. 
- Se um pedido não puder ser concluído por falta de estoque, deve ser rejeitado com um erro apropriado.
- Disponibilizar a API via GraphQL.
- O projeto deve incluir Dockerfile e docker-compose para execução
- A API deve ser escrita preferencialmente em Nodejs ou Golang
- Incluir testes automatizados para as principais regras de negócio
- Opcional:
    - Configurar um workflow no GitHub Actions
    - Incluir logs estruturados

#### Você será avaliado:

- Nas decisões técnica adotadas e justificativas
- Performance da API
- Arquitetura e organização do código
- Modelagem de dados e uso de transações
- Qualidade dos testes
- Clareza e completude da documentação
- Tratamento de erros e robustez

## Entrega

- Um repositório com a API implementada
- README com:
    - Instruções de execução
    - Decisões técnicas
    - Trade-offs
    - Pontos que faria diferente com mais tempo

## Escopo e tempo estimado

Este desafio deve levar entre 4 e 6 horas
Não esperamos funcionalidades além das descritas
Se quiser sugerir melhorias, descreva no README em vez de implementá-las

## Sugestão de estrura

Aqui tem um direcionamento de estrutura para realização do desafio. Você pode adaptar conforme achar melhor.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL
);
```
