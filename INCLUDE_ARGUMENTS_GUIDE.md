# Include Arguments Syntax Highlighting Guide

The Phlow VS Code extension now supports advanced syntax highlighting for `!include` directives with arguments.

## Syntax

```yaml
!include <file_path> [argument=value] [argument=value] ...
```

## Highlighted Elements

### 1. **Directive** (`!include`)
- **Color**: Keyword directive (purple/blue)
- **Scope**: `keyword.directive.include.phlow`

### 2. **File Path**
- **Color**: String (green/yellow)
- **Scope**: `string.unquoted.filepath.phlow`
- **Examples**: `./return.phlow`, `../shared/utils.phlow`

### 3. **Argument Names** (Variables)
- **Color**: Parameter variable (light blue/cyan)
- **Scope**: `variable.parameter.include.phlow`
- **Examples**: `target`, `output`, `config`

### 4. **Assignment Operator** (`=`)
- **Color**: Operator (white/gray)
- **Scope**: `keyword.operator.assignment.include.phlow`

### 5. **Argument Values** (Type-specific highlighting)

#### Unquoted Strings
- **Color**: String (green)
- **Scope**: `string.unquoted.include-arg.phlow`
- **Example**: `route_get_authors`

#### Quoted Strings (Single or Double)
- **Color**: String with quote markers (green with punctuation)
- **Scope**: `string.quoted.single.include-arg.phlow` or `string.quoted.double.include-arg.phlow`
- **Examples**: `"route_get_authors"`, `'simple_result'`

#### Boolean Values
- **Color**: Boolean constant (orange/red)
- **Scope**: `constant.language.boolean.true.include-arg.phlow`
- **Examples**: `true`, `false`

#### Numeric Values
- **Color**: Number (light green/cyan)
- **Scope**: `constant.numeric.integer.include-arg.phlow` or `constant.numeric.float.include-arg.phlow`
- **Examples**: `8080`, `30.5`

#### PHS Expressions in Quoted Strings
- **Color**: Mixed - PHS directive + PHS content highlighting
- **Scope**: `keyword.directive.phs.phlow` + PHS syntax
- **Examples**: `'!phs payload'`, `"!phs main.config"`

## Examples with Highlighting

### Basic Include with Arguments
```yaml
steps:
  - payload: !include ./return.phlow target=route_get_authors output=simple_result
```

**Highlighting**:
- `!include` → Purple (directive)
- `./return.phlow` → Green (file path)
- `target` → Light blue (parameter)
- `=` → Gray (operator)
- `route_get_authors` → Green (unquoted string)
- `output` → Light blue (parameter)
- `=` → Gray (operator)
- `simple_result` → Green (unquoted string)

### Include with Quoted Strings and PHS
```yaml
steps:
  - payload: !include ./return.phlow target='route_get_authors' output='!phs payload'
```

**Highlighting**:
- `!include` → Purple (directive)
- `./return.phlow` → Green (file path)
- `target` → Light blue (parameter)
- `=` → Gray (operator)
- `'route_get_authors'` → Green with quote punctuation
- `output` → Light blue (parameter)
- `=` → Gray (operator)
- `'!phs payload'` → Green quotes + Purple `!phs` + PHS syntax for `payload`

### Include with Mixed Types
```yaml
steps:
  - payload: !include ./config.phlow 
      name=my_service 
      port=3000 
      enabled=true 
      timeout=30.5
      config='!phs main.config'
```

**Highlighting**:
- `name` → Light blue (parameter), `my_service` → Green (string)
- `port` → Light blue (parameter), `3000` → Light green (integer)
- `enabled` → Light blue (parameter), `true` → Orange (boolean)
- `timeout` → Light blue (parameter), `30.5` → Light green (float)
- `config` → Light blue (parameter), `'!phs main.config'` → Mixed PHS highlighting

## Features

✅ **Type-aware highlighting**: Different colors for strings, numbers, booleans
✅ **PHS support**: Full PHS syntax highlighting inside quoted argument values  
✅ **Quote detection**: Proper handling of single and double quotes
✅ **Multi-line support**: Arguments can span multiple lines
✅ **Path highlighting**: File paths are clearly distinguished
✅ **Operator highlighting**: Assignment operators are highlighted
✅ **Parameter naming**: Argument names are highlighted as variables

## Benefits

1. **Visual clarity**: Easy distinction between file paths, parameters, and values
2. **Type safety**: Immediate visual feedback on argument types
3. **Error detection**: Malformed arguments are visually apparent
4. **PHS integration**: Seamless highlighting of embedded PHS expressions
5. **Professional appearance**: Clean, IDE-like syntax highlighting

This enhancement makes working with complex `!include` statements much more readable and maintainable!
