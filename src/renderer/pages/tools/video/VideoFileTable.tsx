import type { VideoFileInfo } from '@shared/types/video';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useVideoToolStore } from './store';

/**
 * 视频文件列表表格
 */
export function VideoFileTable() {
  const scanResult = useVideoToolStore((state) => state.scanResult);

  const columns: ColumnsType<VideoFileInfo> = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: '10%',
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
      width: '12%',
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
      width: '10%',
      render: (fps) => (fps ? `${fps} fps` : '-'),
    },
    {
      title: '大小(MB)',
      key: 'size',
      width: '12%',
      render: (_, record) => {
        const sizeMB = (record.size / 1024 / 1024).toFixed(2);
        return `${sizeMB} MB`;
      },
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
