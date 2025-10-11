import { useState } from 'react';
import { App, Form, Input, InputNumber, Modal, Select, Switch, Space, Typography } from 'antd';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import { createLogger } from '@shared/utils/logger';
import { selectCurrentFiles, useAudioToolStore } from './store';

const logger = createLogger('AudioBatchModal');

const FORMAT_OPTIONS = [
  { label: 'MP3', value: 'mp3' },
  { label: 'WAV', value: 'wav' },
  { label: 'FLAC', value: 'flac' },
  { label: 'AAC', value: 'aac' },
  { label: 'OGG', value: 'ogg' },
];

interface BatchModalProps {
  open: boolean;
  onClose: () => void;
}

interface BatchFormValues {
  convertTargetFormat?: string;
  convertBitrate?: string;
  convertSampleRate?: number;
  convertChannels?: number;
  trimStart?: number;
  trimDuration?: number;
}

export function BatchModal({ open, onClose }: BatchModalProps) {
  const [form] = Form.useForm<BatchFormValues>();
  const [convertEnabled, setConvertEnabled] = useState(true);
  const [trimEnabled, setTrimEnabled] = useState(false);
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

      if (!convertEnabled && !trimEnabled) {
        message.warning('请至少启用一个批量操作');
        return;
      }

      setLoading(true);
      setIsProcessing(true);

      const tasks = selectedFiles.map((file) => {
        const operations: Array<
          | { type: 'convert'; options: { targetFormat: string; bitrate?: string; sampleRate?: number; channels?: number } }
          | { type: 'trim'; options: { startTime: number; duration?: number } }
        > = [];

        if (convertEnabled && values.convertTargetFormat) {
          operations.push({
            type: 'convert',
            options: {
              targetFormat: values.convertTargetFormat,
              bitrate: values.convertBitrate,
              sampleRate: values.convertSampleRate,
              channels: values.convertChannels,
            },
          });
        }

        if (trimEnabled && typeof values.trimStart === 'number') {
          operations.push({
            type: 'trim',
            options: {
              startTime: values.trimStart,
              duration: values.trimDuration,
            },
          });
        }

        return {
          sourcePath: file.path,
          operations,
        };
      }).filter((task) => task.operations.length > 0);

      if (tasks.length === 0) {
        message.warning('请至少配置一个有效的批处理操作');
        return;
      }

      await electronAPI.batchProcessAudio({ tasks });
      message.success('批量处理已完成');
      onClose();
    } catch (error) {
      if ((error as { errorFields?: unknown[] })?.errorFields) {
        return;
      }
      const description = error instanceof Error ? error.message : String(error);
      logger.error('Audio batch processing failed', error);
      message.error(`批处理失败: ${description}`);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      title="批量处理"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space align="center">
          <Switch checked={convertEnabled} onChange={setConvertEnabled} />
          <Typography.Text strong>格式转换</Typography.Text>
        </Space>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ convertTargetFormat: 'mp3', trimStart: 0 }}
        >
          {convertEnabled && (
            <div style={{ border: '1px solid #f0f0f0', padding: 16, borderRadius: 8 }}>
              <Form.Item
                name="convertTargetFormat"
                label="目标格式"
                rules={[{ required: true, message: '请选择目标格式' }]}
              >
                <Select options={FORMAT_OPTIONS} />
              </Form.Item>
              <Form.Item name="convertBitrate" label="比特率 (如 192k)">
                <Input placeholder="可选" />
              </Form.Item>
              <Form.Item name="convertSampleRate" label="采样率 (Hz)">
                <InputNumber min={8000} max={192000} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="convertChannels" label="声道数">
                <InputNumber min={1} max={8} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          )}

          <Space align="center" style={{ marginTop: 16 }}>
            <Switch checked={trimEnabled} onChange={setTrimEnabled} />
            <Typography.Text strong>裁剪</Typography.Text>
          </Space>

          {trimEnabled && (
            <div style={{ border: '1px solid #f0f0f0', padding: 16, borderRadius: 8 }}>
              <Form.Item
                name="trimStart"
                label="开始时间 (秒)"
                rules={[{ required: true, message: '请输入开始时间' }]}
              >
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="trimDuration" label="持续时间 (秒)">
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          )}
        </Form>
      </Space>
    </Modal>
  );
}
