# Release Notes - Version 0.0.11

## 🎯 Major Feature: Go to Definition for Modules

This release introduces **Go to Definition** support for Phlow modules, making navigation between modules effortless.

### ✨ What's New

#### Go to Definition Navigation
- **Ctrl+Click** or **F12** on any module name to navigate directly to its file
- Works with all module types:
  - **Relative modules**: `./route`, `../auth`, `./modules/utils`
  - **Workspace modules**: `cors`, `logger`, `database`
  - **Local modules**: Any `.phlow` or `.yaml` file in your workspace

#### Enhanced Module Resolution
- **Smart search algorithm**: Automatically finds module files in multiple locations
- **Multi-format support**: Works with both `.phlow` and `.yaml` module files
- **Intelligent fallback**: If `.phlow` not found, searches for `.yaml` automatically
- **Real-time validation**: Module references are validated as you type

#### Improved Performance
- **Enhanced caching**: Better cache management for relative path modules
- **File watching**: Automatically updates when module files change
- **Cache invalidation**: Smart cache clearing when modules are modified

### 🚀 How to Use

1. **Open any `.phlow` file** with module references
2. **Ctrl+Click** on a module name (like `./route` or `cors`)
3. **VS Code navigates** directly to the module file
4. **Edit and save** - changes are automatically detected

### 📁 Module Search Order

1. **Relative paths** (`./module`, `../module`)
   - `{relativePath}.phlow`
   - `{relativePath}.yaml`

2. **Workspace modules** (`moduleName`)
   - `{moduleName}.phlow` in root
   - `{moduleName}.yaml` in root
   - `modules/{moduleName}/{moduleName}.phlow`
   - `modules/{moduleName}/phlow.yaml`

3. **Remote modules** (GitHub repository fallback)

### 🔧 Technical Improvements

- **Better cursor detection**: Precise detection of module name boundaries
- **Special character support**: Works with `./`, `../`, and other path characters
- **Enhanced logging**: Detailed debugging information for module resolution
- **Error handling**: Graceful handling of missing modules with clear feedback

### 📝 Example Usage

```yaml
main: http_server
modules:
  - module: ./route        # Ctrl+Click → opens route.phlow
  - module: ../auth        # Ctrl+Click → opens ../auth.phlow
  - module: cors           # Ctrl+Click → searches workspace for cors module
    with:
      origins: ["*"]
```

### 🔄 Backward Compatibility

- ✅ **Fully backward compatible** with existing phlows
- ✅ **No breaking changes** to existing functionality
- ✅ **Enhanced validation** without affecting existing workflows

---

## Upgrade Instructions

1. **Update the extension** to version 0.0.11
2. **Restart VS Code** (recommended)
3. **Open any `.phlow` file** with modules
4. **Try Ctrl+Click** on module names to test navigation

Enjoy the improved development experience! 🚀

---

**Previous versions**: See [CHANGELOG.md](./CHANGELOG.md) for complete version history.
