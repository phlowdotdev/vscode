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
✅ **Go to Definition**: Ctrl+Click or F12 to navigate to included files
✅ **Extension-less includes**: Automatically finds `.phlow`, `.yaml`, or `.yml` files
✅ **Argument validation**: Warns about unused arguments in include statements
✅ **!arg detection**: Scans included files for `!arg argument_name` usage patterns
✅ **Real-time feedback**: Live validation and warnings as you type

## Argument Validation (NEW!)

### How it Works
The extension now validates that all arguments passed to `!include` are actually used in the target file.

### Usage Detection
- Scans included files for `!arg argument_name` patterns
- Compares with arguments provided in `!include` statement
- Shows warnings for unused arguments

### Examples

#### ✅ Valid Usage
```yaml
# return.phlow contains: - use: !arg target
!include ./return target=route_get_authors  # ✅ 'target' is used
```

#### ⚠️ Unused Arguments
```yaml
# return.phlow only uses 'target', not 'other'
!include ./return target=handler other=true  # ⚠️ Warning: 'other' not used
!include ./return unused_param=value         # ⚠️ Warning: 'unused_param' not used
```

#### 📝 Multiple Arguments
```yaml
# template.phlow contains: !arg data and !arg format
!include ./template data='!phs payload' format="json"     # ✅ Both used
!include ./template data='!phs payload' extra=notused     # ⚠️ 'extra' not used
```

### Warning Details
- **Severity**: Warning (not error)
- **Position**: Highlights the unused argument name
- **Message**: "Argument 'name' is not used in included file 'filename'"
- **Code**: `unused-include-argument`
- **Source**: `phlow`

### How it Works
- **Ctrl+Click** or **F12** on any file path in `!include` directives
- **Smart extension detection**: If no extension provided, tries `.phlow` → `.yaml` → `.yml`
- **Arguments awareness**: Works even when arguments are present
- **Relative path support**: Full support for `./` and `../` paths

### Examples with Navigation

```yaml
# These all support Go to Definition:
!include ./return                    # Finds return.phlow, return.yaml, or return.yml
!include ./config target=handler     # Finds config.* and ignores arguments
!include ../shared/utils operation=transform  # Works with relative paths
!include ./template.phlow data='!phs payload' # Works with explicit extensions
```

### Extension Search Order
1. **If extension provided**: Use exact file path
2. **If no extension**: Try in order:
   - `filename.phlow`
   - `filename.yaml` 
   - `filename.yml`

### Console Logging
The extension provides detailed console logs for debugging:
- File search attempts
- Extension resolution
- Success/failure feedback

## Benefits

1. **Visual clarity**: Easy distinction between file paths, parameters, and values
2. **Type safety**: Immediate visual feedback on argument types
3. **Error detection**: Malformed arguments are visually apparent
4. **PHS integration**: Seamless highlighting of embedded PHS expressions
5. **Professional appearance**: Clean, IDE-like syntax highlighting

This enhancement makes working with complex `!include` statements much more readable and maintainable!
