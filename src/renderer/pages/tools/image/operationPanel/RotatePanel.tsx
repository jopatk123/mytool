import { Collapse, InputNumber, Radio, Space, Switch, Typography } from 'antd';
import type { ImageRotationMode } from '@shared/types';

const { Text } = Typography;

interface RotatePanelProps {
  enabled: boolean;
  onToggle(value: boolean): void;
  mode: ImageRotationMode;
  onModeChange(value: ImageRotationMode): void;
  angle: number;
  onAngleChange(value: number | null): void;
  minAngle: number;
  onMinAngleChange(value: number | null): void;
  maxAngle: number;
  onMaxAngleChange(value: number | null): void;
  autoCrop: boolean;
  onAutoCropChange(value: boolean): void;
}

export function RotatePanel({
  enabled,
  onToggle,
  mode,
  onModeChange,
  angle,
  onAngleChange,
  minAngle,
  onMinAngleChange,
  maxAngle,
  onMaxAngleChange,
  autoCrop,
  onAutoCropChange,
}: RotatePanelProps) {
  return (
    <Collapse.Panel header="旋转" key="rotate">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Switch checked={enabled} onChange={onToggle} />
        <Space wrap align="center">
          <Text>模式：</Text>
          <Radio.Group
            value={mode}
            onChange={(event) => onModeChange(event.target.value as ImageRotationMode)}
            disabled={!enabled}
          >
            <Radio.Button value="fixed">固定角度</Radio.Button>
            <Radio.Button value="random">随机角度</Radio.Button>
          </Radio.Group>
        </Space>
        {mode === 'fixed' ? (
          <Space wrap>
            <Text>角度 (°)：</Text>
            <InputNumber
              min={-360}
              max={360}
              step={1}
              value={angle}
              onChange={(value) => onAngleChange(value ?? 0)}
              disabled={!enabled}
            />
          </Space>
        ) : (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space wrap>
              <Text>最小角度 (°)：</Text>
              <InputNumber
                min={-10}
                max={10}
                step={0.5}
                value={minAngle}
                onChange={(value) => onMinAngleChange(value ?? 0)}
                disabled={!enabled}
              />
            </Space>
            <Space wrap>
              <Text>最大角度 (°)：</Text>
              <InputNumber
                min={-10}
                max={10}
                step={0.5}
                value={maxAngle}
                onChange={(value) => onMaxAngleChange(value ?? 0)}
                disabled={!enabled}
              />
            </Space>
            <Text type="secondary">
              随机角度范围限定在 -10° 到 10°，每张图片会应用区间内的随机角度。
            </Text>
          </Space>
        )}
        <Space>
          <Switch checked={autoCrop} onChange={onAutoCropChange} disabled={!enabled} />
          <Text>自动裁剪旋转后的空白区域</Text>
        </Space>
      </Space>
    </Collapse.Panel>
  );
}
