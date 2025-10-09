import { useState } from 'react';
import { Card, Button, List, Space, Typography, Input, message, Tag } from 'antd';
import { FolderOutlined, FileOutlined } from '@ant-design/icons';
import { formatFileSize, formatDate } from '@shared/utils/helpers';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';

const { Title, Text } = Typography;

interface FileItem {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  lastModified: number;
}

function FileTool() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [renamePattern, setRenamePattern] = useState<string>('');
  const electronAPI = useElectronAPI();

  const handleSelectFiles = async () => {
    try {
      const paths = await electronAPI.selectFile({
        properties: ['openFile', 'multiSelections'],
      });

      if (paths && paths.length > 0) {
        // 这里需要获取文件详细信息
        const fileItems: FileItem[] = paths.map((path, index) => ({
          name: path.split('/').pop() || '',
          path,
          size: Math.random() * 1024 * 1024, // 模拟数据
          isDirectory: false,
          lastModified: Date.now() - index * 1000000,
        }));
        
        setFiles(fileItems);
        message.success(`已选择 ${paths.length} 个文件`);
      }
    } catch (error) {
      message.error('选择文件失败');
      console.error('Select files error:', error);
    }
  };

  const handleBatchRename = async () => {
    if (files.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    if (!renamePattern) {
      message.warning('请输入重命名规则');
      return;
    }

    try {
      message.loading({ content: '正在重命名...', key: 'rename' });
      
      // 调用 Electron API 进行批量重命名
      const result = await electronAPI.executeTool('file-tool', {
        action: 'batchRename',
        files: files.map(f => f.path),
        pattern: renamePattern,
      });

      message.success({ content: '重命名完成！', key: 'rename' });
      console.log('Rename result:', result);
    } catch (error) {
      message.error({ content: '重命名失败', key: 'rename' });
      console.error('Rename error:', error);
    }
  };

  return (
    <div>
      <Title level={2}>文件工具</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="选择文件">
          <Space>
            <Button
              type="primary"
              icon={<FolderOutlined />}
              onClick={handleSelectFiles}
            >
              选择文件
            </Button>
            <Text type="secondary">
              已选择 {files.length} 个文件
            </Text>
          </Space>
        </Card>

        {files.length > 0 && (
          <>
            <Card title="文件列表">
              <List
                dataSource={files}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={item.isDirectory ? <FolderOutlined /> : <FileOutlined />}
                      title={item.name}
                      description={
                        <Space>
                          <Tag>{formatFileSize(item.size)}</Tag>
                          <Text type="secondary">{formatDate(item.lastModified)}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            <Card title="批量重命名">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>重命名规则：</Text>
                  <Input
                    placeholder="例如：file_{n} 或 {name}_备份"
                    value={renamePattern}
                    onChange={(e) => setRenamePattern(e.target.value)}
                    style={{ width: '100%', marginTop: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    提示：{'{n}'} 表示序号，{'{name}'} 表示原文件名
                  </Text>
                </div>
                <Button type="primary" onClick={handleBatchRename}>
                  批量重命名
                </Button>
              </Space>
            </Card>
          </>
        )}
      </Space>
    </div>
  );
}

export default FileTool;
