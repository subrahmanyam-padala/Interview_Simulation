// Mock code execution using random simulation to avoid arbitrary RCE vulnerabilities.
// In a real application, this would call Judge0, Piston, or AWS Lambda sandboxes.

export const runCode = async (req, res) => {
  try {
    const { language, code, testCases } = req.body;
    
    if (!code || !language || !testCases) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Simulate execution time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Basic simulation: if the code contains obvious syntax errors or is empty
    if (code.includes('syntax error') || code.length < 5) {
      return res.json({
        success: false,
        compilationError: 'Syntax Error: Unexpected token',
        runtimeError: null,
        executionTime: null,
        memory: null,
        passed: 0,
        total: testCases.length,
        testResults: []
      });
    }

    let compilationError = null;
    if (!code.includes('return') && !code.includes('print')) {
      compilationError = 'SyntaxError: Missing return statement. Your function did not return any value.';
    } else if (['javascript', 'java', 'cpp'].includes(language) && code.includes('return') && !code.includes(';')) {
      compilationError = 'SyntaxError: Missing semicolon at the end of the statement.';
    }

    if (compilationError) {
      return res.json({
        success: false,
        compilationError,
        runtimeError: null,
        executionTime: null,
        memory: null,
        passed: 0,
        total: testCases.length,
        testResults: []
      });
    }

    // Simulate running against test cases
    const testResults = testCases.map(tc => {
      // A slightly better mock: assume the user's code returns the expected output if it includes "return"
      // but ensure it's not just the default starter code "return 0;" or "pass".
      const isPass = (code.includes('return') || code.includes('print')) && !code.includes('return 0;') && !code.includes('pass');
      return {
        input: tc.input || tc.expectedOutput,
        expected: tc.expectedOutput,
        actual: isPass ? tc.expectedOutput : 'null',
        passed: isPass
      };
    });

    const passed = testResults.filter(r => r.passed).length;
    const total = testResults.length;

    res.json({
      success: true,
      compilationError: null,
      runtimeError: null,
      executionTime: `${Math.floor(Math.random() * 50) + 15} ms`,
      memory: `${Math.floor(Math.random() * 10) + 12} MB`,
      passed,
      total,
      testResults
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error during code execution.' });
  }
};

export const submitCode = async (req, res) => {
  // Simulates running hidden test cases
  try {
    const { language, code } = req.body;
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const isPass = (code.includes('return') || code.includes('print')) && !code.includes('return 0;') && !code.includes('pass');
    const total = 10;
    const passed = isPass ? 10 : Math.floor(Math.random() * 4);
    
    res.json({
      success: true,
      overallScore: Math.round((passed / total) * 100),
      passed,
      failed: total - passed,
      executionTime: `${Math.floor(Math.random() * 100) + 40} ms`,
      memoryUsage: `${Math.floor(Math.random() * 15) + 15} MB`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error during submission.' });
  }
};
