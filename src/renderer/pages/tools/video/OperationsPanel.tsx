import { CodeOutlined, CompressOutlined, ScissorOutlined, ZoomInOutlined } from '@ant-design/icons';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import type { VideoCompressRequest } from '@shared/types/video';
import { createLogger } from '@shared/utils/logger';
import { Button, Form, InputNumber, Modal, Select, Space, Tooltip, message } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { useVideoToolStore } from './store';

const logger = createLogger('OperationsPanel');

/**
 * 操作面板组件
 */
export function OperationsPanel() {
  const scanResult = useVideoToolStore((state) => state.scanResult);
  const setError = useVideoToolStore((state) => state.setError);
  const [form] = Form.useForm();
  const electronAPI = useElectronAPI();

  const [isCompressModalVisible, setIsCompressModalVisible] = useState(false);
  const [selectedVideoPath, setSelectedVideoPath] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);

  const videoFiles = useMemo(() => scanResult?.videos || [], [scanResult?.videos]);
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

  const handleShowCompressModal = useCallback(() => {
    if (!hasVideos) {
      setError('没有可用的视频文件');
      return;
    }
    // 设置第一个视频为默认选择
    if (videoFiles.length > 0) {
      setSelectedVideoPath(videoFiles[0].path);
    }
    setIsCompressModalVisible(true);
  }, [hasVideos, setError, videoFiles]);

  const handleCompressModalCancel = () => {
    setIsCompressModalVisible(false);
    form.resetFields();
  };

  const handleCompressModalOk = useCallback(async () => {
    if (!selectedVideoPath) {
      message.error('请选择要压缩的视频文件');
      return;
    }

    try {
      form.validateFields().then(async (values) => {
        setIsCompressing(true);

        // 获取输出路径
        const outputPath = await electronAPI.saveFile({
          title: '选择压缩视频保存位置',
          filters: [
            { name: '视频文件', extensions: ['mp4', 'mkv', 'webm'] },
            { name: '所有文件', extensions: ['*'] },
          ],
        });

        if (!outputPath) {
          setIsCompressing(false);
          return;
        }

        const compressRequest: VideoCompressRequest = {
          inputPath: selectedVideoPath,
          outputPath,
          quality: values.quality || 'medium',
          targetBitrate: values.bitrate,
          format: 'mp4',
        };

        const result = await electronAPI.executeTool('video-tool', {
          action: 'compress',
          ...compressRequest,
        });

        if (result && typeof result === 'object' && 'success' in result) {
          const compressResult = result as { message?: string };
          message.success(compressResult.message || '压缩成功');
          setIsCompressModalVisible(false);
          form.resetFields();
        }
      }).catch(() => {
        // 表单验证失败
      }).finally(() => {
        setIsCompressing(false);
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '压缩失败';
      setError(errorMsg);
      logger.error('Failed to compress video', { error });
      setIsCompressing(false);
    }
  }, [selectedVideoPath, form, electronAPI, setError]);

  return (
    <>
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

            <Tooltip title="压缩视频">
              <Button
                icon={<CompressOutlined />}
                onClick={handleShowCompressModal}
                disabled={!hasVideos}
              >
                压缩视频
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

      <Modal
        title="视频压缩"
        open={isCompressModalVisible}
        onOk={handleCompressModalOk}
        onCancel={handleCompressModalCancel}
        okText="开始压缩"
        cancelText="取消"
        confirmLoading={isCompressing}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Form form={form} layout="vertical">
            <Form.Item
              label="选择视频文件"
              name="videoPath"
              rules={[{ required: true, message: '请选择视频文件' }]}
            >
              <Select
                placeholder="选择要压缩的视频文件"
                value={selectedVideoPath}
                onChange={setSelectedVideoPath}
              >
                {videoFiles.map((video) => (
                  <Select.Option key={video.path} value={video.path}>
                    {video.name} ({(video.size / 1024 / 1024).toFixed(2)} MB)
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="压缩质量"
              name="quality"
              initialValue="medium"
              rules={[{ required: true, message: '请选择压缩质量' }]}
            >
              <Select placeholder="选择压缩质量">
                <Select.Option value="low">低 (500 kbps - 快速)</Select.Option>
                <Select.Option value="medium">中 (1000 kbps - 平衡)</Select.Option>
                <Select.Option value="high">高 (2500 kbps - 高质量)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="目标比特率 (kbps，可选)"
              name="bitrate"
              tooltip="留空使用根据质量等级推荐的比特率"
            >
              <InputNumber min={100} max={10000} placeholder="如: 800" />
            </Form.Item>
          </Form>

          <div style={{ padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '4px', fontSize: '12px' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>提示:</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>低质量适合快速处理和小文件</li>
              <li>中质量提供较好的平衡</li>
              <li>高质量保持最佳视觉效果</li>
            </ul>
          </div>
        </Space>
      </Modal>
    </>
  );
}
