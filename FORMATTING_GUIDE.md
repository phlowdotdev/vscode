# Phlow VS Code Extension - Formatting Guide

## 📏 **Indentation Standards**

A extensão Phlow segue padrões de indentação específicos para cada tipo de arquivo:

### **Arquivos `.phlow` (YAML-based)**
- **Indentação**: 2 espaços
- **Tipo**: Espaços (não tabs)
- **Padrão**: Segue convenções YAML
- **Auto-formatação**: Ativada por padrão

### **Arquivos `.phs` (Rhai/Rust-based)**
- **Indentação**: 4 espaços
- **Tipo**: Espaços (não tabs)
- **Padrão**: Segue convenções Rust
- **Auto-formatação**: Ativada por padrão

## ⚙️ **Configurações Automáticas**

A extensão aplica automaticamente as seguintes configurações:

### **Para arquivos `.phlow`:**
```json
{
  "editor.insertSpaces": true,
  "editor.tabSize": 2,
  "editor.indentSize": 2,
  "editor.autoIndent": "full",
  "editor.formatOnSave": true,
  "editor.formatOnType": true,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true
}
```

### **Para arquivos `.phs`:**
```json
{
  "editor.insertSpaces": true,
  "editor.tabSize": 4,
  "editor.indentSize": 4,
  "editor.autoIndent": "full",
  "editor.formatOnSave": true,
  "editor.formatOnType": true,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true
}
```

## 🔧 **Comandos de Formatação**

### **Formatação Manual**
- `Ctrl+Shift+P` → "Format Document (Phlow Style)"
- Aplica formatação específica para o tipo de arquivo
- Converte tabs em espaços automaticamente

### **Formatação Automática**
- **Format on Save**: Ativado por padrão
- **Format on Type**: Ativado por padrão
- **Auto Indent**: Aplica indentação inteligente

## 📋 **Regras de Indentação**

### **Para `.phlow` files:**
- **Aumenta indentação** após:
  - Linhas terminadas com `:` (propriedades YAML)
  - Items de lista (`-`)
  - Seções especiais: `steps:`, `modules:`, `tests:`, `with:`, etc.

### **Para `.phs` files:**
- **Aumenta indentação** após:
  - Abertura de blocos `{`
  - Estruturas de controle: `if`, `else`, `for`, `while`, `fn`, `loop`
- **Diminui indentação** após:
  - Fechamento de blocos `}`

## 💡 **Boas Práticas**

### **Arquivo `.phlow` Exemplo:**
```yaml
main: cli
name: my-phlow
version: 1.0.0
description: Properly formatted phlow

modules:
  - module: cli
    version: latest
    with:
      args:
        - name: input
          type: string
          required: true

steps:
  - payload:
      message: !phs main.input
  - return: !phs `Hello, ${payload.message}!`

tests:
  - describe: Test basic functionality
    main:
      input: "World"
    assert_eq: "Hello, World!"
```

### **Arquivo `.phs` Exemplo:**
```rust
// Properly formatted PHS file
fn process_data(input) {
    let result = #{
        original: input,
        processed: input.to_upper(),
        length: input.len()
    };
    
    if result.length > 0 {
        log("info", `Processed: ${input}`);
        return result;
    } else {
        return #{
            error: "Empty input"
        };
    }
}

// Access Phlow context
let user_data = main.user_name;
process_data(user_data)
```

## 🛠️ **Personalização**

Se você quiser personalizar as configurações, adicione ao seu `settings.json`:

```json
{
  "[phlow]": {
    "editor.tabSize": 2,
    "editor.insertSpaces": true
  },
  "[phs]": {
    "editor.tabSize": 4,
    "editor.insertSpaces": true
  }
}
```

## 🎯 **Benefícios**

- **Consistência**: Código sempre formatado uniformemente
- **Legibilidade**: Indentação clara facilita leitura
- **Colaboração**: Padrões uniformes entre desenvolvedores
- **Qualidade**: Menos erros relacionados à estrutura
- **Produtividade**: Formatação automática economiza tempo
