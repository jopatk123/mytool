import { Collapse, InputNumber, Select, Space, Switch, Typography } from 'antd';

type ResizeFit = 'cover' | 'contain' | 'inside' | 'outside' | 'fill';

const { Text } = Typography;

interface ResizePanelProps {
  enabled: boolean;
  onToggle(value: boolean): void;
  width: number | null;
  height: number | null;
  onWidthChange(value: number | null): void;
  onHeightChange(value: number | null): void;
  fit: ResizeFit;
  onFitChange(value: ResizeFit): void;
  withoutEnlargement: boolean;
  onWithoutEnlargementChange(value: boolean): void;
}

export function ResizePanel({
  enabled,
  onToggle,
  width,
  height,
  onWidthChange,
  onHeightChange,
  fit,
  onFitChange,
  withoutEnlargement,
  onWithoutEnlargementChange,
}: ResizePanelProps) {
  return (
    <Collapse.Panel header="尺寸调整" key="resize">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Switch checked={enabled} onChange={onToggle} />
        <Space wrap>
          <Text>宽度 (px)：</Text>
          <InputNumber
            min={1}
            value={width ?? undefined}
            onChange={(value) => onWidthChange(value ?? null)}
            disabled={!enabled}
          />
          <Text>高度 (px)：</Text>
          <InputNumber
            min={1}
            value={height ?? undefined}
            onChange={(value) => onHeightChange(value ?? null)}
            disabled={!enabled}
          />
        </Space>
        <Space wrap>
          <Text>缩放模式：</Text>
          <Select
            value={fit}
            onChange={(value) => onFitChange(value as ResizeFit)}
            disabled={!enabled}
            style={{ width: 180 }}
            options={[
              { label: '等比裁剪 (cover)', value: 'cover' },
              { label: '保持完整 (contain)', value: 'contain' },
              { label: '不保持比例 (fill)', value: 'fill' },
              { label: '仅缩小 (inside)', value: 'inside' },
              { label: '放大到覆盖 (outside)', value: 'outside' },
            ]}
          />
        </Space>
        <Space>
          <Switch
            checked={withoutEnlargement}
            onChange={onWithoutEnlargementChange}
            disabled={!enabled}
          />
          <Text>避免放大原图</Text>
        </Space>
      </Space>
    </Collapse.Panel>
  );
}
