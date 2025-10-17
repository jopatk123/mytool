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

  const handlePreview = useCallback((record: VideoFileInfo) => {
    const fileUrl = `file://${record.path}`;
    setPreview({
      fileUrl,
      fileName: record.name,
      fileInfo: record,
    });
  }, [setPreview]);

  const columns: ColumnsType<VideoFileInfo> = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: '8%',
    },
    {
      title: '分辨率',
      key: 'resolution',
      render: (_, record) => {
        if (record.width && record.height) {
          return `${record.width}x${record.height}`;
        }
        return '-';
      },
      width: '12%',
    },
    {
      title: '时长(秒)',
      dataIndex: 'duration',
      key: 'duration',
      width: '10%',
      render: (duration) => {
        if (duration) {
          return duration.toFixed(2);
        }
        return '-';
      },
    },
    {
      title: '帧率',
      dataIndex: 'fps',
      key: 'fps',
      width: '8%',
      render: (fps) => (fps ? `${fps} fps` : '-'),
    },
    {
      title: '大小(MB)',
      key: 'size',
      width: '10%',
      render: (_, record) => {
        const sizeMB = (record.size / 1024 / 1024).toFixed(2);
        return `${sizeMB} MB`;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: '10%',
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
      pagination={{
        pageSize: 10,
        showTotal: (total) => `总计 ${total} 个视频`,
      }}
    />
  );
}
