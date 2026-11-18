
export interface PythonExecutionResult {
  success: boolean;
  output: string;
  error?: string;
}

export async function executePython(
  code: string
): Promise<PythonExecutionResult> {
  try {
    const response = await fetch(
      "https://emkc.org/api/v2/piston/execute",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "python",
          version: "3.10.0",
          files: [{ name: "main.py", content: code }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Python API error: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: result.run.code === 0,
      output: result.run.output || "",
      error: result.run.stderr || undefined,
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
