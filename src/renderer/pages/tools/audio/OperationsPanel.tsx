import { useState, useMemo } from 'react';
import { App, Button, Space, Typography } from 'antd';
import {
  CustomerServiceOutlined,
  ScissorOutlined,
  RetweetOutlined,
  ThunderboltOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import { createLogger } from '@shared/utils/logger';
import { selectCurrentFiles, useAudioToolStore } from './store';
import { ConvertModal } from './ConvertModal';
import { TrimModal } from './TrimModal';
import { BatchModal } from './BatchModal';
import { MergeModal } from './MergeModal';

const logger = createLogger('AudioOperationsPanel');

export function OperationsPanel() {
  const { message } = App.useApp();
  const electronAPI = useElectronAPI();
  const selectedFiles = useAudioToolStore(selectCurrentFiles);
  const isProcessing = useAudioToolStore((state) => state.isProcessing);
  const setPreview = useAudioToolStore((state) => state.setPreview);
  const setError = useAudioToolStore((state) => state.setError);
  const setIsProcessing = useAudioToolStore((state) => state.setIsProcessing);

  const [convertVisible, setConvertVisible] = useState(false);
  const [trimVisible, setTrimVisible] = useState(false);
  const [batchVisible, setBatchVisible] = useState(false);
  const [mergeVisible, setMergeVisible] = useState(false);

  const selectionSummary = useMemo(() => {
    if (selectedFiles.length === 0) return '未选择音频';
    if (selectedFiles.length === 1) return selectedFiles[0].name;
    return `已选择 ${selectedFiles.length} 个音频`;
  }, [selectedFiles]);

  const handlePreview = async () => {
    if (selectedFiles.length === 0) {
      message.warning('请先选择一个音频文件');
      return;
    }

    if (selectedFiles.length > 1) {
      message.warning('预览时仅支持选择一个音频文件');
      return;
    }

    try {
      setIsProcessing(true);
      const preview = await electronAPI.previewAudio({ sourcePath: selectedFiles[0].path });
      setError(null);
      setPreview(preview);
      message.success('预览就绪');
    } catch (error) {
      const description = error instanceof Error ? error.message : String(error);
      setError(description);
      logger.error('Audio preview failed', error);
      message.error(`预览失败: ${description}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }} align="center">
        <Typography.Text type="secondary">{selectionSummary}</Typography.Text>
        <Button
          icon={<RetweetOutlined />}
          disabled={selectedFiles.length === 0}
          onClick={() => setConvertVisible(true)}
        >
          格式转换
        </Button>
        <Button
          icon={<ScissorOutlined />}
          disabled={selectedFiles.length === 0}
          onClick={() => setTrimVisible(true)}
        >
          裁剪
        </Button>
        <Button
          icon={<ThunderboltOutlined />}
          disabled={selectedFiles.length === 0}
          onClick={() => setBatchVisible(true)}
        >
          批量处理
        </Button>
        <Button
          icon={<CustomerServiceOutlined />}
          disabled={selectedFiles.length < 2}
          onClick={() => setMergeVisible(true)}
        >
          合并
        </Button>
        <Button
          icon={<PlayCircleOutlined />}
          disabled={selectedFiles.length === 0 || isProcessing}
          onClick={handlePreview}
        >
          预览
        </Button>
      </Space>

      <ConvertModal open={convertVisible} onClose={() => setConvertVisible(false)} />
      <TrimModal open={trimVisible} onClose={() => setTrimVisible(false)} />
      <BatchModal open={batchVisible} onClose={() => setBatchVisible(false)} />
      <MergeModal open={mergeVisible} onClose={() => setMergeVisible(false)} />
    </>
  );
}
