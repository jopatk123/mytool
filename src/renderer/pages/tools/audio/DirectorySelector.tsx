import { useCallback } from 'react';
import { Button, Input, Space, App } from 'antd';
import { FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import { createLogger } from '@shared/utils/logger';
import { useAudioToolStore } from './store';

const logger = createLogger('AudioDirectorySelector');

export function DirectorySelector() {
  const electronAPI = useElectronAPI();
  const { message } = App.useApp();
  const directory = useAudioToolStore((state) => state.directory);
  const setDirectory = useAudioToolStore((state) => state.setDirectory);
  const setScanResult = useAudioToolStore((state) => state.setScanResult);
  const setIsScanning = useAudioToolStore((state) => state.setIsScanning);
  const setError = useAudioToolStore((state) => state.setError);

  const handlePickDirectory = useCallback(async () => {
    try {
      const result = await electronAPI.selectFile({ properties: ['openDirectory'] });
      if (result && result.length > 0) {
        setDirectory(result[0]);
      }
    } catch (error) {
      logger.error('Directory selection failed', error);
      message.error('选择目录失败');
    }
  }, [electronAPI, message, setDirectory]);

  const handleScan = useCallback(async () => {
    if (!directory) {
      message.warning('请先选择目录');
      return;
    }

    try {
      setIsScanning(true);
      const result = await electronAPI.scanAudio({ directory });
      setScanResult(result);
      message.success(`扫描完成，共找到 ${result.filteredFiles} 个音频文件`);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      logger.error('Audio scan failed', error);
      setError(messageText);
      message.error(`扫描失败: ${messageText}`);
    } finally {
      setIsScanning(false);
    }
  }, [directory, electronAPI, message, setError, setIsScanning, setScanResult]);

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input
        readOnly
        value={directory}
        placeholder="请选择音频所在目录"
        onClick={handlePickDirectory}
      />
      <Button icon={<FolderOpenOutlined />} onClick={handlePickDirectory}>
        浏览
      </Button>
      <Button type="primary" icon={<ReloadOutlined />} onClick={handleScan}>
        扫描
      </Button>
    </Space.Compact>
  );
}
