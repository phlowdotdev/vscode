# 🧪 Guia de Execução Individual de Testes Phlow

## Funcionalidade Implementada ✅

O **Phlow Test Explorer** agora executa testes individuais usando o argumento `--test-filter` e **detecta falhas reais** baseado no exit code do processo.

## Como Funciona

### 🎯 **Execução Individual de Teste**
Quando você clica em "Run" em um teste específico no Test Explorer:

```bash
phlow "arquivo.phlow" --test --test-filter "Nome do Teste"
```

### 📦 **Execução de Todos os Testes**
Quando você executa todos os testes de um arquivo:

```bash
phlow "arquivo.phlow" --test
```

### ✅❌ **Detecção de Sucesso/Falha**
- **Exit Code 0** ➜ Teste **PASSOU** ✅
- **Exit Code ≠ 0** ➜ Teste **FALHOU** ❌
- **Timeout** ➜ Teste **FALHOU** ⏰
- **Erro de Execução** ➜ Teste **FALHOU** 💥

## Exemplo Prático

### 📄 **Arquivo de Teste com Falhas:**
```yaml
tests:
  - describe: "Test That Should Pass"
    main:
      cli:
        command: "echo 'Hello'"
    assert_eq: "Hello"          # ✅ Deve passar
    
  - describe: "Test That Should Fail"
    main:
      cli:
        command: "echo 'Hello'"
    assert_eq: "Wrong Value"    # ❌ Deve falhar
```

### ⚡ **Comandos Executados e Resultados:**

#### Para teste individual:
- **"Test That Should Pass"**: `phlow --test-filter "Test That Should Pass"` ➜ ✅ Exit code 0
- **"Test That Should Fail"**: `phlow --test-filter "Test That Should Fail"` ➜ ❌ Exit code 1

## 🔧 **Comportamento do Test Explorer**

### **Individual Test Run**
1. ✅ Extrai o valor do `describe` do teste
2. ✅ Executa usando child process com captura de exit code
3. ✅ **Exit code 0** ➜ Marca como PASSED
4. ✅ **Exit code ≠ 0** ➜ Marca como FAILED com mensagem de erro
5. ✅ Timeout de 10 segundos por teste

### **File Test Run**
1. ✅ Executa todos os testes do arquivo
2. ✅ Captura exit code global
3. ✅ **Exit code 0** ➜ Marca todos como PASSED
4. ✅ **Exit code ≠ 0** ➜ Marca todos como FAILED
5. ✅ Timeout de 15 segundos para arquivo completo

## 🎮 **Como Usar**

1. **Abra um arquivo `.phlow`** com seção `tests:`
2. **Vá para Test Explorer** (ícone do tubo de ensaio)
3. **Clique no ▶ de um teste** para executar individualmente
4. **Veja o resultado**: ✅ verde = passou, ❌ vermelho = falhou
5. **Clique no teste falhado** para ver detalhes do erro

## 📝 **Logs Detalhados**

O sistema gera logs no Developer Console:
```
🧪 Phlow: Running individual test with filter: "Test That Should Fail"
🧪 Phlow: Test completed with exit code: 1
❌ Phlow: Test "Test That Should Fail" failed: assertion failed
```

## 🔍 **Informações de Debug**

Cada execução captura:
- ✅ **stdout**: Saída normal do teste
- ✅ **stderr**: Mensagens de erro
- ✅ **exit code**: Código de saída (0 = sucesso, outros = falha)
- ✅ **timeout**: Detecta testes que demoram muito

## ⚠️ **Requisitos**

- O runtime Phlow deve suportar o argumento `--test-filter`
- O runtime deve retornar **exit code 0** para testes que passam
- O runtime deve retornar **exit code ≠ 0** para testes que falham
- Testes devem ter a propriedade `describe` para melhor identificação

## 📁 **Arquivos de Teste**

- `test-filter-demo.phlow` - Testes que devem passar
- `failing-test-demo.phlow` - Testes com falhas intencionais
- Use estes arquivos para validar a detecção de falhas!
