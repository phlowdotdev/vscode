# Phlow Language Support

Uma extensão completa do VS Code para a linguagem [Phlow](https://phlow.dev) - o runtime de baixo código em Rust para backends modulares.

## Funcionalidades

### 🎨 Compatibilidade Total com YAML
- **Arquivos `.phlow` se comportam exatamente como YAML**
- Syntax highlighting completo para YAML
- Indentação automática e inteligente
- Folding de blocos e estruturas
- Validação de sintaxe YAML em tempo real
- Suporte a todos os tipos de dados YAML (strings, números, booleanos, arrays, objetos)
- Strings multi-linha (`|` e `>`)
- Comentários e estruturas aninhadas

### ✨ Suporte Completo para PHS (Phlow Script)
- **Arquivos `.phs` com syntax highlighting completo** (baseado em Rhai)
- **PHS inline em arquivos `.phlow` e `.yaml`** após diretivas `!phs`
- **Autocomplete e snippets** para sintaxe Rhai/PHS
- **Hover documentation** para funções e variáveis PHS
- **Indentação automática** e **folding** para blocos de código
- **Funções específicas do Phlow**: `main`, `payload`, `steps`, `envs`

### ✨ Funcionalidades Específicas do Phlow
- Destaque especial para palavras-chave do Phlow (`main`, `modules`, `steps`, etc.)
- Reconhecimento de diretivas especiais (`!phs`, `!include`, `!import`)
- Destaque para módulos conhecidos (cli, postgres, log, http_server)
- Validação de schema específica para flows Phlow

### 📝 Snippets Inteligentes
- **phlow-basic**: Estrutura básica de flow com CLI
- **phlow-simple**: Flow simples sem módulos
- **phlow-cli-module**: Configuração de módulo CLI
- **phlow-step-assert**: Step com lógica condicional
- **phlow-step-use**: Step usando módulos
- **phs**: Expressões Phlow Script
- E muito mais...

### 🔧 Comandos
- **Run Phlow Flow**: Executa o flow atual no terminal
- **Validate Phlow Flow**: Valida a sintaxe e estrutura do flow
- **Create New Phlow Flow**: Assistente para criar novos flows

### 💡 IntelliSense
- Hover para documentação de elementos Phlow
- Validação de schema JSON
- Autocomplete inteligente

## Instalação

1. Abra o VS Code
2. Vá para a aba de Extensões (Ctrl+Shift+X)
3. Procure por "Phlow Language Support"
4. Clique em "Install"

## Uso Rápido

### Criando um novo flow

1. Use o comando `Ctrl+Shift+P` e digite "Create New Phlow Flow"
2. Escolha o tipo de flow desejado
3. Digite o nome do flow
4. O arquivo será criado automaticamente com um template

### Executando um flow

1. Abra um arquivo `.phlow`
2. Clique com o botão direito e selecione "Run Phlow Flow"
3. Ou use `Ctrl+Shift+P` e digite "Run Phlow Flow"

## Exemplos de Uso

### Flow Básico com CLI
```yaml
main: cli
name: Hello Phlow
version: 1.0.0
description: Meu primeiro flow
modules:
  - module: cli
    version: latest
    with:
      additional_args: false
      args:
        - name: name
          description: Nome do usuário
          index: 1
          type: string
          required: true
steps:
  - payload:
      greeting: !phs main.name
  - return: !phs `Olá, ${payload.greeting}!`
```

### Flow com HTTP Server
```yaml
main: http_server
name: API Mirror
version: 1.0.0
modules:
  - module: http_server
    version: latest
steps:
  - return:
      status_code: 200
      body: !phs main
      headers:
        Content-Type: application/json
```

## Tipos de Flow Suportados

- **CLI Flows**: Aplicações de linha de comando
- **HTTP Flows**: Servidores web e APIs
- **Database Flows**: Integração com PostgreSQL
- **Simple Flows**: Processamento de dados sem módulos externos

## Diretivas Especiais

### `!phs` - Phlow Script
Execute código dinâmico inline:
```yaml
message: !phs `Hello, ${main.name}!`
condition: !phs main.age > 18
```

### `!include` - Incluir Arquivos
Inclua conteúdo de outros arquivos YAML:
```yaml
modules: !include modules.yaml
```

### `!import` - Importar Scripts
Importe e execute scripts PHS:
```yaml
result: !import scripts/calculation.phs
```

## Configuração

A extensão funciona automaticamente com arquivos `.phlow`, que são tratados como **YAML completo** com funcionalidades específicas do Phlow. Isso significa que você tem:

- ✅ **Toda a funcionalidade YAML**: indentação, folding, syntax highlighting
- ✅ **Funcionalidades específicas do Phlow**: palavras-chave, diretivas, validação
- ✅ **Compatibilidade total**: arquivos `.phlow` são válidos como YAML

Para melhor experiência:

1. Instale o Phlow runtime: [Documentação oficial](https://phlow.dev/docs/intro)
2. Configure suas variáveis de ambiente no VS Code
3. Use o terminal integrado para executar os flows

## Contribuindo

Contribuições são bem-vindas! Este projeto está em desenvolvimento ativo.

1. Fork o repositório
2. Crie uma branch para sua feature
3. Faça suas alterações
4. Abra um Pull Request

## Links Úteis

- [Documentação do Phlow](https://phlow.dev/docs/intro)
- [GitHub do Phlow](https://github.com/phlowdotdev/phlow)
- [Exemplos de Flows](https://github.com/phlowdotdev/phlow/tree/main/examples)

## Licença

MIT

---

Feito com ❤️ para a comunidade Phlow
# vscode
