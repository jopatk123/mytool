import type { ProtocolRequest } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { registerLocalFileProtocol } from '../../main/protocols/registerLocalFileProtocol';
import type { RegisterLocalFileProtocolOptions } from '../../main/protocols/registerLocalFileProtocol';

const createLogger = () => ({
  debug: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
});

describe('registerLocalFileProtocol', () => {
  it('registers the protocol and resolves file paths', () => {
    const logger = createLogger();
    type RegisterHandler = RegisterLocalFileProtocolOptions['protocol']['registerFileProtocol'];
    const registerFileProtocolSpy = vi.fn<
      Parameters<RegisterHandler>,
      ReturnType<RegisterHandler>
    >();
    const protocol: RegisterLocalFileProtocolOptions['protocol'] = {
      registerFileProtocol: (...args) => registerFileProtocolSpy(...args),
    };

    registerLocalFileProtocol({ logger, protocol });

    expect(registerFileProtocolSpy).toHaveBeenCalledWith('local-file', expect.any(Function));
    expect(logger.success).toHaveBeenCalledWith('Registered local-file:// protocol');

    const handler = registerFileProtocolSpy.mock.calls[0][1];
    const callback = vi.fn();

    const request: ProtocolRequest = {
      url: 'local-file:///tmp/example.png',
      headers: {},
      method: 'GET',
      referrer: '',
    };

    handler(request, callback);

    expect(logger.debug).toHaveBeenCalledWith('Loading local file via protocol', {
      url: '/tmp/example.png',
      decodedPath: '/tmp/example.png',
    });
    expect(callback).toHaveBeenCalledWith({ path: '/tmp/example.png' });
  });

  it('guards against malformed URLs', () => {
    const logger = createLogger();
    type RegisterHandler = RegisterLocalFileProtocolOptions['protocol']['registerFileProtocol'];
    const registerFileProtocolSpy = vi.fn<
      Parameters<RegisterHandler>,
      ReturnType<RegisterHandler>
    >();
    const protocol: RegisterLocalFileProtocolOptions['protocol'] = {
      registerFileProtocol: (...args) => registerFileProtocolSpy(...args),
    };

    registerLocalFileProtocol({ logger, protocol });

    const handler = registerFileProtocolSpy.mock.calls[0][1];
    const callback = vi.fn();

    const request: ProtocolRequest = {
      url: 'local-file://%E0%A4%A',
      headers: {},
      method: 'GET',
      referrer: '',
    };

    handler(request, callback);

    expect(logger.error).toHaveBeenCalledWith('Failed to load local file', {
      url: 'local-file://%E0%A4%A',
      error: expect.any(Error),
    });
    expect(callback).toHaveBeenCalledWith({ error: -2 });
  });
});
