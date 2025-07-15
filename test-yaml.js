import * as yaml from 'yaml';

const content = `tests: 

  - describe: Basic Arithmetic Tests
    main:
      total: 2
    payload: 10
    assert_eq: Total is 20

  - describe: String Concatenation Tests     
    main:
      total: 3
    payload: 5
    assert: !phs payload == "Total is 15"
steps:
  - payload: !phs main.total * payload 
  - payload: "!phs Total is payload"
`;

console.log('Testing YAML parsing...');
try {
    const parsed = yaml.parse(content);
    console.log('Parsed YAML:', JSON.stringify(parsed, null, 2));
    console.log('Has tests:', !!parsed?.tests);
    console.log('Tests type:', typeof parsed?.tests);
    console.log('Tests is array:', Array.isArray(parsed.tests));
    console.log('Number of tests:', parsed.tests?.length);
} catch (error) {
    console.error('YAML Parse Error:', error.message);
}
