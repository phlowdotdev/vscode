# Integração do Phlow com VS Code Test Explorer

A extensão Phlow agora suporta integração completa com o **Test Explorer** nativo do VS Code! 

## 🧪 Como Funciona

### Descoberta Automática de Testes
- A extensão escaneia automaticamente todos os arquivos `.phlow` no workspace
- Identifica seções `tests:` e cria itens de teste individuais
- Cada teste aparece na árvore do Test Explorer

### Estrutura no Test Explorer
```
📁 test-demo.phlow
  └── 🧪 Test: total=2 → "Total is 20"
  └── 🧪 Test: total=3 → Total is 15
  └── 🧪 Test: total=0 → "Total is 0"
```

### Execução de Testes
- **Executar arquivo completo**: Clique no ícone ▶ ao lado do arquivo
- **Executar teste individual**: Clique no ícone ▶ ao lado do teste específico
- **Executar todos os testes**: Use o botão "Run All Tests" no Test Explorer

### Status dos Testes
- ✅ **Passed**: Teste executado com sucesso
- ❌ **Failed**: Teste falhou (com detalhes do erro)
- ⏳ **Running**: Teste em execução
- ⚪ **Not Run**: Teste ainda não executado

## 🎯 Funcionalidades

### 1. **Auto-Discovery**
- Detecta automaticamente novos arquivos `.phlow` com testes
- Atualiza a lista quando arquivos são modificados
- Remove testes quando arquivos são deletados

### 2. **Execução Individual**
- Cada teste pode ser executado independentemente
- Usa `phlow arquivo.phlow --test` para execução
- Resultados são mapeados de volta para o VS Code

### 3. **Navegação Rápida**
- Clique duplo no teste vai para a linha correspondente no código
- Integração com o sistema de problemas do VS Code
- Suporte a ranges de linha para melhor navegação

### 4. **Observação de Mudanças**
- Monitora mudanças em arquivos `.phlow` em tempo real
- Atualiza automaticamente a lista de testes
- Reflete mudanças na estrutura dos testes

## 📋 Como Usar

### 1. Criar Testes
```yaml
tests: 
  - main:
      total: 2
    payload: 10
    assert_eq: "Total is 20"
  - main:
      total: 3
    payload: 5
    assert: !phs payload == "Total is 15"
```

### 2. Abrir Test Explorer
- **Via Menu**: `View > Test Explorer`
- **Via Command Palette**: `Test: Focus on Test Explorer View`
- **Atalho**: `Ctrl+Shift+T` (padrão do VS Code)

### 3. Executar Testes
- **Individual**: Clique em ▶ ao lado do teste
- **Por arquivo**: Clique em ▶ ao lado do arquivo
- **Todos**: Use "Run All Tests" no cabeçalho do Test Explorer

### 4. Ver Resultados
- ✅/❌ Status visual dos testes
- Detalhes de erros no painel de problemas
- Output completo no terminal integrado

## 🔄 Integração Completa

### CodeLens + Test Explorer
- **🧪 Run Tests** (CodeLens): Execução rápida via CodeLens
- **Test Explorer**: Visão completa e gerenciamento de testes
- **Command Palette**: Comandos adicionais para controle

### Workflow Recomendado
1. **Desenvolvimento**: Use CodeLens para execução rápida
2. **Debugging**: Use Test Explorer para análise detalhada
3. **CI/CD**: Use comandos do terminal para automação

## ⚙️ Configuração

### Ativar Test Explorer
O Test Explorer é ativado automaticamente quando a extensão Phlow detecta arquivos com testes.

### Executar Manualmente
```bash
# Via terminal
phlow arquivo.phlow --test

# Via VS Code
Ctrl+Shift+P > "Phlow: Run Tests"
```

### Debug de Testes
Para debugging mais avançado, você pode:
1. Executar o teste individual via Test Explorer
2. Verificar o output no terminal
3. Usar o comando "Phlow: Validate Phlow" para validação adicional

## 🎉 Benefícios

- **Interface Unificada**: Todos os testes em um local
- **Execução Granular**: Execute testes específicos
- **Feedback Visual**: Status claro de cada teste
- **Integração Nativa**: Usa APIs padrão do VS Code
- **Produtividade**: Workflow mais eficiente de teste
