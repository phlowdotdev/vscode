# Guia de Funcionalidades: !import e !include

Este guia detalha as funcionalidades avançadas de navegação implementadas para as diretivas `!import` e `!include` na extensão Phlow VS Code.

## 🚀 Funcionalidades Implementadas

### 1. **Autocomplete de Paths** 📁

A extensão oferece autocomplete inteligente para caminhos de arquivos após `!import` e `!include`:

```yaml
modules: !include mod[TAB]  # Sugere modules.yaml
steps:
  - payload: !import scr[TAB]  # Sugere scripts/
  - payload: !import scripts/val[TAB]  # Sugere validation.phs
```

**Características:**
- ✅ Sugere arquivos baseados na extensão da diretiva
- ✅ Navega por diretórios com `/`
- ✅ Suporta caminhos relativos e absolutos
- ✅ Filtra por extensões relevantes (.phs, .yaml, .yml, .json)

### 2. **Click to Go (Ctrl+Click)** 🔗

Navegue diretamente para arquivos referenciados:

```yaml
# Ctrl+Click em qualquer parte do caminho do arquivo
modules: !include modules.yaml        # ← Ctrl+Click aqui
steps:
  - payload: !import scripts/helper.phs  # ← Ou aqui
```

**Como usar:**
1. Segure `Ctrl` e clique no caminho do arquivo
2. O arquivo será aberto automaticamente
3. Funciona com caminhos relativos e absolutos

### 3. **Rename/Refactor Support** ✏️

Quando você renomeia arquivos, as referências são atualizadas automaticamente:

```yaml
# Antes
modules: !include database.yaml

# Depois de renomear database.yaml → db-config.yaml
modules: !include db-config.yaml  # Atualizado automaticamente!
```

**Funcionalidades:**
- ✅ Atualização automática de referências
- ✅ Suporte para F2 (Rename)
- ✅ Funciona com move/rename no explorador
- ✅ Mantém caminhos relativos corretos

### 4. **Validação de Referências** ⚠️

A extensão monitora e valida referências em tempo real:

```yaml
# Arquivo existente - sem problemas
modules: !include modules.yaml  ✅

# Arquivo não encontrado - aviso
modules: !include missing.yaml  ❌
```

**Recursos:**
- ✅ Detecta arquivos não encontrados
- ✅ Avisa sobre referências quebradas
- ✅ Comando para verificar todas as referências
- ✅ Integração com Problems Panel

### 5. **Hover com Preview** 💡

Passe o mouse sobre caminhos para ver informações:

```yaml
modules: !include modules.yaml  # Hover mostra: Path: modules.yaml, Type: .yaml file
```

## 🎯 Comandos Disponíveis

### `Phlow: Check Import References`
Verifica todas as referências `!import` e `!include` no workspace:

```
Ctrl+Shift+P → "Phlow: Check Import References"
```

**Resultado:**
- ✅ Lista todas as referências encontradas
- ❌ Identifica referências quebradas
- 📍 Mostra arquivo e linha de cada referência

### `Phlow: Reload Extension`
Recarrega a extensão e limpa caches:

```
Ctrl+Shift+P → "Phlow: Reload Extension"
```

## 📂 Tipos de Caminhos Suportados

### Caminhos Relativos
```yaml
# Mesmo diretório
modules: !include modules.yaml

# Subdiretório  
config: !include configs/database.yaml

# Diretório pai
shared: !include ../shared/common.yaml
```

### Caminhos Absolutos
```yaml
# Absoluto do workspace
modules: !include /configs/modules.yaml
```

## 🔧 Extensões de Arquivo Suportadas

### Para `!include`
- `.yaml` / `.yml` - Arquivos de configuração YAML
- `.json` - Arquivos JSON
- `.phlow` - Outros arquivos Phlow

### Para `!import`
- `.phs` - Scripts Phlow (preferencial)
- `.yaml` / `.yml` - Arquivos YAML
- `.json` - Arquivos JSON
- `.phlow` - Arquivos Phlow

## 💡 Exemplos Práticos

### Estrutura de Projeto Recomendada
```
projeto/
├── main.phlow              # Arquivo principal
├── modules.yaml            # Módulos compartilhados
├── configs/
│   ├── database.yaml       # Configuração de banco
│   └── server.yaml         # Configuração de servidor
├── scripts/
│   ├── validation.phs      # Script de validação
│   ├── helpers.phs         # Funções auxiliares
│   └── processing.phs      # Lógica de processamento
└── data/
    └── defaults.yaml       # Dados padrão
```

### Exemplo de Uso
```yaml
main: cli
name: Projeto Completo
version: 1.0.0

# Módulos compartilhados
modules: !include modules.yaml

# Configurações do servidor
server_config: !include configs/server.yaml

steps:
  # Validação de entrada
  - assert: !import scripts/validation.phs
    then:
      # Processamento dos dados
      - payload: !import scripts/processing.phs
    else:
      - return: "Erro na validação"
      
  # Configuração padrão
  - payload: !include data/defaults.yaml
  
  - return: !phs `Processamento concluído: ${payload}`
```

## 🚨 Solução de Problemas

### Problema: Autocomplete não funciona
**Solução:**
1. Verifique se você está digitando após `!import` ou `!include`
2. Pressione `Ctrl+Space` para forçar o autocomplete
3. Certifique-se de que está no diretório correto

### Problema: Click to Go não funciona
**Solução:**
1. Clique exatamente no caminho do arquivo
2. Certifique-se de que está segurando `Ctrl`
3. Verifique se o arquivo existe

### Problema: Referências não são atualizadas
**Solução:**
1. Execute `Phlow: Check Import References`
2. Use F2 para renomear em vez de renomear manualmente
3. Recarregue a extensão se necessário

## 🔄 Monitoramento Automático

A extensão monitora automaticamente:
- ✅ Criação de novos arquivos
- ✅ Exclusão de arquivos
- ✅ Renomeação/movimento de arquivos
- ✅ Mudanças no conteúdo dos arquivos

## 🎨 Próximas Funcionalidades

- [ ] Preview do conteúdo no hover
- [ ] Navegação breadcrumb
- [ ] Refactoring em massa
- [ ] Suporte para wildcards
- [ ] Validação de esquema para arquivos incluídos

---

**Dica:** Use `Ctrl+Shift+P` e digite "Phlow" para ver todos os comandos disponíveis!
