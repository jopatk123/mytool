import { FolderOutlined } from '@ant-design/icons';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import type { VideoScanResult } from '@shared/types/video';
import { createLogger } from '@shared/utils/logger';
import { Button, Input, Space } from 'antd';
import { useCallback, useState } from 'react';
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
  const electronAPI = useElectronAPI();

  const handleScan = useCallback(async () => {
    if (!directory.trim()) {
      setError('请输入有效的目录路径');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      logger.info('Scanning directory', { directory });
      const result = await electronAPI.executeTool('video-tool', {
        action: 'scan',
        directory: directory.trim(),
        recursive: true,
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
  }, [directory, electronAPI, setScanResult, setIsScanning, setError]);

  const handleBrowse = useCallback(async () => {
    try {
      const result = await electronAPI.selectFile({ properties: ['openDirectory'] });
      if (result && result.length > 0) {
        setDirectory(result[0]);
        setError(null);
        logger.info('Directory selected', { directory: result[0] });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '选择目录失败';
      setError(errorMsg);
      logger.error('Failed to select directory', { error });
    }
  }, [electronAPI, setError]);

  return (
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
      <Button type="primary" icon={<FolderOutlined />} onClick={handleScan}>
        扫描目录
      </Button>
    </Space.Compact>
  );
}
