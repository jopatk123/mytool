import {
    CompressOutlined,
    FolderOutlined,
    FormatPainterOutlined,
    PauseOutlined,
    PlayCircleOutlined,
    ScissorOutlined,
    ZoomInOutlined,
} from '@ant-design/icons';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import type {
    VideoCompressRequest,
    VideoConvertRequest,
    VideoFrameExtractRequest,
    VideoTrimRequest,
} from '@shared/types/video';
import { createLogger } from '@shared/utils/logger';
import {
    Button,
    Card,
    Checkbox,
    Collapse,
    Divider,
    Empty,
    Form,
    InputNumber,
    Progress,
    Select,
    Space,
    Table,
    Tooltip,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useMemo, useState } from 'react';
import { useVideoToolStore } from './store';

const logger = createLogger('BatchOperationsPanel');

type OperationType = 'convert' | 'trim' | 'compress' | 'extractFrames';

/**
 * 批量操作面板
 */
export function BatchOperationsPanel() {
  const scanResult = useVideoToolStore((state) => state.scanResult);
  const overwriteOriginal = useVideoToolStore((state) => state.overwriteOriginal);
  const setOverwriteOriginal = useVideoToolStore((state) => state.setOverwriteOriginal);
  const outputDirectory = useVideoToolStore((state) => state.outputDirectory);
  const setOutputDirectory = useVideoToolStore((state) => state.setOutputDirectory);
  const batchState = useVideoToolStore((state) => state.batchState);
  const setBatchState = useVideoToolStore((state) => state.setBatchState);
  const resetBatchState = useVideoToolStore((state) => state.resetBatchState);
  const updateBatchProgress = useVideoToolStore((state) => state.updateBatchProgress);
  const setError = useVideoToolStore((state) => state.setError);
  const addBatchResult = useVideoToolStore((state) => state.addBatchResult);

  const [form] = Form.useForm();
  const electronAPI = useElectronAPI();

  const [operationType, setOperationType] = useState<OperationType>('convert');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoFiles = useMemo(() => scanResult?.videos || [], [scanResult?.videos]);
  const hasVideos = videoFiles.length > 0;

  // 选择输出目录
  const handleSelectOutputDirectory = useCallback(async () => {
    try {
      const result = await electronAPI.selectFile({ properties: ['openDirectory'] });
      if (result && result.length > 0) {
        setOutputDirectory(result[0]);
        message.success(`已选择输出目录: ${result[0]}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '选择目录失败';
      setError(errorMsg);
      logger.error('Failed to select output directory', { error });
    }
  }, [electronAPI, setError, setOutputDirectory]);

  // 清除输出目录
  const handleClearOutputDirectory = useCallback(() => {
    setOutputDirectory(null);
    message.info('已清除输出目录');
  }, [setOutputDirectory]);

  // 处理格式转换
  const handleConvertBatch = useCallback(async () => {
    const values = await form.validateFields();

    if (!hasVideos) {
      message.error('没有可用的视频文件');
      return;
    }

    setIsProcessing(true);
    resetBatchState();
    setBatchState({
      operation: 'convert',
      totalFiles: videoFiles.length,
      isProcessing: true,
      results: [],
    });

    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < videoFiles.length; i++) {
        const video = videoFiles[i];
        updateBatchProgress(i, successCount, failedCount, video.name);

        try {
          const outputPath = outputDirectory
            ? `${outputDirectory}/${video.name.replace(/\.[^/.]+$/, '')}_converted.${values.format || 'mp4'}`
            : `${video.path.replace(/\.[^/.]+$/, '')}_converted.${values.format || 'mp4'}`;

          const request: VideoConvertRequest = {
            inputPath: video.path,
            outputPath,
            format: values.format || 'mp4',
            quality: values.quality,
            codec: values.codec,
          };

          await electronAPI.executeTool('video-tool', {
            action: 'convert',
            ...request,
          });

          successCount++;
          addBatchResult({
            file: video.name,
            success: true,
            output: outputPath,
            message: `格式转换成功`,
          });

          logger.success('Video converted', { file: video.name });
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : '转换失败';
          addBatchResult({
            file: video.name,
            success: false,
            error: errorMsg,
          });
          logger.error('Failed to convert video', { file: video.name, error });
        }
      }

      updateBatchProgress(videoFiles.length, successCount, failedCount);
      setBatchState({ isProcessing: false });
      message.success(`格式转换完成: ${successCount} 成功, ${failedCount} 失败`);
    } finally {
      setIsProcessing(false);
    }
  }, [
    form,
    hasVideos,
    videoFiles,
    outputDirectory,
    electronAPI,
    resetBatchState,
    setBatchState,
    updateBatchProgress,
    addBatchResult,
  ]);

  // 处理压缩
  const handleCompressBatch = useCallback(async () => {
    const values = await form.validateFields();

    if (!hasVideos) {
      message.error('没有可用的视频文件');
      return;
    }

    setIsProcessing(true);
    resetBatchState();
    setBatchState({
      operation: 'compress',
      totalFiles: videoFiles.length,
      isProcessing: true,
      results: [],
    });

    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < videoFiles.length; i++) {
        const video = videoFiles[i];
        updateBatchProgress(i, successCount, failedCount, video.name);

        try {
          const outputPath = overwriteOriginal
            ? video.path
            : (outputDirectory
              ? `${outputDirectory}/${video.name.replace(/\.[^/.]+$/, '')}_compressed.mp4`
              : `${video.path.replace(/\.[^/.]+$/, '')}_compressed.mp4`);

          const request: VideoCompressRequest = {
            inputPath: video.path,
            outputPath,
            quality: values.quality,
            targetBitrate: values.bitrate,
            scale: values.scale,
            format: 'mp4',
          };

          await electronAPI.executeTool('video-tool', {
            action: 'compress',
            ...request,
          });

          successCount++;
          addBatchResult({
            file: video.name,
            success: true,
            output: outputPath,
            message: `压缩成功`,
          });

          logger.success('Video compressed', { file: video.name });
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : '压缩失败';
          addBatchResult({
            file: video.name,
            success: false,
            error: errorMsg,
          });
          logger.error('Failed to compress video', { file: video.name, error });
        }
      }

      updateBatchProgress(videoFiles.length, successCount, failedCount);
      setBatchState({ isProcessing: false });
      message.success(`压缩完成: ${successCount} 成功, ${failedCount} 失败`);
    } finally {
      setIsProcessing(false);
    }
  }, [
    form,
    hasVideos,
    videoFiles,
    outputDirectory,
    overwriteOriginal,
    electronAPI,
    resetBatchState,
    setBatchState,
    updateBatchProgress,
    addBatchResult,
  ]);

  // 处理裁剪
  const handleTrimBatch = useCallback(async () => {
    const values = await form.validateFields();

    if (!hasVideos) {
      message.error('没有可用的视频文件');
      return;
    }

    if (values.startTime === undefined || values.endTime === undefined) {
      message.error('请设置开始和结束时间');
      return;
    }

    setIsProcessing(true);
    resetBatchState();
    setBatchState({
      operation: 'trim',
      totalFiles: videoFiles.length,
      isProcessing: true,
      results: [],
    });

    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < videoFiles.length; i++) {
        const video = videoFiles[i];
        updateBatchProgress(i, successCount, failedCount, video.name);

        try {
          const outputPath = outputDirectory
            ? `${outputDirectory}/${video.name.replace(/\.[^/.]+$/, '')}_trimmed.${video.format || 'mp4'}`
            : `${video.path.replace(/\.[^/.]+$/, '')}_trimmed.${video.format || 'mp4'}`;

          const request: VideoTrimRequest = {
            inputPath: video.path,
            outputPath,
            startTime: values.startTime,
            endTime: values.endTime,
          };

          await electronAPI.executeTool('video-tool', {
            action: 'trim',
            ...request,
          });

          successCount++;
          addBatchResult({
            file: video.name,
            success: true,
            output: outputPath,
            message: `裁剪成功`,
          });

          logger.success('Video trimmed', { file: video.name });
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : '裁剪失败';
          addBatchResult({
            file: video.name,
            success: false,
            error: errorMsg,
          });
          logger.error('Failed to trim video', { file: video.name, error });
        }
      }

      updateBatchProgress(videoFiles.length, successCount, failedCount);
      setBatchState({ isProcessing: false });
      message.success(`裁剪完成: ${successCount} 成功, ${failedCount} 失败`);
    } finally {
      setIsProcessing(false);
    }
  }, [
    form,
    hasVideos,
    videoFiles,
    outputDirectory,
    electronAPI,
    resetBatchState,
    setBatchState,
    updateBatchProgress,
    addBatchResult,
  ]);

  // 处理帧提取
  const handleExtractFramesBatch = useCallback(async () => {
    const values = await form.validateFields();

    if (!hasVideos) {
      message.error('没有可用的视频文件');
      return;
    }

    setIsProcessing(true);
    resetBatchState();
    setBatchState({
      operation: 'extractFrames',
      totalFiles: videoFiles.length,
      isProcessing: true,
      results: [],
    });

    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < videoFiles.length; i++) {
        const video = videoFiles[i];
        updateBatchProgress(i, successCount, failedCount, video.name);

        try {
          const outputDir = outputDirectory
            ? `${outputDirectory}/${video.name.replace(/\.[^/.]+$/, '')}_frames`
            : `${video.path.replace(/\.[^/.]+$/, '')}_frames`;

          const request: VideoFrameExtractRequest = {
            inputPath: video.path,
            outputDir,
            interval: values.interval || 1,
            startTime: values.startTime,
            endTime: values.endTime,
          };

          await electronAPI.executeTool('video-tool', {
            action: 'extractFrames',
            ...request,
          });

          successCount++;
          addBatchResult({
            file: video.name,
            success: true,
            output: outputDir,
            message: `帧提取成功`,
          });

          logger.success('Frames extracted', { file: video.name });
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : '提取失败';
          addBatchResult({
            file: video.name,
            success: false,
            error: errorMsg,
          });
          logger.error('Failed to extract frames', { file: video.name, error });
        }
      }

      updateBatchProgress(videoFiles.length, successCount, failedCount);
      setBatchState({ isProcessing: false });
      message.success(`帧提取完成: ${successCount} 成功, ${failedCount} 失败`);
    } finally {
      setIsProcessing(false);
    }
  }, [
    form,
    hasVideos,
    videoFiles,
    outputDirectory,
    electronAPI,
    resetBatchState,
    setBatchState,
    updateBatchProgress,
    addBatchResult,
  ]);

  // 渲染操作表单
  const renderOperationForm = () => {
    switch (operationType) {
      case 'convert':
        return (
          <>
            <Form.Item
              label="目标格式"
              name="format"
              initialValue="mp4"
              rules={[{ required: true, message: '请选择目标格式' }]}
            >
              <Select placeholder="选择格式">
                <Select.Option value="mp4">MP4</Select.Option>
                <Select.Option value="mkv">MKV</Select.Option>
                <Select.Option value="avi">AVI</Select.Option>
                <Select.Option value="webm">WebM</Select.Option>
                <Select.Option value="mov">MOV</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="质量" name="quality" initialValue="medium">
              <Select placeholder="选择质量">
                <Select.Option value="low">低 (快速，较小文件)</Select.Option>
                <Select.Option value="medium">中 (平衡)</Select.Option>
                <Select.Option value="high">高 (最佳质量)</Select.Option>
                <Select.Option value="lossless">无损 (保留所有细节，最大文件)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="编码器" name="codec" initialValue="h264">
              <Select placeholder="选择编码器">
                <Select.Option value="h264">H.264 (兼容性好)</Select.Option>
                <Select.Option value="h265">H.265 (更小文件)</Select.Option>
                <Select.Option value="vp9">VP9 (高质量)</Select.Option>
                <Select.Option value="av1">AV1 (最优压缩)</Select.Option>
              </Select>
            </Form.Item>
          </>
        );

      case 'compress':
        return (
          <>
            <Form.Item
              label="压缩质量"
              name="quality"
              initialValue="medium"
              rules={[{ required: true, message: '请选择压缩质量' }]}
            >
              <Select placeholder="选择质量">
                <Select.Option value="low">低 (500 kbps - 快速)</Select.Option>
                <Select.Option value="medium">中 (1000 kbps - 平衡)</Select.Option>
                <Select.Option value="high">高 (2500 kbps - 高质量)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="目标比特率 (kbps，可选)" name="bitrate">
              <InputNumber min={100} max={10000} placeholder="如: 800" />
            </Form.Item>

            <Form.Item label="缩放 (可选)" name="scale" tooltip="如: 1280:720 或 -1:480">
              <InputNumber placeholder="如: 1280" />
            </Form.Item>
          </>
        );

      case 'trim':
        return (
          <>
            <Form.Item
              label="开始时间 (秒)"
              name="startTime"
              rules={[{ required: true, message: '请输入开始时间' }]}
            >
              <InputNumber min={0} step={0.1} placeholder="如: 10" />
            </Form.Item>

            <Form.Item
              label="结束时间 (秒)"
              name="endTime"
              rules={[{ required: true, message: '请输入结束时间' }]}
            >
              <InputNumber min={0} step={0.1} placeholder="如: 60" />
            </Form.Item>
          </>
        );

      case 'extractFrames':
        return (
          <>
            <Form.Item label="帧间隔 (秒)" name="interval" initialValue={1}>
              <InputNumber min={0.1} max={10} step={0.1} placeholder="默认每1秒提取一帧" />
            </Form.Item>

            <Form.Item label="开始时间 (秒，可选)" name="startTime">
              <InputNumber min={0} step={0.1} placeholder="可选" />
            </Form.Item>

            <Form.Item label="结束时间 (秒，可选)" name="endTime">
              <InputNumber min={0} step={0.1} placeholder="可选" />
            </Form.Item>
          </>
        );

      default:
        return null;
    }
  };

  // 结果表格列定义
  const resultColumns: ColumnsType<typeof batchState.results[0]> = [
    {
      title: '文件名',
      dataIndex: 'file',
      key: 'file',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      render: (success: boolean) => (success ? '✅ 成功' : '❌ 失败'),
      width: 80,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      render: (text: string | undefined, record) => text || record.error || '-',
      ellipsis: true,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 操作类型选择 */}
      <Card size="small" title="选择操作">
        <Space wrap>
          <Tooltip title="转换视频格式">
            <Button
              icon={<FormatPainterOutlined />}
              type={operationType === 'convert' ? 'primary' : 'default'}
              onClick={() => {
                setOperationType('convert');
                form.resetFields();
              }}
            >
              格式转换
            </Button>
          </Tooltip>

          <Tooltip title="裁剪视频">
            <Button
              icon={<ScissorOutlined />}
              type={operationType === 'trim' ? 'primary' : 'default'}
              onClick={() => {
                setOperationType('trim');
                form.resetFields();
              }}
            >
              视频裁剪
            </Button>
          </Tooltip>

          <Tooltip title="提取视频帧">
            <Button
              icon={<ZoomInOutlined />}
              type={operationType === 'extractFrames' ? 'primary' : 'default'}
              onClick={() => {
                setOperationType('extractFrames');
                form.resetFields();
              }}
            >
              提取帧
            </Button>
          </Tooltip>

          <Tooltip title="压缩视频">
            <Button
              icon={<CompressOutlined />}
              type={operationType === 'compress' ? 'primary' : 'default'}
              onClick={() => {
                setOperationType('compress');
                form.resetFields();
              }}
            >
              压缩视频
            </Button>
          </Tooltip>
        </Space>
      </Card>

      {/* 输出设置 */}
      <Card size="small" title="输出设置">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>输出目录</div>
            <Space>
              <Button
                icon={<FolderOutlined />}
                onClick={handleSelectOutputDirectory}
                disabled={isProcessing}
              >
                {outputDirectory ? '更改输出目录' : '选择输出目录'}
              </Button>
              {outputDirectory && (
                <Button onClick={handleClearOutputDirectory} disabled={isProcessing}>
                  清除
                </Button>
              )}
            </Space>
            {outputDirectory && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                当前: {outputDirectory}
              </div>
            )}
            {!outputDirectory && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                未选择 - 将在原文件目录生成
              </div>
            )}
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <Checkbox
            checked={overwriteOriginal}
            onChange={(e) => setOverwriteOriginal(e.target.checked)}
            disabled={isProcessing}
          >
            允许覆盖原文件
          </Checkbox>
          <div style={{ fontSize: '12px', color: '#666', marginLeft: '24px' }}>
            勾选后，处理结果将直接覆盖源文件（谨慎操作）
          </div>
        </Space>
      </Card>

      {/* 操作参数 */}
      <Card size="small" title={`${operationType === 'convert' ? '格式转换' : operationType === 'compress' ? '压缩' : operationType === 'trim' ? '裁剪' : '提取帧'} 参数`}>
        <Form form={form} layout="vertical">
          {renderOperationForm()}
        </Form>
      </Card>

      {/* 进度显示 */}
      {batchState.isProcessing && (
        <Card size="small" title="处理进度">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <div style={{ marginBottom: '8px' }}>
                {batchState.currentFile && `正在处理: ${batchState.currentFile}`}
              </div>
              <Progress
                percent={batchState.progress}
                status={batchState.isProcessing ? 'active' : 'success'}
              />
            </div>
            <div style={{ display: 'flex', gap: '32px', fontSize: '12px' }}>
              <div>总数: {batchState.totalFiles}</div>
              <div>已处理: {batchState.processedFiles}</div>
              <div style={{ color: 'green' }}>成功: {batchState.successFiles}</div>
              <div style={{ color: 'red' }}>失败: {batchState.failedFiles}</div>
            </div>
          </Space>
        </Card>
      )}

      {/* 操作按钮 */}
      <Card size="small">
        <Space>
          <Tooltip title={hasVideos ? `批量${operationType === 'convert' ? '格式转换' : operationType === 'compress' ? '压缩' : operationType === 'trim' ? '裁剪' : '提取帧'} ${videoFiles.length} 个视频` : '没有可用的视频文件'}>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={
                operationType === 'convert'
                  ? handleConvertBatch
                  : operationType === 'compress'
                    ? handleCompressBatch
                    : operationType === 'trim'
                      ? handleTrimBatch
                      : handleExtractFramesBatch
              }
              disabled={!hasVideos || isProcessing}
              loading={isProcessing}
            >
              {isProcessing ? '处理中...' : `开始 ${operationType === 'convert' ? '格式转换' : operationType === 'compress' ? '压缩' : operationType === 'trim' ? '裁剪' : '提取帧'}`}
            </Button>
          </Tooltip>

          {isProcessing && (
            <Button danger icon={<PauseOutlined />} onClick={() => {
              setIsProcessing(false);
              setBatchState({ isProcessing: false });
              message.warning('已取消处理');
            }}>
              取消
            </Button>
          )}
        </Space>
      </Card>

      {/* 结果列表 */}
      {batchState.results.length > 0 && (
        <Card size="small" title={`处理结果 (${batchState.results.length})`}>
          <Collapse
            items={[
              {
                key: 'results',
                label: `成功: ${batchState.successFiles} | 失败: ${batchState.failedFiles}`,
                children: (
                  <Table
                    columns={resultColumns}
                    dataSource={batchState.results}
                    rowKey={(_, index) => String(index)}
                    size="small"
                    pagination={{
                      pageSize: 10,
                      showTotal: (total) => `总计 ${total} 条`,
                    }}
                  />
                ),
              },
            ]}
          />
        </Card>
      )}

      {!hasVideos && (
        <Empty description="没有可用的视频文件，请先扫描目录" />
      )}
    </div>
  );
}
