import { Card, Empty } from 'antd';
import { useVideoToolStore } from './store';

export function VideoPreview() {
  const preview = useVideoToolStore((state) => state.preview);

  return (
    <Card title="视频预览" size="small" style={{ marginTop: 16 }}>
      {preview ? (
        <div>
          <video
            controls
            src={preview.fileUrl}
            style={{ width: '100%', maxHeight: 400, backgroundColor: '#000' }}
          >
            您的浏览器不支持视频播放。
          </video>
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: 0, marginBottom: 8 }}>
              <strong>文件名:</strong> {preview.fileName}
            </p>
            <p style={{ margin: 0, marginBottom: 8 }}>
              <strong>分辨率:</strong> {preview.fileInfo.width}x{preview.fileInfo.height}
            </p>
            <p style={{ margin: 0, marginBottom: 8 }}>
              <strong>时长:</strong> {Math.floor(preview.fileInfo.duration / 60)}:{String(Math.floor(preview.fileInfo.duration % 60)).padStart(2, '0')}
            </p>
            <p style={{ margin: 0, marginBottom: 8 }}>
              <strong>帧率:</strong> {preview.fileInfo.fps} fps
            </p>
            <p style={{ margin: 0 }}>
              <strong>文件大小:</strong> {(preview.fileInfo.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </div>
      ) : (
        <Empty description="请选择视频文件并点击预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );
}
