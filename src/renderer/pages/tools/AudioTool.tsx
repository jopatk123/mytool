import { useMemo } from 'react';
import { Card, Col, Row, Statistic, Alert } from 'antd';
import { DirectorySelector } from './audio/DirectorySelector';
import { OperationsPanel } from './audio/OperationsPanel';
import { AudioFileTable } from './audio/AudioFileTable';
import { PreviewPlayer } from './audio/PreviewPlayer';
import { useAudioToolStore } from './audio/store';

function AudioTool() {
  const scanResult = useAudioToolStore((state) => state.scanResult);
  const isScanning = useAudioToolStore((state) => state.isScanning);
  const error = useAudioToolStore((state) => state.error);
  const clearError = useAudioToolStore((state) => state.setError);

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
          <Card title="音频目录" loading={isScanning}>
            <DirectorySelector />
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}>
                <Statistic title="扫描文件" value={stats.total} />
              </Col>
              <Col span={8}>
                <Statistic title="音频文件" value={stats.filtered} />
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
                onClose={() => clearError(null)}
              />
            )}
          </Card>
        </Col>

        <Col span={24}>
          <Card title="音频列表" bodyStyle={{ padding: 0 }}>
            <AudioFileTable />
          </Card>
        </Col>

        <Col span={24}>
          <PreviewPlayer />
        </Col>
      </Row>
    </div>
  );
}

export default AudioTool;
