import { Collapse, Select, Slider, Space, Switch, Typography } from 'antd';

type CompressFormat = 'jpeg' | 'png' | 'webp';

const { Text } = Typography;

interface CompressPanelProps {
  enabled: boolean;
  onToggle(value: boolean): void;
  format: CompressFormat;
  onFormatChange(value: CompressFormat): void;
  quality: number;
  onQualityChange(value: number): void;
}

export function CompressPanel({
  enabled,
  onToggle,
  format,
  onFormatChange,
  quality,
  onQualityChange,
}: CompressPanelProps) {
  return (
    <Collapse.Panel header="压缩" key="compress">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Switch checked={enabled} onChange={onToggle} />
        <Space wrap>
          <Text>输出格式：</Text>
          <Select
            value={format}
            onChange={value => onFormatChange(value as CompressFormat)}
            disabled={!enabled}
            style={{ width: 160 }}
            options={[
              { label: 'JPEG', value: 'jpeg' },
              { label: 'PNG', value: 'png' },
              { label: 'WebP', value: 'webp' },
            ]}
          />
        </Space>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>压缩质量：{quality}%</Text>
          <Slider
            min={10}
            max={100}
            step={5}
            value={quality}
            disabled={!enabled}
            onChange={value => onQualityChange(value as number)}
          />
        </Space>
      </Space>
    </Collapse.Panel>
  );
}
