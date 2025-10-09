import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Collapse,
  Divider,
  Input,
  InputNumber,
  Select,
  Slider,
  Space,
  Switch,
  Typography,
  message,
} from 'antd';
import type { ImageBatchOperation, ImageJobRequest } from '@shared/types';

type HashRenameOperation = Extract<ImageBatchOperation, { type: 'hashRename' }>;

const { Text } = Typography;

interface OperationPanelProps {
  disabled: boolean;
  running: boolean;
  assetCount: number;
  onRun(payload: { operations: ImageBatchOperation[]; options: ImageJobRequest['options'] }): void;
  onCancel(): void;
}

export function OperationPanel({ disabled, running, assetCount, onRun, onCancel }: OperationPanelProps) {
  const [enableHashRename, setEnableHashRename] = useState(true);
  const [hashAlgorithm, setHashAlgorithm] = useState<HashRenameOperation['algorithm']>('sha256');
  const [hashPrefix, setHashPrefix] = useState('');
  const [keepExtension, setKeepExtension] = useState(true);

  const [enableResize, setEnableResize] = useState(false);
  const [resizeWidth, setResizeWidth] = useState<number | null>(null);
  const [resizeHeight, setResizeHeight] = useState<number | null>(null);
  const [resizeFit, setResizeFit] = useState<'cover' | 'contain' | 'inside' | 'outside' | 'fill'>('inside');
  const [preventEnlarge, setPreventEnlarge] = useState(true);

  const [enableCompress, setEnableCompress] = useState(true);
  const [compressQuality, setCompressQuality] = useState(80);
  const [compressFormat, setCompressFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');

  const [overwrite, setOverwrite] = useState(false);

  const canRun = useMemo(() => {
    const hasOperation = enableHashRename || enableResize || enableCompress;
    if (!hasOperation) return false;
    if (enableResize && !resizeWidth && !resizeHeight) return false;
    return true;
  }, [enableHashRename, enableResize, enableCompress, resizeWidth, resizeHeight]);

  const buildOperations = (): ImageBatchOperation[] => {
    const operations: ImageBatchOperation[] = [];

    if (enableHashRename) {
      operations.push({
        type: 'hashRename',
        algorithm: hashAlgorithm,
        prefix: hashPrefix.trim() || undefined,
        keepExtension,
      });
    }

    if (enableResize) {
      operations.push({
        type: 'resize',
        width: resizeWidth ?? undefined,
        height: resizeHeight ?? undefined,
        fit: resizeFit,
        withoutEnlargement: preventEnlarge,
      });
    }

    if (enableCompress) {
      operations.push({
        type: 'compress',
        quality: compressQuality,
        targetFormat: compressFormat,
      });
    }

    return operations;
  };

  const handleRun = () => {
    if (!canRun) {
      message.warning('请至少启用一个有效的批量操作');
      return;
    }

    const operations = buildOperations();
    onRun({
      operations,
      options: {
        overwrite,
      },
    });
  };

  return (
    <Card
      title="批量操作设置"
      extra={
        <Text type="secondary">
          {assetCount > 0 ? `已选择 ${assetCount} 张图片` : '暂无图片'}
        </Text>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Collapse bordered={false} defaultActiveKey={['hash', 'compress']}>
          <Collapse.Panel header="哈希重命名" key="hash">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Switch checked={enableHashRename} onChange={setEnableHashRename} />
              <Space wrap>
                <Text>哈希算法：</Text>
                <Select
                  value={hashAlgorithm}
                  onChange={setHashAlgorithm}
                  options={[
                    { label: 'SHA-256', value: 'sha256' },
                    { label: 'SHA-1', value: 'sha1' },
                    { label: 'MD5', value: 'md5' },
                  ]}
                  style={{ width: 160 }}
                  disabled={!enableHashRename}
                />
              </Space>
              <Input
                placeholder="可选：为文件名前增加前缀"
                value={hashPrefix}
                onChange={event => setHashPrefix(event.target.value)}
                disabled={!enableHashRename}
              />
              <Space>
                <Switch checked={keepExtension} onChange={setKeepExtension} disabled={!enableHashRename} />
                <Text>保留原始扩展名</Text>
              </Space>
            </Space>
          </Collapse.Panel>

          <Collapse.Panel header="尺寸调整" key="resize">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Switch checked={enableResize} onChange={setEnableResize} />
              <Space wrap>
                <Text>宽度 (px)：</Text>
                <InputNumber min={1} value={resizeWidth ?? undefined} onChange={value => setResizeWidth(value ?? null)} disabled={!enableResize} />
                <Text>高度 (px)：</Text>
                <InputNumber min={1} value={resizeHeight ?? undefined} onChange={value => setResizeHeight(value ?? null)} disabled={!enableResize} />
              </Space>
              <Space wrap>
                <Text>缩放模式：</Text>
                <Select
                  value={resizeFit}
                  onChange={value => setResizeFit(value)}
                  disabled={!enableResize}
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
                <Switch checked={preventEnlarge} onChange={setPreventEnlarge} disabled={!enableResize} />
                <Text>避免放大原图</Text>
              </Space>
            </Space>
          </Collapse.Panel>

          <Collapse.Panel header="压缩" key="compress">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Switch checked={enableCompress} onChange={setEnableCompress} />
              <Space wrap>
                <Text>输出格式：</Text>
                <Select
                  value={compressFormat}
                  onChange={value => setCompressFormat(value)}
                  disabled={!enableCompress}
                  style={{ width: 160 }}
                  options={[
                    { label: 'JPEG', value: 'jpeg' },
                    { label: 'PNG', value: 'png' },
                    { label: 'WebP', value: 'webp' },
                  ]}
                />
              </Space>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>压缩质量：{compressQuality}%</Text>
                <Slider
                  min={10}
                  max={100}
                  step={5}
                  value={compressQuality}
                  disabled={!enableCompress}
                  onChange={value => setCompressQuality(value as number)}
                />
              </Space>
            </Space>
          </Collapse.Panel>
        </Collapse>

        <Divider style={{ margin: '16px 0' }} />

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space>
            <Switch checked={overwrite} onChange={setOverwrite} />
            <Text>允许覆盖原文件（请谨慎操作）</Text>
          </Space>

          <Space>
            <Button type="primary" onClick={handleRun} disabled={disabled || running || !canRun} loading={running}>
              开始批量处理
            </Button>
            {running && (
              <Button danger onClick={onCancel}>
                取消任务
              </Button>
            )}
          </Space>
        </Space>
      </Space>
    </Card>
  );
}
