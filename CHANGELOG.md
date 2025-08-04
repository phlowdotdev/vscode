# Change Log

## [0.0.12] - 2025-08-04

### Added

#### � Local .phlow Module Autocomplete (NEW!)
- **Property detection**: Extracts existing `with` properties from local `.phlow` modules
- **Smart completions**: Shows available properties when configuring local modules
- **Contextual hints**: Displays source module file and property values
- **Flexible configuration**: Allows adding new properties beyond existing ones
- **Seamless integration**: Works alongside existing binary module autocomplete

#### �🎨 Enhanced !include Arguments Syntax Highlighting
- **NEW FEATURE**: Advanced syntax highlighting for `!include` directive arguments
- **Type-aware highlighting**: Different colors for strings, numbers, booleans in arguments
- **PHS integration**: Full PHS syntax highlighting inside quoted argument values
- **Smart parameter detection**: Argument names highlighted as variables
- **Quote support**: Proper handling of single and double quoted values
- **Multi-line arguments**: Support for arguments spanning multiple lines

#### 🔧 Include Arguments Features
- **File path highlighting**: Clear distinction of file paths from arguments
- **Assignment operators**: Highlighted `=` operators between parameters and values
- **Unquoted strings**: Support for simple identifiers without quotes
- **Boolean values**: `true`/`false` highlighted as language constants
- **Numeric values**: Integer and float detection with appropriate highlighting
- **PHS expressions**: `!phs` directives inside quoted strings with full syntax support

#### 🎯 Enhanced Go to Definition for !include
- **Extension-less includes**: `!include ./return` automatically finds `.phlow`, `.yaml`, or `.yml`
- **Smart file search**: Tries extensions in order: `.phlow` → `.yaml` → `.yml`
- **Arguments support**: Works with include arguments `!include ./file target=value`
- **Relative paths**: Full support for `./`, `../` paths with automatic extension detection
- **Detailed logging**: Console logs for debugging include file resolution

#### ⚠️ Include Arguments Validation (NEW!)
- **Unused argument detection**: Warns when `!include` arguments are not used in target file
- **Smart !arg analysis**: Scans included files for `!arg argument_name` usage
- **Real-time warnings**: Live validation as you type include statements
- **Precise error positioning**: Warnings highlight exactly the unused argument name
- **Performance optimized**: Only validates when include files exist and are readable

### Improved

#### 🎯 Syntax Highlighting Engine
- **Regex optimization**: More precise patterns for argument parsing
- **Performance**: Efficient highlighting without impacting editor performance
- **Scope granularity**: Detailed TextMate scopes for fine-grained theming

### Technical Details

#### 🎨 New TextMate Scopes
```typescript
// New scopes for include arguments
'variable.parameter.include.phlow'           // Argument names (target, output)
'keyword.operator.assignment.include.phlow' // Assignment operator (=)
'string.unquoted.include-arg.phlow'         // Unquoted string values
'string.quoted.single.include-arg.phlow'    // Single quoted strings
'string.quoted.double.include-arg.phlow'    // Double quoted strings
'constant.language.boolean.*.include-arg.phlow' // Boolean values
'constant.numeric.*.include-arg.phlow'      // Numeric values
'string.unquoted.filepath.phlow'            // File paths
```

#### 📝 Syntax Support
```yaml
# All these patterns are now properly highlighted and navigable:
!include ./return.phlow target=route_get_authors output=simple_result
!include ./config.phlow enabled=true port=8080 timeout=30.5
!include ./template.phlow data='!phs payload' format="!phs main.format"

# Extension-less includes with Go to Definition (NEW!)
!include ./return target=handler                    # Finds return.phlow
!include ./config debug=true                        # Finds config.yaml or config.yml
!include ../shared/utils operation=transform         # Finds utils.phlow, utils.yaml, or utils.yml

# Argument validation examples (NEW!)
!include ./return target=route_get_authors          # ✅ 'target' used in return.phlow
!include ./return unused_arg=value                  # ⚠️  Warning: 'unused_arg' not used
!include ./return target=handler extra=notused      # ⚠️  Warning: 'extra' not used
```

#### 🏗️ Grammar Architecture
- **Modular patterns**: Separate patterns for file paths, arguments, and values
- **Nested highlighting**: PHS expressions within quoted argument values
- **Context-aware**: Different highlighting based on argument value context

