import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Space, Typography } from 'antd';
import { createLogger } from '@shared/utils/logger';
import type { ImageJobRequest } from '@shared/types';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import { FolderSelector } from './image/FolderSelector';
import { ImageGrid } from './image/ImageGrid';
import { OperationPanel } from './image/OperationPanel';
import { JobProgress } from './image/JobProgress';
import { useImageToolStore } from './image/store';

const { Title, Text } = Typography;

const logger = createLogger('ImageToolPage');

function ImageTool() {
  const { message } = App.useApp();
  const electronAPI = useElectronAPI();
  const [scanning, setScanning] = useState(false);

  const {
    directory,
    includeSubdirectories,
    setIncludeSubdirectories,
    setDirectory,
    setScanResult,
    clearScan,
    assets,
    selectedAssetIds,
    toggleAsset,
    selectAll,
    clearSelection,
    scanId,
    status,
    progress,
    summary,
    errors,
    updateFromEvent,
    jobId,
    setJobId,
  } = useImageToolStore((state) => ({
    directory: state.directory,
    includeSubdirectories: state.includeSubdirectories,
    setIncludeSubdirectories: state.setIncludeSubdirectories,
    setDirectory: state.setDirectory,
    setScanResult: state.setScanResult,
    clearScan: state.clearScan,
    assets: state.assets,
    selectedAssetIds: state.selectedAssetIds,
    toggleAsset: state.toggleAsset,
    selectAll: state.selectAll,
    clearSelection: state.clearSelection,
    scanId: state.scanId,
    status: state.status,
    progress: state.progress,
    summary: state.summary,
    errors: state.errors,
    updateFromEvent: state.updateFromEvent,
    jobId: state.jobId,
    setJobId: state.setJobId,
  }));

  useEffect(() => {
    let dispose: () => void = () => {};
    try {
      dispose = electronAPI.onImageJobEvent((event) => {
        updateFromEvent(event);
      });
    } catch (error) {
      logger.warn('订阅图片任务事件失败，可能在非 Electron 环境运行', error);
    }

    return () => {
      try {
        dispose();
      } catch (error) {
        logger.warn('取消图片任务事件订阅失败', error);
      }
    };
  }, [electronAPI, updateFromEvent]);

  const handleSelectFolder = useCallback(async () => {
    try {
      setScanning(true);
      const result = await electronAPI.selectFile({ properties: ['openDirectory'] });
      if (!result || result.length === 0) {
        setScanning(false);
        return;
      }

      const folder = result[0];
      setDirectory(folder);
      const scanResult = await electronAPI.scanImages({
        directory: folder,
        options: { includeSubdirectories },
      });
      setScanResult(scanResult.scanId, scanResult.assets, folder);
      message.success(`已扫描 ${scanResult.assets.length} 张图片`);
    } catch (error) {
      logger.error('Scan folder failed', error);
      message.error('扫描图片目录失败，请检查路径或权限');
    } finally {
      setScanning(false);
    }
  }, [electronAPI, includeSubdirectories, setDirectory, setScanResult, message]);

  const handleRescan = useCallback(async () => {
    if (!directory) {
      message.warning('请先选择图片目录');
      return;
    }

    try {
      setScanning(true);
      const scanResult = await electronAPI.scanImages({
        directory,
        options: { includeSubdirectories },
      });
      setScanResult(scanResult.scanId, scanResult.assets, directory);
      message.success(`已重新扫描 ${scanResult.assets.length} 张图片`);
    } catch (error) {
      logger.error('Rescan folder failed', error);
      message.error('重新扫描图片目录失败，请稍后重试');
    } finally {
      setScanning(false);
    }
  }, [directory, electronAPI, includeSubdirectories, message, setScanResult]);

  const handleRunJob = useCallback(
    async (payload: {
      operations: ImageJobRequest['operations'];
      options: ImageJobRequest['options'];
    }) => {
      if (!scanId) {
        message.warning('请先扫描图片目录');
        return;
      }

      if (selectedAssetIds.length === 0) {
        message.warning('请选择要处理的图片');
        return;
      }

      try {
        const request: ImageJobRequest = {
          scanId,
          assetIds: selectedAssetIds,
          operations: payload.operations,
          options: {
            ...payload.options,
            concurrency: payload.options?.concurrency,
          },
        };

        const { jobId: startedJobId } = await electronAPI.startImageJob(request);
        setJobId(startedJobId);
        message.success('批处理任务已开始');
      } catch (error) {
        logger.error('Start image job failed', error);
        message.error('启动批处理失败，请稍后重试');
      }
    },
    [electronAPI, scanId, selectedAssetIds, setJobId, message],
  );

  const handleCancelJob = useCallback(async () => {
    if (!jobId) return;
    try {
      await electronAPI.cancelImageJob(jobId);
      message.info('已发送取消请求');
    } catch (error) {
      logger.error('Cancel image job failed', error);
      message.error('取消任务失败');
    }
  }, [electronAPI, jobId, message]);

  const isRunning = useMemo(() => status === 'running', [status]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={2}>图片批量处理工具</Title>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <FolderSelector
            directory={directory}
            includeSubdirectories={includeSubdirectories}
            onSelectDirectory={handleSelectFolder}
            onToggleInclude={setIncludeSubdirectories}
            loading={scanning}
          />

          <Space
            align="center"
            wrap
            style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}
          >
            <Space>
              <Button onClick={selectAll} disabled={assets.length === 0}>
                全选
              </Button>
              <Button onClick={clearSelection} disabled={selectedAssetIds.length === 0}>
                清除选择
              </Button>
              <Button danger onClick={clearScan} disabled={assets.length === 0}>
                清除扫描结果
              </Button>
              <Button
                type="primary"
                onClick={handleRescan}
                disabled={!directory || scanning}
                loading={scanning}
              >
                扫描图片
              </Button>
            </Space>
            <Text type="secondary">
              当前选中 {selectedAssetIds.length} / {assets.length}
            </Text>
          </Space>
        </Space>
      </Card>

      {/* 图片列表和预览区域 */}
      <Card styles={{ body: { padding: '16px' } }}>
        <ImageGrid assets={assets} selectedAssetIds={selectedAssetIds} onToggle={toggleAsset} />
      </Card>

      <OperationPanel
        disabled={assets.length === 0 || scanning}
        running={isRunning}
        assetCount={selectedAssetIds.length}
        onRun={handleRunJob}
        onCancel={handleCancelJob}
      />

      <JobProgress progress={progress} summary={summary} errors={errors} />
    </Space>
  );
}

export default ImageTool;
