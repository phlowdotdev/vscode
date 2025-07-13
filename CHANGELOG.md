# Change Log

## [0.0.1] - 2025-01-13

### Inicial
- 🎉 Primeira versão da extensão Phlow Language Support

### Funcionalidades Adicionadas
- 🎨 **Syntax Highlighting completo** para arquivos `.phlow`
  - Destaque de palavras-chave do Phlow (main, modules, steps, assert, payload, etc.)
  - Destaque especial para diretivas (!phs, !include, !import)
  - Suporte a interpolação de strings e expressões
  - Colorização para módulos conhecidos (cli, postgres, log, http_server)

- 📝 **Snippets inteligentes** para desenvolvimento rápido
  - `phlow-basic`: Estrutura básica de flow com CLI
  - `phlow-simple`: Flow simples sem módulos externos
  - `phlow-cli-module`: Configuração de módulo CLI
  - `phlow-step-assert`: Step com lógica condicional
  - `phlow-step-use`: Step usando módulos
  - `phlow-postgres-module`: Configuração PostgreSQL
  - `phlow-http-module`: Configuração servidor HTTP
  - `phs`, `include`, `import`: Diretivas especiais
  - E muito mais...

- 🔧 **Comandos de produtividade**
  - `Run Phlow Flow`: Executa o flow atual no terminal
  - `Validate Phlow Flow`: Valida sintaxe e estrutura
  - `Create New Phlow Flow`: Assistente para novos flows com templates

- 💡 **IntelliSense e validação**
  - Hover documentation para elementos Phlow
  - Schema JSON para validação de estrutura
  - Autocomplete contextual
  - Detecção de erros em tempo real

- 🎯 **Integração com VS Code**
  - Menus de contexto no explorador e editor
  - Configuração de linguagem otimizada
  - Suporte a folding e indentação
  - Reconhecimento automático de arquivos .phlow

### Arquitetura
- Baseado no VS Code Extension API
- Uso de TextMate Grammar para syntax highlighting
- Schema JSON Schema Draft-07 para validação
- TypeScript para lógica da extensão
- Snippets em formato JSON

### Tipos de Flow Suportados
- **CLI Flows**: Aplicações de linha de comando
- **HTTP Flows**: Servidores web e APIs REST
- **Database Flows**: Integração com PostgreSQL
- **Simple Flows**: Processamento de dados sem módulos externos

### Diretivas Implementadas
- `!phs`: Phlow Script para código dinâmico
- `!include`: Inclusão de arquivos YAML externos
- `!import`: Importação e execução de scripts PHS

### Validações Incluídas
- Verificação de campo obrigatório `steps`
- Validação de formato de versão semântica
- Estrutura básica de módulos e steps
- Sintaxe YAML correta

---

Próximas versões planejadas:
- 🔍 Goto definition para módulos incluídos
- 🧪 Debug support para flows
- 📊 Integração com OpenTelemetry traces
- 🚀 Deploy automation para flows
- 🔄 Hot reload durante desenvolvimento