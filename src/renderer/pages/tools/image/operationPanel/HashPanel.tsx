import { Collapse, Select, Space, Switch, Typography } from 'antd';
import type { ImageBatchOperation } from '@shared/types';

type HashRenameOperation = Extract<ImageBatchOperation, { type: 'hashRename' }>;

const { Text } = Typography;

interface HashPanelProps {
  enabled: boolean;
  onToggle(value: boolean): void;
  algorithm: HashRenameOperation['algorithm'];
  onAlgorithmChange(value: HashRenameOperation['algorithm']): void;
}

export function HashPanel({ enabled, onToggle, algorithm, onAlgorithmChange }: HashPanelProps) {
  return (
    <Collapse.Panel header="哈希刷新" key="hash">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Switch checked={enabled} onChange={onToggle} />
        <Space wrap>
          <Text>哈希算法：</Text>
          <Select
            value={algorithm}
            onChange={(value) => onAlgorithmChange(value as HashRenameOperation['algorithm'])}
            options={[
              { label: 'SHA-256', value: 'sha256' },
              { label: 'SHA-1', value: 'sha1' },
              { label: 'MD5', value: 'md5' },
            ]}
            style={{ width: 160 }}
            disabled={!enabled}
          />
        </Space>
        <Text type="secondary">此操作会直接覆盖原文件，仅刷新其哈希值。</Text>
      </Space>
    </Collapse.Panel>
  );
}
