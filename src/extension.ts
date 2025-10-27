import * as vscode from 'vscode';
import * as path from 'path';
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

// Função para buscar schema de módulo Phlow (.phlow)
async function fetchPhlowModuleSchema(url: string, moduleName: string): Promise<ModuleSchema | null> {
	return new Promise((resolve) => {
		https.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => data += chunk);
			res.on('end', () => {
				try {
					if (res.statusCode === 404) {
						resolve(null);
						return;
					}

					const schema = parsePhlowModuleFile(data, moduleName);
					resolve(schema);
				} catch (error) {
					console.error(`Error parsing Phlow module ${moduleName}:`, error);
					resolve(null);
				}
			});
		}).on('error', () => {
			resolve(null);
		});
	});
}

// Função para buscar schema de módulo YAML (Rust)
async function fetchYamlModuleSchema(url: string, moduleName: string): Promise<ModuleSchema | null> {
	return new Promise((resolve) => {
		https.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => data += chunk);
			res.on('end', () => {
				try {
					if (res.statusCode === 404) {
						resolve(null);
						return;
					}

					const schema = parseModuleYaml(data);
					resolve(schema);
				} catch (error) {
					console.error(`Error parsing YAML module ${moduleName}:`, error);
					resolve(null);
				}
			});
		}).on('error', () => {
			resolve(null);
		});
	});
}

// Função para buscar schema de módulo local
async function fetchLocalModuleSchema(moduleName: string): Promise<ModuleSchema | null> {
	try {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return null;
		}

		// Procurar em todas as pastas do workspace
		for (const folder of workspaceFolders) {
			// Primeiro tenta encontrar {moduleName}.phlow
			const phlowModulePath = vscode.Uri.joinPath(folder.uri, `${moduleName}.phlow`);
			try {
				const phlowContent = await vscode.workspace.fs.readFile(phlowModulePath);
				const contentString = Buffer.from(phlowContent).toString('utf8');
				const schema = parsePhlowModuleFile(contentString, moduleName);
				if (schema) {
					console.log(`Found local Phlow module: ${phlowModulePath.fsPath}`);
					return schema;
				}
			} catch (error) {
				// Arquivo .phlow não encontrado, continua
			}

			// Depois tenta encontrar {moduleName}.yaml
			const yamlModulePath = vscode.Uri.joinPath(folder.uri, `${moduleName}.yaml`);
			try {
				const yamlContent = await vscode.workspace.fs.readFile(yamlModulePath);
				const contentString = Buffer.from(yamlContent).toString('utf8');
				const schema = parseModuleYaml(contentString);
				if (schema) {
					console.log(`Found local YAML module: ${yamlModulePath.fsPath}`);
					return schema;
				}
			} catch (error) {
				// Arquivo .yaml não encontrado, continua
			}

			// Procurar em subdiretórios modules/
			const modulesDir = vscode.Uri.joinPath(folder.uri, 'modules');
			try {
				// Tenta {modules}/{moduleName}/{moduleName}.phlow
				const moduleSubdirPhlow = vscode.Uri.joinPath(modulesDir, moduleName, `${moduleName}.phlow`);
				const phlowContent = await vscode.workspace.fs.readFile(moduleSubdirPhlow);
				const contentString = Buffer.from(phlowContent).toString('utf8');
				const schema = parsePhlowModuleFile(contentString, moduleName);
				if (schema) {
					console.log(`Found local Phlow module in subdirectory: ${moduleSubdirPhlow.fsPath}`);
					return schema;
				}
			} catch (error) {
				// Arquivo .phlow no subdiretório não encontrado, continua
			}

			try {
				// Tenta {modules}/{moduleName}/phlow.yaml
				const moduleSubdirYaml = vscode.Uri.joinPath(modulesDir, moduleName, 'phlow.yaml');
				const yamlContent = await vscode.workspace.fs.readFile(moduleSubdirYaml);
				const contentString = Buffer.from(yamlContent).toString('utf8');
				const schema = parseModuleYaml(contentString);
				if (schema) {
					console.log(`Found local YAML module in subdirectory: ${moduleSubdirYaml.fsPath}`);
					return schema;
				}
			} catch (error) {
				// Arquivo .yaml no subdiretório não encontrado, continua
			}
		}

		return null;
	} catch (error) {
		console.error(`Error searching for local module ${moduleName}:`, error);
		return null;
	}
}