### Compatibility
- ✅ **Backwards compatible**: Existing `!include` usage remains unchanged
- ✅ **Theme compatible**: Works with all VS Code themes through standard scopes
- ✅ **Performance optimized**: No impact on editor responsiveness

---

## [0.0.11] - 2025-08-04

### Added

#### 🎯 Go to Definition for Modules
- **NEW FEATURE**: "Go to Definition" navigation (Ctrl+Click or F12) for modules
- **Relative path support**: Works with modules like `./route`, `../utils`, etc.
- **Smart search**: Automatically locates `.phlow` and `.yaml` module files
- **Multiple locations**: Searches in workspace, modules/ subfolders and relative paths
- **Detailed logging**: Logging system for debugging module navigation

#### 🔧 Module System Improvements
- **Enhanced detection**: Better detection of module names in `module:` lines
- **Special character support**: Now works with `./`, `../` and other special characters
- **Position range**: Precise detection of cursor position over module name
- **Error feedback**: Detailed logs when modules are not found

#### 📁 Enhanced File Watching
- **Automatic revalidation**: Automatically revalidates documents when modules change
- **Cache invalidation**: Clears cache for multiple keys when module files change
- **Relative path support**: File watcher works with relative modules
- **Optimized performance**: Only revalidates documents that use the changed module

### Improved

#### 🚀 Performance and Stability
- **Module resolution**: More robust module resolution algorithm
- **Error handling**: Better error handling in module search
- **Cache management**: More efficient cache system for relative modules
- **Path resolution**: More precise path resolution for different module types

### Technical Details

#### 🎯 Go to Definition Implementation
```typescript
// New implementation that works with relative paths
const moduleDefinitionProvider = vscode.languages.registerDefinitionProvider(
  phlowDocumentSelector,
  {
    async provideDefinition(document, position) {
      // Detects cursor position within module name
      // Works with ./route, ../utils, route, etc.
      // Automatically searches for .phlow and .yaml files
    }
  }
);
```

#### 📁 Updated Search Order
1. **Relative Modules**: `./module`, `../module`
   - `{relativePath}.phlow`
   - `{relativePath}.yaml`
2. **Local Modules**: Current workspace
   - `{moduleName}.phlow` in root
   - `{moduleName}.yaml` in root  
   - `modules/{moduleName}/{moduleName}.phlow`
   - `modules/{moduleName}/phlow.yaml`
3. **Remote Modules**: GitHub repository (if not found locally)

#### 🔍 Enhanced File Watching
- **revalidateDocumentsUsingModule()**: New function for intelligent revalidation
- **Multiple cache keys**: Clears cache for simple names and relative paths
- **Workspace relative paths**: Full support for workspace-relative paths

### Compatibility
- ✅ **Backwards compatible**: Maintains compatibility with previous versions
- ✅ **Multi-format support**: Works with both `.phlow` and `.yaml` modules
- ✅ **Path flexibility**: Support for absolute and relative paths

---

## [0.0.10] - 2025-08-04

### Added

#### 🆕 Phlow Modules Support (.phlow)
- **NEW FEATURE**: Complete validation for Phlow Modules (`.phlow` files as modules)
- **Auto-detection**: Extension now detects if a module is a `.phlow` or `phlow.yaml` file
- **Schema extraction**: Automatic extraction of `with`, `input` and `output` from `.phlow` files
- **Smart fallback**: If `.phlow` not found, searches for `phlow.yaml` (Rust modules)
- **Optimized cache**: Cache system for both module types

#### 📁 Local Module Support
- **NEW FEATURE**: Complete support for local modules in workspace
- **Local first**: Prioritizes local modules over remote modules
- **Multiple locations**: Searches in various locations:
  - `{moduleName}.phlow` in workspace root
  - `{moduleName}.yaml` in workspace root
  - `modules/{moduleName}/{moduleName}.phlow` in subdirectories
  - `modules/{moduleName}/phlow.yaml` in subdirectories
- **File watching**: Automatic monitoring of local module changes
- **Cache invalidation**: Smart cache that updates when local modules change

#### 🔧 Enhanced Validation System
- **Dual module support**: Support for Rust (YAML) and Phlow (`.phlow`) modules
- **Schema parsing**: Specific parser to extract schemas from `.phlow` files
- **Properties validation**: Validation of `with`, `input` and `output` properties in Phlow Modules
- **Better error handling**: Improved error handling for both module types

