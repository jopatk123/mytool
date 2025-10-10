import React from 'react';
import { Button, Checkbox, Space, Typography, message } from 'antd';
import { FolderOpenOutlined, ScanOutlined } from '@ant-design/icons';
import { electronAPI } from '@renderer/api/electron';
import { useFileToolStore } from './store';

const { Text } = Typography;

/**
 * 文件夹选择器组件
 * 负责选择目录、配置扫描选项并触发扫描
 */
export const FolderSelector: React.FC = () => {
  const {
    selectedDirectory,
    scanOptions,
    isScanning,
    setSelectedDirectory,
    setScanOptions,
    setIsScanning,
    setScanResult,
  } = useFileToolStore();

  const handleSelectFolder = async () => {
    try {
      const result = await electronAPI.selectFile({
        properties: ['openDirectory'],
      });

      if (result && result.length > 0) {
        setSelectedDirectory(result[0]);
        message.success('已选择文件夹');
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
      message.error('选择文件夹失败');
    }
  };

  const handleScan = async () => {
    if (!selectedDirectory) {
      message.warning('请先选择文件夹');
      return;
    }

    setIsScanning(true);
    try {
      const result = await electronAPI.scanFiles({
        directory: selectedDirectory,
        options: scanOptions,
      });

      setScanResult(result);
      message.success(`扫描完成，找到 ${result.filteredFiles} 个文件`);
    } catch (error) {
      console.error('Failed to scan directory:', error);
      message.error('扫描失败');
      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleIncludeSubdirectoriesChange = (checked: boolean) => {
    setScanOptions({
      ...scanOptions,
      includeSubdirectories: checked,
    });
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Button
            icon={<FolderOpenOutlined />}
            onClick={handleSelectFolder}
            disabled={isScanning}
          >
            选择文件夹
          </Button>
          <Checkbox
            checked={scanOptions.includeSubdirectories}
            onChange={(e) => handleIncludeSubdirectoriesChange(e.target.checked)}
            disabled={isScanning}
          >
            包含子文件夹
          </Checkbox>
        </Space>

        {selectedDirectory && (
          <div>
            <Text type="secondary">当前目录: </Text>
            <Text code>{selectedDirectory}</Text>
          </div>
        )}

        <Button
          type="primary"
          icon={<ScanOutlined />}
          onClick={handleScan}
          loading={isScanning}
          disabled={!selectedDirectory}
        >
          {isScanning ? '扫描中...' : '扫描文件'}
        </Button>
      </Space>
    </div>
  );
};
