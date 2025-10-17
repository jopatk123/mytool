import { CodeOutlined, ScissorOutlined, ZoomInOutlined } from '@ant-design/icons';
import { createLogger } from '@shared/utils/logger';
import { Button, Form, InputNumber, Select, Space, Tooltip } from 'antd';
import { useVideoToolStore } from './store';

const logger = createLogger('OperationsPanel');

/**
 * 操作面板组件
 */
export function OperationsPanel() {
  const scanResult = useVideoToolStore((state) => state.scanResult);
  const setError = useVideoToolStore((state) => state.setError);
  const [form] = Form.useForm();

  const videoFiles = scanResult?.videos || [];
  const hasVideos = videoFiles.length > 0;

  const handleConvert = async () => {
    if (!hasVideos) {
      setError('没有可用的视频文件');
      return;
    }

    try {
      logger.info('Converting videos');
      // 这里可以集成实际的视频转换逻辑
      setError(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '转换失败';
      setError(errorMsg);
      logger.error('Failed to convert videos', { error });
    }
  };

  const handleTrim = async () => {
    if (!hasVideos) {
      setError('没有可用的视频文件');
      return;
    }

    try {
      logger.info('Trimming videos');
      // 这里可以集成实际的视频裁剪逻辑
      setError(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '裁剪失败';
      setError(errorMsg);
      logger.error('Failed to trim videos', { error });
    }
  };

  const handleExtractFrames = async () => {
    if (!hasVideos) {
      setError('没有可用的视频文件');
      return;
    }

    try {
      logger.info('Extracting frames');
      // 这里可以集成实际的帧提取逻辑
      setError(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '提取失败';
      setError(errorMsg);
      logger.error('Failed to extract frames', { error });
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        <Space>
          <Tooltip title="转换视频格式">
            <Button
              icon={<CodeOutlined />}
              onClick={handleConvert}
              disabled={!hasVideos}
            >
              格式转换
            </Button>
          </Tooltip>

          <Tooltip title="裁剪视频">
            <Button
              icon={<ScissorOutlined />}
              onClick={handleTrim}
              disabled={!hasVideos}
            >
              视频裁剪
            </Button>
          </Tooltip>

          <Tooltip title="提取视频帧">
            <Button
              icon={<ZoomInOutlined />}
              onClick={handleExtractFrames}
              disabled={!hasVideos}
            >
              提取帧
            </Button>
          </Tooltip>
        </Space>
      </div>

      <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <Form form={form} layout="inline">
          <Form.Item label="格式" name="format">
            <Select style={{ width: 120 }} placeholder="选择格式">
              <Select.Option value="mp4">MP4</Select.Option>
              <Select.Option value="mkv">MKV</Select.Option>
              <Select.Option value="webm">WebM</Select.Option>
              <Select.Option value="mov">MOV</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="质量" name="quality">
            <Select style={{ width: 120 }} placeholder="选择质量">
              <Select.Option value="low">低</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="high">高</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="帧间隔" name="interval">
            <InputNumber min={0.5} max={10} placeholder="秒" />
          </Form.Item>
        </Form>
      </div>
    </Space>
  );
}
