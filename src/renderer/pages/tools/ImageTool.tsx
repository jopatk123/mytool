import { useState } from 'react';
import { Card, Upload, Button, Space, Typography, Select, InputNumber, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';

const { Title, Text } = Typography;
const { Dragger } = Upload;

function ImageTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [format, setFormat] = useState<string>('jpeg');
  const [quality, setQuality] = useState<number>(80);
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const electronAPI = useElectronAPI();

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: 'image/*',
    beforeUpload: (file) => {
      setSelectedFile(file);
      return false;
    },
    onRemove: () => {
      setSelectedFile(null);
    },
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      message.warning('请先选择图片文件');
      return;
    }

    try {
      message.loading({ content: '正在处理...', key: 'process' });
      
      // 调用 Electron API 处理图片
      const result = await electronAPI.processImage(selectedFile.path, {
        format,
        quality,
        resize: width || height ? { width, height } : undefined,
      });

      message.success({ content: '处理完成！', key: 'process' });
      console.log('Process result:', result);
    } catch (error) {
      message.error({ content: '处理失败', key: 'process' });
      console.error('Process error:', error);
    }
  };

  return (
    <div>
      <Title level={2}>图片处理工具</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="上传图片">
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽图片到此区域上传</p>
            <p className="ant-upload-hint">
              支持 JPG、PNG、WebP、GIF、BMP 等格式
            </p>
          </Dragger>
        </Card>

        {selectedFile && (
          <Card title="处理选项">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>输出格式：</Text>
                <Select
                  value={format}
                  onChange={setFormat}
                  style={{ width: 200, marginLeft: 16 }}
                  options={[
                    { label: 'JPEG', value: 'jpeg' },
                    { label: 'PNG', value: 'png' },
                    { label: 'WebP', value: 'webp' },
                  ]}
                />
              </div>

              <div>
                <Text strong>质量（1-100）：</Text>
                <InputNumber
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(val) => setQuality(val || 80)}
                  style={{ width: 200, marginLeft: 16 }}
                />
              </div>

              <div>
                <Text strong>调整尺寸：</Text>
                <Space style={{ marginLeft: 16 }}>
                  <InputNumber
                    placeholder="宽度"
                    value={width}
                    onChange={setWidth}
                    style={{ width: 120 }}
                  />
                  <span>×</span>
                  <InputNumber
                    placeholder="高度"
                    value={height}
                    onChange={setHeight}
                    style={{ width: 120 }}
                  />
                </Space>
              </div>

              <Button type="primary" size="large" onClick={handleProcess}>
                开始处理
              </Button>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
}

export default ImageTool;
