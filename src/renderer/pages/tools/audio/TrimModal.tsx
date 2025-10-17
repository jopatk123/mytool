import { useState } from 'react';
import { App, Form, InputNumber, Input, Modal, Select } from 'antd';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import { createLogger } from '@shared/utils/logger';
import { selectCurrentFiles, useAudioToolStore } from './store';

const logger = createLogger('AudioTrimModal');

const FORMAT_OPTIONS = [
  { label: '保持原格式', value: '' },
  { label: 'MP3', value: 'mp3' },
  { label: 'WAV', value: 'wav' },
  { label: 'FLAC', value: 'flac' },
];

interface TrimModalProps {
  open: boolean;
  onClose: () => void;
}

interface TrimFormValues {
  startTime: number;
  endTime?: number;
  duration?: number;
  targetFormat?: string;
}

export function TrimModal({ open, onClose }: TrimModalProps) {
  const [form] = Form.useForm<TrimFormValues>();
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

      if (!values.endTime && !values.duration) {
        message.warning('请设置结束时间或持续时间');
        return;
      }

      setLoading(true);
      setIsProcessing(true);

      for (const file of selectedFiles) {
        await electronAPI.trimAudio({
          sourcePath: file.path,
          options: {
            startTime: values.startTime,
            endTime: values.endTime,
            duration: values.duration,
            targetFormat: values.targetFormat || undefined,
          },
        });
      }

      message.success('裁剪完成');
      onClose();
    } catch (error) {
      if ((error as { errorFields?: unknown[] })?.errorFields) {
        return;
      }
      const description = error instanceof Error ? error.message : String(error);
      logger.error('Audio trim failed', error);
      message.error(`裁剪失败: ${description}`);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      title="音频裁剪"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ startTime: 0, targetFormat: '' }}>
        <Form.Item
          name="startTime"
          label="开始时间 (秒)"
          rules={[{ required: true, message: '请填写开始时间' }]}
        >
          <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="endTime" label="结束时间 (秒)" tooltip="可选，与持续时间二选一">
          <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="duration" label="持续时间 (秒)" tooltip="可选，与结束时间二选一">
          <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="targetFormat" label="输出格式">
          <Select options={FORMAT_OPTIONS} />
        </Form.Item>
        <Form.Item label="输出文件名后缀" tooltip="可选，默认将附加 -trimmed">
          <Input disabled placeholder="暂不支持自定义" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