// Função para buscar schema de módulo local via caminho relativo
async function fetchRelativeModuleSchema(relativePath: string, currentDocumentUri: vscode.Uri): Promise<ModuleSchema | null> {
	try {
		console.log(`🔍 Fetching relative module schema for: ${relativePath}`);
		console.log(`   From document: ${vscode.workspace.asRelativePath(currentDocumentUri)}`);

		// Resolve o caminho relativo em relação ao arquivo atual
		const currentDocumentDir = vscode.Uri.joinPath(currentDocumentUri, '..');
		console.log(`   Document directory: ${currentDocumentDir.fsPath}`);

		// Primeiro tenta {relativePath}.phlow
		const phlowModulePath = vscode.Uri.joinPath(currentDocumentDir, `${relativePath}.phlow`);
		console.log(`   Trying .phlow file: ${phlowModulePath.fsPath}`);

		try {
			const phlowContent = await vscode.workspace.fs.readFile(phlowModulePath);
			const contentString = Buffer.from(phlowContent).toString('utf8');
			const moduleBaseName = path.basename(relativePath);
			const schema = parsePhlowModuleFile(contentString, moduleBaseName);
			if (schema) {
				console.log(`✅ Found relative Phlow module: ${phlowModulePath.fsPath}`);
				console.log(`   Module name: ${schema.name}, Version: ${schema.version}`);
				return schema;
			}
		} catch (error) {
			console.log(`   .phlow file not found: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		// Depois tenta {relativePath}.yaml
		const yamlModulePath = vscode.Uri.joinPath(currentDocumentDir, `${relativePath}.yaml`);
		console.log(`   Trying .yaml file: ${yamlModulePath.fsPath}`);

		try {
			const yamlContent = await vscode.workspace.fs.readFile(yamlModulePath);
			const contentString = Buffer.from(yamlContent).toString('utf8');
			const schema = parseModuleYaml(contentString);
			if (schema) {
				console.log(`✅ Found relative YAML module: ${yamlModulePath.fsPath}`);
				console.log(`   Module name: ${schema.name}, Version: ${schema.version}`);
				return schema;
			}
		} catch (error) {
			console.log(`   .yaml file not found: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		console.log(`❌ No relative module found for: ${relativePath}`);
		return null;
	} catch (error) {
		console.error(`❌ Error searching for relative module ${relativePath}:`, error);
		return null;
	}
}

async function fetchModuleSchema(moduleName: string, currentDocumentUri?: vscode.Uri): Promise<ModuleSchema | null> {
	console.log(`📦 Fetching module schema for: "${moduleName}"`);

	// Detecta se é um caminho relativo
	const isRelativePath = moduleName.startsWith('./') || moduleName.startsWith('../');
	console.log(`   Is relative path: ${isRelativePath}`);

	// Se é caminho relativo, usa a nova função específica (sem cache para caminhos relativos)
	if (isRelativePath && currentDocumentUri) {
		console.log(`   Using relative path resolution from: ${vscode.workspace.asRelativePath(currentDocumentUri)}`);
		return await fetchRelativeModuleSchema(moduleName, currentDocumentUri);
	}

	// Check cache first for absolute modules
	if (moduleSchemaCache.has(moduleName)) {
		console.log(`   Found in cache: ${moduleName}`);
		return moduleSchemaCache.get(moduleName)!;
	}

	// Se já tentamos buscar este módulo e não foi encontrado, não tente novamente
	if (moduleNotFoundCache.has(moduleName)) {
		console.log(`   Module in not-found cache: ${moduleName}`);
		return null;
	}

	try {
		console.log(`   Searching for module: ${moduleName}`);

		// PRIMEIRO: Tenta buscar módulo local no workspace
		console.log(`   1️⃣ Trying local workspace module...`);
		const localSchema = await fetchLocalModuleSchema(moduleName);
		if (localSchema) {
			console.log(`   ✅ Found local module: ${moduleName}`);
			moduleSchemaCache.set(moduleName, localSchema);
			return localSchema;
		}

		// SEGUNDO: Tenta buscar arquivo .phlow remoto (Phlow Module)
		console.log(`   2️⃣ Trying remote .phlow module...`);
		const phlowModuleUrl = `https://raw.githubusercontent.com/phlowdotdev/phlow/refs/heads/main/modules/${moduleName}/${moduleName}.phlow`;
		const phlowSchema = await fetchPhlowModuleSchema(phlowModuleUrl, moduleName);

		if (phlowSchema) {
			console.log(`   ✅ Found remote .phlow module: ${moduleName}`);
			moduleSchemaCache.set(moduleName, phlowSchema);
			return phlowSchema;
		}

		// TERCEIRO: Tenta buscar phlow.yaml remoto (módulo Rust)
		console.log(`   3️⃣ Trying remote .yaml module...`);
		const yamlModuleUrl = `https://raw.githubusercontent.com/phlowdotdev/phlow/refs/heads/main/modules/${moduleName}/phlow.yaml`;
		const yamlSchema = await fetchYamlModuleSchema(yamlModuleUrl, moduleName);

		if (yamlSchema) {
			console.log(`   ✅ Found remote .yaml module: ${moduleName}`);
			moduleSchemaCache.set(moduleName, yamlSchema);
			return yamlSchema;
		}

		// Nenhum dos formatos foi encontrado
		console.log(`   ❌ Module not found anywhere: ${moduleName}`);
		moduleNotFoundCache.add(moduleName);
		return null;

	} catch (error) {
		console.error(`   ❌ Error fetching module ${moduleName}:`, error);
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

// Função para extrair schema de arquivos .phlow (Phlow Modules)
function parsePhlowModuleFile(phlowContent: string, moduleName: string): ModuleSchema | null {
	try {
		// Parse usando a biblioteca YAML (arquivos .phlow são compatíveis com YAML)
		const parsedPhlow = yaml.parse(phlowContent);

		if (!parsedPhlow || typeof parsedPhlow !== 'object') {
			return null;
		}

		// Criar schema base
		const schema: ModuleSchema = {
			name: parsedPhlow.name || moduleName,
			description: parsedPhlow.description || '',
			version: parsedPhlow.version || '1.0.0',
			type: 'script' // Phlow modules são sempre do tipo script
		};

		// Extrair seção 'with' (configuração do módulo)
		if (parsedPhlow.with && typeof parsedPhlow.with === 'object') {
			schema.with = {
				type: parsedPhlow.with.type || 'object',
				required: parsedPhlow.with.required || false,
				aditional_propierties: parsedPhlow.with.aditional_propierties || false,
				properties: parsedPhlow.with.properties || {}
			};
		}

		// Extrair seção 'input' (dados de entrada esperados)
		if (parsedPhlow.input && typeof parsedPhlow.input === 'object') {
			schema.input = {
				type: parsedPhlow.input.type || 'object',
				required: parsedPhlow.input.required || false,
				aditional_propierties: parsedPhlow.input.aditional_propierties || false,
				properties: parsedPhlow.input.properties || {}
			};
		}

		// Extrair seção 'output' (dados de saída produzidos)
		if (parsedPhlow.output && typeof parsedPhlow.output === 'object') {
			schema.output = {
				type: parsedPhlow.output.type || 'object',
				required: parsedPhlow.output.required || false,
				aditional_propierties: parsedPhlow.output.aditional_propierties || false,
				properties: parsedPhlow.output.properties || {}
			};
		}

		// Debug logging
		console.log(`Successfully parsed Phlow module schema for ${moduleName}`);
		if (schema.with?.properties) {
			console.log(`Available 'with' properties:`, Object.keys(schema.with.properties));
		}
		if (schema.input?.properties) {
			console.log(`Available 'input' properties:`, Object.keys(schema.input.properties));
		}
		if (schema.output?.properties) {
			console.log(`Available 'output' properties:`, Object.keys(schema.output.properties));
		}

		return schema;
	} catch (error) {
		console.error(`Error parsing Phlow module file for ${moduleName}:`, error);
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

		if (!phlowType) {
			return;
		}

		const phlowName = await vscode.window.showInputBox({
			prompt: 'Phlow name',
			placeHolder: 'my-phlow'
		});

		if (!phlowName) {
			return;
		}

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
			if (!word) {
				return;
			}

			const wordText = document.getText(word);
			const line = document.lineAt(position.line).text;

			// Check if this is a module name - try to fetch schema for any module
			if (line.includes('module:')) {
				const schema = await fetchModuleSchema(wordText, document.uri);
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
					// First try to get schema for binary modules
					const schema = await fetchModuleSchema(moduleMatch.moduleName, document.uri);
					if (schema?.with?.properties) {
						// Check if we're typing a value for an enum property
						const enumCompletions = await getEnumValueCompletions(document, position, schema, moduleMatch);
						if (enumCompletions.length > 0) {
							return enumCompletions;
						}

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

							// Build documentation with enum information
							let documentation = `**${key}**\n\n` +
								`Type: \`${prop.type || 'any'}\`\n\n` +
								`Required: ${prop.required ? 'Yes' : 'No'}\n\n` +
								`${prop.description || 'No description available'}`;

							// Add enum values if available
							if (prop.enum && Array.isArray(prop.enum)) {
								const formattedEnumValues = prop.enum.map((val: any) => {
									if (typeof val === 'string') {
										return `"${val}"`;
									}
									return String(val);
								}).join(', ');
								documentation += `\n\n**Allowed values:** ${formattedEnumValues}`;
							}

							completion.documentation = new vscode.MarkdownString(documentation);

							// Add default value if available, or first enum value for enum types
							if (prop.default !== undefined) {
								completion.insertText = `${key}: ${formatYamlValue(prop.default, prop.type)}`;
								completion.documentation.appendMarkdown(`\n\nDefault: \`${prop.default}\``);
							} else if (prop.enum && Array.isArray(prop.enum) && prop.enum.length > 0) {
								// For enum properties, suggest the first enum value
								const firstEnumValue = prop.enum[0];
								completion.insertText = `${key}: ${formatYamlValue(firstEnumValue, prop.type)}`;
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
					} else {
						// If no schema found, try to provide completions for local .phlow modules
						const localModuleCompletions = await getLocalPhlowModuleCompletions(moduleMatch.moduleName, document.uri);
						if (localModuleCompletions.length > 0) {
							return localModuleCompletions;
						}
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

	// Function to get enum value completions when typing property values
	async function getEnumValueCompletions(
		document: vscode.TextDocument,
		position: vscode.Position,
		schema: ModuleSchema,
		moduleMatch: { moduleName: string; withinWith: boolean; arrayProperty?: string }
	): Promise<vscode.CompletionItem[]> {
		const lineText = document.lineAt(position.line).text;
		const colonIndex = lineText.indexOf(':');

		// Check if we're after a colon (typing a value)
		if (colonIndex === -1 || position.character <= colonIndex + 1) {
			return []; // Not typing a value
		}

		// Extract the property name
		const propertyNamePart = lineText.substring(0, colonIndex).trim();
		const propertyName = propertyNamePart.replace(/^\s*-?\s*/, ''); // Remove leading dash and spaces

		if (!propertyName) {
			return []; // No property name found
		}

		// Find the property schema
		let propertySchema: any = null;

		// Handle array context
		if (moduleMatch.arrayProperty) {
			const arrayPropertySchema = schema.with?.properties[moduleMatch.arrayProperty];
			if (arrayPropertySchema?.type === 'array' && arrayPropertySchema.items?.properties) {
				propertySchema = arrayPropertySchema.items.properties[propertyName];
			}
		} else {
			// Top-level property
			propertySchema = schema.with?.properties[propertyName];
		}

		// Check if this property has enum values
		if (!propertySchema || !propertySchema.enum || !Array.isArray(propertySchema.enum)) {
			return []; // No enum values to suggest
		}

		console.log(`Providing enum completions for property: ${propertyName}, values: [${propertySchema.enum.join(', ')}]`);

		// Create completions for each enum value
		const completions: vscode.CompletionItem[] = [];

		for (const enumValue of propertySchema.enum) {
			const completion = new vscode.CompletionItem(String(enumValue), vscode.CompletionItemKind.EnumMember);
			completion.detail = `Enum value for ${propertyName}`;

			// Format the insert text based on the value type
			if (typeof enumValue === 'string') {
				completion.insertText = `"${enumValue}"`;
				completion.documentation = new vscode.MarkdownString(
					`**String enum value:** \`"${enumValue}"\`\n\n` +
					`Valid option for property \`${propertyName}\``
				);
			} else if (typeof enumValue === 'boolean') {
				completion.insertText = String(enumValue);
				completion.documentation = new vscode.MarkdownString(
					`**Boolean enum value:** \`${enumValue}\`\n\n` +
					`Valid option for property \`${propertyName}\``
				);
			} else {
				completion.insertText = String(enumValue);
				completion.documentation = new vscode.MarkdownString(
					`**Enum value:** \`${enumValue}\`\n\n` +
					`Valid option for property \`${propertyName}\``
				);
			}

			// Set sort text to maintain enum order
			completion.sortText = `enum_${propertySchema.enum.indexOf(enumValue).toString().padStart(3, '0')}`;

			completions.push(completion);
		}

		// Add a header hint
		if (completions.length > 0) {
			const hint = new vscode.CompletionItem(`📋 ${propertyName} values`, vscode.CompletionItemKind.Text);
			hint.detail = `${propertySchema.enum.length} allowed values`;
			hint.documentation = new vscode.MarkdownString(
				`**Property:** \`${propertyName}\`\n\n` +
				`**Type:** enum\n\n` +
				`**Allowed values:** ${propertySchema.enum.map((v: any) => `\`${v}\``).join(', ')}\n\n` +
				`Choose one of the values below:`
			);
			hint.sortText = '000_hint';
			hint.insertText = '';
			completions.unshift(hint);
		}

		return completions;
	}

	// Function to get completions for local .phlow modules based on existing 'with' properties
	async function getLocalPhlowModuleCompletions(moduleName: string, currentDocumentUri: vscode.Uri): Promise<vscode.CompletionItem[]> {
		console.log(`🔍 Looking for local .phlow module completions: ${moduleName}`);

		// Find the local module file
		const moduleFileUri = await findModuleFileLocation(moduleName, currentDocumentUri);
		if (!moduleFileUri || !moduleFileUri.fsPath.endsWith('.phlow')) {
			console.log(`   ❌ No local .phlow module found for: ${moduleName}`);
			return [];
		}

		try {
			console.log(`   ✅ Found local .phlow module: ${moduleFileUri.fsPath}`);

			// Read the module file content
			const moduleFileContent = await vscode.workspace.fs.readFile(moduleFileUri);
			const moduleText = moduleFileContent.toString();

			// Parse existing 'with' properties from the module file
			const existingProperties = parseWithPropertiesFromPhlowModule(moduleText);

			if (existingProperties.length === 0) {
				console.log(`   ❌ No 'with' properties found in module: ${moduleName}`);
				return [];
			}

			console.log(`   ✅ Found ${existingProperties.length} 'with' properties in module: ${moduleName}`);

			// Create completion items for existing properties
			const completions: vscode.CompletionItem[] = [];

			for (const property of existingProperties) {
				const completion = new vscode.CompletionItem(property.name, vscode.CompletionItemKind.Property);
				completion.detail = `Local module property (${path.basename(moduleFileUri.fsPath)})`;
				completion.documentation = new vscode.MarkdownString(
					`**${property.name}** (from local module)\n\n` +
					`Source: \`${path.basename(moduleFileUri.fsPath)}\`\n\n` +
					`Value: \`${property.value || 'undefined'}\`\n\n` +
					`This property exists in the local module's 'with' section.`
				);

				completion.insertText = `${property.name}: `;
				completion.sortText = `1_${property.name}`; // After required properties
				completions.push(completion);
			}

			// Add a hint that this is a local module
			const localHint = new vscode.CompletionItem('ℹ️ Local Module', vscode.CompletionItemKind.Text);
			localHint.detail = 'Properties from local .phlow module';
			localHint.documentation = new vscode.MarkdownString(
				`**Local Module:** \`${path.basename(moduleFileUri.fsPath)}\`\n\n` +
				`These properties are extracted from the existing 'with' section of the local module file.\n\n` +
				`You can add additional properties or modify existing ones.`
			);
			localHint.sortText = '0_hint';
			localHint.insertText = '';
			completions.unshift(localHint);

			return completions;

		} catch (error) {
			console.log(`   ❌ Error reading local module file: ${error}`);
			return [];
		}
	}

	// Parse 'with' properties from a .phlow module file content
	function parseWithPropertiesFromPhlowModule(moduleText: string): Array<{ name: string, value?: string }> {
		const properties: Array<{ name: string, value?: string }> = [];
		const lines = moduleText.split('\n');

		let withinWith = false;
		let withIndent = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmedLine = line.trim();
			const currentIndent = line.length - line.trimStart().length;

			// Find 'with:' section
			if (trimmedLine === 'with:') {
				withinWith = true;
				withIndent = currentIndent;
				continue;
			}

			// Exit 'with:' section if we're back to lower or equal indent
			if (withinWith && trimmedLine && currentIndent <= withIndent && !trimmedLine.startsWith('with:')) {
				withinWith = false;
			}

			// Parse properties within 'with:' section
			if (withinWith && currentIndent > withIndent && trimmedLine.includes(':')) {
				const colonIndex = trimmedLine.indexOf(':');
				const propertyName = trimmedLine.substring(0, colonIndex).trim();
				const propertyValue = trimmedLine.substring(colonIndex + 1).trim();

				// Skip array items markers and nested objects without property names
				if (!propertyName.startsWith('-') && propertyName && !propertyName.includes(' ')) {
					// Only add top-level properties (direct children of 'with:')
					if (currentIndent === withIndent + 2) {
						properties.push({
							name: propertyName,
							value: propertyValue || undefined
						});
					}
				}
			}
		}

		return properties;
	}
	// Document validation for modules
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('phlow');
	context.subscriptions.push(diagnosticCollection);

	async function validateDocument(document: vscode.TextDocument) {
		if (document.languageId !== 'phlow') {
			return;
		}

		const diagnostics: vscode.Diagnostic[] = [];
		const lines = document.getText().split('\n');

		// Parse document structure to find modules and their configurations
		const modules = await parseDocumentModules(lines);

		for (const moduleInfo of modules) {
			// Tenta buscar o schema do módulo dinamicamente
			// Se não existir, o fetchModuleSchema retornará null e será ignorado
			const schema = await fetchModuleSchema(moduleInfo.name, document.uri);
			if (schema && moduleInfo.withProperties) {
				const propertyDiagnostics = await validateModuleProperties(moduleInfo, schema, lines);
				diagnostics.push(...propertyDiagnostics);
			}
			// Se o schema não existir, simplesmente ignora (não mostra erro)
		}

		// Parse and validate !include directives with arguments
		const includeValidations = await validateIncludeDirectives(document, lines);
		diagnostics.push(...includeValidations);

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

			// Find module declaration (suporta nomes simples e caminhos relativos)
			const moduleMatch = line.match(/^\s*-?\s*module:\s*([^\s]+)/);
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
						} else if (validChildProperties.includes(childProperty)) {
							// Validate enum values for array item properties
							const childPropertySchema = parentSchema.items.properties[childProperty];
							const enumValidation = validateEnumValue(prop, childPropertySchema, lines, moduleInfo.name);
							if (enumValidation) {
								diagnostics.push(enumValidation);
							}
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
						} else if (validChildProperties.includes(childProperty)) {
							// Validate enum values for nested object properties
							const childPropertySchema = parentSchema.properties[childProperty];
							const enumValidation = validateEnumValue(prop, childPropertySchema, lines, moduleInfo.name);
							if (enumValidation) {
								diagnostics.push(enumValidation);
							}
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
				} else if (validProperties.includes(prop.name)) {
					// Validate enum values for top-level properties
					const propertySchema = schema.with.properties[prop.name];
					const enumValidation = validateEnumValue(prop, propertySchema, lines, moduleInfo.name);
					if (enumValidation) {
						diagnostics.push(enumValidation);
					}
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

	// Function to validate enum values

	// Heuristic: detect inline PHS-like expressions (when `!phs` is omitted).
	function isLikelyPhs(value: string): boolean {
		if (!value) return false;
		const v = value.trim();

		if (v.startsWith('!phs')) return true;

		// Quoted strings should not be considered PHS
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return false;

		const operators = ["+", "-", "*", "/", "%", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "??", "?:"];
		const reserved = ["if", "else", "for", "while", "loop", "match", "let", "const", "fn", "return", "switch", "case", "default", "try", "catch", "throw", "when", "payload", "input", "steps", "main", "setup", "envs"];

		const firstWord = v.split(/\s+/)[0].split('.')[0] || '';
		if (reserved.includes(firstWord)) return true;

		if (operators.some(op => v.includes(op))) return true;

		if (v.startsWith('{') || v.startsWith('[') || v.includes('(')) return true;

		return false;
	}
	function validateEnumValue(prop: { name: string; range: vscode.Range; lineIndex: number }, propertySchema: any, lines: string[], moduleName: string): vscode.Diagnostic | null {
		// Check if the property has enum values defined
		if (!propertySchema || !propertySchema.enum || !Array.isArray(propertySchema.enum)) {
			return null; // No enum to validate against
		}

		// Get the current value of the property from the document
		const line = lines[prop.lineIndex];
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) {
			return null; // No value to validate
		}

		const valueString = line.substring(colonIndex + 1).trim();
		if (!valueString) {
			return null; // Empty value, let required validation handle it
		}

		// Parse the value, handling different types
		let actualValue: any = valueString;

		// Remove quotes if present
		if ((valueString.startsWith('"') && valueString.endsWith('"')) ||
			(valueString.startsWith("'") && valueString.endsWith("'"))) {
			actualValue = valueString.slice(1, -1);
		}
		// Parse boolean values
		else if (valueString.toLowerCase() === 'true') {
			actualValue = true;
		}
		else if (valueString.toLowerCase() === 'false') {
			actualValue = false;
		}
		// Parse numeric values
		else if (!isNaN(Number(valueString))) {
			actualValue = Number(valueString);
		}
		// Handle PHS expressions - skip validation for dynamic values (explicit or heuristic)
		else if (valueString.includes('!phs') || isLikelyPhs(valueString)) {
			console.log(`Skipping enum validation for PHS expression: ${valueString}`);
			return null;
		}

		// Check if the actual value is in the enum
		const enumValues = propertySchema.enum;
		const isValidEnumValue = enumValues.includes(actualValue);

		if (!isValidEnumValue) {
			console.log(`Invalid enum value: ${actualValue} for property ${prop.name} in module ${moduleName}. Valid values: [${enumValues.join(', ')}]`);

			// Create range for the value part only (after the colon)
			const valueStart = colonIndex + 1;
			const valueEnd = line.length;
			const valueRange = new vscode.Range(
				prop.lineIndex,
				valueStart,
				prop.lineIndex,
				valueEnd
			);

			// Format enum values for display
			const formattedEnumValues = enumValues.map((val: any) => {
				if (typeof val === 'string') {
					return `"${val}"`;
				}
				return String(val);
			}).join(', ');

			return new vscode.Diagnostic(
				valueRange,
				`Invalid value '${actualValue}' for property '${prop.name}'. Expected one of: ${formattedEnumValues}`,
				vscode.DiagnosticSeverity.Error
			);
		}

		console.log(`Valid enum value: ${actualValue} for property ${prop.name} in module ${moduleName}`);
		return null;
	}

	// Validate !include directives and their arguments
	async function validateIncludeDirectives(document: vscode.TextDocument, lines: string[]): Promise<vscode.Diagnostic[]> {
		const diagnostics: vscode.Diagnostic[] = [];
		const documentDir = path.dirname(document.uri.fsPath);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Match !include with arguments: !include ./file arg1=value1 arg2=value2
			const includeMatch = line.match(/(!include)\s+([^\s]+)(\s+(.+))?/);
			if (!includeMatch) {
				continue;
			}

			const directive = includeMatch[1];
			const filePath = includeMatch[2];
			const argumentsString = includeMatch[4] || '';

			console.log(`🔍 Validating include: ${filePath} with args: "${argumentsString}"`);

			// Parse arguments from the include line
			const includeArgs = parseIncludeArguments(argumentsString, i, line);

			if (includeArgs.length === 0) {
				console.log(`   No arguments to validate for ${filePath}`);
				continue;
			}

			// Find the included file
			const includeFileUri = await findIncludeFileLocation(filePath, documentDir);
			if (!includeFileUri) {
				console.log(`   ❌ Include file not found: ${filePath}`);
				continue;
			}

			console.log(`   ✅ Found include file: ${includeFileUri.fsPath}`);

			try {
				// Read the included file content
				const includeFileContent = await vscode.workspace.fs.readFile(includeFileUri);
				const includeText = includeFileContent.toString();

				// Find !arg usages in the included file
				const usedArgs = findArgUsagesInFile(includeText);
				console.log(`   Used args in ${path.basename(includeFileUri.fsPath)}: [${usedArgs.join(', ')}]`);

				// Check each argument from !include
				for (const arg of includeArgs) {
					if (!usedArgs.includes(arg.name)) {
						console.log(`   ⚠️  Unused argument: ${arg.name}`);

						const diagnostic = new vscode.Diagnostic(
							arg.range,
							`Argument '${arg.name}' is not used in included file '${path.basename(includeFileUri.fsPath)}'`,
							vscode.DiagnosticSeverity.Warning
						);
						diagnostic.code = 'unused-include-argument';
						diagnostic.source = 'phlow';
						diagnostics.push(diagnostic);
					} else {
						console.log(`   ✅ Argument '${arg.name}' is used in included file`);
					}
				}

			} catch (error) {
				console.log(`   ❌ Error reading include file: ${error}`);
			}
		}

		return diagnostics;
	}

	// Parse arguments from !include line
	function parseIncludeArguments(argumentsString: string, lineIndex: number, fullLine: string): Array<{ name: string, range: vscode.Range }> {
		const args: Array<{ name: string, range: vscode.Range }> = [];

		if (!argumentsString || argumentsString.trim() === '') {
			return args;
		}

		// Find the start position of arguments in the full line
		const includeMatch = fullLine.match(/(!include)\s+([^\s]+)\s+/);
		const argumentsStartPos = includeMatch ? includeMatch.index! + includeMatch[0].length : 0;

		// Match argument patterns: name=value (including quoted values)
		const argPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:'[^']*'|"[^"]*"|[^\s]+)/g;
		let match;

		while ((match = argPattern.exec(argumentsString)) !== null) {
			const argName = match[1];
			const argStartInArgString = match.index;
			const argStartInFullLine = argumentsStartPos + argStartInArgString;

			const range = new vscode.Range(
				lineIndex,
				argStartInFullLine,
				lineIndex,
				argStartInFullLine + argName.length
			);

			args.push({
				name: argName,
				range: range
			});
		}

		return args;
	}

	// Find !arg usages in file content
	function findArgUsagesInFile(fileContent: string): string[] {
		const usedArgs: string[] = [];

		// Match !arg argument_name patterns
		const argMatches = fileContent.matchAll(/!arg\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);

		for (const match of argMatches) {
			const argName = match[1];
			if (!usedArgs.includes(argName)) {
				usedArgs.push(argName);
			}
		}

		return usedArgs;
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

	// File system watcher for local modules (enhanced for relative paths)
	const localModuleWatcher = vscode.workspace.createFileSystemWatcher('**/*.{phlow,yaml}');

	// Clear cache and revalidate when local modules change
	localModuleWatcher.onDidChange(async uri => {
		const fileName = path.basename(uri.fsPath, path.extname(uri.fsPath));
		const relativePath = vscode.workspace.asRelativePath(uri);

		console.log(`🔄 Local module changed: ${relativePath}`);

		// Clear cache for simple module names
		if (moduleSchemaCache.has(fileName)) {
			console.log(`   Clearing cache for module: ${fileName}`);
			moduleSchemaCache.delete(fileName);
			moduleNotFoundCache.delete(fileName);
		}

		// Clear cache for relative paths (handle ./route, ../module, etc.)
		const moduleDir = path.dirname(uri.fsPath);
		const workspaceFolders = vscode.workspace.workspaceFolders;

		if (workspaceFolders) {
			for (const folder of workspaceFolders) {
				const relativeFromWorkspace = path.relative(folder.uri.fsPath, uri.fsPath);
				const relativeCacheKey = `./${relativeFromWorkspace.replace(/\\/g, '/')}`;
				const relativeWithoutExt = relativeCacheKey.replace(/\.(phlow|yaml)$/, '');

				// Clear various possible cache keys for this file
				const possibleKeys = [
					relativeCacheKey,
					relativeWithoutExt,
					`./${fileName}`,
					`../${fileName}`,
					fileName
				];

				for (const key of possibleKeys) {
					if (moduleSchemaCache.has(key)) {
						console.log(`   Clearing relative cache for key: ${key}`);
						moduleSchemaCache.delete(key);
						moduleNotFoundCache.delete(key);
					}
				}
			}
		}

		// Revalidate all open .phlow documents that might use this module
		await revalidateDocumentsUsingModule(fileName, relativePath);
	});

	localModuleWatcher.onDidCreate(async uri => {
		const fileName = path.basename(uri.fsPath, path.extname(uri.fsPath));
		const relativePath = vscode.workspace.asRelativePath(uri);

		console.log(`➕ Local module created: ${relativePath}`);

		// Clear not-found cache
		if (moduleNotFoundCache.has(fileName)) {
			console.log(`   Clearing not-found cache for: ${fileName}`);
			moduleNotFoundCache.delete(fileName);
		}

		// Revalidate documents that might now find this module
		await revalidateDocumentsUsingModule(fileName, relativePath);
	});

	localModuleWatcher.onDidDelete(uri => {
		const fileName = path.basename(uri.fsPath, path.extname(uri.fsPath));
		const relativePath = vscode.workspace.asRelativePath(uri);

		console.log(`❌ Local module deleted: ${relativePath}`);

		if (moduleSchemaCache.has(fileName)) {
			console.log(`   Clearing cache for deleted module: ${fileName}`);
			moduleSchemaCache.delete(fileName);
		}

		// Note: We don't revalidate on delete to avoid flooding with errors
		// The validation will naturally show errors when the module is not found
	});

	// Helper function to revalidate documents that use a specific module
	async function revalidateDocumentsUsingModule(moduleName: string, modulePath: string) {
		console.log(`🔍 Revalidating documents using module: ${moduleName} (${modulePath})`);

		const phlowDocuments = vscode.workspace.textDocuments.filter(
			doc => doc.languageId === 'phlow'
		);

		for (const document of phlowDocuments) {
			const content = document.getText();

			// Check if document uses this module (simple name or relative path)
			const modulePatterns = [
				`module: ${moduleName}`,
				`module: ./${moduleName}`,
				`module: ../${moduleName}`,
				`module: ${modulePath.replace(/\\/g, '/')}`
			];

			const usesModule = modulePatterns.some(pattern => content.includes(pattern));

			if (usesModule) {
				console.log(`   Revalidating document: ${vscode.workspace.asRelativePath(document.uri)}`);
				await validateDocument(document);
			}
		}
	}

	context.subscriptions.push(localModuleWatcher);

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

			// Check if we found a module declaration (suporta nomes simples e caminhos relativos)
			const moduleMatch = line.match(/^\s*-?\s*module:\s*([^\s]+)/);
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

		if (!moduleName) {
			return;
		}

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

				// Check if we're in a PHS context (!phs) or the value looks like an inline PHS expression
				const phsMatch = linePrefix.match(/!phs\s+/);
				let phsStartIndex: number | null = null;
				let phsPrefix = '';
				if (phsMatch) {
					phsStartIndex = phsMatch.index! + phsMatch[0].length;
					phsPrefix = linePrefix.substring(phsStartIndex);
				} else {
					// Try to detect implicit PHS: if typing a value after a colon and it looks like PHS
					const colonIndex = linePrefix.indexOf(':');
					if (colonIndex !== -1) {
						const valuePart = linePrefix.substring(colonIndex + 1).trim();
						if (isLikelyPhs(valuePart)) {
							phsStartIndex = linePrefix.length - valuePart.length;
							phsPrefix = linePrefix.substring(phsStartIndex);
						}
					}
				}

				if (phsStartIndex === null) {
					return undefined;
				}

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

	// Enhanced Path Intellisense provider for !import and !include
	const pathIntellisenseProvider = vscode.languages.registerCompletionItemProvider(
		phlowDocumentSelector,
		{
			async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				const context = createPhlowPathContext(document, position);

				if (!context.shouldProvide) {
					return undefined;
				}

				return await providePhlowPathCompletions(context);
			}
		},
		'/',  // Trigger on slash for directory navigation
		'.',  // Trigger on dot for file extensions
		' '   // Trigger on space
	);

	context.subscriptions.push(pathIntellisenseProvider);

	// Helper interfaces and functions for Path Intellisense
	interface PhlowPathContext {
		document: vscode.TextDocument;
		position: vscode.Position;
		lineText: string;
		directive: string | null;
		pathString: string;
		shouldProvide: boolean;
		importRange: vscode.Range;
		workspaceFolder: vscode.WorkspaceFolder | undefined;
		documentDir: string;
	}

	function createPhlowPathContext(document: vscode.TextDocument, position: vscode.Position): PhlowPathContext {
		const lineText = document.lineAt(position).text;
		const textToPosition = lineText.substring(0, position.character);
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
		const documentDir = path.dirname(document.uri.fsPath);

		// Check if we're in an !import or !include context
		const directiveMatch = textToPosition.match(/(!import|!include)\s+/);
		if (!directiveMatch) {
			return {
				document,
				position,
				lineText,
				directive: null,
				pathString: '',
				shouldProvide: false,
				importRange: new vscode.Range(position, position),
				workspaceFolder,
				documentDir
			};
		}

		const directive = directiveMatch[1];
		const afterDirective = textToPosition.substring(directiveMatch.index! + directiveMatch[0].length);

		// Extract the path being typed (handle quotes and spaces)
		let pathString = afterDirective.trim();

		// Remove quotes if present
		if (pathString.startsWith('"') || pathString.startsWith("'")) {
			pathString = pathString.substring(1);
		}

		// Calculate the import range for replacement
		const directiveEnd = directiveMatch.index! + directiveMatch[0].length;
		const pathStart = directiveEnd + afterDirective.length - pathString.length;
		const importRange = new vscode.Range(
			new vscode.Position(position.line, pathStart),
			position
		);

		return {
			document,
			position,
			lineText,
			directive,
			pathString,
			shouldProvide: true,
			importRange,
			workspaceFolder,
			documentDir
		};
	}

	async function providePhlowPathCompletions(context: PhlowPathContext): Promise<vscode.CompletionItem[]> {
		if (!context.workspaceFolder) {
			return [];
		}

		const { directive, pathString, documentDir, workspaceFolder } = context;

		// Determine the target directory
		const targetDir = getPathOfFolderToLookupFiles(
			context.document.uri.fsPath,
			pathString,
			workspaceFolder.uri.fsPath
		);

		// Get children of the target directory
		const children = await getChildrenOfPath(targetDir);

		// Filter files based on directive
		const allowedExtensions = directive === '!import'
			? ['.phs', '.phlow', '.yaml', '.yml', '.json']
			: ['.yaml', '.yml', '.json'];

		// Create completion items
		const completions: vscode.CompletionItem[] = [];

		for (const child of children) {
			if (child.isFile) {
				// Only include files with allowed extensions
				const fileExtension = path.extname(child.name);
				if (allowedExtensions.includes(fileExtension)) {
					const completion = createPathCompletionItem(child, context);
					completions.push(completion);
				}
			} else {
				// Always include directories
				const completion = createPathCompletionItem(child, context);
				completions.push(completion);
			}
		}

		return completions;
	}

	function getPathOfFolderToLookupFiles(
		fileName: string,
		text: string,
		rootPath: string
	): string {
		const normalizedText = path.normalize(text || '');
		const isPathAbsolute = normalizedText.startsWith(path.sep);

		const rootFolder = isPathAbsolute ? rootPath : path.dirname(fileName);
		const pathEntered = normalizedText;

		return path.join(rootFolder, pathEntered);
	}

	interface FileInfo {
		name: string;
		isFile: boolean;
		path: string;
	}

	async function getChildrenOfPath(targetPath: string): Promise<FileInfo[]> {
		try {
			const filesTuples = await vscode.workspace.fs.readDirectory(vscode.Uri.file(targetPath));
			const fileInfoList: FileInfo[] = [];

			for (const [name, type] of filesTuples) {
				// Skip hidden files and node_modules
				if (name.startsWith('.') || name === 'node_modules') {
					continue;
				}

				fileInfoList.push({
					name,
					isFile: type === vscode.FileType.File,
					path: path.join(targetPath, name)
				});
			}

			return fileInfoList;
		} catch (error) {
			return [];
		}
	}

	function createPathCompletionItem(fileInfo: FileInfo, context: PhlowPathContext): vscode.CompletionItem {
		const { directive, documentDir } = context;
		const isDirectory = !fileInfo.isFile;

		// Calculate relative path from document to file
		const relativePath = path.relative(documentDir, fileInfo.path);
		const displayName = isDirectory ? fileInfo.name + '/' : fileInfo.name;
		const insertText = isDirectory ? fileInfo.name + '/' : relativePath;

		// Create completion item
		const completion = new vscode.CompletionItem(
			displayName,
			isDirectory ? vscode.CompletionItemKind.Folder : getFileCompletionKind(fileInfo.name)
		);

		// Set insert text and range
		completion.insertText = insertText;
		completion.range = context.importRange;

		// Set detail and documentation
		if (isDirectory) {
			completion.detail = 'Directory';
			completion.documentation = new vscode.MarkdownString(
				`**Directory:** ${fileInfo.name}\n\nNavigate into this directory`
			);
		} else {
			const fileExtension = path.extname(fileInfo.name);
			completion.detail = `${directive} ${relativePath}`;
			completion.documentation = new vscode.MarkdownString(
				`**${directive}** ${fileInfo.name}\n\n` +
				`Path: \`${relativePath}\`\n\n` +
				`Type: ${fileExtension} file`
			);
		}

		// Set sort text to prioritize files over directories
		completion.sortText = isDirectory ? 'z' + displayName : 'a' + displayName;

		return completion;
	}

	function getFileCompletionKind(fileName: string): vscode.CompletionItemKind {
		const extension = path.extname(fileName);
		switch (extension) {
			case '.phlow':
				return vscode.CompletionItemKind.Module;
			case '.phs':
				return vscode.CompletionItemKind.Function;
			case '.json':
				return vscode.CompletionItemKind.Struct;
			case '.yaml':
			case '.yml':
				return vscode.CompletionItemKind.Property;
			default:
				return vscode.CompletionItemKind.File;
		}
	}

	// Definition provider for module names (Go to module file)
	const moduleDefinitionProvider = vscode.languages.registerDefinitionProvider(
		phlowDocumentSelector,
		{
			async provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
				const line = document.lineAt(position.line).text;

				console.log(`🔍 Module definition request at position ${position.character} in line: "${line}"`);

				// Check if we're on a module name in a "module:" line
				if (line.includes('module:')) {
					// Extract the module name from the line (supports relative paths)
					const moduleMatch = line.match(/module:\s*([^\s]+)/);
					if (moduleMatch) {
						const moduleName = moduleMatch[1];
						const moduleStartIndex = line.indexOf(moduleName);
						const moduleEndIndex = moduleStartIndex + moduleName.length;

						console.log(`   Module found: "${moduleName}" at positions ${moduleStartIndex}-${moduleEndIndex}, cursor at ${position.character}`);

						// Check if cursor is within the module name range
						if (position.character >= moduleStartIndex && position.character <= moduleEndIndex) {
							console.log(`   ✅ Cursor is within module name range, searching for: ${moduleName}`);

							// Find the module file
							const moduleLocation = await findModuleFileLocation(moduleName, document.uri);
							if (moduleLocation) {
								console.log(`   ✅ Found module file: ${moduleLocation.fsPath}`);
								return new vscode.Location(moduleLocation, new vscode.Position(0, 0));
							} else {
								console.log(`   ❌ Module file not found: ${moduleName}`);
							}
						} else {
							console.log(`   ❌ Cursor is outside module name range`);
						}
					}
				}

				return undefined;
			}
		}
	);

	// Helper function to find module file location
	async function findModuleFileLocation(moduleName: string, currentDocumentUri: vscode.Uri): Promise<vscode.Uri | null> {
		console.log(`🔍 Looking for module file: ${moduleName}`);

		// Check if it's a relative path
		const isRelativePath = moduleName.startsWith('./') || moduleName.startsWith('../');

		if (isRelativePath) {
			console.log(`   Searching for relative module: ${moduleName}`);
			const currentDocumentDir = vscode.Uri.joinPath(currentDocumentUri, '..');

			// Try .phlow file first
			const phlowModulePath = vscode.Uri.joinPath(currentDocumentDir, `${moduleName}.phlow`);
			try {
				await vscode.workspace.fs.stat(phlowModulePath);
				console.log(`   Found relative .phlow module: ${phlowModulePath.fsPath}`);
				return phlowModulePath;
			} catch (error) {
				console.log(`   Relative .phlow not found: ${phlowModulePath.fsPath}`);
			}

			// Try .yaml file
			const yamlModulePath = vscode.Uri.joinPath(currentDocumentDir, `${moduleName}.yaml`);
			try {
				await vscode.workspace.fs.stat(yamlModulePath);
				console.log(`   Found relative .yaml module: ${yamlModulePath.fsPath}`);
				return yamlModulePath;
			} catch (error) {
				console.log(`   Relative .yaml not found: ${yamlModulePath.fsPath}`);
			}
		} else {
			// Search for absolute module in workspace
			console.log(`   Searching for absolute module: ${moduleName}`);
			const workspaceFolders = vscode.workspace.workspaceFolders;

			if (workspaceFolders) {
				for (const folder of workspaceFolders) {
					// Try root level .phlow file
					const phlowModulePath = vscode.Uri.joinPath(folder.uri, `${moduleName}.phlow`);
					try {
						await vscode.workspace.fs.stat(phlowModulePath);
						console.log(`   Found workspace .phlow module: ${phlowModulePath.fsPath}`);
						return phlowModulePath;
					} catch (error) {
						// Continue searching
					}

					// Try root level .yaml file
					const yamlModulePath = vscode.Uri.joinPath(folder.uri, `${moduleName}.yaml`);
					try {
						await vscode.workspace.fs.stat(yamlModulePath);
						console.log(`   Found workspace .yaml module: ${yamlModulePath.fsPath}`);
						return yamlModulePath;
					} catch (error) {
						// Continue searching
					}

					// Try modules/ subdirectory
					const modulesDir = vscode.Uri.joinPath(folder.uri, 'modules');
					try {
						// Try modules/{moduleName}/{moduleName}.phlow
						const moduleSubdirPhlow = vscode.Uri.joinPath(modulesDir, moduleName, `${moduleName}.phlow`);
						await vscode.workspace.fs.stat(moduleSubdirPhlow);
						console.log(`   Found modules subdir .phlow: ${moduleSubdirPhlow.fsPath}`);
						return moduleSubdirPhlow;
					} catch (error) {
						// Continue searching
					}

					try {
						// Try modules/{moduleName}/phlow.yaml
						const moduleSubdirYaml = vscode.Uri.joinPath(modulesDir, moduleName, 'phlow.yaml');
						await vscode.workspace.fs.stat(moduleSubdirYaml);
						console.log(`   Found modules subdir .yaml: ${moduleSubdirYaml.fsPath}`);
						return moduleSubdirYaml;
					} catch (error) {
						// Continue searching
					}
				}
			}
		}

		console.log(`   ❌ Module file not found: ${moduleName}`);
		return null;
	}

	context.subscriptions.push(moduleDefinitionProvider);

	// Definition provider for !import and !include (click to go)
	const definitionProvider = vscode.languages.registerDefinitionProvider(
		phlowDocumentSelector,
		{
			async provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
				const lineText = document.lineAt(position).text;

				console.log(`🔍 Include/Import definition request at position ${position.character} in line: "${lineText}"`);

				// Check if we're on a file path after !import or !include
				const importMatch = lineText.match(/(!import|!include)\s+([^\s]+)/);
				if (!importMatch) {
					console.log(`   ❌ No !import or !include found in line`);
					return undefined;
				}

				const directive = importMatch[1];
				const filePath = importMatch[2];
				const documentDir = path.dirname(document.uri.fsPath);

				console.log(`   Found ${directive} with path: "${filePath}"`);

				// Check if the cursor is on the file path
				const pathStartIndex = lineText.indexOf(filePath);
				const pathEndIndex = pathStartIndex + filePath.length;

				console.log(`   Path positions: ${pathStartIndex}-${pathEndIndex}, cursor at ${position.character}`);

				if (position.character < pathStartIndex || position.character > pathEndIndex) {
					console.log(`   ❌ Cursor is outside file path range`);
					return undefined;
				}

				console.log(`   ✅ Cursor is within file path, searching for: ${filePath}`);

				// Find the actual file
				const targetLocation = await findIncludeFileLocation(filePath, documentDir);
				if (targetLocation) {
					console.log(`   ✅ Found file: ${targetLocation.fsPath}`);
					return new vscode.Location(targetLocation, new vscode.Position(0, 0));
				} else {
					console.log(`   ❌ File not found: ${filePath}`);
				}

				return undefined;
			}
		}
	);

	// Helper function to find include/import file location with extension detection
	async function findIncludeFileLocation(filePath: string, documentDir: string): Promise<vscode.Uri | null> {
		console.log(`🔍 Looking for include file: ${filePath} from directory: ${documentDir}`);

		// Resolve the base path
		let basePath: string;
		if (path.isAbsolute(filePath)) {
			basePath = filePath;
		} else {
			basePath = path.resolve(documentDir, filePath);
		}

		console.log(`   Base path resolved to: ${basePath}`);

		// Check if the file already has an extension
		const hasExtension = path.extname(filePath) !== '';

		if (hasExtension) {
			// File has extension, try it directly
			console.log(`   File has extension, trying directly: ${basePath}`);
			const directUri = vscode.Uri.file(basePath);
			try {
				await vscode.workspace.fs.stat(directUri);
				console.log(`   ✅ Found file with extension: ${basePath}`);
				return directUri;
			} catch (error) {
				console.log(`   ❌ File with extension not found: ${basePath}`);
				return null;
			}
		} else {
			// File has no extension, try .phlow, .yaml, .yml in order
			const extensions = ['.phlow', '.yaml', '.yml'];

			for (const ext of extensions) {
				const testPath = basePath + ext;
				console.log(`   Trying with extension: ${testPath}`);

				const testUri = vscode.Uri.file(testPath);
				try {
					await vscode.workspace.fs.stat(testUri);
					console.log(`   ✅ Found file with ${ext}: ${testPath}`);
					return testUri;
				} catch (error) {
					console.log(`   File not found with ${ext}: ${testPath}`);
				}
			}

			console.log(`   ❌ File not found with any extension: ${basePath}`);
			return null;
		}
	}

	context.subscriptions.push(definitionProvider);

	// Rename provider for !import and !include (update references when files are renamed)
	const renameProvider = vscode.languages.registerRenameProvider(
		phlowDocumentSelector,
		{
			async provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
				const lineText = document.lineAt(position).text;
				const wordRange = document.getWordRangeAtPosition(position);

				if (!wordRange) {
					return undefined;
				}

				// Check if we're on a file path after !import or !include
				const importMatch = lineText.match(/(!import|!include)\s+([^\s]+)/);
				if (!importMatch) {
					return undefined;
				}

				const directive = importMatch[1];
				const filePath = importMatch[2];
				const documentDir = path.dirname(document.uri.fsPath);

				// Check if the cursor is on the file path
				const pathStartIndex = lineText.indexOf(filePath);
				const pathEndIndex = pathStartIndex + filePath.length;

				if (position.character < pathStartIndex || position.character > pathEndIndex) {
					return undefined;
				}

				// Calculate the new relative path
				let newPath: string;
				if (path.isAbsolute(filePath)) {
					// If it was absolute, keep it absolute
					newPath = newName;
				} else {
					// If it was relative, calculate new relative path
					const currentDir = path.dirname(path.resolve(documentDir, filePath));
					const newAbsolutePath = path.resolve(currentDir, newName);
					newPath = path.relative(documentDir, newAbsolutePath);

					// Normalize path separators for consistency
					newPath = newPath.replace(/\\/g, '/');
				}

				// Create the workspace edit
				const edit = new vscode.WorkspaceEdit();
				const range = new vscode.Range(
					position.line, pathStartIndex,
					position.line, pathEndIndex
				);

				edit.replace(document.uri, range, newPath);
				return edit;
			}
		}
	);

	context.subscriptions.push(renameProvider);

	// File system watcher for automatic import reference updates
	const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{phlow,phs,yaml,yml,json}');

	// Handle file renames/moves
	fileWatcher.onDidCreate(async (uri) => {
		// This could be a rename/move operation, check if we need to update references
		await updateImportReferences(uri);
	});

	fileWatcher.onDidDelete(async (uri) => {
		// File was deleted, we could warn about broken references
		await checkForBrokenReferences(uri);
	});

	context.subscriptions.push(fileWatcher);

	// Helper function to update import references
	async function updateImportReferences(targetUri: vscode.Uri) {
		try {
			// Find all .phlow files in the workspace
			const phlowFiles = await vscode.workspace.findFiles('**/*.phlow', '**/node_modules/**');

			for (const phlowFile of phlowFiles) {
				const document = await vscode.workspace.openTextDocument(phlowFile);
				const content = document.getText();
				const lines = content.split('\n');

				// Check each line for import/include directives
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					const importMatch = line.match(/(!import|!include)\s+([^\s]+)/);

					if (importMatch) {
						const directive = importMatch[1];
						const filePath = importMatch[2];
						const documentDir = path.dirname(phlowFile.fsPath);

						// Resolve the referenced file path
						let resolvedPath: string;
						if (path.isAbsolute(filePath)) {
							resolvedPath = filePath;
						} else {
							resolvedPath = path.resolve(documentDir, filePath);
						}

						// Check if this matches our target file
						if (path.normalize(resolvedPath) === path.normalize(targetUri.fsPath)) {
							// This reference points to our target file, but we can't automatically update
							// without knowing the old path. This is handled by the rename provider above.
							console.log(`Found reference to ${targetUri.fsPath} in ${phlowFile.fsPath}`);
						}
					}
				}
			}
		} catch (error) {
			console.error('Error updating import references:', error);
		}
	}

	// Helper function to check for broken references
	async function checkForBrokenReferences(deletedUri: vscode.Uri) {
		try {
			// Find all .phlow files in the workspace
			const phlowFiles = await vscode.workspace.findFiles('**/*.phlow', '**/node_modules/**');
			const brokenRefs: { file: string; line: number; path: string }[] = [];

			for (const phlowFile of phlowFiles) {
				const document = await vscode.workspace.openTextDocument(phlowFile);
				const content = document.getText();
				const lines = content.split('\n');

				// Check each line for import/include directives
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					const importMatch = line.match(/(!import|!include)\s+([^\s]+)/);

					if (importMatch) {
						const directive = importMatch[1];
						const filePath = importMatch[2];
						const documentDir = path.dirname(phlowFile.fsPath);

						// Resolve the referenced file path
						let resolvedPath: string;
						if (path.isAbsolute(filePath)) {
							resolvedPath = filePath;
						} else {
							resolvedPath = path.resolve(documentDir, filePath);
						}

						// Check if this matches our deleted file
						if (path.normalize(resolvedPath) === path.normalize(deletedUri.fsPath)) {
							brokenRefs.push({
								file: phlowFile.fsPath,
								line: i + 1,
								path: filePath
							});
						}
					}
				}
			}

			// Show warning about broken references
			if (brokenRefs.length > 0) {
				const message = `Found ${brokenRefs.length} broken import/include reference(s) to deleted file ${path.basename(deletedUri.fsPath)}:`;
				const details = brokenRefs.map(ref => `• ${path.basename(ref.file)}:${ref.line} - ${ref.path}`).join('\n');

				vscode.window.showWarningMessage(
					`${message}\n\n${details}`,
					'Show Problems Panel'
				).then(selection => {
					if (selection === 'Show Problems Panel') {
						vscode.commands.executeCommand('workbench.panel.markers.view.focus');
					}
				});
			}
		} catch (error) {
			console.error('Error checking for broken references:', error);
		}
	}

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

	// Command to force update import references
	const updateImportReferencesCommand = vscode.commands.registerCommand('phlow.updateImportReferences', async () => {
		try {
			// Find all .phlow files in the workspace
			const phlowFiles = await vscode.workspace.findFiles('**/*.phlow', '**/node_modules/**');
			let totalReferences = 0;
			const brokenRefs: { file: string; line: number; path: string }[] = [];

			for (const phlowFile of phlowFiles) {
				const document = await vscode.workspace.openTextDocument(phlowFile);
				const content = document.getText();
				const lines = content.split('\n');

				// Check each line for import/include directives
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					const importMatch = line.match(/(!import|!include)\s+([^\s]+)/);

					if (importMatch) {
						totalReferences++;
						const directive = importMatch[1];
						const filePath = importMatch[2];
						const documentDir = path.dirname(phlowFile.fsPath);

						// Resolve the referenced file path
						let resolvedPath: string;
						if (path.isAbsolute(filePath)) {
							resolvedPath = filePath;
						} else {
							resolvedPath = path.resolve(documentDir, filePath);
						}

						// Check if the file exists
						try {
							await vscode.workspace.fs.stat(vscode.Uri.file(resolvedPath));
						} catch (error) {
							// File doesn't exist, add to broken references
							brokenRefs.push({
								file: phlowFile.fsPath,
								line: i + 1,
								path: filePath
							});
						}
					}
				}
			}

			// Show results
			if (brokenRefs.length > 0) {
				const message = `Found ${totalReferences} import/include reference(s) with ${brokenRefs.length} broken reference(s):`;
				const details = brokenRefs.map(ref => `• ${path.basename(ref.file)}:${ref.line} - ${ref.path}`).join('\n');

				vscode.window.showWarningMessage(
					`${message}\n\n${details}`,
					'Show Problems Panel'
				).then(selection => {
					if (selection === 'Show Problems Panel') {
						vscode.commands.executeCommand('workbench.panel.markers.view.focus');
					}
				});
			} else {
				vscode.window.showInformationMessage(
					`✅ Found ${totalReferences} import/include reference(s) - all are valid!`
				);
			}
		} catch (error) {
			console.error('Error checking import references:', error);
			vscode.window.showErrorMessage(`Error checking import references: ${error}`);
		}
	});

	context.subscriptions.push(updateImportReferencesCommand);
}

// This method is called when your extension is deactivated
export function deactivate() { }
