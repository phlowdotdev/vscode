# Phlow VS Code Extension - Lint System

## 🔍 Real-time Module Validation

A extensão Phlow agora inclui um sistema de lint robusto que valida em tempo real as configurações dos módulos, mostrando erros com sublinhado vermelho quando você tenta usar propriedades não mapeadas.

## ✨ Funcionalidades do Lint

### 1. **Validação de Módulos Conhecidos**
- Detecta módulos não reconhecidos
- Mostra warning amarelo para módulos desconhecidos
- Lista módulos disponíveis na mensagem de erro

### 2. **Validação de Propriedades `with`**
- Valida todas as propriedades dentro da seção `with:` de cada módulo
- Mostra erro vermelho para propriedades inválidas
- Lista propriedades válidas na mensagem de erro

### 3. **Detecção de Propriedades Obrigatórias**
- Identifica propriedades obrigatórias não definidas
- Mostra erro vermelho no nome do módulo quando propriedades obrigatórias estão faltando

### 4. **Cache de Schemas**
- Baixa automaticamente os schemas dos módulos do repositório GitHub
- Mantém cache para melhor performance
- Atualiza schemas conforme necessário

## 🚨 Tipos de Erro

### Erro: Propriedade Inválida
```yaml
modules:
  - module: cli
    with:
      invalid_property: value  # ❌ Erro: sublinhado vermelho
```

### Warning: Módulo Desconhecido
```yaml
modules:
  - module: unknown_module  # ⚠️ Warning: sublinhado amarelo
```

### Erro: Propriedade Obrigatória Faltando
```yaml
modules:
  - module: cli  # ❌ Erro se args obrigatório não estiver definido
    with:
      additional_args: false
      # args: # propriedade obrigatória faltando
```

## 🛠️ Como Usar

1. **Validação Automática**: O lint executa automaticamente enquanto você digita
2. **Validação Manual**: Use `Ctrl+Shift+P` → "Validate Phlow Flow"
3. **Painel de Problemas**: Veja todos os erros no painel "Problems" (Ctrl+Shift+M)

## 🎯 Benefícios

- **Detecção Precoce de Erros**: Identifica problemas antes da execução
- **Autocompletar Inteligente**: Sugere apenas propriedades válidas
- **Documentação Contextual**: Hover mostra informações sobre módulos e propriedades
- **Experiência de Desenvolvimento Melhorada**: Menos tempo debugando, mais tempo desenvolvendo

## 📋 Módulos Suportados

Atualmente validamos schemas para:
- `cli` - Interface de linha de comando
- `http_request` - Requisições HTTP
- `http_server` - Servidor HTTP
- `amqp` - Mensageria AMQP/RabbitMQ
- `postgres` - Banco de dados PostgreSQL
- E muitos outros...

## 🔄 Atualizações de Schema

Os schemas são baixados automaticamente do repositório oficial do Phlow:
`https://github.com/phlowdotdev/phlow/tree/main/modules/{module_name}/phlow.yaml`

A extensão mantém um cache local para melhor performance e atualiza conforme necessário.
