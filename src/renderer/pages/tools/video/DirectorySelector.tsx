import { FolderOutlined } from '@ant-design/icons';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import type { VideoScanResult } from '@shared/types/video';
import { createLogger } from '@shared/utils/logger';
import { Button, Checkbox, Input, Space } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useVideoToolStore } from './store';

const logger = createLogger('DirectorySelector');

/**
 * 目录选择器组件
 */
export function DirectorySelector() {
  const [directory, setDirectory] = useState<string>('');
  const setScanResult = useVideoToolStore((state) => state.setScanResult);
  const setIsScanning = useVideoToolStore((state) => state.setIsScanning);
  const setError = useVideoToolStore((state) => state.setError);
  const includeSubdirectories = useVideoToolStore((state) => state.includeSubdirectories);
  const setIncludeSubdirectories = useVideoToolStore((state) => state.setIncludeSubdirectories);
  const electronAPI = useElectronAPI();

  const performScan = useCallback(async (targetDirectory: string) => {
    const normalized = targetDirectory.trim();

    if (!normalized) {
      setError('请输入有效的目录路径');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      logger.info('Scanning directory', {
        directory: normalized,
        includeSubdirectories,
      });
      const result = await electronAPI.executeTool('video-tool', {
        action: 'scan',
        directory: normalized,
        recursive: includeSubdirectories,
      });

      setScanResult(result as VideoScanResult);
      logger.success('Directory scan completed');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '扫描失败';
      setError(errorMsg);
      logger.error('Failed to scan directory', { error });
    } finally {
      setIsScanning(false);
    }
  }, [electronAPI, includeSubdirectories, setError, setIsScanning, setScanResult]);

  const handleScan = useCallback(async () => {
    await performScan(directory);
  }, [directory, performScan]);

  const handleBrowse = useCallback(async () => {
    try {
      const result = await electronAPI.selectFile({ properties: ['openDirectory'] });
      if (result && result.length > 0) {
        const selectedDirectory = result[0];
        setDirectory(selectedDirectory);
        setError(null);
        logger.info('Directory selected', { directory: selectedDirectory });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '选择目录失败';
      setError(errorMsg);
      logger.error('Failed to select directory', { error });
    }
  }, [electronAPI, setError]);

  useEffect(() => {
    if (directory) {
      void performScan(directory);
    }
  }, [includeSubdirectories, directory, performScan]);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          placeholder="输入视频目录路径 (例: /home/user/videos)"
          value={directory}
          onChange={(e) => setDirectory(e.target.value)}
          onPressEnter={handleScan}
        />
        <Button icon={<FolderOutlined />} onClick={handleBrowse}>
          浏览
        </Button>
        <Button type="primary" onClick={handleScan}>
          重新扫描
        </Button>
      </Space.Compact>

      <Checkbox
        checked={includeSubdirectories}
        onChange={(event) => setIncludeSubdirectories(event.target.checked)}
      >
        包含子文件夹
      </Checkbox>
    </Space>
  );
}
