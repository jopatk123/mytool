import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { createLogger } from '../../../shared/utils/logger';

const logger = createLogger('FFmpegService');

type SpawnResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export class FFmpegService {
  private readonly binaryPath: string;

  constructor(binaryPath: string = ffmpegInstaller.path) {
    this.binaryPath = binaryPath;
  }

  async ensureAvailable(): Promise<void> {
    try {
      await access(this.binaryPath, fsConstants.X_OK);
    } catch (error) {
      logger.error('FFmpeg binary is not accessible', { path: this.binaryPath, error });
      throw error;
    }
  }

  async run(args: string[], options?: { cwd?: string; timeoutMs?: number }): Promise<SpawnResult> {
    await this.ensureAvailable();

    const { cwd, timeoutMs } = options ?? {};
    logger.debug('Running ffmpeg command', { args, cwd });

    return new Promise<SpawnResult>((resolve, reject) => {
      const child = spawn(this.binaryPath, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timeout: NodeJS.Timeout | null = null;

      if (timeoutMs && timeoutMs > 0) {
        timeout = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error(`FFmpeg command timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        logger.error('FFmpeg process failed to start', { error });
        reject(error);
      });

      child.on('close', (exitCode) => {
        if (timeout) {
          clearTimeout(timeout);
        }

        logger.debug('FFmpeg command completed', { exitCode, stdout, stderr });

        if (exitCode === 0) {
          resolve({ exitCode, stdout, stderr });
        } else {
          const error = new Error(`FFmpeg exited with code ${exitCode}: ${stderr}`);
          reject(error);
        }
      });
    });
  }

  getPath(): string {
    return this.binaryPath;
  }
}
