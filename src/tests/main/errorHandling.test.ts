import { describe, expect, it, vi } from 'vitest';
import { setupErrorHandling } from '../../main/bootstrap/errorHandling';

const createController = () => {
  const dialog = { showErrorBox: vi.fn() };
  const logger = { error: vi.fn(), warn: vi.fn() };
  const observability = { recordError: vi.fn() };
  const toSafeJson = vi.fn((value: unknown) => value);

  const controller = setupErrorHandling({
    dialog,
    logger,
    observability,
    toSafeJson,
  });

  return { controller, dialog, logger, observability };
};

describe('setupErrorHandling', () => {
  it('reports fatal errors only once', () => {
    const { controller, dialog, observability } = createController();
    const error = new Error('boom');

    controller.notifyFatalError('Fatal', error);
    controller.notifyFatalError('Fatal', new Error('second'));

    expect(observability.recordError).toHaveBeenCalledTimes(1);
    expect(dialog.showErrorBox).toHaveBeenCalledTimes(1);
    expect(dialog.showErrorBox).toHaveBeenCalledWith('Fatal', 'boom');
  });

  it('stringifies unknown error payloads', () => {
    const { controller, dialog, observability } = createController();
    controller.notifyFatalError('Fatal', 'raw error');

    expect(observability.recordError).toHaveBeenCalledWith('raw error', 'main');
    expect(dialog.showErrorBox).toHaveBeenCalledWith('Fatal', 'raw error');
  });
});
