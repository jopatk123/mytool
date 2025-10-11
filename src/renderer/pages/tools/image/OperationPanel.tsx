import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Collapse, Divider, Space, Typography, message } from 'antd';
import type { ImageBatchOperation, ImageJobRequest, ImageRotationMode } from '@shared/types';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import { HashPanel } from './operationPanel/HashPanel';
import { ResizePanel } from './operationPanel/ResizePanel';
import { CropPanel } from './operationPanel/CropPanel';
import { CompressPanel } from './operationPanel/CompressPanel';
import { RotatePanel } from './operationPanel/RotatePanel';
import { OutputControls } from './operationPanel/OutputControls';

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
  <Collapse bordered={false} defaultActiveKey={[]}>
          {HashPanel({
            enabled: enableHashRename,
            onToggle: setEnableHashRename,
            algorithm: hashAlgorithm,
            onAlgorithmChange: setHashAlgorithm,
          })}
          {ResizePanel({
            enabled: enableResize,
            onToggle: setEnableResize,
            width: resizeWidth,
            height: resizeHeight,
            onWidthChange: setResizeWidth,
            onHeightChange: setResizeHeight,
            fit: resizeFit,
            onFitChange: value => setResizeFit(value),
            withoutEnlargement: preventEnlarge,
            onWithoutEnlargementChange: setPreventEnlarge,
          })}
          {CropPanel({
            enabled: enableCrop,
            onToggle: setEnableCrop,
            top: cropTop,
            bottom: cropBottom,
            left: cropLeft,
            right: cropRight,
            onTopChange: value => setCropTop(clampCropInput(value)),
            onBottomChange: value => setCropBottom(clampCropInput(value)),
            onLeftChange: value => setCropLeft(clampCropInput(value)),
            onRightChange: value => setCropRight(clampCropInput(value)),
          })}
          {CompressPanel({
            enabled: enableCompress,
            onToggle: setEnableCompress,
            format: compressFormat,
            onFormatChange: value => setCompressFormat(value),
            quality: compressQuality,
            onQualityChange: value => setCompressQuality(value),
          })}
          {RotatePanel({
            enabled: enableRotate,
            onToggle: setEnableRotate,
            mode: rotateMode,
            onModeChange: value => setRotateMode(value),
            angle: rotateAngle,
            onAngleChange: value => setRotateAngle(clampFixedAngle(value)),
            minAngle: rotateMinAngle,
            onMinAngleChange: value => setRotateMinAngle(clampRandomAngle(value)),
            maxAngle: rotateMaxAngle,
            onMaxAngleChange: value => setRotateMaxAngle(clampRandomAngle(value)),
            autoCrop: rotateAutoCrop,
            onAutoCropChange: setRotateAutoCrop,
          })}
        </Collapse>

        <Divider style={{ margin: '16px 0' }} />

        <OutputControls
          overwrite={effectiveOverwrite}
          onOverwriteChange={setOverwrite}
          overwriteForced={enableHashRename}
          outputDirectory={outputDirectory}
          onSelectOutputDirectory={handleSelectOutputDirectory}
          onClearOutputDirectory={handleClearOutputDirectory}
          canSelectOutputDirectory={!effectiveOverwrite}
          onRun={handleRun}
          onCancel={onCancel}
          canRun={canRun}
          disabled={disabled}
          running={running}
        />
      </Space>
    </Card>
  );
}
