import { PlayCircleOutlined } from '@ant-design/icons';
import type { VideoFileInfo } from '@shared/types/video';
import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback } from 'react';
import { useVideoToolStore } from './store';

/**
 * 视频文件列表表格
 */
export function VideoFileTable() {
  const scanResult = useVideoToolStore((state) => state.scanResult);
  const setPreview = useVideoToolStore((state) => state.setPreview);

  const toLocalFileUrl = useCallback((filePath: string) => `local-file://${encodeURIComponent(filePath)}`, []);

  const handlePreview = useCallback((record: VideoFileInfo) => {
    const fileUrl = toLocalFileUrl(record.path);
    setPreview({
      fileUrl,
      fileName: record.name,
      fileInfo: record,
    });
  }, [setPreview, toLocalFileUrl]);

  const columns: ColumnsType<VideoFileInfo> = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '大小(MB)',
      key: 'size',
      render: (_, record) => {
        const sizeMB = (record.size / 1024 / 1024).toFixed(2);
        return `${sizeMB} MB`;
      },
      width: 110,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => handlePreview(record)}
        >
          预览
        </Button>
      ),
    },
  ];

  const videos = scanResult?.videos || [];

  return (
    <Table
      columns={columns}
      dataSource={videos}
      rowKey="path"
      size="small"
      pagination={{
        pageSize: 10,
        showTotal: (total) => `总计 ${total} 个视频`,
      }}
    />
  );
}
