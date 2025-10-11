import { useState } from 'react';
import { App, Form, Input, Modal, Select } from 'antd';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import { createLogger } from '@shared/utils/logger';
import { selectCurrentFiles, useAudioToolStore } from './store';

const logger = createLogger('AudioMergeModal');

const FORMAT_OPTIONS = [
  { label: '自动推断', value: '' },
  { label: 'MP3', value: 'mp3' },
  { label: 'WAV', value: 'wav' },
  { label: 'FLAC', value: 'flac' },
  { label: 'AAC', value: 'aac' },
];

interface MergeModalProps {
  open: boolean;
  onClose: () => void;
}

interface MergeFormValues {
  format?: string;
  outputFileName?: string;
}

export function MergeModal({ open, onClose }: MergeModalProps) {
  const [form] = Form.useForm<MergeFormValues>();
  const [loading, setLoading] = useState(false);
  const electronAPI = useElectronAPI();
  const { message } = App.useApp();
  const selectedFiles = useAudioToolStore(selectCurrentFiles);
  const setIsProcessing = useAudioToolStore((state) => state.setIsProcessing);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (selectedFiles.length < 2) {
        message.warning('合并操作至少需要选择两个音频文件');
        return;
      }

      setLoading(true);
      setIsProcessing(true);

      await electronAPI.mergeAudio({
        sourcePaths: selectedFiles.map((file) => file.path),
        options: {
          format: values.format || undefined,
          outputFileName: values.outputFileName?.trim() || undefined,
        },
      });

      message.success('合并完成');
      onClose();
    } catch (error) {
      if ((error as { errorFields?: unknown[] })?.errorFields) {
        return;
      }
      const description = error instanceof Error ? error.message : String(error);
      logger.error('Audio merge failed', error);
      message.error(`合并失败: ${description}`);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      title="音频合并"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ format: '' }}>
        <Form.Item name="format" label="输出格式">
          <Select options={FORMAT_OPTIONS} />
        </Form.Item>
        <Form.Item name="outputFileName" label="输出文件名" tooltip="可选，默认自动生成">
          <Input placeholder="例如 merged-take1" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
