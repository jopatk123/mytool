import { Button, Space, Switch, Tooltip, Typography } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface FolderSelectorProps {
  directory: string | null;
  includeSubdirectories: boolean;
  onSelectDirectory(): void;
  onToggleInclude(value: boolean): void;
  loading?: boolean;
}

export function FolderSelector({ directory, includeSubdirectories, onSelectDirectory, onToggleInclude, loading }: FolderSelectorProps) {
  return (
    <Space direction="horizontal" size="large" wrap>
      <Button type="primary" icon={<FolderOpenOutlined />} onClick={onSelectDirectory} loading={loading}>
        选择图片文件夹
      </Button>
      <Space>
        <Switch checked={includeSubdirectories} onChange={onToggleInclude} />
        <Text>包含子文件夹</Text>
      </Space>
      {directory && (
        <Tooltip title={directory}>
          <Text ellipsis style={{ maxWidth: 360 }}>
            当前目录：{directory}
          </Text>
        </Tooltip>
      )}
    </Space>
  );
}
