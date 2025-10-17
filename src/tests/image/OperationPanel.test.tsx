import { OperationPanel } from '@renderer/pages/tools/image/OperationPanel';
import { fireEvent, render, screen } from '@testing-library/react';
import { message } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

    // 默认展开的面板内容应该可见
    expect(screen.getByText('哈希算法：')).toBeTruthy();
    expect(screen.getByText('输出格式：')).toBeTruthy();
    expect(screen.getByText('模式：')).toBeTruthy();

    // 展开其他面板来检查所有内容
    const resizeHeader = screen.getByText('尺寸调整');
    fireEvent.click(resizeHeader);
    expect(screen.getByText('缩放方式')).toBeTruthy();
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

    // 展开所有需要的面板
    const resizeHeader = screen.getByText('尺寸调整');
    fireEvent.click(resizeHeader);

    const getAllSwitches = () => screen.getAllByRole('switch');
    const switches = getAllSwitches();

    // 索引：0=hash, 1=resize, 2=crop, 3=compress, 4=rotate, 5=autoCrop, 6=overwrite
    const hashSwitch = switches[0];
    const resizeSwitch = switches[1];
    const compressSwitch = switches[3];
    const rotateSwitch = switches[4];
    const autoCropSwitch = switches[5];

    fireEvent.click(hashSwitch); // 禁用 hash rename (默认开启)
    fireEvent.click(resizeSwitch); // enable resize

    // 获取所有spinbutton，启用resize后应该出现宽度和高度输入框
    const getAllInputs = () => screen.queryAllByRole('spinbutton');
    const resizeInputs = getAllInputs();
    if (resizeInputs.length >= 2) {
      fireEvent.change(resizeInputs[0], { target: { value: '512' } }); // 宽度
    }

    if (compressSwitch) fireEvent.click(compressSwitch); // enable compress
    if (rotateSwitch) fireEvent.click(rotateSwitch); // enable rotate

    // 切换到随机模式
    const randomRadio = screen.getByRole('radio', { name: '随机角度' });
    fireEvent.click(randomRadio);

    if (autoCropSwitch) fireEvent.click(autoCropSwitch); // enable auto crop

    // 获取最小和最大角度输入框（应该在列表后面）
    const allInputs = getAllInputs();
    if (allInputs.length >= 4) {
      const minAngleInput = allInputs[allInputs.length - 2]; // 倒数第二个
      const maxAngleInput = allInputs[allInputs.length - 1]; // 最后一个
      fireEvent.change(minAngleInput, { target: { value: '-3' } });
      fireEvent.change(maxAngleInput, { target: { value: '4' } });
    }

    fireEvent.click(hashSwitch); // 重新启用 hash rename

    const startButton = screen.getByRole('button', { name: '开始批量处理' });
    fireEvent.click(startButton);

    expect(onRun).toHaveBeenCalledTimes(1);
    const payload = onRun.mock.calls[0][0];
    const types = payload.operations.map((operation: { type: string }) => operation.type);

    // 验证包含 resize 和 rotate 操作
    expect(types).toContain('resize');
    expect(types).toContain('rotate');

    const rotateOperation = payload.operations.find(
      (operation: { type: string }) => operation.type === 'rotate',
    );
    expect(rotateOperation).toMatchObject({
      mode: 'random',
      minAngle: -3,
      maxAngle: 4,
      autoCrop: true,
    });

    const options = payload.options;
    // 由于最后没有重新启用 hashRename，overwrite 应该为 false
    expect(options.outputDirectory).toBeNull();
  });
});
