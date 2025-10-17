import { DirectorySelector } from '@renderer/pages/tools/video/DirectorySelector';
import { OperationsPanel } from '@renderer/pages/tools/video/OperationsPanel';
import { VideoFileTable } from '@renderer/pages/tools/video/VideoFileTable';
import { VideoPreview } from '@renderer/pages/tools/video/VideoPreview';
import { useVideoToolStore } from '@renderer/pages/tools/video/store';
import { Alert, Card, Col, Row, Statistic } from 'antd';
import { useMemo } from 'react';

function VideoTool() {
  const scanResult = useVideoToolStore((state) => state.scanResult);
  const isScanning = useVideoToolStore((state) => state.isScanning);
  const error = useVideoToolStore((state) => state.error);
  const setError = useVideoToolStore((state) => state.setError);

  const stats = useMemo(() => {
    if (!scanResult) {
      return {
        total: 0,
        filtered: 0,
        directory: '',
      };
    }

    return {
      total: scanResult.totalFiles,
      filtered: scanResult.filteredFiles,
      directory: scanResult.directory,
    };
  }, [scanResult]);

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="视频目录" loading={isScanning}>
            <DirectorySelector />
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}>
                <Statistic title="扫描文件" value={stats.total} />
              </Col>
              <Col span={8}>
                <Statistic title="视频文件" value={stats.filtered} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="当前目录"
                  value={stats.directory || '-'}
                  valueRender={(node) => <span style={{ wordBreak: 'break-all' }}>{node}</span>}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="操作">
            <OperationsPanel />
            {error && (
              <Alert
                type="error"
                message={error}
                style={{ marginTop: 16 }}
                closable
                onClose={() => setError(null)}
              />
            )}
          </Card>
        </Col>

        <Col span={9}>
          <Card title="视频列表" bodyStyle={{ padding: 0 }}>
            <VideoFileTable />
          </Card>
        </Col>

        <Col span={15}>
          <VideoPreview />
        </Col>
      </Row>
    </div>
  );
}

export default VideoTool;
