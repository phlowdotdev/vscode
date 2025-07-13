# Guia de Teste da Extensão Phlow

## Como Testar a Extensão

### 1. Abrir o Projeto no VS Code
```bash
code /home/assis/projects/lowcarboncode/phlow-vscode/phlow
```

### 2. Executar a Extensão
1. Pressione `F5` para abrir uma nova janela do VS Code com a extensão carregada
2. Na nova janela, abra a pasta `example/`
3. Abra qualquer arquivo `.phlow`

### 3. Funcionalidades para Testar

#### Compatibilidade YAML Completa
- ✅ Abra `example/yaml-behavior-demo.phlow`
- Verifique se funciona como YAML normal:
  - Indentação automática (Tab/Shift+Tab)
  - Folding de blocos (clique nas setas)
  - Syntax highlighting para tipos YAML (strings, números, booleanos)
  - Strings multi-linha (`|` e `>`)
  - Comentários (#)
  - Estruturas aninhadas

#### Funcionalidades PHS (Phlow Script)
- ✅ Abra `example/script.phs`
- Verifique syntax highlighting Rhai/PHS:
  - Palavras-chave: `fn`, `let`, `const`, `if`, `while`, `for`
  - Funções: `print`, `debug`, `log`, `timestamp`
  - Variáveis Phlow: `main`, `payload`, `steps`, `envs`
  - Strings template com `\${}`
  - Comentários `//` e `/* */`

#### PHS Inline em Arquivos Phlow
- ✅ Abra `example/phs-inline-demo.phlow`
- Verifique syntax highlighting de PHS após `!phs`:
  - Código PHS dentro de backticks `` ` ``
  - Highlighting de sintaxe Rhai
  - Interpolação de strings
  - Funções e variáveis PHS

#### Snippets
- ✅ Crie um novo arquivo `.phlow`
- Digite os prefixes e pressione Tab:
  - `phlow-basic` → estrutura completa
  - `phlow-simple` → flow simples
  - `phs` → diretiva !phs
  - `phlow-step-assert` → step condicional

#### Comandos PHS
- ✅ `Ctrl+Shift+P` → "Run PHS Script"
  - Teste com arquivo `.phs`
- ✅ Clique direito em arquivo `.phs` → "Run PHS Script"

#### Snippets PHS
- ✅ Crie um novo arquivo `.phs`
- Digite os prefixes e pressione Tab:
  - `fn` → definição de função
  - `if` → estrutura condicional
  - `for` → loop for
  - `let` → declaração de variável
  - `main` → acesso a contexto principal

#### Hover Documentation PHS
- ✅ Passe o mouse sobre:
  - Palavras-chave: `fn`, `let`, `if`, `while`
  - Variáveis Phlow: `main`, `payload`, `steps`
  - Funções: `print`, `debug`, `log`

#### Hover Documentation
- ✅ Passe o mouse sobre palavras-chave como:
  - `main`, `modules`, `steps`, `assert`, `payload`
  - `!phs`, `!include`, `!import`

#### Validação de Schema
- ✅ Remova o campo `steps` de um arquivo
- ✅ Use versão inválida (ex: "1.0")
- Verifique se aparecem erros no Problems panel

### 4. Arquivos de Exemplo para Teste

#### `main.phlow` - Flow Completo
- Demonstra CLI, validação, nested steps
- Teste executando: `phlow example/main.phlow João 15`

#### `simple-flow.phlow` - Flow Simples
- Sem módulos externos
- Teste a funcionalidade de payload

#### `http-server.phlow` - Servidor HTTP
- API que ecoa requisições
- Teste se reconhece módulo http_server

#### `postgres-demo.phlow` - Integração BD
- Demonstra uso de variáveis de ambiente
- Teste syntax highlighting para postgres

#### `yaml-behavior-demo.phlow` - Comportamento YAML
- Testa compatibilidade total com YAML
- Verifique indentação, folding, syntax highlighting
- Combine recursos YAML + funcionalidades Phlow

### 5. Testes de Compatibilidade YAML

Para garantir que os arquivos `.phlow` se comportam como YAML:

1. **Indentação**: Use Tab/Shift+Tab em estruturas aninhadas
2. **Folding**: Clique nas setas para colapsar/expandir blocos
3. **Validation**: Teste sintaxe YAML inválida (ex: indentação errada)
4. **Types**: Verifique destaque para strings, números, booleanos
5. **Multi-line**: Teste strings com `|` e `>`
6. **Comments**: Adicione comentários com `#`

### 6. Problemas Conhecidos

Se encontrar problemas:

1. **Extensão não carrega**:
   - Verifique o terminal do VS Code por erros
   - Execute `npm run compile` no projeto

2. **Snippets não funcionam**:
   - Verifique se o arquivo tem extensão `.phlow`
   - Teste em arquivo YAML também

3. **Comandos não aparecem**:
   - Verifique se está na janela com extensão ativa
   - Recarregue a janela (`Ctrl+R`)

### 6. Próximos Passos

Para melhorar a extensão:
- [ ] Adicionar mais módulos conhecidos
- [ ] Implementar goto definition
- [ ] Adicionar debug support
- [ ] Integrar com Phlow CLI
- [ ] Criar temas personalizados

### 7. Publicação

Para publicar a extensão:
```bash
npm install -g vsce
vsce package
vsce publish
```

---

## Resultado Esperado

A extensão deve fornecer:
- ✅ Syntax highlighting completo
- ✅ Snippets funcionais para todos os tipos
- ✅ Comandos integrados no menu
- ✅ Validação de schema em tempo real
- ✅ Hover documentation
- ✅ Suporte completo para arquivos .phlow
