import { Button, Space, Switch, Typography } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface OutputControlsProps {
  overwrite: boolean;
  onOverwriteChange(value: boolean): void;
  overwriteForced: boolean;
  outputDirectory: string | null;
  onSelectOutputDirectory(): void;
  onClearOutputDirectory(): void;
  canSelectOutputDirectory: boolean;
  onRun(): void;
  onCancel(): void;
  canRun: boolean;
  disabled: boolean;
  running: boolean;
}

export function OutputControls({
  overwrite,
  onOverwriteChange,
  overwriteForced,
  outputDirectory,
  onSelectOutputDirectory,
  onClearOutputDirectory,
  canSelectOutputDirectory,
  onRun,
  onCancel,
  canRun,
  disabled,
  running,
}: OutputControlsProps) {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space>
        <Switch checked={overwrite} onChange={onOverwriteChange} disabled={overwriteForced} />
        <Text>允许覆盖原文件（哈希刷新时将强制启用）</Text>
      </Space>

      {canSelectOutputDirectory && (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary">输出目录（可选）：</Text>
          <Space style={{ width: '100%' }}>
            <Button icon={<FolderOpenOutlined />} onClick={onSelectOutputDirectory}>
              选择输出目录
            </Button>
            {outputDirectory && (
              <Button onClick={onClearOutputDirectory}>清除</Button>
            )}
          </Space>
          {outputDirectory ? (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              当前输出目录: {outputDirectory}
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              未选择输出目录时，将在原图片所在目录生成新文件
            </Text>
          )}
        </Space>
      )}

      <Space>
        <Button type="primary" onClick={onRun} disabled={disabled || running || !canRun} loading={running}>
          开始批量处理
        </Button>
        {running && (
          <Button danger onClick={onCancel}>
            取消任务
          </Button>
        )}
      </Space>
    </Space>
  );
}
