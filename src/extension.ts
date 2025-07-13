import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
	console.log('Phlow extension is now active!');

	// Configurar arquivos .phlow para herdar comportamentos do YAML
	vscode.languages.setLanguageConfiguration('phlow', {
		wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/,
		indentationRules: {
			increaseIndentPattern: /^(\s*(- ))?.*:(\s)*$/,
			decreaseIndentPattern: /^\s*\}\s*$/
		}
	});

	// Configurar arquivos .phs para se comportarem como Rhai
	vscode.languages.setLanguageConfiguration('phs', {
		wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/,
		indentationRules: {
			increaseIndentPattern: /\{[^}]*$/,
			decreaseIndentPattern: /^\s*\}/
		}
	});

	// Command to run a flow
	const runFlowCommand = vscode.commands.registerCommand('phlow.runFlow', async (uri?: vscode.Uri) => {
		const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
		if (!fileUri) {
			vscode.window.showErrorMessage('No Phlow file selected');
			return;
		}

		const terminal = vscode.window.createTerminal('Phlow');
		terminal.show();
		terminal.sendText(`phlow "${fileUri.fsPath}"`);
	});

	// Command to validate a flow
	const validateFlowCommand = vscode.commands.registerCommand('phlow.validateFlow', async (uri?: vscode.Uri) => {
		const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
		if (!fileUri) {
			vscode.window.showErrorMessage('No Phlow file selected');
			return;
		}

		try {
			const content = fs.readFileSync(fileUri.fsPath, 'utf8');
			const yamlDoc = require('yaml').parse(content);

			// Basic validations
			const errors: string[] = [];

			if (!yamlDoc.steps || !Array.isArray(yamlDoc.steps) || yamlDoc.steps.length === 0) {
				errors.push('The "steps" field is required and must contain at least one step');
			}

			if (yamlDoc.version && !/^\d+\.\d+\.\d+$/.test(yamlDoc.version)) {
				errors.push('Version must follow semantic versioning pattern (e.g., 1.0.0)');
			}

			if (errors.length > 0) {
				vscode.window.showErrorMessage(`Validation errors:\n${errors.join('\n')}`);
			} else {
				vscode.window.showInformationMessage('Flow is valid!');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Error validating flow: ${error}`);
		}
	});

	// Command to create a new flow
	const createNewFlowCommand = vscode.commands.registerCommand('phlow.createNewFlow', async () => {
		const flowType = await vscode.window.showQuickPick([
			{ label: 'Basic Flow', description: 'Flow with CLI and modules', value: 'basic' },
			{ label: 'Simple Flow', description: 'Flow without external modules', value: 'simple' },
			{ label: 'HTTP Flow', description: 'Flow with HTTP server', value: 'http' },
			{ label: 'PostgreSQL Flow', description: 'Flow with database integration', value: 'postgres' }
		], {
			placeHolder: 'Select flow type'
		});

		if (!flowType) return;

		const flowName = await vscode.window.showInputBox({
			prompt: 'Flow name',
			placeHolder: 'my-flow'
		});

		if (!flowName) return;

		let template = '';

		switch (flowType.value) {
			case 'basic':
				template = `main: cli
name: ${flowName}
version: 1.0.0
description: Flow description
author: Your Name
modules:
  - module: cli
    version: latest
    with:
      additional_args: false
      args:
        - name: input
          description: Input parameter
          index: 1
          type: string
          required: true
steps:
  - payload:
      message: !phs main.input
  - return: !phs \`Hello, \${payload.message}!\`
`;
				break;
			case 'simple':
				template = `name: ${flowName}
version: 1.0.0
description: Simple flow description
steps:
  - payload: "Hello, World!"
  - payload: !phs \`Result: \${payload}\`
`;
				break;
			case 'http':
				template = `main: http_server
name: ${flowName}
version: 1.0.0
description: HTTP server flow
modules:
  - module: http_server
    version: latest
steps:
  - return:
      status_code: 200
      body: !phs main
      headers:
        Content-Type: application/json
`;
				break;
			case 'postgres':
				template = `main: cli
name: ${flowName}
version: 1.0.0
description: PostgreSQL flow
modules:
  - module: cli
    version: latest
    with:
      additional_args: false
      args:
        - name: query
          description: SQL query
          index: 1
          type: string
          required: true
  - module: postgres
    version: latest
    with:
      host: !phs envs.POSTGRES_HOST ?? 'localhost'
      user: !phs envs.POSTGRES_USER ?? 'postgres'
      password: !phs envs.POSTGRES_PASSWORD
      database: mydb
steps:
  - use: postgres
    input:
      query: !phs main.query
  - return: !phs payload
`;
				break;
		}

		const newFile = vscode.Uri.file(path.join(
			vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
			`${flowName}.phlow`
		)); await vscode.workspace.fs.writeFile(newFile, Buffer.from(template, 'utf8'));
		await vscode.window.showTextDocument(newFile);

		vscode.window.showInformationMessage(`Flow "${flowName}" created successfully!`);
	});

	// Register commands
	context.subscriptions.push(runFlowCommand, validateFlowCommand, createNewFlowCommand);

	// Command to run PHS scripts
	const runPhsCommand = vscode.commands.registerCommand('phs.runScript', async (uri?: vscode.Uri) => {
		const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
		if (!fileUri) {
			vscode.window.showErrorMessage('No PHS file selected');
			return;
		}

		const terminal = vscode.window.createTerminal('PHS');
		terminal.show();
		// Assuming there is a PHS runtime or it can be executed via Phlow
		terminal.sendText(`phs "${fileUri.fsPath}"`);
	});

	context.subscriptions.push(runPhsCommand);

	// CodeLens provider for Phlow files
	const phlowCodeLensProvider = vscode.languages.registerCodeLensProvider('phlow', {
		provideCodeLenses(document, token) {
			const codeLenses: vscode.CodeLens[] = [];
			const text = document.getText();
			const lines = text.split('\n');

			// Find the best position for CodeLens (after name or main declaration)
			let targetLine = 0;
			for (let i = 0; i < lines.length && i < 10; i++) {
				const line = lines[i].trim();
				if (line.startsWith('name:') || line.startsWith('main:') || line.startsWith('version:')) {
					targetLine = i;
					break;
				}
			}

			const range = new vscode.Range(targetLine, 0, targetLine, 0);

			// Add "Run Flow" CodeLens
			const runCommand: vscode.Command = {
				title: "▶ Run Flow",
				command: "phlow.runFlow",
				arguments: [document.uri]
			};
			codeLenses.push(new vscode.CodeLens(range, runCommand));

			// Add "Validate Flow" CodeLens
			const validateCommand: vscode.Command = {
				title: "✓ Validate",
				command: "phlow.validateFlow",
				arguments: [document.uri]
			};
			codeLenses.push(new vscode.CodeLens(range, validateCommand));

			return codeLenses;
		}
	});

	context.subscriptions.push(phlowCodeLensProvider);

	// CodeLens provider for PHS files
	const phsCodeLensProvider = vscode.languages.registerCodeLensProvider('phs', {
		provideCodeLenses(document, token) {
			const codeLenses: vscode.CodeLens[] = [];
			const text = document.getText();
			const lines = text.split('\n');

			// Find function definitions or use line 0 if no functions found
			let targetLine = 0;
			for (let i = 0; i < lines.length && i < 20; i++) {
				const line = lines[i].trim();
				if (line.startsWith('fn ') || line.startsWith('let ') || line.startsWith('const ')) {
					targetLine = i;
					break;
				}
			}

			const range = new vscode.Range(targetLine, 0, targetLine, 0);

			// Add "Run Script" CodeLens
			const runCommand: vscode.Command = {
				title: "▶ Run PHS Script",
				command: "phs.runScript",
				arguments: [document.uri]
			};
			codeLenses.push(new vscode.CodeLens(range, runCommand));

			return codeLenses;
		}
	});

	context.subscriptions.push(phsCodeLensProvider);

	// Activate specific features for .phlow files
	const phlowDocumentSelector = { scheme: 'file', language: 'phlow' };

	// Hover provider to show information about Phlow elements
	const hoverProvider = vscode.languages.registerHoverProvider(phlowDocumentSelector, {
		provideHover(document, position) {
			const word = document.getWordRangeAtPosition(position);
			if (!word) return;

			const wordText = document.getText(word);

			const hoverTexts: { [key: string]: vscode.MarkdownString } = {
				'main': new vscode.MarkdownString('**main**: Specifies the main module that provides the initial context (e.g.: `cli`, `http_server`)'),
				'modules': new vscode.MarkdownString('**modules**: List of modules required for the flow'),
				'steps': new vscode.MarkdownString('**steps**: Sequence of steps that the flow will execute'),
				'assert': new vscode.MarkdownString('**assert**: Evaluates a boolean condition to control flow'),
				'then': new vscode.MarkdownString('**then**: Executes if the assertion is true'),
				'else': new vscode.MarkdownString('**else**: Executes if the assertion is false'),
				'payload': new vscode.MarkdownString('**payload**: Data that the step sends to the next step'),
				'return': new vscode.MarkdownString('**return**: Stops the flow and returns the specified data'),
				'use': new vscode.MarkdownString('**use**: Specifies the module to be used in this step'),
				'!phs': new vscode.MarkdownString('**!phs**: Directive to execute inline Phlow scripts'),
				'!include': new vscode.MarkdownString('**!include**: Directive to include content from another YAML file'),
				'!import': new vscode.MarkdownString('**!import**: Directive to import and execute a .phs script')
			};

			return hoverTexts[wordText] ? new vscode.Hover(hoverTexts[wordText]) : undefined;
		}
	});

	context.subscriptions.push(hoverProvider);

	// Hover provider for PHS files
	const phsDocumentSelector = { scheme: 'file', language: 'phs' };
	const phsHoverProvider = vscode.languages.registerHoverProvider(phsDocumentSelector, {
		provideHover(document, position) {
			const word = document.getWordRangeAtPosition(position);
			if (!word) return;

			const wordText = document.getText(word);

			const phsHoverTexts: { [key: string]: vscode.MarkdownString } = {
				'fn': new vscode.MarkdownString('**fn**: Declares a function in PHS\n```phs\nfn my_function(param1, param2) {\n    return param1 + param2;\n}\n```'),
				'let': new vscode.MarkdownString('**let**: Declares a mutable variable\n```phs\nlet variable = value;\n```'),
				'const': new vscode.MarkdownString('**const**: Declares a constant\n```phs\nconst MY_CONST = 42;\n```'),
				'if': new vscode.MarkdownString('**if**: Conditional structure\n```phs\nif condition {\n    // code\n}\n```'),
				'while': new vscode.MarkdownString('**while**: While loop\n```phs\nwhile condition {\n    // code\n}\n```'),
				'for': new vscode.MarkdownString('**for**: For loop\n```phs\nfor item in array {\n    // code\n}\n```'),
				'return': new vscode.MarkdownString('**return**: Returns a value from the function'),
				'main': new vscode.MarkdownString('**main**: Access to Phlow main context\n```phs\nmain.parameter\n```'),
				'payload': new vscode.MarkdownString('**payload**: Access to data from previous step\n```phs\npayload.data\n```'),
				'steps': new vscode.MarkdownString('**steps**: Access to data from previous steps\n```phs\nsteps.step_id.result\n```'),
				'envs': new vscode.MarkdownString('**envs**: Access to environment variables\n```phs\nenvs.MY_VARIABLE\n```'),
				'print': new vscode.MarkdownString('**print**: Function to print values\n```phs\nprint("Hello, World!");\n```'),
				'debug': new vscode.MarkdownString('**debug**: Function for debugging\n```phs\ndebug(variable);\n```'),
				'log': new vscode.MarkdownString('**log**: Phlow function for logging\n```phs\nlog("info", "message");\n```')
			};

			return phsHoverTexts[wordText] ? new vscode.Hover(phsHoverTexts[wordText]) : undefined;
		}
	});

	context.subscriptions.push(phsHoverProvider);

	// Provider for custom folding (maintains YAML compatibility)
	const foldingProvider = vscode.languages.registerFoldingRangeProvider(phlowDocumentSelector, {
		provideFoldingRanges(document) {
			const ranges: vscode.FoldingRange[] = [];
			const lines = document.getText().split('\n');

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				// Detect YAML/Phlow blocks for folding
				if (/^(\s*)(steps|modules|then|else):\s*$/.test(line)) {
					const indent = line.match(/^(\s*)/)?.[1].length || 0;
					let endLine = i;

					// Look for the end of the block
					for (let j = i + 1; j < lines.length; j++) {
						const nextLine = lines[j];
						const nextIndent = nextLine.match(/^(\s*)/)?.[1].length || 0;

						if (nextLine.trim() && nextIndent <= indent) {
							break;
						}
						endLine = j;
					}

					if (endLine > i) {
						ranges.push(new vscode.FoldingRange(i, endLine));
					}
				}
			}

			return ranges;
		}
	});

	context.subscriptions.push(foldingProvider);
}

// This method is called when your extension is deactivated
export function deactivate() { }
