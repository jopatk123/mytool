import { Card, List, Progress, Space, Typography } from 'antd';
import type { ImageJobProgress, ImageJobSummary, ImageJobError } from '@shared/types';
import { formatDate } from '@shared/utils/helpers';

const { Text } = Typography;

interface JobProgressProps {
  progress: ImageJobProgress | null;
  summary: ImageJobSummary | null;
  errors: ImageJobError[];
}

export function JobProgress({ progress, summary, errors }: JobProgressProps) {
  if (!progress && !summary) {
    return null;
  }

  return (
    <Card title="任务进度">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {progress && (
          <div>
            <Text strong>总体进度</Text>
            <Progress
              percent={progress.percent}
              status={progress.failed > 0 ? 'exception' : progress.percent === 100 ? 'success' : 'active'}
            />
            <Text type="secondary">
              已完成 {progress.completed} / {progress.total}，失败 {progress.failed}，剩余 {progress.pending}
            </Text>
            {progress.message && <Text>{progress.message}</Text>}
          </div>
        )}

        {summary && (
          <Space direction="vertical" size="small">
            <Text>任务编号：{summary.jobId}</Text>
            <Text>开始时间：{formatDate(summary.startedAt)}</Text>
            <Text>结束时间：{formatDate(summary.finishedAt)}</Text>
            <Text>用时：{Math.round(summary.durationMs / 1000)} 秒</Text>
            <Text type="secondary">
              成功 {summary.completed}，失败 {summary.failed}
            </Text>
          </Space>
        )}

        {errors.length > 0 && (
          <Card type="inner" title={`失败记录 (${errors.length})`}>
            <List
              size="small"
              dataSource={errors}
              renderItem={error => (
                <List.Item>
                  <Space direction="vertical" size={0} style={{ width: '100%' }}>
                    <Text type="danger">图片 ID：{error.assetId}</Text>
                    <Text>{error.error}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Space>
    </Card>
  );
}
