import { useMemo } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AudioFileInfo } from '@shared/types/audio';
import { useAudioToolStore } from './store';

const formatDuration = (duration: number | null): string => {
  if (typeof duration !== 'number' || Number.isNaN(duration)) return '-';
  const minutes = Math.floor(duration / 60);
  const seconds = Math.round(duration % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const formatSize = (size: number): string => {
  if (!Number.isFinite(size) || size <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
};

export function AudioFileTable() {
  const scanResult = useAudioToolStore((state) => state.scanResult);
  const selectedIds = useAudioToolStore((state) => state.selectedIds);
  const toggleSelection = useAudioToolStore((state) => state.toggleSelection);
  const setSelected = useAudioToolStore((state) => state.setSelected);

  const columns: ColumnsType<AudioFileInfo> = useMemo(
    () => [
      { title: '文件名', dataIndex: 'name', key: 'name', width: 220 },
      { title: '相对路径', dataIndex: 'relativePath', key: 'relativePath' },
      {
        title: '时长',
        dataIndex: ['metadata', 'duration'],
        key: 'duration',
        width: 120,
        render: (_value, record) => formatDuration(record.metadata.duration),
      },
      {
        title: '比特率',
        dataIndex: ['metadata', 'bitrate'],
        key: 'bitrate',
        width: 120,
        render: (_value, record) =>
          record.metadata.bitrate ? `${Math.round(record.metadata.bitrate / 1000)} kbps` : '-',
      },
      {
        title: '大小',
        dataIndex: 'size',
        key: 'size',
        width: 120,
        render: (value: number) => formatSize(value),
      },
      {
        title: '修改时间',
        dataIndex: 'lastModified',
        key: 'lastModified',
        width: 180,
        render: (value: number) => new Date(value).toLocaleString(),
      },
    ],
    [],
  );

  return (
    <Table<AudioFileInfo>
      size="small"
      rowKey="id"
      columns={columns}
      dataSource={scanResult?.files ?? []}
      pagination={{ pageSize: 10 }}
      rowSelection={{
        selectedRowKeys: Array.from(selectedIds),
        onSelect: (record) => toggleSelection(record.id),
        onSelectAll: (checked, selectedRows) => {
          if (checked) {
            setSelected(selectedRows.map((row) => row.id));
          } else {
            setSelected([]);
          }
        },
      }}
    />
  );
}
