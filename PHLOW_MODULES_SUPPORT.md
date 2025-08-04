# Phlow Modules Support Example

The extension now supports validation of `.phlow` modules in addition to Rust `.yaml` modules.

## How it works:

1. **First tries to fetch**: `modules/{moduleName}/{moduleName}.phlow`
2. **If not found, searches**: `modules/{moduleName}/phlow.yaml`
3. **Extracts schema**: From `with`, `input`, `output` sections in both formats
4. **Validates properties**: Real-time with autocompletion

## Example of .phlow module:

```phlow
name: route
description: Reusable routing module
version: 1.0.0

with:
  type: object
  required: true
  properties:
    method:
      type: string
      required: true
      description: HTTP method
    path:
      type: string
      required: true
      description: URL path pattern

input:
  type: object
  properties:
    request:
      type: object
      description: HTTP request data

output:
  type: object
  properties:
    matched:
      type: boolean
      description: Whether route matched

steps:
  - assert: !phs main.method == input.request.method && input.request.path.startsWith(main.path)
    then:
      return:
        matched: true
        params: !phs input.request.params
    else:
      return:
        matched: false
```

## Testing:

To test, create a `.phlow` file and use a module that is a `.phlow` file:

```phlow
main: http_server
modules:
  - module: route
    with:
      method: GET
      path: /api/users
```

The extension will now validate the `method` and `path` properties based on the schema extracted from the `route.phlow` file.

## Go to Definition Support:

You can now use **Ctrl+Click** or **F12** on module names to navigate to their files:

- **Relative modules**: `./route`, `../utils` - navigates to relative `.phlow` or `.yaml` files
- **Workspace modules**: `route` - searches in workspace root and `modules/` folder
- **Smart detection**: Automatically finds the correct file type (`.phlow` or `.yaml`)

## Features:

- ✅ **Dual format support**: Both `.phlow` and `.yaml` modules
- ✅ **Local-first**: Prioritizes local modules over remote ones
- ✅ **Real-time validation**: Live validation as you type
- ✅ **Smart caching**: Efficient caching with automatic invalidation
- ✅ **File watching**: Auto-updates when module files change
- ✅ **Go to Definition**: Click navigation to module files
- ✅ **Relative paths**: Support for `./` and `../` module references
