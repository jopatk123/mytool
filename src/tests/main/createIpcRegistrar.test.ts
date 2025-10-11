import { describe, expect, it, vi } from 'vitest';
import { IPCChannel } from '../../shared/types';
import { createIpcRegistrar } from '../../main/ipc/createIpcRegistrar';

const createMocks = () => {
  const handleSpy = vi.fn();
  const ipcMain = { handle: handleSpy } as unknown as Parameters<
    typeof createIpcRegistrar
  >[0]['ipcMain'];
  const logger = { error: vi.fn() } as Parameters<typeof createIpcRegistrar>[0]['logger'];
  const observability = { recordError: vi.fn() } as Parameters<
    typeof createIpcRegistrar
  >[0]['observability'];
  const toSafeJson = vi.fn((value: unknown) => value);

  const register = createIpcRegistrar({ ipcMain, logger, observability, toSafeJson });

  return {
    handleSpy,
    logger,
    observability,
    register,
    toSafeJson,
  };
};

describe('createIpcRegistrar', () => {
  it('wraps handler results in a success response', async () => {
    const { handleSpy, register } = createMocks();

    register(IPCChannel.TOOL_GET_LIST, async () => ['tool-A']);
    expect(handleSpy).toHaveBeenCalledWith(IPCChannel.TOOL_GET_LIST, expect.any(Function));

    const handler = handleSpy.mock.calls[0][1];
    const result = await handler({}, 'arg1');

    expect(result).toEqual({ success: true, data: ['tool-A'] });
  });

  it('captures handler errors and emits structured responses', async () => {
    const { handleSpy, logger, observability, toSafeJson, register } = createMocks();
    const failure = new Error('boom');

    register(IPCChannel.TOOL_EXECUTE, async () => {
      throw failure;
    });

    const handler = handleSpy.mock.calls[0][1];
    const response = await handler({}, 'tool-id', { foo: 'bar' });

    expect(response.success).toBe(false);
    expect(logger.error).toHaveBeenCalledWith('IPC handler failed', {
      channel: IPCChannel.TOOL_EXECUTE,
      args: ['tool-id', { foo: 'bar' }],
      error: failure,
    });
    expect(observability.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: `ipc:${IPCChannel.TOOL_EXECUTE}`,
      }),
      'main',
    );
    expect(toSafeJson).toHaveBeenCalledTimes(3);
  });
});
