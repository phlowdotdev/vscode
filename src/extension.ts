import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as yaml from 'yaml';

// Module schema cache
interface ModuleSchema {
	name: string;
	description: string;
	version: string;
	type: string;
	with?: {
		type: string;
		required: boolean;
		aditional_propierties?: boolean;
		properties: { [key: string]: any };
	};
	input?: {
		type: string;
		required: boolean;
		aditional_propierties?: boolean;
		properties: { [key: string]: any };
	};
	output?: {
		type: string;
		required: boolean;
		aditional_propierties?: boolean;
		properties: { [key: string]: any };
	};
}

const moduleSchemaCache = new Map<string, ModuleSchema>();
const moduleNotFoundCache = new Set<string>(); // Cache para módulos que não existem
let availableModulesCache: string[] | null = null; // Cache para módulos disponíveis

// Função para buscar lista de módulos disponíveis no GitHub
async function fetchAvailableModules(): Promise<string[]> {
	if (availableModulesCache) {
		return availableModulesCache;
	}

	try {
		const url = 'https://api.github.com/repos/phlowdotdev/phlow/contents/modules';

		return new Promise((resolve) => {
			https.get(url, (res) => {
				let data = '';
				res.on('data', (chunk) => data += chunk);
				res.on('end', () => {
					try {
						const contents = JSON.parse(data);
						if (Array.isArray(contents)) {
							const modules = contents
								.filter((item: any) => item.type === 'dir')
								.map((item: any) => item.name);
							availableModulesCache = modules;
							resolve(modules);
						} else {
							// Fallback para módulos conhecidos se a API falhar
							const fallbackModules = [
								'cli', 'amqp', 'http_request', 'http_server', 'postgres', 'log',
								'consumer', 'producer', 'file', 'redis', 'mongodb', 'smtp',
								'jwt', 'crypto', 'template', 'validator'
							];
							availableModulesCache = fallbackModules;
							resolve(fallbackModules);
						}
					} catch (error) {
						// Fallback para módulos conhecidos se houver erro
						const fallbackModules = [
							'cli', 'amqp', 'http_request', 'http_server', 'postgres', 'log',
							'consumer', 'producer', 'file', 'redis', 'mongodb', 'smtp',
							'jwt', 'crypto', 'template', 'validator'
						];
						availableModulesCache = fallbackModules;
						resolve(fallbackModules);
					}
				});
			}).on('error', () => {
				// Fallback para módulos conhecidos se houver erro de rede
				const fallbackModules = [
					'cli', 'amqp', 'http_request', 'http_server', 'postgres', 'log',
					'consumer', 'producer', 'file', 'redis', 'mongodb', 'smtp',
					'jwt', 'crypto', 'template', 'validator'
				];
				availableModulesCache = fallbackModules;
				resolve(fallbackModules);
			});
		});
	} catch (error) {
		// Fallback para módulos conhecidos
		const fallbackModules = [
			'cli', 'amqp', 'http_request', 'http_server', 'postgres', 'log',
			'consumer', 'producer', 'file', 'redis', 'mongodb', 'smtp',
			'jwt', 'crypto', 'template', 'validator'
		];
		availableModulesCache = fallbackModules;
		return fallbackModules;
	}
}

async function fetchModuleSchema(moduleName: string): Promise<ModuleSchema | null> {
	if (moduleSchemaCache.has(moduleName)) {
		return moduleSchemaCache.get(moduleName)!;
	}

	// Se já tentamos buscar este módulo e não foi encontrado, não tente novamente
	if (moduleNotFoundCache.has(moduleName)) {
		return null;
	}

	try {
		const url = `https://raw.githubusercontent.com/phlowdotdev/phlow/refs/heads/main/modules/${moduleName}/phlow.yaml`;

		return new Promise((resolve, reject) => {
			https.get(url, (res) => {
				let data = '';
				res.on('data', (chunk) => data += chunk);
				res.on('end', () => {
					try {
						if (res.statusCode === 404) {
							// Módulo não encontrado, adiciona ao cache de não encontrados
							moduleNotFoundCache.add(moduleName);
							resolve(null);
							return;
						}

						const schema = parseModuleYaml(data);
						if (schema) {
							moduleSchemaCache.set(moduleName, schema);
							resolve(schema);
						} else {
							// Se não conseguiu fazer parse, considera como não encontrado
							moduleNotFoundCache.add(moduleName);
							resolve(null);
						}
					} catch (error) {
						moduleNotFoundCache.add(moduleName);
						resolve(null);
					}
				});
			}).on('error', () => {
				moduleNotFoundCache.add(moduleName);
				resolve(null);
			});
		});
	} catch (error) {
		moduleNotFoundCache.add(moduleName);
		return null;
	}
}

function parseModuleYaml(yamlContent: string): ModuleSchema | null {
	try {
		// Parse using the YAML library
		const parsedYaml = yaml.parse(yamlContent);

		if (!parsedYaml || typeof parsedYaml !== 'object') {
			return null;
		}

		// Extract the required fields for ModuleSchema
		const schema: ModuleSchema = {
			name: parsedYaml.name || '',
			description: parsedYaml.description || '',
			version: parsedYaml.version || '',
			type: parsedYaml.type || ''
		};

		// Handle 'with' section
		if (parsedYaml.with && typeof parsedYaml.with === 'object') {
			schema.with = {
				type: parsedYaml.with.type || 'object',
				required: parsedYaml.with.required || false,
				properties: parsedYaml.with.properties || {}
			};
		}

		// Handle 'input' section
		if (parsedYaml.input && typeof parsedYaml.input === 'object') {
			schema.input = {
				type: parsedYaml.input.type || 'object',
				required: parsedYaml.input.required || false,
				properties: parsedYaml.input.properties || {}
			};
		}

		// Handle 'output' section
		if (parsedYaml.output && typeof parsedYaml.output === 'object') {
			schema.output = {
				type: parsedYaml.output.type || 'object',
				required: parsedYaml.output.required || false,
				properties: parsedYaml.output.properties || {}
			};
		}

		// Debug logging to verify parsing
		console.log('Successfully parsed schema for', schema.name);
		if (schema.with?.properties) {
			console.log('Available properties:', Object.keys(schema.with.properties));
		}

		return schema;
	} catch (error) {
		console.error('Error parsing module YAML:', error);
		return null;
	}
}

// Test provider for VS Code Test Explorer
class PhlowTestProvider {
	private testController: vscode.TestController;
	private watcherDisposables: vscode.Disposable[] = [];

	constructor(context: vscode.ExtensionContext) {
		this.testController = vscode.tests.createTestController(
			'phlowTests',
			'Phlow Tests'
		);
		context.subscriptions.push(this.testController);

		// Set up test runner
		this.testController.createRunProfile(
			'Run Phlow Tests',
			vscode.TestRunProfileKind.Run,
			this.runTests.bind(this),
			true
		);

		// Watch for file changes
		this.watchTestFiles();

		// Discover tests in open files immediately
		this.discoverTests();
	}

