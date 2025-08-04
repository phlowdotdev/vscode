# Phlow Language Support

A complete VS Code extension for the [Phlow](https://phlow.dev) language - the low-code Rust runtime for modular backends.

## Features

### 🎨 Full YAML Compatibility
- **`.phlow` files behave exactly like YAML**
- Complete syntax highlighting for YAML
- **Automatic 2-space indentation** (YAML standard)
- Block and structure folding
- Real-time YAML syntax validation
- Support for all YAML data types (strings, numbers, booleans, arrays, objects)
- Multi-line strings (`|` and `>`)
- Comments and nested structures
- **Format on save and type** enabled by default

### ✨ Complete PHS (Phlow Script) Support
- **`.phs` files with complete syntax highlighting** (based on Rhai)
- **Automatic 4-space indentation** (Rust standard)
- **Inline PHS in `.phlow` and `.yaml` files** after `!phs` directives
- **Autocomplete and snippets** for Rhai/PHS syntax
- **Hover documentation** for PHS functions and variables
- **Automatic indentation** and **folding** for code blocks
- **Phlow-specific functions**: `main`, `payload`, `steps`, `envs`
- **Format on save and type** enabled by default

### ✨ Phlow-Specific Features
- Special highlighting for Phlow keywords (`main`, `modules`, `steps`, etc.)
- Recognition of special directives (`!phs`, `!include`, `!import`)
- **Enhanced !include arguments**: Type-aware syntax highlighting for include arguments
- Highlighting for known modules (cli, postgres, log, http_server)
- Phlow-specific schema validation for phlows

### 📝 Smart Snippets
- **phlow-basic**: Basic phlow structure with CLI
- **phlow-simple**: Simple phlow without modules
- **phlow-cli-module**: CLI module configuration
- **phlow-step-assert**: Step with conditional logic
- **phlow-step-use**: Step using modules
- **phs**: Phlow Script expressions
- And much more...

### ✨ Enhanced Module Support
- **Dynamic module validation** - Validates any module from the Phlow repository
- **Local module support** - Full support for local modules in workspace
- **Phlow Modules (.phlow)** - Support for both `.phlow` and `.yaml` module formats
- **Relative path modules** - Support for `./route`, `../utils`, etc.
- **Go to Definition** - Ctrl+Click or F12 to navigate to module files
- **Automatic module discovery** - Fetches available modules from GitHub API and local files
- **Smart autocompletion** for module properties based on their schemas
- **Enhanced hover documentation** with module-specific information and links
- **Dynamic schema fetching** from GitHub repository for up-to-date module information
- **Local module priority** - Local modules take precedence over remote ones
- **Multiple search locations** - Searches in root, modules/ subdirectory
- **Property validation** for module `with` configurations
- **Required property detection** and warnings
- **File watching** - Automatically updates when local modules change
- **Real-time cache invalidation** - Smart cache management for local modules
- **No module restrictions** - Use any module that exists locally or in the Phlow repository

### 🔧 Commands
- **Run Phlow Phlow**: Execute the current phlow in terminal
- **Run Phlow Tests**: Execute the phlow tests using `phlow file.phlow --test`
- **Validate Phlow Phlow**: Comprehensive validation with detailed error reporting
- **Create New Phlow Phlow**: Wizard to create new phlows
- **Format Document (Phlow Style)**: Apply proper indentation (2 spaces for .phlow, 4 for .phs)
- **Clear Module Cache**: Clear cached module schemas (useful for development)

### 🧪 Test Explorer Integration
- **Native VS Code Test Explorer**: All Phlow tests appear in the built-in Test Explorer
- **Individual Test Execution**: Run specific tests or entire test suites
- **Real-time Discovery**: Automatically detects and updates tests as you edit files
- **Visual Feedback**: Clear pass/fail status with detailed error reporting
- **Quick Navigation**: Jump to test code with a single click

> **💡 Tip**: Open Test Explorer with `View > Test Explorer` or `Ctrl+Shift+T`

### 🎯 Go to Definition
- **Module navigation** - Ctrl+Click or F12 on module names to navigate to their files
- **Include navigation** - Ctrl+Click or F12 on `!include` file paths to open included files
- **Extension-less support** - Automatically finds `.phlow`, `.yaml`, or `.yml` files
- **Relative path support** - Works with `./route`, `../utils`, `./modules/auth`, etc.
- **Arguments aware** - Navigation works even when include has arguments
- **Multi-format support** - Automatically finds `.phlow` or `.yaml` module files
- **Smart search** - Searches workspace root, modules/ folder, and relative paths
- **Real-time feedback** - Console logs for debugging file resolution

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

### Creating a new phlow

1. Use the command `Ctrl+Shift+P` and type "Create New Phlow Phlow"
2. Choose the desired phlow type
3. Enter the phlow name
4. The file will be created automatically with a template

### Running a phlow

1. Open a `.phlow` file
2. Right-click and select "Run Phlow Phlow"
3. Or use `Ctrl+Shift+P` and type "Run Phlow Phlow"

### Running phlow tests

1. Open a `.phlow` file that contains a `tests:` section
2. Right-click and select "Run Phlow Tests"
3. Or use `Ctrl+Shift+P` and type "Run Phlow Tests"
4. The extension will execute `phlow file.phlow --test` in the terminal

> **💡 Tip**: Files with tests will show a "🧪 Run Tests" CodeLens at the top for quick access

## Usage Examples

### Basic CLI Phlow
```yaml
main: cli
name: Hello Phlow
version: 1.0.0
description: My first phlow
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

### Phlow with Inline PHS
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

### Phlow with Local Modules and Go to Definition
```yaml
main: http_server
name: API with Local Modules
version: 1.0.0
description: Using local modules with navigation support

modules:
  # Ctrl+Click on these module names to navigate to their files
  - module: ./route        # Goes to route.phlow or route.yaml in same folder
  - module: ../auth        # Goes to auth.phlow or auth.yaml in parent folder
  - module: cors           # Searches in workspace and modules/ folder
    with:
      origins: ["*"]
      methods: ["GET", "POST"]

steps:
  - use: route
    with:
      method: GET
      path: /api/users
  - use: cors
  - return:
      status: 200
      body: !phs payload
```

### Phlow with Tests
```yaml
main: cli
name: Math Calculator
version: 1.0.0
description: Calculator with test cases
modules:
  - module: cli
    version: latest
    with:
      args:
        - name: total
          type: number
          required: true

# Test cases - run with "phlow file.phlow --test"
tests: 
  - main:
      total: 2
    payload: 10
    assert_eq: "Total is 20"
  - main:
      total: 3
    payload: 5
    assert: !phs payload == "Total is 15"

steps:
  - payload: !phs main.total * payload 
  - payload: !phs `Total is ${payload}`
```

## Supported Phlow Types

- **CLI Phlows**: Command-line applications
- **HTTP Phlows**: Web servers and APIs
- **Database Phlows**: PostgreSQL integration
- **Simple Phlows**: Data processing without external modules

## Special Directives

### `!phs` - Phlow Script
Execute dynamic inline code:
```yaml
message: !phs `Hello, ${main.name}!`
condition: !phs main.age > 18
```

### `!include` - Include Files with Arguments
Include content from other files with typed arguments:
```yaml
# Basic include
modules: !include modules.yaml

# Include with arguments (NEW!)
result: !include ./return.phlow target=route_get_authors output='!phs payload'

# Multiple arguments with different types
config: !include ./config.phlow 
  name=my_service 
  port=3000 
  enabled=true 
  data='!phs main.input'
```

**Syntax Highlighting Features**:
- 🎨 **File paths**: Clearly highlighted (green)
- 🔧 **Parameter names**: Highlighted as variables (blue) 
- ⚡ **Assignment operators**: `=` highlighted (gray)
- 📝 **String values**: Quoted and unquoted strings (green)
- 🔢 **Numbers**: Integer and float highlighting (cyan)
- ✅ **Booleans**: `true`/`false` highlighted (orange)
- 🚀 **PHS expressions**: Full PHS syntax in quoted values

> **📖 See [INCLUDE_ARGUMENTS_GUIDE.md](./INCLUDE_ARGUMENTS_GUIDE.md) for detailed syntax examples**

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
- ✅ **Automatic formatting**: 2-space indentation for `.phlow`, 4-space for `.phs`

### Indentation Standards
- **`.phlow` files**: 2 spaces (YAML standard)
- **`.phs` files**: 4 spaces (Rust standard)
- **Auto-formatting**: Enabled by default (format on save, format on type)
- **Manual formatting**: Use `Ctrl+Shift+P` → "Format Document (Phlow Style)"

> **📖 See [FORMATTING_GUIDE.md](./FORMATTING_GUIDE.md) for detailed formatting rules and examples**

For the best experience:

1. Install the Phlow runtime: [Official Documentation](https://phlow.dev/docs/intro)
2. Configure your environment variables in VS Code
3. Use the integrated terminal to run phlows

## Contributing

Contributions are welcome! This project is in active development.

1. Fork the repository
2. Create a branch for your feature
3. Make your changes
4. Open a Pull Request

## Useful Links

- [Phlow Documentation](https://phlow.dev/docs/intro)
- [Phlow GitHub](https://github.com/phlowdotdev/phlow)
- [Phlow Examples](https://github.com/phlowdotdev/phlow/tree/main/examples)

## License

MIT

---

Made with ❤️ for the Phlow community
