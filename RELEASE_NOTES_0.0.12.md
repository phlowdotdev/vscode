# Release Notes - Version 0.0.12

## 🎨 New Feature: Enhanced !include Arguments Syntax Highlighting

This release introduces **advanced syntax highlighting** for `!include` directive arguments, making complex include statements much more readable and maintainable.

### ✨ What's New

#### Type-Aware Argument Highlighting
The extension now provides **intelligent syntax highlighting** for `!include` arguments with full type detection:

```yaml
# All these elements are now beautifully highlighted:
!include ./return.phlow target=route_get_authors output='!phs payload'
```

#### Supported Argument Types

1. **🔧 Parameter Names** (Light Blue)
   - `target`, `output`, `config`, etc.
   - Highlighted as variables for clear identification

2. **📁 File Paths** (Green)
   - `./return.phlow`, `../shared/utils.phlow`
   - Clear distinction from arguments

3. **📝 String Values** (Green with Quotes)
   - Unquoted: `route_get_authors`
   - Single quoted: `'simple_result'`
   - Double quoted: `"complex_value"`

4. **🔢 Numeric Values** (Cyan)
   - Integers: `8080`, `3000`
   - Floats: `30.5`, `1.25`

5. **✅ Boolean Values** (Orange)
   - `true`, `false`

6. **🚀 PHS Expressions** (Full PHS Syntax)
   - `'!phs payload'`
   - `"!phs main.config"`
   - Complete PHS highlighting inside quotes

### 🎯 Usage Examples

#### Simple Arguments
```yaml
- payload: !include ./config.phlow name=my_service port=3000 enabled=true
```

#### Complex Arguments with PHS
```yaml
- payload: !include ./template.phlow 
    target=route_handler
    data='!phs payload.input'
    format="!phs { type: 'json', indent: 2 }"
    debug=true
```

#### Multi-line Arguments
```yaml
- payload: !include ./complex.phlow
    name=my_service
    port=8080
    timeout=30.5
    config='!phs main.settings'
    template="Hello, !phs main.user"
```

### 🔧 Technical Improvements

#### New TextMate Scopes
- `variable.parameter.include.phlow` - Parameter names
- `keyword.operator.assignment.include.phlow` - Assignment operators
- `string.unquoted.filepath.phlow` - File paths
- `string.quoted.*.include-arg.phlow` - Quoted argument values
- `constant.language.boolean.*.include-arg.phlow` - Boolean values
- `constant.numeric.*.include-arg.phlow` - Numeric values

#### Performance Optimized
- **Efficient regex patterns** for fast highlighting
- **No performance impact** on editor responsiveness
- **Memory efficient** grammar rules

### 🎨 Visual Benefits

1. **Immediate Type Recognition**: See argument types at a glance
2. **Clear Parameter Separation**: Easy distinction between parameters and values
3. **PHS Integration**: Seamless highlighting of embedded PHS expressions
4. **Error Prevention**: Malformed arguments are visually apparent
5. **Professional Look**: Clean, IDE-quality syntax highlighting

### 📝 Documentation

- **Complete syntax guide**: [INCLUDE_ARGUMENTS_GUIDE.md](./INCLUDE_ARGUMENTS_GUIDE.md)
- **Example file**: `example/include-arguments-demo.phlow`
- **Type reference**: All supported argument types documented

### 🔄 Compatibility

- ✅ **Fully backward compatible** with existing `!include` usage
- ✅ **Theme compatible** with all VS Code color themes
- ✅ **No breaking changes** to existing functionality

---

## Upgrade Instructions

1. **Update the extension** to version 0.0.12
2. **Restart VS Code** (recommended)
3. **Open any `.phlow` file** with `!include` directives
4. **Enjoy the enhanced highlighting** for include arguments

Try the new syntax with complex arguments to see the full power of the type-aware highlighting! 🚀

---

**Previous versions**: See [CHANGELOG.md](./CHANGELOG.md) for complete version history.