	private watchTestFiles() {
		const watcher = vscode.workspace.createFileSystemWatcher('**/*.phlow');

		watcher.onDidCreate(uri => this.updateTestsForFile(uri));
		watcher.onDidChange(uri => this.updateTestsForFile(uri));
		watcher.onDidDelete(uri => this.removeTestsForFile(uri));

		this.watcherDisposables.push(watcher);

		// Watch for text document changes
		vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.languageId === 'phlow') {
				this.updateTestsForFile(e.document.uri);
			}
		});
	}

	private async discoverTests() {
		console.log('🔍 Phlow: Starting test discovery...');

		try {
			// Find all .phlow files in workspace
			const phlowFiles = await vscode.workspace.findFiles('**/*.phlow', '**/node_modules/**');
			console.log(`🔍 Phlow: Found ${phlowFiles.length} .phlow files:`, phlowFiles.map(f => f.fsPath));

			for (const file of phlowFiles) {
				console.log(`🔍 Phlow: Processing file: ${file.fsPath}`);
				await this.updateTestsForFile(file);
			}

			console.log(`🔍 Phlow: Test discovery completed. Total test items: ${this.testController.items.size}`);
		} catch (error) {
			console.error('❌ Phlow: Error during test discovery:', error);
		}
	}

	private async updateTestsForFile(uri: vscode.Uri) {
		try {
			console.log(`🔍 Phlow: Updating tests for file: ${uri.fsPath}`);

			const document = await vscode.workspace.openTextDocument(uri);
			const content = document.getText();

			// Remove existing tests for this file
			this.removeTestsForFile(uri);

			// Parse tests from file
			const tests = this.parseTestsFromContent(content, uri);
			console.log(`🔍 Phlow: Found ${tests.length} tests in ${path.basename(uri.fsPath)}`);

			if (tests.length > 0) {
				// Create file test item
				const fileTest = this.testController.createTestItem(
					uri.toString(),
					path.basename(uri.fsPath),
					uri
				);

				console.log(`🔍 Phlow: Created file test item: ${fileTest.id}`);

				// Add individual test cases
				for (const test of tests) {
					const testItem = this.testController.createTestItem(
						`${uri.toString()}-${test.index}`,
						test.name,
						uri
					);
					testItem.range = test.range;
					fileTest.children.add(testItem);
					console.log(`🔍 Phlow: Added test: ${test.name}`);
				}

				this.testController.items.add(fileTest);
				console.log(`✅ Phlow: Successfully added file ${path.basename(uri.fsPath)} with ${tests.length} tests`);
			} else {
				console.log(`ℹ️ Phlow: No tests found in ${path.basename(uri.fsPath)}`);
			}
		} catch (error) {
			console.error(`❌ Phlow: Error updating tests for file ${uri.fsPath}:`, error);
		}
	}

	private removeTestsForFile(uri: vscode.Uri) {
		const existingTest = this.testController.items.get(uri.toString());
		if (existingTest) {
			this.testController.items.delete(uri.toString());
		}
	}

	private parseTestsFromContent(content: string, uri: vscode.Uri): Array<{
		index: number;
		name: string;
		range: vscode.Range;
		testCase: any;
	}> {
		const tests: Array<{
			index: number;
			name: string;
			range: vscode.Range;
			testCase: any;
		}> = []; try {
			console.log(`🔍 Phlow: Parsing content for ${path.basename(uri.fsPath)}`);

			// Use more lenient YAML parsing options
			const parsed = yaml.parse(content, {
				strict: false,
				uniqueKeys: false,
				logLevel: 'silent'
			});
			console.log(`🔍 Phlow: YAML parsed successfully`);
			console.log(`🔍 Phlow: Has tests:`, !!parsed?.tests, 'Type:', typeof parsed?.tests);
			console.log(`🔍 Phlow: Tests content:`, parsed?.tests);

			if (!parsed?.tests || !Array.isArray(parsed.tests)) {
				console.log(`ℹ️ Phlow: No tests array found in ${path.basename(uri.fsPath)}`);
				return tests;
			}

			console.log(`🔍 Phlow: Found ${parsed.tests.length} test cases`);

			const lines = content.split('\n');
			let testsLineIndex = -1;

			// Find the line with "tests:"
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].trim().startsWith('tests:')) {
					testsLineIndex = i;
					console.log(`🔍 Phlow: Found 'tests:' at line ${i + 1}`);
					break;
				}
			}

			if (testsLineIndex === -1) {
				console.log(`❌ Phlow: Could not find 'tests:' line in file`);
				return tests;
			}

			// Parse each test case
			parsed.tests.forEach((testCase: any, index: number) => {
				// Find the line of this specific test in the YAML
				let testLineIndex = testsLineIndex + 1;
				let dashCount = 0;

				for (let i = testsLineIndex + 1; i < lines.length; i++) {
					const line = lines[i].trim();

					// Stop if we reach another top-level section (like steps:, main:, etc.)
					if (line.endsWith(':') && !line.startsWith('-') && !line.startsWith(' ')) {
						// This is likely another section, stop here
						if (dashCount === index) {
							testLineIndex = Math.max(testsLineIndex + 1, i - 1);
						}
						break;
					}

					if (line.startsWith('-') && dashCount === index) {
						testLineIndex = i;
						break;
					} else if (line.startsWith('-')) {
						dashCount++;
					}
				}

				// Generate test name
				let testName = `Test ${index + 1}`;

				// Use describe if available
				if (testCase.describe) {
					testName = testCase.describe;
				} else if (testCase.main && typeof testCase.main === 'object') {
					const mainKeys = Object.keys(testCase.main);
					if (mainKeys.length > 0) {
						const firstKey = mainKeys[0];
						testName = `Test: ${firstKey}=${testCase.main[firstKey]}`;
					}
				}

				// Add expected result to the name for clarity
				if (testCase.assert_eq !== undefined) {
					testName += ` → expects: ${testCase.assert_eq}`;
				} else if (testCase.assert) {
					testName += ` → condition: ${testCase.assert.replace('!phs ', '')}`;
				}

				tests.push({
					index,
					name: testName,
					range: new vscode.Range(testLineIndex, 0, testLineIndex, lines[testLineIndex]?.length || 0),
					testCase
				});
			});
		} catch (error) {
			console.error('Error parsing tests from content:', error);
		}

		return tests;
	}

	private async runTests(
		request: vscode.TestRunRequest,
		cancellation: vscode.CancellationToken
	) {
		const run = this.testController.createTestRun(request);

		try {
			// Get tests to run
			if (request.include) {
				for (const test of request.include) {
					if (cancellation.isCancellationRequested) {
						break;
					}
					await this.runTestItem(test, run);
				}
			} else {
				// Run all tests
				this.testController.items.forEach(async (test) => {
					if (!cancellation.isCancellationRequested) {
						await this.runTestItem(test, run);
					}
				});
			}
		} finally {
			run.end();
		}
	}

	private async runTestItem(test: vscode.TestItem, run: vscode.TestRun) {
		if (test.children.size > 0) {
			// This is a file test, run all its children
			console.log(`🧪 Phlow: Running all tests in file: ${test.label}`);
			await this.runAllTestsInFile(test, run);
		} else {
			// This is an individual test
			await this.runSingleTest(test, run);
		}
	}

	private async runAllTestsInFile(fileTest: vscode.TestItem, run: vscode.TestRun) {
		try {
			if (!fileTest.uri) {
				run.failed(fileTest, new vscode.TestMessage('No file URI found'));
				return;
			}

			console.log(`🧪 Phlow: Running all tests in file: ${fileTest.uri.fsPath}`);

			// Mark all child tests as started
			fileTest.children.forEach(childTest => {
				run.started(childTest);
			});

			// Execute all tests and capture the result
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileTest.uri);
			const cwd = workspaceFolder?.uri.fsPath || path.dirname(fileTest.uri.fsPath);

			const command = `phlow "${fileTest.uri.fsPath}" --test`;
			console.log(`🧪 Phlow: Executing command: ${command}`);

			// Execute the command using child process
			const { spawn } = require('child_process');

			const process = spawn('phlow', [fileTest.uri.fsPath, '--test'], {
				cwd: cwd,
				stdio: ['pipe', 'pipe', 'pipe']
			});

			let stdout = '';
			let stderr = '';

			process.stdout.on('data', (data: Buffer) => {
				stdout += data.toString();
			});

			process.stderr.on('data', (data: Buffer) => {
				stderr += data.toString();
			});

			// Wait for the process to complete
			const exitCode = await new Promise<number>((resolve, reject) => {
				process.on('close', (code: number) => {
					resolve(code);
				});

				process.on('error', (error: Error) => {
					reject(error);
				});

				// Timeout after 15 seconds for all tests
				setTimeout(() => {
					process.kill();
					reject(new Error('Test execution timeout'));
				}, 15000);
			});

			console.log(`🧪 Phlow: All tests completed with exit code: ${exitCode}`);
			console.log(`🧪 Phlow: stdout:`, stdout);
			if (stderr) {
				console.log(`🧪 Phlow: stderr:`, stderr);
			}

			// Mark all tests based on overall result
			// TODO: Parse output to determine individual test results
			if (exitCode === 0) {
				fileTest.children.forEach(childTest => {
					run.passed(childTest);
				});
				console.log(`✅ Phlow: All tests in ${fileTest.label} passed`);
			} else {
				const errorMessage = stderr || stdout || `Tests failed with exit code ${exitCode}`;
				fileTest.children.forEach(childTest => {
					run.failed(childTest, new vscode.TestMessage(errorMessage));
				});
				console.log(`❌ Phlow: Tests in ${fileTest.label} failed: ${errorMessage}`);
			}

		} catch (error) {
			console.error(`🧪 Phlow: Error running tests in file:`, error);
			fileTest.children.forEach(childTest => {
				run.failed(childTest, new vscode.TestMessage(`Error running test: ${error}`));
			});
		}
	}

	private async runSingleTest(test: vscode.TestItem, run: vscode.TestRun) {
		run.started(test);

		try {
			if (!test.uri) {
				run.failed(test, new vscode.TestMessage('No file URI found for test'));
				return;
			}

			// Extract test index from test ID
			const testId = test.id;
			const match = testId.match(/-(\d+)$/);
			if (!match) {
				run.failed(test, new vscode.TestMessage('Could not parse test index'));
				return;
			}

			const testIndex = parseInt(match[1]);

			// Get test data to extract the describe value
			const document = await vscode.workspace.openTextDocument(test.uri);
			const content = document.getText();
			const parsed = yaml.parse(content, {
				strict: false,
				uniqueKeys: false,
				logLevel: 'silent'
			});

			if (!parsed?.tests?.[testIndex]) {
				run.failed(test, new vscode.TestMessage('Test not found in file'));
				return;
			}

			const testCase = parsed.tests[testIndex];
			const testFilter = testCase.describe || `Test ${testIndex + 1}`;

			console.log(`🧪 Phlow: Running individual test with filter: "${testFilter}"`);

			// Execute the command and capture the result
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(test.uri);
			const cwd = workspaceFolder?.uri.fsPath || path.dirname(test.uri.fsPath);

			const command = `phlow "${test.uri.fsPath}" --test --test-filter "${testFilter}"`;
			console.log(`🧪 Phlow: Executing command: ${command}`);

			// Execute the command using a child process to capture exit code
			const { spawn } = require('child_process');

			const process = spawn('phlow', [test.uri.fsPath, '--test', '--test-filter', testFilter], {
				cwd: cwd,
				stdio: ['pipe', 'pipe', 'pipe']
			});

			let stdout = '';
			let stderr = '';

			process.stdout.on('data', (data: Buffer) => {
				stdout += data.toString();
			});

			process.stderr.on('data', (data: Buffer) => {
				stderr += data.toString();
			});

			// Wait for the process to complete
			const exitCode = await new Promise<number>((resolve, reject) => {
				process.on('close', (code: number) => {
					resolve(code);
				});

				process.on('error', (error: Error) => {
					reject(error);
				});

				// Timeout after 10 seconds
				setTimeout(() => {
					process.kill();
					reject(new Error('Test execution timeout'));
				}, 10000);
			});

			console.log(`🧪 Phlow: Test completed with exit code: ${exitCode}`);
			console.log(`🧪 Phlow: stdout:`, stdout);
			if (stderr) {
				console.log(`🧪 Phlow: stderr:`, stderr);
			}

			// Determine test result based on exit code
			if (exitCode === 0) {
				run.passed(test);
				console.log(`✅ Phlow: Test "${testFilter}" passed`);
			} else {
				const errorMessage = stderr || stdout || `Test failed with exit code ${exitCode}`;
				run.failed(test, new vscode.TestMessage(errorMessage));
				console.log(`❌ Phlow: Test "${testFilter}" failed: ${errorMessage}`);
			}

		} catch (error) {
			console.error(`🧪 Phlow: Error running individual test:`, error);
			run.failed(test, new vscode.TestMessage(`Error running test: ${error}`));
		}
	}

	dispose() {
		this.watcherDisposables.forEach(d => d.dispose());
	}

	// Public method to trigger test discovery
	public async refreshTests() {
		await this.discoverTests();
	}

	// Debug method to test a specific file
	public async debugTestsForFile(uri: vscode.Uri) {
		console.log(`🐛 Phlow: Debug testing file: ${uri.fsPath}`);
		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const content = document.getText();
			console.log(`🐛 Phlow: File content length: ${content.length}`);
			console.log(`🐛 Phlow: File content preview:`, content.substring(0, 200));

			const tests = this.parseTestsFromContent(content, uri);
			console.log(`🐛 Phlow: Parsed ${tests.length} tests`);

			if (tests.length > 0) {
				vscode.window.showInformationMessage(`Found ${tests.length} tests in ${path.basename(uri.fsPath)}`);
			} else {
				vscode.window.showWarningMessage(`No tests found in ${path.basename(uri.fsPath)}`);
			}
		} catch (error) {
			console.error(`🐛 Phlow: Error in debug:`, error);
			vscode.window.showErrorMessage(`Debug error: ${error}`);
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Phlow extension is now active!');

	// Initialize test provider
	const phlowTestProvider = new PhlowTestProvider(context);

	// Configurar arquivos .phlow para herdar comportamentos do YAML com indentação de 2 espaços
	vscode.languages.setLanguageConfiguration('phlow', {
		wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/,
		indentationRules: {
			increaseIndentPattern: /^(\s*(- ))?.*:(\s)*$|^(\s*)(-\s+)?.*:(\s)*$|^(\s*)(steps|modules|tests|then|else|with|properties|args)\s*:/,
			decreaseIndentPattern: /^\s*\}\s*$/
		}
	});

	// Configurar arquivos .phs para se comportarem como Rhai/Rust com indentação de 4 espaços
	vscode.languages.setLanguageConfiguration('phs', {
		wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/,
		indentationRules: {
			increaseIndentPattern: /^.*\{[^}]*$|^.*(if|else|for|while|fn|loop)\s*.*\{?\s*$/,
			decreaseIndentPattern: /^\s*\}.*$/
		}
	});

	// Command to run a phlow
	const runPhlowCommand = vscode.commands.registerCommand('phlow.runPhlow', async (uri?: vscode.Uri) => {
		const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
		if (!fileUri) {
			vscode.window.showErrorMessage('No Phlow file selected');
			return;
		}

		const terminal = vscode.window.createTerminal('Phlow');
		terminal.show();
		terminal.sendText(`phlow "${fileUri.fsPath}"`);
	});
	// Command to run phlow tests
	const runPhlowTestsCommand = vscode.commands.registerCommand('phlow.runPhlowTests', async (uri?: vscode.Uri) => {
		const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
		if (!fileUri) {
			vscode.window.showErrorMessage('No Phlow file selected');
			return;
		}

		// Check if the file has tests before running
		const document = await vscode.workspace.openTextDocument(fileUri);
		const text = document.getText();

		if (!text.includes('tests:')) {
			vscode.window.showWarningMessage('No tests found in this Phlow file. Add a "tests:" section to run tests.');
			return;
		}

		const terminal = vscode.window.createTerminal('Phlow Tests');
		terminal.show();
		terminal.sendText(`phlow "${fileUri.fsPath}" --test`);
	});

	// Command to refresh tests
	const refreshTestsCommand = vscode.commands.registerCommand('phlow.refreshTests', async () => {
		console.log('🔄 Phlow: Manually refreshing tests...');
		await phlowTestProvider.refreshTests();
		vscode.window.showInformationMessage('Phlow tests refreshed');
	});

	// Debug command to test current file
	const debugTestsCommand = vscode.commands.registerCommand('phlow.debugTests', async () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (activeEditor && activeEditor.document.languageId === 'phlow') {
			await phlowTestProvider.debugTestsForFile(activeEditor.document.uri);
		} else {
			vscode.window.showWarningMessage('Please open a .phlow file first');
		}
	});

	// Command to create a new phlow
	const createNewPhlowCommand = vscode.commands.registerCommand('phlow.createNewPhlow', async () => {
		const phlowType = await vscode.window.showQuickPick([
			{ label: 'Basic Phlow', description: 'Phlow with CLI and modules', value: 'basic' },
			{ label: 'Simple Phlow', description: 'Phlow without external modules', value: 'simple' },
			{ label: 'HTTP Phlow', description: 'Phlow with HTTP server', value: 'http' },
			{ label: 'PostgreSQL Phlow', description: 'Phlow with database integration', value: 'postgres' }
		], {
			placeHolder: 'Select phlow type'
		});

		if (!phlowType) return;

		const phlowName = await vscode.window.showInputBox({
			prompt: 'Phlow name',
			placeHolder: 'my-phlow'
		});

		if (!phlowName) return;

		let template = '';

		switch (phlowType.value) {
			case 'basic':
				template = `main: cli
name: ${phlowName}
version: 1.0.0
description: Phlow description
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
				template = `name: ${phlowName}
version: 1.0.0
description: Simple phlow description
steps:
  - payload: "Hello, World!"
  - payload: !phs \`Result: \${payload}\`
`;
				break;
			case 'http':
				template = `main: http_server
name: ${phlowName}
version: 1.0.0
description: HTTP server phlow
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
name: ${phlowName}
version: 1.0.0
description: PostgreSQL phlow
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
			`${phlowName}.phlow`
		)); await vscode.workspace.fs.writeFile(newFile, Buffer.from(template, 'utf8'));
		await vscode.window.showTextDocument(newFile);

		vscode.window.showInformationMessage(`Phlow "${phlowName}" created successfully!`);
	});

	// Enhanced command to validate with detailed output
	const validatePhlowCommand = vscode.commands.registerCommand('phlow.validatePhlow', async (uri?: vscode.Uri) => {
		const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
		if (!fileUri) {
			vscode.window.showErrorMessage('No Phlow file selected');
			return;
		}

		const document = await vscode.workspace.openTextDocument(fileUri);

		// Show progress during validation
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Validating Phlow phlow...",
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 30, message: "Parsing modules..." });
			await validateDocument(document);

			progress.report({ increment: 70, message: "Checking schemas..." });
			await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
		});

		const diagnostics = diagnosticCollection.get(fileUri);
		if (diagnostics && diagnostics.length > 0) {
			const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
			const warnings = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;

			// Show detailed validation results
			const message = `Phlow validation completed:\n• ${errors} error(s)\n• ${warnings} warning(s)\n\nCheck the Problems panel for details.`;

			if (errors > 0) {
				vscode.window.showErrorMessage(message, 'Open Problems Panel').then(selection => {
					if (selection) {
						vscode.commands.executeCommand('workbench.panel.markers.view.focus');
					}
				});
			} else {
				vscode.window.showWarningMessage(message, 'Open Problems Panel').then(selection => {
					if (selection) {
						vscode.commands.executeCommand('workbench.panel.markers.view.focus');
					}
				});
			}
		} else {
			vscode.window.showInformationMessage('✅ Phlow validation passed successfully! No issues found.');
		}
	});

	// Register commands
	context.subscriptions.push(runPhlowCommand, runPhlowTestsCommand, refreshTestsCommand, debugTestsCommand, createNewPhlowCommand, validatePhlowCommand);

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

			// Helper function to check if a line is at root level (no indentation)
			const isRootLevel = (line: string): boolean => {
				return line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t');
			};

			// Find the best position for "Run Phlow" CodeLens (main: first, then steps:)
			let runPhlowLine = -1;

			// First try to find root-level "main:"
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const trimmedLine = line.trim();
				if (isRootLevel(line) && trimmedLine.startsWith('main:')) {
					runPhlowLine = i;
					break;
				}
			}

			// If no root-level "main:" found, look for root-level "steps:"
			if (runPhlowLine === -1) {
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					const trimmedLine = line.trim();
					if (isRootLevel(line) && trimmedLine.startsWith('steps:')) {
						runPhlowLine = i;
						break;
					}
				}
			}

			// Add "Run Phlow" CodeLens if we found a suitable position
			if (runPhlowLine !== -1) {
				const runRange = new vscode.Range(runPhlowLine, 0, runPhlowLine, 0);
				const runCommand: vscode.Command = {
					title: "▶ Run Phlow",
					command: "phlow.runPhlow",
					arguments: [document.uri]
				};
				codeLenses.push(new vscode.CodeLens(runRange, runCommand));
			}

			// Find root-level tests: line and add "Run Tests" CodeLens above it
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const trimmedLine = line.trim();
				if (isRootLevel(line) && trimmedLine.startsWith('tests:')) {
					const testRange = new vscode.Range(i, 0, i, 0);
					const testCommand: vscode.Command = {
						title: "🧪 Run Tests",
						command: "phlow.runPhlowTests",
						arguments: [document.uri]
					};
					codeLenses.push(new vscode.CodeLens(testRange, testCommand));
					break; // Only show for the first root-level tests: found
				}
			}

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

	// Enhanced hover provider to show information about Phlow elements and modules
	const hoverProvider = vscode.languages.registerHoverProvider(phlowDocumentSelector, {
		async provideHover(document, position) {
			const word = document.getWordRangeAtPosition(position);
			if (!word) return;

			const wordText = document.getText(word);
			const line = document.lineAt(position.line).text;

			// Check if this is a module name - try to fetch schema for any module
			if (line.includes('module:')) {
				const schema = await fetchModuleSchema(wordText);
				if (schema) {
					const hover = new vscode.MarkdownString();
					hover.isTrusted = true;
					hover.supportHtml = true;

					hover.appendMarkdown(`### 📦 ${schema.name} Module\n\n`);
					hover.appendMarkdown(`**Description:** ${schema.description}\n\n`);
					hover.appendMarkdown(`**Version:** ${schema.version}\n\n`);
					hover.appendMarkdown(`**Type:** ${schema.type}\n\n`);

					if (schema.with?.properties) {
						hover.appendMarkdown(`**Configuration Options:**\n`);
						Object.entries(schema.with.properties).forEach(([key, prop]: [string, any]) => {
							const required = prop.required ? ' *(required)*' : ' *(optional)*';
							hover.appendMarkdown(`- \`${key}\`: ${prop.description || 'No description'}${required}\n`);
						});
					}

					hover.appendMarkdown(`\n[📚 View module documentation](https://github.com/phlowdotdev/phlow/tree/main/modules/${wordText})`);

					return new vscode.Hover(hover);
				}
			}		// Default hover texts for Phlow keywords
			const hoverTexts: { [key: string]: vscode.MarkdownString } = {
				'main': new vscode.MarkdownString('**main**: Specifies the main module that provides the initial context (e.g.: `cli`, `http_server`)'),
				'modules': new vscode.MarkdownString('**modules**: List of modules required for the phlow'),
				'steps': new vscode.MarkdownString('**steps**: Sequence of steps that the phlow will execute'),
				'tests': new vscode.MarkdownString('**tests**: List of test cases for the phlow. Run with `phlow file.phlow --test`'),
				'describe': new vscode.MarkdownString('**describe**: Human-readable description of what the test is validating'),
				'assert': new vscode.MarkdownString('**assert**: Evaluates a boolean condition to control phlow'),
				'assert_eq': new vscode.MarkdownString('**assert_eq**: Asserts that the result equals the expected value'),
				'then': new vscode.MarkdownString('**then**: Executes if the assertion is true'),
				'else': new vscode.MarkdownString('**else**: Executes if the assertion is false'),
				'payload': new vscode.MarkdownString('**payload**: Data that the step sends to the next step'),
				'return': new vscode.MarkdownString('**return**: Stops the phlow and returns the specified data'),
				'use': new vscode.MarkdownString('**use**: Specifies the module to be used in this step'),
				'with': new vscode.MarkdownString('**with**: Configuration parameters for the module'),
				'!phs': new vscode.MarkdownString('**!phs**: Directive to execute inline Phlow scripts'),
				'!include': new vscode.MarkdownString('**!include**: Directive to include content from another YAML file'),
				'!import': new vscode.MarkdownString('**!import**: Directive to import and execute a .phs script')
			};

			return hoverTexts[wordText] ? new vscode.Hover(hoverTexts[wordText]) : undefined;
		}
	});

	context.subscriptions.push(hoverProvider);

	// Completion provider for module properties
	const completionProvider = vscode.languages.registerCompletionItemProvider(
		phlowDocumentSelector,
		{
			async provideCompletionItems(document, position, token, context) {
				const lineText = document.lineAt(position.line).text;
				const linePrefix = lineText.substring(0, position.character);

				// Check if we're in a module's 'with' section
				const moduleMatch = findModuleContext(document, position);
				if (moduleMatch) {
					const schema = await fetchModuleSchema(moduleMatch.moduleName);
					if (schema?.with?.properties) {
						const completions: vscode.CompletionItem[] = [];

						// If we're in an array context, suggest array item properties
						if (moduleMatch.arrayProperty) {
							const arrayPropertySchema = schema.with.properties[moduleMatch.arrayProperty];

							if (arrayPropertySchema?.type === 'array' && arrayPropertySchema.items?.properties) {
								Object.entries(arrayPropertySchema.items.properties).forEach(([key, prop]: [string, any]) => {
									const completion = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
									completion.detail = `${moduleMatch.arrayProperty} item property`;
									completion.documentation = new vscode.MarkdownString(
										`**${key}** (array item property)\n\n` +
										`Type: \`${prop.type || 'any'}\`\n\n` +
										`Required: ${prop.required ? 'Yes' : 'No'}\n\n` +
										`${prop.description || 'No description available'}`
									);

									completion.insertText = `${key}: `;

									if (prop.required) {
										completion.sortText = `0_${key}`;
										completion.label = `${key} *`;
									} else {
										completion.sortText = `1_${key}`;
									}

									completions.push(completion);
								});

								// Add hint if additional properties are allowed
								if (arrayPropertySchema.items.aditional_propierties === true) {
									const additionalHint = new vscode.CompletionItem('...', vscode.CompletionItemKind.Text);
									additionalHint.detail = 'Additional properties allowed';
									additionalHint.documentation = new vscode.MarkdownString('This array item accepts additional properties beyond those listed above.');
									additionalHint.sortText = '9_additional';
									additionalHint.insertText = '';
									completions.push(additionalHint);
								}

								return completions;
							}
						}

						// Otherwise suggest top-level module properties
						Object.entries(schema.with.properties).forEach(([key, prop]: [string, any]) => {
							const completion = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
							completion.detail = prop.description || 'Module property';
							completion.documentation = new vscode.MarkdownString(
								`**${key}**\n\n` +
								`Type: \`${prop.type || 'any'}\`\n\n` +
								`Required: ${prop.required ? 'Yes' : 'No'}\n\n` +
								`${prop.description || 'No description available'}`
							);

							// Add default value if available
							if (prop.default !== undefined) {
								completion.insertText = `${key}: ${formatYamlValue(prop.default, prop.type)}`;
								completion.documentation.appendMarkdown(`\n\nDefault: \`${prop.default}\``);
							} else {
								completion.insertText = `${key}: `;
							}

							// Add required indicator
							if (prop.required) {
								completion.sortText = `0_${key}`; // Required items first
								completion.label = `${key} *`;
							} else {
								completion.sortText = `1_${key}`;
							}

							completions.push(completion);
						});

						// Add hint if additional properties are allowed at module level
						if (schema.with.aditional_propierties === true) {
							const additionalHint = new vscode.CompletionItem('...', vscode.CompletionItemKind.Text);
							additionalHint.detail = 'Additional properties allowed';
							additionalHint.documentation = new vscode.MarkdownString('This module accepts additional properties beyond those listed above.');
							additionalHint.sortText = '9_additional';
							additionalHint.insertText = '';
							completions.push(additionalHint);
						}

						return completions;
					}
				}

				// Default completions for Phlow keywords
				if (linePrefix.trim() === '' || linePrefix.endsWith('  ')) {
					return [
						createCompletionItem('main', 'Main module', vscode.CompletionItemKind.Property),
						createCompletionItem('name', 'Phlow name', vscode.CompletionItemKind.Property),
						createCompletionItem('version', 'Phlow version', vscode.CompletionItemKind.Property),
						createCompletionItem('description', 'Phlow description', vscode.CompletionItemKind.Property),
						createCompletionItem('modules', 'Required modules', vscode.CompletionItemKind.Property),
						createCompletionItem('tests', 'Test cases', vscode.CompletionItemKind.Property),
						createCompletionItem('steps', 'Phlow steps', vscode.CompletionItemKind.Property),
					];
				}

				// Module name completions
				if (linePrefix.includes('module:')) {
					const availableModules = await fetchAvailableModules();
					return availableModules.map((moduleName: string) => {
						const completion = new vscode.CompletionItem(moduleName, vscode.CompletionItemKind.Module);
						completion.detail = `Phlow ${moduleName} module`;
						completion.insertText = moduleName;
						return completion;
					});
				}

				return undefined;
			}
		},
		':',  // Trigger on colon
		' ',  // Trigger on space
		'-'   // Trigger on dash (for YAML lists)
	);

	context.subscriptions.push(completionProvider);
	// Document validation for modules
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('phlow');
	context.subscriptions.push(diagnosticCollection);

	async function validateDocument(document: vscode.TextDocument) {
		if (document.languageId !== 'phlow') return;

		const diagnostics: vscode.Diagnostic[] = [];
		const lines = document.getText().split('\n');

		// Parse document structure to find modules and their configurations
		const modules = await parseDocumentModules(lines);

		for (const moduleInfo of modules) {
			// Tenta buscar o schema do módulo dinamicamente
			// Se não existir, o fetchModuleSchema retornará null e será ignorado
			const schema = await fetchModuleSchema(moduleInfo.name);
			if (schema && moduleInfo.withProperties) {
				const propertyDiagnostics = await validateModuleProperties(moduleInfo, schema, lines);
				diagnostics.push(...propertyDiagnostics);
			}
			// Se o schema não existir, simplesmente ignora (não mostra erro)
		}

		diagnosticCollection.set(document.uri, diagnostics);
	}

	interface ModuleInfo {
		name: string;
		nameRange: vscode.Range;
		lineIndex: number;
		withProperties: Array<{
			name: string;
			range: vscode.Range;
			lineIndex: number;
		}>;
	}

	async function parseDocumentModules(lines: string[]): Promise<ModuleInfo[]> {
		const modules: ModuleInfo[] = [];
		let currentModule: ModuleInfo | null = null;
		let withinWith = false;
		let withIndent = 0;
		let arrayContext: { propertyName: string; indent: number } | null = null;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmedLine = line.trim();
			const currentIndent = line.length - line.trimStart().length;

			// Find module declaration
			const moduleMatch = line.match(/^\s*-?\s*module:\s*(\w+)/);
			if (moduleMatch) {
				// Save previous module if exists
				if (currentModule) {
					modules.push(currentModule);
				}

				const moduleName = moduleMatch[1];
				const start = line.indexOf(moduleName);
				currentModule = {
					name: moduleName,
					nameRange: new vscode.Range(i, start, i, start + moduleName.length),
					lineIndex: i,
					withProperties: []
				};
				withinWith = false;
				arrayContext = null;
				continue;
			}

			// Find 'with:' section
			if (currentModule && trimmedLine === 'with:') {
				withinWith = true;
				withIndent = currentIndent;
				arrayContext = null;
				continue;
			}

			// Parse properties within 'with:' section
			if (currentModule && withinWith && currentIndent > withIndent) {

				// Handle array items (lines starting with -)
				if (trimmedLine.startsWith('-') && arrayContext) {
					// We're in an array context, don't add the dash itself as a property
					continue;
				}

				// Handle regular properties
				if (trimmedLine.includes(':')) {
					const colonIndex = trimmedLine.indexOf(':');
					const propertyName = trimmedLine.substring(0, colonIndex).trim();

					// Skip array items markers and nested objects without property names
					if (!propertyName.startsWith('-') && propertyName && !propertyName.includes(' ')) {
						const start = line.indexOf(propertyName);

						// Check if this is a top-level property in 'with:' section
						if (currentIndent === withIndent + 2) {
							currentModule.withProperties.push({
								name: propertyName,
								range: new vscode.Range(i, start, i, start + propertyName.length),
								lineIndex: i
							});

							// Reset array context for new top-level property
							arrayContext = null;
						}
						// Check if this is a property inside an array item
						else if (arrayContext && currentIndent > arrayContext.indent) {
							// Add this as a property that belongs to the array property
							// We'll validate it against the array item schema
							currentModule.withProperties.push({
								name: `${arrayContext.propertyName}.${propertyName}`,
								range: new vscode.Range(i, start, i, start + propertyName.length),
								lineIndex: i
							});
						}
					}
				}

				// Detect when we're entering an array context
				if (currentModule.withProperties.length > 0) {
					const lastProperty = currentModule.withProperties[currentModule.withProperties.length - 1];
					if (!lastProperty.name.includes('.') && currentIndent === withIndent + 4 && trimmedLine.startsWith('-')) {
						arrayContext = {
							propertyName: lastProperty.name,
							indent: currentIndent
						};
					}
				}
			}

			// Exit 'with:' section if we're back to lower indent
			if (withinWith && trimmedLine && currentIndent <= withIndent && !trimmedLine.startsWith('with:')) {
				withinWith = false;
				arrayContext = null;
			}
		}

		// Add last module
		if (currentModule) {
			modules.push(currentModule);
		}

		return modules;
	}

	async function validateModuleProperties(moduleInfo: ModuleInfo, schema: ModuleSchema, lines: string[]): Promise<vscode.Diagnostic[]> {
		const diagnostics: vscode.Diagnostic[] = [];

		if (!schema.with?.properties) {
			console.log(`No 'with' properties found for module ${moduleInfo.name}`);
			return diagnostics;
		}

		const validProperties = Object.keys(schema.with.properties);
		const requiredProperties = Object.entries(schema.with.properties)
			.filter(([_, prop]: [string, any]) => prop.required)
			.map(([key, _]) => key);

		console.log(`Module ${moduleInfo.name} - Valid properties:`, validProperties);
		console.log(`Module ${moduleInfo.name} - Required properties:`, requiredProperties);
		console.log(`Module ${moduleInfo.name} - Found properties:`, moduleInfo.withProperties.map(p => p.name));
		console.log(`Module ${moduleInfo.name} - Additional properties allowed:`, schema.with.aditional_propierties === true);

		const foundProperties = new Set<string>();

		// Validate each property
		for (const prop of moduleInfo.withProperties) {
			// Handle nested properties (like args.name, args.type, etc.)
			if (prop.name.includes('.')) {
				const [parentProperty, childProperty] = prop.name.split('.');
				foundProperties.add(parentProperty); // Mark parent as found

				// Get parent property schema
				const parentSchema = schema.with.properties[parentProperty];
				if (parentSchema) {
					// Check if parent is an array with object items
					if (parentSchema.type === 'array' && parentSchema.items?.properties) {
						const validChildProperties = Object.keys(parentSchema.items.properties);
						const allowsAdditionalProperties = parentSchema.items.aditional_propierties === true;

						// Only validate if additional properties are not allowed or if the property is in the schema
						if (!allowsAdditionalProperties && !validChildProperties.includes(childProperty)) {
							console.log(`Invalid array item property: ${childProperty} for ${parentProperty} in module ${moduleInfo.name}`);
							diagnostics.push(new vscode.Diagnostic(
								prop.range,
								`Invalid property '${childProperty}' for array '${parentProperty}' in module '${moduleInfo.name}'. Valid properties: ${validChildProperties.join(', ')}`,
								vscode.DiagnosticSeverity.Error
							));
						} else if (allowsAdditionalProperties && !validChildProperties.includes(childProperty)) {
							console.log(`Additional array item property accepted: ${childProperty} for ${parentProperty} in module ${moduleInfo.name} (aditional_propierties: true)`);
						}
					}
					// Check if parent is an object with nested properties
					else if (parentSchema.type === 'object' && parentSchema.properties) {
						const validChildProperties = Object.keys(parentSchema.properties);
						const allowsAdditionalProperties = parentSchema.aditional_propierties === true;

						// Only validate if additional properties are not allowed or if the property is in the schema
						if (!allowsAdditionalProperties && !validChildProperties.includes(childProperty)) {
							console.log(`Invalid nested property: ${childProperty} for ${parentProperty} in module ${moduleInfo.name}`);
							diagnostics.push(new vscode.Diagnostic(
								prop.range,
								`Invalid property '${childProperty}' for object '${parentProperty}' in module '${moduleInfo.name}'. Valid properties: ${validChildProperties.join(', ')}`,
								vscode.DiagnosticSeverity.Error
							));
						} else if (allowsAdditionalProperties && !validChildProperties.includes(childProperty)) {
							console.log(`Additional nested property accepted: ${childProperty} for ${parentProperty} in module ${moduleInfo.name} (aditional_propierties: true)`);
						}
					}
				}
			} else {
				// Handle top-level properties
				foundProperties.add(prop.name);

				// Check if additional properties are allowed at the module level
				const allowsAdditionalProperties = schema.with.aditional_propierties === true;

				// Only validate if additional properties are not allowed
				if (!allowsAdditionalProperties && !validProperties.includes(prop.name)) {
					console.log(`Invalid property found: ${prop.name} for module ${moduleInfo.name}`);
					diagnostics.push(new vscode.Diagnostic(
						prop.range,
						`Invalid property '${prop.name}' for module '${moduleInfo.name}'. Valid properties: ${validProperties.join(', ')}`,
						vscode.DiagnosticSeverity.Error
					));
				} else if (allowsAdditionalProperties && !validProperties.includes(prop.name)) {
					console.log(`Additional property accepted: ${prop.name} for module ${moduleInfo.name} (aditional_propierties: true)`);
				}
			}
		}

		// Check for missing required properties
		const missingRequired = requiredProperties.filter(prop => !foundProperties.has(prop));
		if (missingRequired.length > 0) {
			console.log(`Missing required properties for ${moduleInfo.name}:`, missingRequired);
			diagnostics.push(new vscode.Diagnostic(
				moduleInfo.nameRange,
				`Module '${moduleInfo.name}' is missing required properties: ${missingRequired.join(', ')}`,
				vscode.DiagnosticSeverity.Error
			));
		}

		return diagnostics;
	}

	// Real-time validation with debouncing
	let validationTimeout: NodeJS.Timeout | undefined;

	vscode.workspace.onDidChangeTextDocument(e => {
		if (e.document.languageId === 'phlow') {
			// Clear previous timeout
			if (validationTimeout) {
				clearTimeout(validationTimeout);
			}

			// Debounce validation to avoid excessive API calls
			validationTimeout = setTimeout(() => {
				validateDocument(e.document);
			}, 300);
		}
	});

	vscode.workspace.onDidOpenTextDocument(doc => {
		if (doc.languageId === 'phlow') {
			validateDocument(doc);
		}
	});

	vscode.workspace.onDidSaveTextDocument(doc => {
		if (doc.languageId === 'phlow') {
			validateDocument(doc);
		}
	});

	// Validate open documents on activation
	vscode.workspace.textDocuments.forEach(doc => {
		if (doc.languageId === 'phlow') {
			validateDocument(doc);
		}
	});

	function findModuleContext(document: vscode.TextDocument, position: vscode.Position): { moduleName: string; withinWith: boolean; arrayProperty?: string } | null {
		let currentModuleName = '';
		let withinWith = false;
		let withinModule = false;
		let arrayProperty = '';

		// Look backwards from current position to find module context
		for (let i = position.line; i >= 0; i--) {
			const line = document.lineAt(i).text;
			const indent = line.length - line.trimStart().length;
			const trimmedLine = line.trim();

			// Check if we're in a 'with:' section
			if (trimmedLine.startsWith('with:')) {
				withinWith = true;
				continue;
			}

			// Check if we're inside an array item (line starts with -)
			if (trimmedLine.startsWith('-') && withinWith) {
				// Look for the array property name above
				for (let j = i - 1; j >= 0; j--) {
					const prevLine = document.lineAt(j).text;
					const prevTrimmed = prevLine.trim();
					const prevIndent = prevLine.length - prevLine.trimStart().length;

					if (prevTrimmed.includes(':') && prevIndent < indent) {
						const colonIndex = prevTrimmed.indexOf(':');
						const propertyName = prevTrimmed.substring(0, colonIndex).trim();
						if (propertyName && !propertyName.startsWith('-')) {
							arrayProperty = propertyName;
							break;
						}
					}
				}
			}

			// Check if we found a module declaration
			const moduleMatch = line.match(/^\s*-?\s*module:\s*(\w+)/);
			if (moduleMatch) {
				currentModuleName = moduleMatch[1];
				withinModule = true;
				break;
			}

			// If we hit a different section or module, stop
			if (indent <= 2 && trimmedLine && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('with:')) {
				break;
			}
		}

		if (withinModule && currentModuleName && withinWith) {
			return { moduleName: currentModuleName, withinWith: true, arrayProperty: arrayProperty || undefined };
		}

		return null;
	}

	function createCompletionItem(label: string, detail: string, kind: vscode.CompletionItemKind): vscode.CompletionItem {
		const item = new vscode.CompletionItem(label, kind);
		item.detail = detail;
		item.insertText = `${label}: `;
		return item;
	}

	function formatYamlValue(value: any, type?: string): string {
		if (type === 'string' && typeof value === 'string') {
			return `"${value}"`;
		}
		if (type === 'boolean') {
			return value ? 'true' : 'false';
		}
		if (type === 'array') {
			return '\n  - ';
		}
		if (type === 'object') {
			return '\n  ';
		}
		return String(value);
	}

	// Provider for custom folding (maintains YAML compatibility)
	const foldingProvider = vscode.languages.registerFoldingRangeProvider(phlowDocumentSelector, {
		provideFoldingRanges(document) {
			const ranges: vscode.FoldingRange[] = [];
			const lines = document.getText().split('\n');

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				// Detect YAML/Phlow blocks for folding
				if (/^(\s*)(steps|modules|tests|then|else):\s*$/.test(line)) {
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

	// Função para limpar caches (útil para desenvolvimento/debugging)
	const clearCacheCommand = vscode.commands.registerCommand('phlow.clearModuleCache', () => {
		moduleSchemaCache.clear();
		moduleNotFoundCache.clear();
		availableModulesCache = null;
		vscode.window.showInformationMessage('Module caches cleared successfully!');
	});

	// Comando para aplicar formatação padrão aos arquivos Phlow
	const formatPhlowCommand = vscode.commands.registerCommand('phlow.formatDocument', async () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showWarningMessage('No active editor found');
			return;
		}

		const document = activeEditor.document;
		if (document.languageId !== 'phlow' && document.languageId !== 'phs') {
			vscode.window.showWarningMessage('This command only works with .phlow and .phs files');
			return;
		}

		// Aplicar formatação
		await vscode.commands.executeCommand('editor.action.formatDocument');

		// Aplicar configurações de indentação específicas
		const tabSize = document.languageId === 'phlow' ? 2 : 4;
		await vscode.commands.executeCommand('editor.action.indentationToSpaces');
		await vscode.commands.executeCommand('editor.action.changeTabDisplaySize', tabSize);

		vscode.window.showInformationMessage(`Document formatted with ${tabSize}-space indentation`);
	});

	// Debug command to test module schema parsing
	const testModuleSchemaCommand = vscode.commands.registerCommand('phlow.testModuleSchema', async () => {
		const moduleName = await vscode.window.showInputBox({
			prompt: 'Enter module name to test (any module name)',
			placeHolder: 'cli',
			value: 'cli'
		});

		if (!moduleName) return;

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Testing schema for module: ${moduleName}`,
			cancellable: false
		}, async (progress) => {
			progress.report({ message: "Fetching schema from GitHub..." });

			const schema = await fetchModuleSchema(moduleName);

			if (schema) {
				const properties = schema.with?.properties ? Object.keys(schema.with.properties) : [];
				const requiredProps = schema.with?.properties ?
					Object.entries(schema.with.properties)
						.filter(([_, prop]: [string, any]) => prop.required)
						.map(([key, _]) => key) : [];

				const message = `✅ Schema loaded for ${moduleName}:\n\n` +
					`Properties (${properties.length}): ${properties.join(', ')}\n\n` +
					`Required: ${requiredProps.join(', ')}\n\n` +
					`Description: ${schema.description}`;

				vscode.window.showInformationMessage(message);
			} else {
				vscode.window.showErrorMessage(`❌ Module '${moduleName}' not found in Phlow repository. Make sure the module name is correct.`);
			}
		});
	});

	context.subscriptions.push(clearCacheCommand, formatPhlowCommand, testModuleSchemaCommand);

	// Add test provider to subscriptions
	context.subscriptions.push(phlowTestProvider);

	// PHS inline completion provider
	const phsInlineCompletionProvider = vscode.languages.registerCompletionItemProvider(
		phlowDocumentSelector,
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				const lineText = document.lineAt(position).text;
				const linePrefix = lineText.substring(0, position.character);

				// Check if we're in a PHS context (!phs)
				const phsMatch = linePrefix.match(/!phs\s+/);
				if (!phsMatch) {
					return undefined;
				}

				// Get the PHS part after !phs
				const phsStartIndex = phsMatch.index! + phsMatch[0].length;
				const phsPrefix = linePrefix.substring(phsStartIndex);

				// PHS completions
				const completions: vscode.CompletionItem[] = [];

				// Phlow-specific variables
				const phlowVariables = [
					{ name: 'main', detail: 'Main module arguments and configuration' },
					{ name: 'payload', detail: 'Current step payload data' },
					{ name: 'steps', detail: 'Access to steps context' },
					{ name: 'envs', detail: 'Environment variables' }
				];

				// PHS keywords
				const phsKeywords = [
					{ name: 'if', detail: 'Conditional expression' },
					{ name: 'else', detail: 'Alternative condition' },
					{ name: 'let', detail: 'Variable declaration' },
					{ name: 'fn', detail: 'Function definition' },
					{ name: 'return', detail: 'Return statement' },
					{ name: 'true', detail: 'Boolean true' },
					{ name: 'false', detail: 'Boolean false' },
					{ name: 'null', detail: 'Null value' }
				];

				// PHS built-in functions
				const phsFunctions = [
					{ name: 'print', detail: 'Print to console' },
					{ name: 'debug', detail: 'Debug output' },
					{ name: 'type_of', detail: 'Get type of value' },
					{ name: 'len', detail: 'Get length of array/string' },
					{ name: 'is_empty', detail: 'Check if empty' },
					{ name: 'contains', detail: 'Check if contains value' },
					{ name: 'push', detail: 'Add to array' },
					{ name: 'pop', detail: 'Remove from array' },
					{ name: 'split', detail: 'Split string' },
					{ name: 'join', detail: 'Join array elements' },
					{ name: 'trim', detail: 'Remove whitespace' },
					{ name: 'to_upper', detail: 'Convert to uppercase' },
					{ name: 'to_lower', detail: 'Convert to lowercase' },
					{ name: 'to_string', detail: 'Convert to string' },
					{ name: 'to_int', detail: 'Convert to integer' },
					{ name: 'to_float', detail: 'Convert to float' },
					{ name: 'timestamp', detail: 'Get current timestamp' }
				];

				// Phlow-specific functions
				const phlowFunctions = [
					{ name: 'log', detail: 'Log message with level' },
					{ name: 'query', detail: 'Database query' },
					{ name: 'producer', detail: 'Message producer' },
					{ name: 'consumer', detail: 'Message consumer' }
				];

				// Add completions based on context
				if (phsPrefix.length === 0 || phsPrefix.match(/^\s*$/)) {
					// Beginning of PHS expression, show all options
					phlowVariables.forEach(item => {
						const completion = new vscode.CompletionItem(item.name, vscode.CompletionItemKind.Variable);
						completion.detail = item.detail;
						completion.insertText = item.name;
						completions.push(completion);
					});

					phsKeywords.forEach(item => {
						const completion = new vscode.CompletionItem(item.name, vscode.CompletionItemKind.Keyword);
						completion.detail = item.detail;
						completion.insertText = item.name;
						completions.push(completion);
					});

					phsFunctions.forEach(item => {
						const completion = new vscode.CompletionItem(item.name, vscode.CompletionItemKind.Function);
						completion.detail = item.detail;
						completion.insertText = `${item.name}(`;
						completions.push(completion);
					});

					phlowFunctions.forEach(item => {
						const completion = new vscode.CompletionItem(item.name, vscode.CompletionItemKind.Function);
						completion.detail = item.detail;
						completion.insertText = `${item.name}(`;
						completions.push(completion);
					});
				}

				// Property access completions (e.g., main.something)
				const dotMatch = phsPrefix.match(/(main|payload|steps|envs)\.(\w*)$/);
				if (dotMatch) {
					const objectName = dotMatch[1];
					const partialProperty = dotMatch[2];

					// Common properties based on object type
					let properties: string[] = [];
					switch (objectName) {
						case 'main':
							properties = ['name', 'version', 'description', 'args', 'body', 'headers', 'query'];
							break;
						case 'payload':
							properties = ['data', 'type', 'status', 'result', 'error'];
							break;
						case 'steps':
							properties = ['current', 'previous', 'next', 'index'];
							break;
						case 'envs':
							properties = ['DATABASE_URL', 'API_KEY', 'PORT', 'HOST'];
							break;
					}

					properties.forEach(prop => {
						if (prop.startsWith(partialProperty)) {
							const completion = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
							completion.detail = `${objectName}.${prop}`;
							completion.insertText = prop;
							completions.push(completion);
						}
					});
				}

				return completions;
			}
		},
		'.',  // Trigger on dot for property access
		' ',  // Trigger on space
		'('   // Trigger on parentheses for functions
	);

	context.subscriptions.push(phsInlineCompletionProvider);

	// Command to reload extension
	const reloadExtensionCommand = vscode.commands.registerCommand('phlow.reloadExtension', async () => {
		// Clear all caches
		moduleSchemaCache.clear();
		moduleNotFoundCache.clear();
		availableModulesCache = null;
		
		// Reload window to refresh syntax highlighting
		const result = await vscode.window.showInformationMessage(
			'Extension reloaded! Reload VS Code window to apply syntax highlighting changes?',
			'Reload Window',
			'Later'
		);
		
		if (result === 'Reload Window') {
			vscode.commands.executeCommand('workbench.action.reloadWindow');
		}
	});

	context.subscriptions.push(reloadExtensionCommand);
}

// This method is called when your extension is deactivated
export function deactivate() { }
