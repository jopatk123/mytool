import { InfoCircleOutlined } from '@ant-design/icons';
import { InputNumber, Radio, Space, Switch, Tooltip, Typography } from 'antd';

type ResizeMode = 'fixed' | 'aspectRatio' | 'smart';

const { Text } = Typography;

interface ResizePanelProps {
  enabled: boolean;
  onToggle(value: boolean): void;
  width: number | null;
  height: number | null;
  onWidthChange(value: number | null): void;
  onHeightChange(value: number | null): void;
  mode: ResizeMode;
  onModeChange(value: ResizeMode): void;
}

export function ResizePanel({
  enabled,
  onToggle,
  width,
  height,
  onWidthChange,
  onHeightChange,
  mode,
  onModeChange,
}: ResizePanelProps) {
  const getModeDescription = (m: ResizeMode): string => {
    switch (m) {
      case 'fixed':
        return '强制缩放到指定尺寸，不保持宽高比';
      case 'aspectRatio':
        return '等比缩放，长边不超过目标值，保持宽高比';
      case 'smart':
        return '等比缩放并裁剪到目标尺寸（需同时设置宽高）';
      default:
        return '';
    }
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space>
        <Switch checked={enabled} onChange={onToggle} />
        <Text>启用尺寸调整</Text>
      </Space>

      <div style={{ paddingLeft: '24px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space wrap style={{ marginBottom: '8px' }}>
            <Text>目标尺寸：</Text>
            <InputNumber
              placeholder="宽"
              min={1}
              value={width ?? undefined}
              onChange={(value) => onWidthChange(value ?? null)}
              disabled={!enabled}
              style={{ width: '80px' }}
            />
            <Text>×</Text>
            <InputNumber
              placeholder="高"
              min={1}
              value={height ?? undefined}
              onChange={(value) => onHeightChange(value ?? null)}
              disabled={!enabled}
              style={{ width: '80px' }}
            />
          </Space>

          <div style={{ margin: '12px 0 8px 0' }}>
            <Text strong>缩放方式</Text>
          </div>

          <Radio.Group
            value={mode}
            onChange={(e) => onModeChange(e.target.value as ResizeMode)}
            disabled={!enabled}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <Radio value="aspectRatio">
              <Text>
                等比缩放
                <Tooltip title={getModeDescription('aspectRatio')}>
                  <InfoCircleOutlined style={{ marginLeft: '4px' }} />
                </Tooltip>
              </Text>
            </Radio>

            <Radio value="smart">
              <Text>
                智能填充
                <Tooltip title={getModeDescription('smart')}>
                  <InfoCircleOutlined style={{ marginLeft: '4px' }} />
                </Tooltip>
              </Text>
            </Radio>

            <Radio value="fixed">
              <Text>
                固定尺寸
                <Tooltip title={getModeDescription('fixed')}>
                  <InfoCircleOutlined style={{ marginLeft: '4px' }} />
                </Tooltip>
              </Text>
            </Radio>
          </Radio.Group>

          <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px' }}>
            💡 提示：如果仅设置宽度或高度，缩放方式将自动调整为等比缩放。
          </Text>
        </Space>
      </div>
    </Space>
  );
}
