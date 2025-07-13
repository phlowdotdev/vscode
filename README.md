# Phlow Language Support

A complete VS Code extension for the [Phlow](https://phlow.dev) language - the low-code Rust runtime for modular backends.

## Features

### 🎨 Full YAML Compatibility
- **`.phlow` files behave exactly like YAML**
- Complete syntax highlighting for YAML
- Automatic and intelligent indentation
- Block and structure folding
- Real-time YAML syntax validation
- Support for all YAML data types (strings, numbers, booleans, arrays, objects)
- Multi-line strings (`|` and `>`)
- Comments and nested structures

### ✨ Complete PHS (Phlow Script) Support
- **`.phs` files with complete syntax highlighting** (based on Rhai)
- **Inline PHS in `.phlow` and `.yaml` files** after `!phs` directives
- **Autocomplete and snippets** for Rhai/PHS syntax
- **Hover documentation** for PHS functions and variables
- **Automatic indentation** and **folding** for code blocks
- **Phlow-specific functions**: `main`, `payload`, `steps`, `envs`

### ✨ Phlow-Specific Features
- Special highlighting for Phlow keywords (`main`, `modules`, `steps`, etc.)
- Recognition of special directives (`!phs`, `!include`, `!import`)
- Highlighting for known modules (cli, postgres, log, http_server)
- Phlow-specific schema validation for flows

### 📝 Smart Snippets
- **phlow-basic**: Basic flow structure with CLI
- **phlow-simple**: Simple flow without modules
- **phlow-cli-module**: CLI module configuration
- **phlow-step-assert**: Step with conditional logic
- **phlow-step-use**: Step using modules
- **phs**: Phlow Script expressions
- And much more...

### 🔧 Commands
- **Run Phlow Flow**: Execute the current flow in terminal
- **Validate Phlow Flow**: Validate flow syntax and structure
- **Create New Phlow Flow**: Wizard to create new flows

### 💡 IntelliSense
- Hover for Phlow element documentation
- JSON schema validation
- Intelligent autocomplete

## Installation

1. Open VS Code
2. Go to Extensions tab (Ctrl+Shift+X)
3. Search for "Phlow Language Support"
4. Click "Install"

## Quick Start

### Creating a new flow

1. Use the command `Ctrl+Shift+P` and type "Create New Phlow Flow"
2. Choose the desired flow type
3. Enter the flow name
4. The file will be created automatically with a template

### Running a flow

1. Open a `.phlow` file
2. Right-click and select "Run Phlow Flow"
3. Or use `Ctrl+Shift+P` and type "Run Phlow Flow"

## Usage Examples

### Basic CLI Flow
```yaml
main: cli
name: Hello Phlow
version: 1.0.0
description: My first flow
modules:
  - module: cli
    version: latest
    with:
      additional_args: false
      args:
        - name: name
          description: User name
          index: 1
          type: string
          required: true
steps:
  - payload:
      greeting: !phs main.name
  - return: !phs `Hello, ${payload.greeting}!`
```

### Flow with Inline PHS
```yaml
main: cli
name: PHS Demo
modules:
  - module: cli
    version: latest
    with:
      args:
        - name: name
          type: string
          required: true
steps:
  # Inline PHS with complete syntax highlighting
  - payload: !phs `{
      user_name: main.name,
      processed_at: timestamp(),
      greeting: if main.name.len() > 0 {
        "Hello, " + main.name + "!"
      } else {
        "Hello, World!"
      }
    }`
  - return: !phs payload.greeting
```

### Standalone PHS File
```rust
// script.phs - Complete support for Rhai syntax
fn process_data(input) {
    let result = #{
        original: input,
        processed: input.to_upper(),
        length: input.len()
    };
    
    log("info", `Processed: ${input}`);
    return result;
}

// Access to Phlow context
let user_data = main.user_name;
process_data(user_data)
```

## Supported Flow Types

- **CLI Flows**: Command-line applications
- **HTTP Flows**: Web servers and APIs
- **Database Flows**: PostgreSQL integration
- **Simple Flows**: Data processing without external modules

## Special Directives

### `!phs` - Phlow Script
Execute dynamic inline code:
```yaml
message: !phs `Hello, ${main.name}!`
condition: !phs main.age > 18
```

### `!include` - Include Files
Include content from other YAML files:
```yaml
modules: !include modules.yaml
```

### `!import` - Import Scripts
Import and execute PHS scripts:
```yaml
result: !import scripts/calculation.phs
```

## Configuration

The extension works automatically with `.phlow` files, which are treated as **complete YAML** with Phlow-specific features. This means you get:

- ✅ **All YAML functionality**: indentation, folding, syntax highlighting
- ✅ **Phlow-specific features**: keywords, directives, validation
- ✅ **Complete compatibility**: `.phlow` files are valid YAML

For the best experience:

1. Install the Phlow runtime: [Official Documentation](https://phlow.dev/docs/intro)
2. Configure your environment variables in VS Code
3. Use the integrated terminal to run flows

## Contributing

Contributions are welcome! This project is in active development.

1. Fork the repository
2. Create a branch for your feature
3. Make your changes
4. Open a Pull Request

## Useful Links

- [Phlow Documentation](https://phlow.dev/docs/intro)
- [Phlow GitHub](https://github.com/phlowdotdev/phlow)
- [Flow Examples](https://github.com/phlowdotdev/phlow/tree/main/examples)

## License

MIT

---

Made with ❤️ for the Phlow community