#### 📋 Expanded IntelliSense
- **Autocompletion**: Smart autocompletion for `.phlow` module properties
- **Hover documentation**: On-hover documentation for Phlow Modules
- **Schema validation**: Real-time validation for both module formats

### Improved

#### 🚀 Performance
- **Caching strategy**: Optimized cache strategy for different module types
- **Network requests**: Reduced network requests through smart caching
- **Error caching**: Cache of modules not found to avoid repeated attempts

#### 🔍 Debugging and Logging
- **Enhanced logging**: Detailed logs for debugging Phlow modules
- **Module type detection**: Clear identification of module type being processed
- **Schema extraction logs**: Specific logs for schema extraction

### Technical Details

#### 📁 Module Search Order
1. **Local Modules**: Current workspace (highest priority)
   - `{moduleName}.phlow` in root
   - `{moduleName}.yaml` in root  
   - `modules/{moduleName}/{moduleName}.phlow`
   - `modules/{moduleName}/phlow.yaml`
2. **Remote Modules**: GitHub repository
   - `modules/{moduleName}/{moduleName}.phlow`
   - `modules/{moduleName}/phlow.yaml`

#### 🏗️ Architecture
- **fetchLocalModuleSchema()**: New function to fetch local modules
- **fetchPhlowModuleSchema()**: Function to fetch schemas from `.phlow` files
- **fetchYamlModuleSchema()**: Refactored function for YAML modules
- **parsePhlowModuleFile()**: Specific parser to extract schemas from Phlow Modules
- **File System Watcher**: Automatic monitoring of local module changes

#### 📝 Schema Support
```typescript
// Complete support for Phlow Modules schema
interface ModuleSchema {
  name: string;
  description: string;
  version: string;
  type: 'script' | 'binary';
  with?: { properties: object };
  input?: { properties: object };
  output?: { properties: object };
}
```

### Compatibility
- ✅ **Backwards compatible**: Fully compatible with existing Rust modules
- ✅ **Forward compatible**: Ready for new Phlow Modules
- ✅ **Graceful fallback**: Automatic fallback between formats

---

## [0.0.1] - 2025-01-13

### Initial
- 🎉 First version of Phlow Language Support extension

### Added Features
- 🎨 **Complete Syntax Highlighting** for `.phlow` files
  - Highlighting of Phlow keywords (main, modules, steps, assert, payload, etc.)
  - Special highlighting for directives (!phs, !include, !import)
  - Support for string interpolation and expressions
  - Colorization for known modules (cli, postgres, log, http_server)

- 📝 **Smart snippets** for rapid development
  - `phlow-basic`: Basic phlow structure with CLI
  - `phlow-simple`: Simple phlow without external modules
  - `phlow-cli-module`: CLI module configuration
  - `phlow-step-assert`: Step with conditional logic
  - `phlow-step-use`: Step using modules
  - `phlow-postgres-module`: PostgreSQL configuration
  - `phlow-http-module`: HTTP server configuration
  - `phs`, `include`, `import`: Special directives
  - And many more...

- 🔧 **Productivity commands**
  - `Run Phlow`: Execute current phlow in terminal
  - `Validate Phlow`: Validate syntax and structure
  - `Create New Phlow`: Assistant for new phlows with templates

- 💡 **IntelliSense and validation**
  - Hover documentation for Phlow elements
  - JSON Schema for structure validation
  - Contextual autocomplete
  - Real-time error detection

- 🎯 **VS Code integration**
  - Context menus in explorer and editor
  - Optimized language configuration
  - Folding and indentation support
  - Automatic recognition of .phlow files

### Architecture
- Based on VS Code Extension API
- TextMate Grammar for syntax highlighting
- JSON Schema Draft-07 for validation
- TypeScript for extension logic
- Snippets in JSON format

### Supported Phlow Types
- **CLI Phlows**: Command line applications
- **HTTP Phlows**: Web servers and REST APIs
- **Database Phlows**: PostgreSQL integration
- **Simple Phlows**: Data processing without external modules

### Implemented Directives
- `!phs`: Phlow Script for dynamic code
- `!include`: Inclusion of external YAML files
- `!import`: Import and execution of PHS scripts

### Included Validations
- Required `steps` field verification
- Semantic version format validation
- Basic structure of modules and steps
- Correct YAML syntax

---

Planned upcoming versions:
- 🔍 Goto definition for included modules
- 🧪 Debug support for phlows
- 📊 OpenTelemetry traces integration
- 🚀 Deploy automation for phlows
- 🔄 Hot reload during development