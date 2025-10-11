import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Collapse,
  Divider,
  InputNumber,
  Select,
  Slider,
  Space,
  Switch,
  Typography,
  Radio,
  message,
} from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import type { ImageBatchOperation, ImageJobRequest, ImageRotationMode } from '@shared/types';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';

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
  const electronAPI = useElectronAPI();
  
  const [enableHashRename, setEnableHashRename] = useState(false);
  const [hashAlgorithm, setHashAlgorithm] = useState<HashRenameOperation['algorithm']>('sha256');

  const [enableResize, setEnableResize] = useState(false);
  const [resizeWidth, setResizeWidth] = useState<number | null>(null);
  const [resizeHeight, setResizeHeight] = useState<number | null>(null);
  const [resizeFit, setResizeFit] = useState<'cover' | 'contain' | 'inside' | 'outside' | 'fill'>('inside');
  const [preventEnlarge, setPreventEnlarge] = useState(true);

  const [enableCompress, setEnableCompress] = useState(false);
  const [compressQuality, setCompressQuality] = useState(80);
  const [compressFormat, setCompressFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');

  const [enableCrop, setEnableCrop] = useState(false);
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropRight, setCropRight] = useState(0);

  const [enableRotate, setEnableRotate] = useState(false);
  const [rotateMode, setRotateMode] = useState<ImageRotationMode>('fixed');
  const [rotateAngle, setRotateAngle] = useState(0);
  const [rotateMinAngle, setRotateMinAngle] = useState(-5);
  const [rotateMaxAngle, setRotateMaxAngle] = useState(5);
  const [rotateAutoCrop, setRotateAutoCrop] = useState(false);

  const [overwrite, setOverwrite] = useState(false);
  const [outputDirectory, setOutputDirectory] = useState<string | null>(null);
  const effectiveOverwrite = enableHashRename ? true : overwrite;

  const clampCropInput = useCallback((value: number | null | undefined): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  }, []);

  const clampFixedAngle = useCallback((value: number | null | undefined): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }
    return Math.max(-360, Math.min(360, value));
  }, []);

  const clampRandomAngle = useCallback((value: number | null | undefined): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }
    return Math.max(-10, Math.min(10, value));
  }, []);

  useEffect(() => {
    if (!enableHashRename) {
      return;
    }
    if (!overwrite) {
      setOverwrite(true);
    }
    if (outputDirectory) {
      setOutputDirectory(null);
      message.info('启用哈希刷新后已禁用自定义输出目录，处理结果将覆盖原文件。');
    }
  }, [enableHashRename, overwrite, outputDirectory]);

  const canRun = useMemo(() => {
    const cropValues = [cropTop, cropBottom, cropLeft, cropRight].map(value => clampCropInput(value));
    const hasCrop = enableCrop && cropValues.some(value => value > 0);

    const randomMin = clampRandomAngle(rotateMinAngle);
    const randomMax = clampRandomAngle(rotateMaxAngle);
    const randomRangeValid = randomMin <= randomMax;

    const hasOperation = enableHashRename || enableResize || enableCompress || hasCrop || enableRotate;
    if (!hasOperation) {
      return false;
    }

    if (enableResize && !resizeWidth && !resizeHeight) {
      return false;
    }

    if (enableCrop && !hasCrop) {
      return false;
    }

    if (enableRotate && rotateMode === 'random' && !randomRangeValid) {
      return false;
    }

    return true;
  }, [
    clampCropInput,
    clampRandomAngle,
    cropBottom,
    cropLeft,
    cropRight,
    cropTop,
    enableCompress,
    enableCrop,
    enableHashRename,
    enableResize,
    enableRotate,
    resizeHeight,
    resizeWidth,
    rotateMaxAngle,
    rotateMinAngle,
    rotateMode,
  ]);

  const handleSelectOutputDirectory = async () => {
    try {
      const result = await electronAPI.selectFile({ properties: ['openDirectory'] });
      if (result && result.length > 0) {
        setOutputDirectory(result[0]);
        message.success(`已选择输出目录: ${result[0]}`);
      }
    } catch {
      message.error('选择输出目录失败');
    }
  };

  const handleClearOutputDirectory = () => {
    setOutputDirectory(null);
    message.info('已清除输出目录设置');
  };

  const buildOperations = (): ImageBatchOperation[] => {
    const operations: ImageBatchOperation[] = [];

    if (enableHashRename) {
      operations.push({
        type: 'hashRename',
        algorithm: hashAlgorithm,
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

    if (enableCrop) {
      const top = clampCropInput(cropTop);
      const bottom = clampCropInput(cropBottom);
      const left = clampCropInput(cropLeft);
      const right = clampCropInput(cropRight);
      const hasCrop = top > 0 || bottom > 0 || left > 0 || right > 0;
      if (hasCrop) {
        operations.push({
          type: 'crop',
          pixels: {
            top: top > 0 ? top : undefined,
            bottom: bottom > 0 ? bottom : undefined,
            left: left > 0 ? left : undefined,
            right: right > 0 ? right : undefined,
          },
        });
      }
    }

    if (enableRotate) {
      if (rotateMode === 'fixed') {
        operations.push({
          type: 'rotate',
          mode: 'fixed',
          angle: clampFixedAngle(rotateAngle),
          autoCrop: rotateAutoCrop,
        });
      } else {
        const minAngle = clampRandomAngle(rotateMinAngle);
        const maxAngle = clampRandomAngle(rotateMaxAngle);
        const resolvedMin = Math.min(minAngle, maxAngle);
        const resolvedMax = Math.max(minAngle, maxAngle);
        operations.push({
          type: 'rotate',
          mode: 'random',
          minAngle: resolvedMin,
          maxAngle: resolvedMax,
          autoCrop: rotateAutoCrop,
        });
      }
    }

    return operations;
  };

  const handleRun = () => {
    if (!canRun) {
      message.warning('请至少启用一个有效的批量操作');
      return;
    }

    // 如果未勾选覆盖且未选择输出目录，提示用户
    if (!effectiveOverwrite && !outputDirectory) {
      message.info('将在原目录生成新文件');
    }

    const operations = buildOperations();
    if (operations.length === 0) {
      message.warning('请至少启用一个有效的批量操作');
      return;
    }
    onRun({
      operations,
      options: {
        overwrite: effectiveOverwrite,
        outputDirectory: enableHashRename ? null : outputDirectory,
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
        <Collapse bordered={false} defaultActiveKey={['hash', 'compress', 'rotate']}>
          <Collapse.Panel header="哈希刷新" key="hash">
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
              <Text type="secondary">此操作会直接覆盖原文件，仅刷新其哈希值。</Text>
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

          <Collapse.Panel header="裁剪" key="crop">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Switch checked={enableCrop} onChange={setEnableCrop} />
              <Text type="secondary">为需要裁剪的方向输入像素值（px），未填写或为 0 的方向将保持不变。</Text>
              <Space wrap style={{ width: '100%' }}>
                <Space>
                  <Text>顶部：</Text>
                  <InputNumber min={0} value={cropTop} onChange={value => setCropTop(clampCropInput(value))} disabled={!enableCrop} />
                </Space>
                <Space>
                  <Text>底部：</Text>
                  <InputNumber min={0} value={cropBottom} onChange={value => setCropBottom(clampCropInput(value))} disabled={!enableCrop} />
                </Space>
                <Space>
                  <Text>左侧：</Text>
                  <InputNumber min={0} value={cropLeft} onChange={value => setCropLeft(clampCropInput(value))} disabled={!enableCrop} />
                </Space>
                <Space>
                  <Text>右侧：</Text>
                  <InputNumber min={0} value={cropRight} onChange={value => setCropRight(clampCropInput(value))} disabled={!enableCrop} />
                </Space>
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

          <Collapse.Panel header="旋转" key="rotate">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Switch checked={enableRotate} onChange={setEnableRotate} />
              <Space wrap align="center">
                <Text>模式：</Text>
                <Radio.Group
                  value={rotateMode}
                  onChange={event => setRotateMode(event.target.value as ImageRotationMode)}
                  disabled={!enableRotate}
                >
                  <Radio.Button value="fixed">固定角度</Radio.Button>
                  <Radio.Button value="random">随机角度</Radio.Button>
                </Radio.Group>
              </Space>
              {rotateMode === 'fixed' ? (
                <Space wrap>
                  <Text>角度 (°)：</Text>
                  <InputNumber
                    min={-360}
                    max={360}
                    step={1}
                    value={rotateAngle}
                    onChange={value => setRotateAngle(clampFixedAngle(value))}
                    disabled={!enableRotate}
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
                      value={rotateMinAngle}
                      onChange={value => setRotateMinAngle(clampRandomAngle(value))}
                      disabled={!enableRotate}
                    />
                  </Space>
                  <Space wrap>
                    <Text>最大角度 (°)：</Text>
                    <InputNumber
                      min={-10}
                      max={10}
                      step={0.5}
                      value={rotateMaxAngle}
                      onChange={value => setRotateMaxAngle(clampRandomAngle(value))}
                      disabled={!enableRotate}
                    />
                  </Space>
                  <Text type="secondary">随机角度范围限定在 -10° 到 10°，每张图片会应用区间内的随机角度。</Text>
                </Space>
              )}
              <Space>
                <Switch checked={rotateAutoCrop} onChange={setRotateAutoCrop} disabled={!enableRotate} />
                <Text>自动裁剪旋转后的空白区域</Text>
              </Space>
            </Space>
          </Collapse.Panel>
        </Collapse>

        <Divider style={{ margin: '16px 0' }} />

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space>
            <Switch checked={effectiveOverwrite} onChange={setOverwrite} disabled={enableHashRename} />
            <Text>允许覆盖原文件（哈希刷新时将强制启用）</Text>
          </Space>

          {!effectiveOverwrite && (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary">输出目录（可选）：</Text>
              <Space style={{ width: '100%' }}>
                <Button 
                  icon={<FolderOpenOutlined />} 
                  onClick={handleSelectOutputDirectory}
                  disabled={effectiveOverwrite}
                >
                  选择输出目录
                </Button>
                {outputDirectory && (
                  <Button onClick={handleClearOutputDirectory}>
                    清除
                  </Button>
                )}
              </Space>
              {outputDirectory && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  当前输出目录: {outputDirectory}
                </Text>
              )}
              {!outputDirectory && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  未选择输出目录时，将在原图片所在目录生成新文件
                </Text>
              )}
            </Space>
          )}

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
