import React from 'react';
import { Button, Space, message, Modal } from 'antd';
import {
  ExportOutlined,
  ImportOutlined,
  DeleteOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { electronAPI } from '@renderer/api/electron';
import { useFileToolStore, getSelectedFiles } from './store';

/**
 * 操作面板组件
 * 提供导出、导入、删除、移除等操作
 */
export const ActionPanel: React.FC = () => {
  const {
    scanResult,
    selectedFileIds,
    isProcessing,
    setIsProcessing,
    setScanResult,
    removeFiles,
  } = useFileToolStore();

  const selectedFiles = scanResult ? getSelectedFiles(useFileToolStore.getState()) : [];
  const hasSelection = selectedFileIds.size > 0;

  const handleExport = async () => {
    if (!scanResult || scanResult.files.length === 0) {
      message.warning('没有可导出的文件');
      return;
    }

    try {
      const outputPath = await electronAPI.saveFile({
        title: '导出文件列表',
        defaultPath: `file-list-${Date.now()}.csv`,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });

      if (!outputPath) {
        return;
      }

      setIsProcessing(true);
      await electronAPI.exportFilesToCSV({
        files: scanResult.files,
        outputPath,
      });

      message.success('导出成功');
    } catch (error) {
      console.error('Failed to export:', error);
      message.error('导出失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    try {
      const filePaths = await electronAPI.selectFile({
        title: '选择 CSV 文件',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        properties: ['openFile'],
      });

      if (!filePaths || filePaths.length === 0) {
        return;
      }

      setIsProcessing(true);
      const result = await electronAPI.importCSV(filePaths[0]);

      if (result.tasks.length === 0) {
        message.warning('CSV 文件中没有有效的重命名任务');
        return;
      }

      // 执行重命名
      Modal.confirm({
        title: '确认批量重命名',
        content: `将要重命名 ${result.tasks.length} 个文件${
          result.invalidRows > 0 ? `，跳过 ${result.invalidRows} 行无效数据` : ''
        }。是否继续？`,
        onOk: async () => {
          try {
            const renameResults = await electronAPI.renameFiles(result.tasks);
            const successCount = renameResults.filter((r) => r.success).length;
            const failedCount = renameResults.filter((r) => !r.success).length;

            if (failedCount > 0) {
              message.warning(
                `重命名完成：成功 ${successCount} 个，失败 ${failedCount} 个`
              );
            } else {
              message.success(`成功重命名 ${successCount} 个文件`);
            }

            // 刷新列表（重新扫描）
            if (scanResult) {
              const newScanResult = await electronAPI.scanFiles({
                directory: scanResult.directory,
                options: useFileToolStore.getState().scanOptions,
              });
              setScanResult(newScanResult);
            }
          } catch (error) {
            console.error('Failed to rename files:', error);
            message.error('批量重命名失败');
          }
        },
      });
    } catch (error) {
      console.error('Failed to import:', error);
      message.error('导入失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = () => {
    if (!hasSelection) {
      message.warning('请先选择要删除的文件');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedFileIds.size} 个文件吗？此操作不可恢复！`,
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        try {
          setIsProcessing(true);
          const filePaths = selectedFiles.map((f) => f.path);
          const results = await electronAPI.deleteFiles(filePaths);

          const successCount = results.filter((r) => r.success).length;
          const failedCount = results.filter((r) => !r.success).length;

          if (failedCount > 0) {
            message.warning(`删除完成：成功 ${successCount} 个，失败 ${failedCount} 个`);
          } else {
            message.success(`成功删除 ${successCount} 个文件`);
          }

          // 从列表中移除已删除的文件
          const deletedIds = results.filter((r) => r.success).map((r) => r.id);
          removeFiles(deletedIds);
        } catch (error) {
          console.error('Failed to delete files:', error);
          message.error('删除文件失败');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleRemove = () => {
    if (!hasSelection) {
      message.warning('请先选择要移除的文件');
      return;
    }

    removeFiles(Array.from(selectedFileIds));
    message.success(`已从列表中移除 ${selectedFileIds.size} 个文件`);
  };

  return (
    <Space style={{ marginBottom: 16 }}>
      <Button
        icon={<ExportOutlined />}
        onClick={handleExport}
        disabled={!scanResult || scanResult.files.length === 0 || isProcessing}
      >
        导出CSV
      </Button>
      <Button
        icon={<ImportOutlined />}
        onClick={handleImport}
        disabled={isProcessing}
      >
        导入并重命名
      </Button>
      <Button
        icon={<CloseOutlined />}
        onClick={handleRemove}
        disabled={!hasSelection || isProcessing}
      >
        移除 ({selectedFileIds.size})
      </Button>
      <Button
        icon={<DeleteOutlined />}
        danger
        onClick={handleDelete}
        disabled={!hasSelection || isProcessing}
      >
        删除 ({selectedFileIds.size})
      </Button>
    </Space>
  );
};
