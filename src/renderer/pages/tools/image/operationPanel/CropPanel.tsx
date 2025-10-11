import { InputNumber, Space, Switch, Typography } from 'antd';

const { Text } = Typography;

interface CropPanelProps {
  enabled: boolean;
  onToggle(value: boolean): void;
  top: number;
  bottom: number;
  left: number;
  right: number;
  onTopChange(value: number): void;
  onBottomChange(value: number): void;
  onLeftChange(value: number): void;
  onRightChange(value: number): void;
}

export function CropPanel({
  enabled,
  onToggle,
  top,
  bottom,
  left,
  right,
  onTopChange,
  onBottomChange,
  onLeftChange,
  onRightChange,
}: CropPanelProps) {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Switch checked={enabled} onChange={onToggle} />
      <Text type="secondary">
        为需要裁剪的方向输入像素值（px），未填写或为 0 的方向将保持不变。
      </Text>
      <Space wrap style={{ width: '100%' }}>
        <Space>
          <Text>顶部：</Text>
          <InputNumber
            min={0}
            value={top}
            onChange={(value) => onTopChange(value ?? 0)}
            disabled={!enabled}
          />
        </Space>
        <Space>
          <Text>底部：</Text>
          <InputNumber
            min={0}
            value={bottom}
            onChange={(value) => onBottomChange(value ?? 0)}
            disabled={!enabled}
          />
        </Space>
        <Space>
          <Text>左侧：</Text>
          <InputNumber
            min={0}
            value={left}
            onChange={(value) => onLeftChange(value ?? 0)}
            disabled={!enabled}
          />
        </Space>
        <Space>
          <Text>右侧：</Text>
          <InputNumber
            min={0}
            value={right}
            onChange={(value) => onRightChange(value ?? 0)}
            disabled={!enabled}
          />
        </Space>
      </Space>
    </Space>
  );
}
