# Suporte a Propriedades Adicionais (Additional Properties)

A extensão Phlow VS Code agora suporta a validação inteligente de propriedades adicionais através da flag `aditional_propierties: true` nos schemas dos módulos.

## Como Funciona

### Comportamento Padrão (aditional_propierties: false ou ausente)
- Todas as propriedades devem estar definidas no schema
- Propriedades não mapeadas geram erros de validação
- IntelliSense mostra apenas propriedades definidas no schema

### Com aditional_propierties: true
- Propriedades definidas no schema são validadas normalmente
- Propriedades adicionais são aceitas sem validação
- IntelliSense mostra propriedades do schema + indicação que propriedades extras são permitidas

## Estrutura do Schema

```yaml
# Schema de módulo com suporte a propriedades adicionais
name: exemplo-modulo
with:
  type: object
  aditional_propierties: true  # Permite propriedades extras no nível do módulo
  properties:
    config_definida:
      type: string
      required: true
    args:
      type: array
      items:
        type: object
        aditional_propierties: true  # Permite propriedades extras em itens do array
        properties:
          name:
            type: string
            required: true
          index:
            type: number
            required: true
```

## Exemplo de Uso

```yaml
# Phlow usando propriedades adicionais
main: exemplo-modulo
modules:
  - module: exemplo-modulo
    with:
      # Propriedade definida no schema - validada
      config_definida: "valor obrigatório"
      
      # Propriedades adicionais - aceitas sem validação
      config_personalizada: "minha configuração"
      configuracao_extra:
        nested: true
        data: "qualquer valor"
      
      args:
        - name: "input"         # Propriedade definida - validada
          index: 1              # Propriedade definida - validada
          # Propriedades extras aceitas no item do array
          custom_validator: true
          metadata:
            description: "Input personalizado"
            category: "user_input"
```

## IntelliSense

Quando `aditional_propierties: true` está habilitado:
- As propriedades definidas no schema aparecem primeiro (com indicação de obrigatórias/opcionais)
- Aparece uma entrada especial "..." indicando que propriedades adicionais são aceitas
- Hover documentation indica quando propriedades extras são permitidas

## Validação

- **Propriedades definidas**: Sempre validadas segundo o schema
- **Propriedades requeridas**: Sempre verificadas, mesmo com aditional_propierties: true
- **Propriedades adicionais**: Aceitas sem validação quando aditional_propierties: true
- **Tipos aninhados**: Suporte completo para objetos e arrays com propriedades adicionais

## Logs de Debug

O sistema registra informações úteis no console:
```
Module cli - Additional properties allowed: false
Invalid property found: custom_config for module cli
Additional property accepted: custom_field for module exemplo (aditional_propierties: true)
```

## Casos de Uso

1. **Módulos Flexíveis**: Permitir configurações específicas do usuário
2. **Backwards Compatibility**: Aceitar propriedades de versões futuras
3. **Plugin Systems**: Permitir extensões de terceiros
4. **Configuration Override**: Configurações específicas do ambiente
