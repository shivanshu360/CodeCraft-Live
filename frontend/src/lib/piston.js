// Code execution service with Wandbox and Piston support

const WANDBOX_API = "https://wandbox.org/api/compile.json";
const PISTON_API = "https://emkc.org/api/v2/piston/execute";

const WANDBOX_COMPILERS = {
  javascript: "nodejs-20.17.0",
  python: "cpython-3.12.7",
  java: "openjdk-jdk-21+35",
};

const PISTON_CONFIG = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
};

function getFileExtension(language) {
  const extensions = {
    javascript: "js",
    python: "py",
    java: "java",
  };
  return extensions[language] || "txt";
}

/**
 * Execute code using Wandbox API (no auth required)
 */
async function executeWithWandbox(language, code) {
  const compiler = WANDBOX_COMPILERS[language];
  if (!compiler) {
    throw new Error(`Unsupported Wandbox language: ${language}`);
  }

  const response = await fetch(WANDBOX_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      compiler,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Wandbox error: HTTP ${response.status}`);
  }

  const data = await response.json();
  const isSuccess = data.status === "0";
  const output = data.program_output || data.compiler_output || "";
  const error = data.program_error || data.compiler_error || data.compiler_message || "";

  if (!isSuccess && error) {
    return {
      success: false,
      output: output,
      error: error,
    };
  }

  return {
    success: isSuccess,
    output: output || (isSuccess ? "No output" : ""),
    error: isSuccess ? undefined : error || "Execution failed",
  };
}

/**
 * Fallback to Piston API if available
 */
async function executeWithPiston(language, code) {
  const config = PISTON_CONFIG[language];
  if (!config) {
    throw new Error(`Unsupported Piston language: ${language}`);
  }

  const response = await fetch(PISTON_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      language: config.language,
      version: config.version,
      files: [
        {
          name: `main.${getFileExtension(language)}`,
          content: code,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Piston error: HTTP ${response.status}`);
  }

  const data = await response.json();
  const output = data.run?.output || "";
  const stderr = data.run?.stderr || "";

  if (stderr) {
    return {
      success: false,
      output,
      error: stderr,
    };
  }

  return {
    success: true,
    output: output || "No output",
  };
}

/**
 * Fallback client-side execution for JavaScript
 */
function executeClientSideJS(code) {
  const logs = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const formatArg = (arg) => {
    if (typeof arg === "object" && arg !== null) {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  };

  console.log = (...args) => logs.push(args.map(formatArg).join(" "));
  console.error = (...args) => logs.push(args.map(formatArg).join(" "));
  console.warn = (...args) => logs.push(args.map(formatArg).join(" "));

  try {
    const fn = new Function(code);
    fn();
    return {
      success: true,
      output: logs.join("\n") || "No output",
    };
  } catch (err) {
    return {
      success: false,
      output: logs.join("\n"),
      error: err.toString(),
    };
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}

/**
 * @param {string} language - programming language
 * @param {string} code - source code to execute
 * @returns {Promise<{success:boolean, output?:string, error?: string}>}
 */
export async function executeCode(language, code) {
  if (!WANDBOX_COMPILERS[language] && !PISTON_CONFIG[language]) {
    return {
      success: false,
      error: `Unsupported language: ${language}`,
    };
  }

  // 1. Try Wandbox first (reliable, free, no whitelist)
  try {
    return await executeWithWandbox(language, code);
  } catch (wandboxError) {
    console.warn("Wandbox execution failed, trying Piston:", wandboxError);
  }

  // 2. Try Piston as backup
  try {
    return await executeWithPiston(language, code);
  } catch (pistonError) {
    console.warn("Piston execution failed:", pistonError);
  }

  // 3. If JavaScript and network APIs are down, run client-side
  if (language === "javascript") {
    try {
      return executeClientSideJS(code);
    } catch (localError) {
      return {
        success: false,
        error: `Execution failed: ${localError.message}`,
      };
    }
  }

  return {
    success: false,
    error: "Code execution servers are currently unavailable. Please try again shortly.",
  };
}
