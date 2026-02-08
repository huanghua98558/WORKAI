import { exec as execCb } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCb);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Execute shell command and return result
 * @param command Shell command to execute
 * @param isBackground Whether to run in background (default: false)
 * @returns Promise with stdout and stderr
 */
export async function execShell(
  command: string,
  isBackground: boolean = false
): Promise<ExecResult> {
  if (isBackground) {
    // For background commands, we spawn the process
    const { spawn } = await import('child_process');
    const child = spawn('sh', ['-c', command], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return { stdout: '', stderr: '' };
  }

  try {
    const result = await exec(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 300000, // 5 minutes timeout
    });
    return result;
  } catch (error: any) {
    // Return error in stderr even if command fails
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || String(error),
    };
  }
}
