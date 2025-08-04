# Local Module Autocomplete Guide

## Overview

The Phlow VS Code extension now provides intelligent autocomplete for local `.phlow` modules by analyzing their existing `with` properties. This feature helps you configure local modules by showing properties that already exist in the target module file.

## How It Works

When you reference a local `.phlow` module in your configuration:

```yaml
modules:
  - module: ./my-local-module     # Points to my-local-module.phlow  
    with:
      # Autocomplete here shows properties from my-local-module.phlow
```

The extension will:

1. **Detect the local module**: Recognizes relative paths (starting with `./` or `../`)
2. **Read the target file**: Parses the target `.phlow` module file
3. **Extract existing properties**: Finds all properties in the target module's `with` section
4. **Provide completions**: Shows these properties as autocomplete suggestions

## Example

### Target Module: `shared/database.phlow`
```yaml
name: database-module
description: Database connection module
with:
  host: localhost
  port: 5432
  database: myapp
  username: admin
  password: secret
  ssl_enabled: true
  timeout: 30
steps:
  - payload:
      connection: !phs `${with.host}:${with.port}`
  - return: !phs payload
```

### Using the Module: `main.phlow`
```yaml
modules:
  - module: ./shared/database
    with:
      # ✨ Autocomplete shows:
      # - host (current value: localhost)
      # - port (current value: 5432)  
      # - database (current value: myapp)
      # - username (current value: admin)
      # - password (current value: secret)
      # - ssl_enabled (current value: true)
      # - timeout (current value: 30)
      host: production-db.company.com
      port: 5432
      database: production_app
      username: prod_user
      password: !phs envs.DB_PASSWORD
      ssl_enabled: true
      timeout: 60
      # You can also add new properties not in the original
      max_connections: 100
```

## Features

### 🎯 Smart Property Detection
- Extracts only top-level properties from the `with` section
- Shows current values as hints in the documentation
- Ignores nested objects and arrays for simplicity

### 📝 Contextual Information
- **Source file**: Shows which file the properties come from
- **Current values**: Displays existing values for reference
- **Property type**: Infers type from existing values when possible

### 🔧 Flexible Configuration  
- **Override existing**: Change any property from the original module
- **Add new properties**: Include additional properties not in the original
- **No validation constraints**: Local modules don't enforce strict schemas

### 🚀 Automatic Detection
- **Extension-less**: Works with `./module` (finds `module.phlow`)
- **Relative paths**: Supports `../shared/utils`, `./modules/auth`, etc.
- **Real-time updates**: Updates completions when target module files change

## Completion Information

Each completion item shows:

- **Property name**: The exact property name to use
- **Source**: Which local module file it comes from  
- **Current value**: The existing value in the target module
- **Type hint**: Inferred from the existing value

Example completion popup:
```
host
Local module property (database.phlow)
Value: localhost
This property exists in the local module's 'with' section.
```

## Best Practices

### 1. Organize Local Modules
```yaml
# Good: Clear module structure
modules/
  ├── database.phlow      # Database configuration
  ├── auth.phlow         # Authentication setup  
  ├── logging.phlow      # Logging configuration
  └── utils.phlow        # Common utilities
```

### 2. Use Descriptive Properties
```yaml
# Good: Clear property names
with:
  host: localhost
  port: 5432
  database_name: myapp
  connection_timeout: 30
  ssl_required: true

# Avoid: Generic names
with:
  config: localhost
  setting: 5432
  value: myapp
```

### 3. Document Your Modules
```yaml
name: database-connection
description: Handles database connections with configurable parameters
version: 1.0.0
with:
  host: localhost           # Database host address
  port: 5432               # Database port number  
  database: myapp          # Database name
  username: admin          # Database username
  password: secret         # Database password
```

## Troubleshooting

### No Completions Appearing

1. **Check file path**: Ensure the module path correctly points to a `.phlow` file
2. **Verify with section**: The target module must have a `with:` section
3. **Check indentation**: Properties must be properly indented under `with:`
4. **Console logs**: Check VS Code Developer Console for debugging information

### Completions Not Updating

1. **Save the target file**: Changes in target modules require saving
2. **Restart completion**: Press `Ctrl+Space` to manually trigger
3. **Clear cache**: Use "Phlow: Clear Module Cache" command

### Properties Not Detected

Make sure properties in target module follow this format:
```yaml
with:
  property_name: value      # ✅ Detected
  nested:                   # ❌ Not detected (nested object)
    sub_property: value
  - array_item              # ❌ Not detected (array)
```

## Advanced Usage

### Combining with Binary Modules

You can mix local and binary modules in the same configuration:

```yaml
modules:
  - module: cli             # Binary module (schema-based completion)
    with:
      # Schema-driven completions with type validation
      additional_args: false
      args: []
      
  - module: ./local-module  # Local module (property-based completion)  
    with:
      # Property-based completions from existing file
      host: localhost
      port: 3000
```

### Dynamic Property Values

Local modules work great with PHS expressions:

```yaml
# In local-module.phlow
with:
  host: !phs envs.APP_HOST ?? 'localhost'
  port: !phs envs.APP_PORT ?? 3000
  debug: !phs envs.NODE_ENV == 'development'

# In main.phlow using the module
modules:
  - module: ./local-module
    with:
      # Autocomplete shows these properties even with PHS expressions
      host: production.example.com
      port: 8080  
      debug: false
```

This feature makes working with local modules much more efficient and reduces configuration errors by showing you exactly what properties are available in your target modules.
