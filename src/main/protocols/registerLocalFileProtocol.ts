import type { Protocol } from 'electron';
import type Logger from '../../shared/utils/logger';

interface ProtocolLike {
  registerFileProtocol: Protocol['registerFileProtocol'];
}

export interface RegisterLocalFileProtocolOptions {
  logger: Pick<Logger, 'debug' | 'error' | 'success'>;
  protocol: ProtocolLike;
}

/**
 * Registers the custom local-file protocol so the renderer can load files from disk in a controlled
 * way. Extracted into its own module to simplify testing and future extensions.
 */
export const registerLocalFileProtocol = (options: RegisterLocalFileProtocolOptions): void => {
  const { logger, protocol } = options;

  protocol.registerFileProtocol('local-file', (request, callback) => {
    try {
      const url = request.url.substring('local-file://'.length);
      const decodedPath = decodeURIComponent(url);

      logger.debug('Loading local file via protocol', { url, decodedPath });

      callback({ path: decodedPath });
    } catch (error) {
      logger.error('Failed to load local file', { url: request.url, error });
      callback({ error: -2 });
    }
  });

  logger.success('Registered local-file:// protocol');
};
