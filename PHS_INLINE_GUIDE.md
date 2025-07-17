# PHS Inline Guide

Esta documentação explica como usar o PHS (Phlow Script) inline nos arquivos `.phlow` com todas as funcionalidades completas.

## Funcionalidades Implementadas

### 1. Syntax Highlighting Completo
Todo código PHS após a diretiva `!phs` recebe destaque de sintaxe completo, incluindo:
- Palavras-chave (`if`, `else`, `let`, `fn`, `return`, etc.)
- Funções built-in (`len`, `to_upper`, `contains`, etc.)
- Variáveis especiais do Phlow (`main`, `payload`, `steps`, `envs`)
- Strings, números e operadores
- Comentários inline

### 2. Autocompletar Inteligente
O VS Code oferece autocompletar para:
- **Variáveis do Phlow**: `main`, `payload`, `steps`, `envs`
- **Funções PHS**: `len()`, `to_upper()`, `contains()`, `split()`, etc.
- **Funções específicas do Phlow**: `log()`, `query()`, `producer()`, `consumer()`
- **Acesso a propriedades**: `main.input`, `payload.data`, etc.

### 3. Diferentes Formatos de PHS Inline

#### Formato Inline Simples
```yaml
- assert: !phs main.input && main.input.len() > 0
- payload: !phs main.input.to_upper()
- return: !phs `Hello, ${main.input}!`
```

#### Formato de Bloco com Backticks
```yaml
- payload: !phs `{
    original: main.input,
    processed: main.input.to_upper(),
    length: main.input.len()
  }`
```

#### Formato Multiline com Pipe (|)
```yaml
- payload: !phs |
  let result = #{
    input: main.input,
    length: main.input.len()
  };
  
  if result.length > 0 {
    result.processed = result.input.to_upper();
  }
  
  return result;
```

## Exemplos Práticos

### Exemplo 1: Validação com Condicionais
```yaml
steps:
  - assert: !phs main.age && main.age >= 18
    then:
      - payload: !phs `{
          message: "Access granted",
          user: main.name,
          age: main.age,
          adult: true
        }`
    else:
      - payload: !phs `{
          message: "Access denied",
          user: main.name,
          age: main.age,
          adult: false
        }`
```

### Exemplo 2: Processamento de Strings
```yaml
steps:
  - payload: !phs |
    let text = main.input;
    
    // Limpeza e formatação
    text = text.trim();
    if text.len() == 0 {
      return #{
        error: "Empty input not allowed",
        original: main.input
      };
    }
    
    // Processamento
    let words = text.split(" ");
    let processed = words.map(|word| word.to_upper()).join("_");
    
    return #{
      original: main.input,
      processed: processed,
      word_count: words.len()
    };
```

### Exemplo 3: Interpolação de Strings
```yaml
steps:
  - payload: !phs `{
      greeting: "Hello, ${main.name}!",
      status: "User ${main.name} is ${main.age} years old",
      summary: "Processing completed at ${timestamp()}"
    }`
```

## Funcionalidades Específicas do Phlow

### Variáveis Especiais
- **`main`**: Contém argumentos e configurações do módulo principal
- **`payload`**: Dados do step atual
- **`steps`**: Contexto dos steps
- **`envs`**: Variáveis de ambiente

### Funções do Phlow
- **`log(level, message)`**: Logging com níveis
- **`query(sql)`**: Consultas de banco de dados
- **`producer(data)`**: Produção de mensagens
- **`consumer()`**: Consumo de mensagens
- **`timestamp()`**: Timestamp atual

## Triggers para Autocompletar

O autocompletar é ativado por:
- **Ponto (.)**: Para acesso a propriedades (`main.`, `payload.`)
- **Espaço**: Para palavras-chave e funções
- **Parênteses (()**: Para funções

## Integração com Testes

O PHS inline também funciona perfeitamente nos testes:

```yaml
tests:
  - describe: Test PHS inline
    main:
      input: "hello world"
    assert: !phs payload.includes("HELLO")
  
  - describe: Complex condition
    main:
      age: 25
    assert: !phs payload.adult && payload.age >= 18
```

## Validação e Debugging

- **Syntax Highlighting**: Erros de sintaxe são destacados em tempo real
- **Autocompletar**: Previne erros de digitação em nomes de variáveis/funções
- **Hover**: Informações sobre funções e variáveis ao passar o mouse

## Benefícios

1. **Experiência Unificada**: PHS inline tem a mesma experiência que arquivos `.phs` standalone
2. **Produtividade**: Autocompletar e syntax highlighting reduzem erros
3. **Flexibilidade**: Diferentes formatos para diferentes necessidades
4. **Integração**: Funciona perfeitamente com o sistema de testes do Phlow

Este sistema permite que você tenha toda a potência do PHS diretamente nos seus arquivos `.phlow`, mantendo a sintaxe limpa e a experiência de desenvolvimento otimizada.
