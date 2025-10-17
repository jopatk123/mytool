import { useState } from 'react';
import { App, Form, Input, InputNumber, Modal, Select } from 'antd';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import { createLogger } from '@shared/utils/logger';
import { selectCurrentFiles, useAudioToolStore } from './store';

const logger = createLogger('AudioConvertModal');

const FORMAT_OPTIONS = [
  { label: 'MP3', value: 'mp3' },
  { label: 'WAV', value: 'wav' },
  { label: 'FLAC', value: 'flac' },
  { label: 'AAC', value: 'aac' },
  { label: 'OGG', value: 'ogg' },
];

interface ConvertModalProps {
  open: boolean;
  onClose: () => void;
}

interface ConvertFormValues {
  targetFormat: string;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
}

export function ConvertModal({ open, onClose }: ConvertModalProps) {
  const [form] = Form.useForm<ConvertFormValues>();
  const [loading, setLoading] = useState(false);
  const electronAPI = useElectronAPI();
  const { message } = App.useApp();
  const selectedFiles = useAudioToolStore(selectCurrentFiles);
  const setIsProcessing = useAudioToolStore((state) => state.setIsProcessing);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (selectedFiles.length === 0) {
        message.warning('请先选择至少一个音频文件');
        return;
      }

      setLoading(true);
      setIsProcessing(true);

      for (const file of selectedFiles) {
        await electronAPI.convertAudio({
          sourcePath: file.path,
          options: {
            targetFormat: values.targetFormat,
            bitrate: values.bitrate,
            sampleRate: values.sampleRate,
            channels: values.channels,
          },
        });
      }

      message.success('格式转换完成');
      onClose();
    } catch (error) {
      if ((error as { errorFields?: unknown[] })?.errorFields) {
        return;
      }
      const description = error instanceof Error ? error.message : String(error);
      logger.error('Audio conversion failed', error);
      message.error(`转换失败: ${description}`);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      title="格式转换"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ targetFormat: 'mp3' }}>
        <Form.Item
          name="targetFormat"
          label="目标格式"
          rules={[{ required: true, message: '请选择目标格式' }]}
        >
          <Select options={FORMAT_OPTIONS} />
        </Form.Item>
        <Form.Item name="bitrate" label="比特率 (如 192k)" tooltip="可选，示例：128k 或 192k">
          <Input placeholder="例如 192k" />
        </Form.Item>
        <Form.Item name="sampleRate" label="采样率 (Hz)">
          <InputNumber min={8000} max={192000} style={{ width: '100%' }} placeholder="例如 44100" />
        </Form.Item>
        <Form.Item name="channels" label="声道数">
          <InputNumber min={1} max={8} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
