import React, { useMemo } from 'react';
import { Table, Typography, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FileInfo } from '@shared/types';
import { useFileToolStore } from './store';

const { Text } = Typography;

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
};

/**
 * 格式化日期
 */
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN');
};

/**
 * 文件列表表格组件
 * 显示扫描结果，支持选择和虚拟滚动
 */
export const FileTable: React.FC = () => {
  const {
    scanResult,
    selectedFileIds,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,
  } = useFileToolStore();

  const files = scanResult?.files || [];
  const hasSelection = selectedFileIds.size > 0;

  const columns: ColumnsType<FileInfo> = useMemo(
    () => [
      {
        title: '文件名',
        dataIndex: 'name',
        key: 'name',
        width: 300,
        ellipsis: true,
        render: (name: string) => (
          <Text ellipsis={{ tooltip: name }} style={{ maxWidth: 280 }}>
            {name}
          </Text>
        ),
      },
      {
        title: '路径',
        dataIndex: 'relativePath',
        key: 'relativePath',
        ellipsis: true,
        render: (path: string) => (
          <Text type="secondary" ellipsis={{ tooltip: path }}>
            {path}
          </Text>
        ),
      },
      {
        title: '大小',
        dataIndex: 'size',
        key: 'size',
        width: 120,
        render: (size: number) => formatFileSize(size),
        sorter: (a, b) => a.size - b.size,
      },
      {
        title: '扩展名',
        dataIndex: 'extension',
        key: 'extension',
        width: 100,
        render: (ext: string) => <Tag color="blue">{ext || '无'}</Tag>,
      },
      {
        title: '修改时间',
        dataIndex: 'lastModified',
        key: 'lastModified',
        width: 180,
        render: (time: number) => formatDate(time),
        sorter: (a, b) => a.lastModified - b.lastModified,
      },
    ],
    []
  );

  const rowSelection = {
    selectedRowKeys: Array.from(selectedFileIds),
    onChange: (selectedRowKeys: React.Key[]) => {
      clearSelection();
      selectedRowKeys.forEach((key) => toggleFileSelection(key as string));
    },
    onSelectAll: (selected: boolean) => {
      if (selected) {
        selectAllFiles();
      } else {
        clearSelection();
      }
    },
  };

  if (!scanResult) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Text type="secondary">请选择文件夹并扫描文件</Text>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Text>
          共 <strong>{scanResult.totalFiles}</strong> 个文件
        </Text>
        {scanResult.filteredFiles !== scanResult.totalFiles && (
          <Text type="secondary">
            (过滤后: <strong>{scanResult.filteredFiles}</strong> 个)
          </Text>
        )}
        {hasSelection && (
          <Text type="warning">
            已选择 <strong>{selectedFileIds.size}</strong> 个文件
          </Text>
        )}
      </Space>

      <Table
        columns={columns}
        dataSource={files}
        rowKey="id"
        rowSelection={rowSelection}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          pageSizeOptions: ['20', '50', '100', '200'],
        }}
        scroll={{ y: 400 }}
        size="small"
      />
    </div>
  );
};
