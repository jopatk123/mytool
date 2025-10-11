import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { OperationPanel } from '@renderer/pages/tools/image/OperationPanel';
import { message } from 'antd';

vi.mock('@renderer/hooks/useElectronAPI', () => ({
  useElectronAPI: () => ({
    selectFile: vi.fn().mockResolvedValue(null),
  }),
}));

describe('OperationPanel', () => {
  beforeEach(() => {
    const dismiss = (() => undefined) as unknown as ReturnType<typeof message.info>;
    vi.spyOn(message, 'info').mockImplementation(() => dismiss);
    vi.spyOn(message, 'success').mockImplementation(() => dismiss);
    vi.spyOn(message, 'warning').mockImplementation(() => dismiss);
    vi.spyOn(message, 'error').mockImplementation(() => dismiss);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders collapse panel content by default', () => {
    render(
      <OperationPanel
        disabled={false}
        running={false}
        assetCount={2}
        onRun={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('哈希算法：')).toBeTruthy();
    expect(screen.getByText('宽度 (px)：')).toBeTruthy();
    expect(screen.getByText('输出格式：')).toBeTruthy();
    expect(screen.getByText('模式：')).toBeTruthy();
  });

  it('builds operations from enabled controls', async () => {
    const onRun = vi.fn();

    render(
      <OperationPanel
        disabled={false}
        running={false}
        assetCount={3}
        onRun={onRun}
        onCancel={vi.fn()}
      />,
    );

    const getSwitch = (index: number) => screen.getAllByRole('switch')[index];

  fireEvent.click(getSwitch(0)); // enable hash rename
  fireEvent.click(getSwitch(1)); // enable resize
  fireEvent.click(getSwitch(4)); // enable compress
  fireEvent.click(getSwitch(5)); // enable rotate
  fireEvent.click(screen.getByRole('radio', { name: '随机角度' }));
  fireEvent.click(getSwitch(6)); // enable auto crop

    const widthInput = within(screen.getByText('宽度 (px)：').parentElement as HTMLElement).getByRole('spinbutton');
  fireEvent.change(widthInput, { target: { value: '512' } });
  fireEvent.blur(widthInput);

    const minAngleInput = within(screen.getByText('最小角度 (°)：').parentElement as HTMLElement).getByRole('spinbutton');
    const maxAngleInput = within(screen.getByText('最大角度 (°)：').parentElement as HTMLElement).getByRole('spinbutton');
  fireEvent.change(minAngleInput, { target: { value: '-3' } });
  fireEvent.blur(minAngleInput);
  fireEvent.change(maxAngleInput, { target: { value: '4' } });
  fireEvent.blur(maxAngleInput);

  fireEvent.click(screen.getByRole('button', { name: '开始批量处理' }));

    expect(onRun).toHaveBeenCalledTimes(1);
    const payload = onRun.mock.calls[0][0];
    const types = payload.operations.map((operation: { type: string }) => operation.type);
    expect(types).toEqual(['hashRename', 'resize', 'compress', 'rotate']);

    const rotateOperation = payload.operations.find((operation: { type: string }) => operation.type === 'rotate');
    expect(rotateOperation).toMatchObject({
      mode: 'random',
      minAngle: -3,
      maxAngle: 4,
      autoCrop: true,
    });

    const options = payload.options;
    expect(options.overwrite).toBe(true);
    expect(options.outputDirectory).toBeNull();
  });
});
