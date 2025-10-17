import { Card, Empty } from 'antd';
import { useEffect, useMemo, useRef } from 'react';
import { useVideoToolStore } from './store';

export function VideoPreview() {
  const preview = useVideoToolStore((state) => state.preview);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && preview?.fileUrl) {
      videoRef.current.pause();
      videoRef.current.load();
    }
  }, [preview?.fileUrl]);

  const metadata = useMemo(() => {
    if (!preview) {
      return null;
    }

    const items: Array<{ label: string; value: string }> = [
      {
        label: '文件大小',
        value: `${(preview.fileInfo.size / (1024 * 1024)).toFixed(2)} MB`,
      },
    ];

    if (preview.fileInfo.width && preview.fileInfo.height) {
      items.push({
        label: '分辨率',
        value: `${preview.fileInfo.width} × ${preview.fileInfo.height}`,
      });
    }

    if (preview.fileInfo.duration > 0) {
      const minutes = Math.floor(preview.fileInfo.duration / 60);
      const seconds = Math.floor(preview.fileInfo.duration % 60);
      items.push({
        label: '时长',
        value: `${minutes}:${String(seconds).padStart(2, '0')}`,
      });
    }

    if (preview.fileInfo.fps > 0) {
      items.push({ label: '帧率', value: `${preview.fileInfo.fps} fps` });
    }

    if (preview.fileInfo.format) {
      items.push({ label: '格式', value: preview.fileInfo.format.toUpperCase() });
    }

    return items;
  }, [preview]);

  return (
    <Card title="视频预览" size="small" style={{ marginTop: 16 }}>
      {preview ? (
        <div>
          <video
            controls
            ref={videoRef}
            key={preview.fileUrl}
            src={preview.fileUrl}
            style={{ width: '100%', maxHeight: 400, backgroundColor: '#000' }}
          >
            您的浏览器不支持视频播放。
          </video>
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: 0, marginBottom: 8 }}>
              <strong>文件名:</strong> {preview.fileName}
            </p>
            {metadata?.map((item) => (
              <p key={item.label} style={{ margin: 0, marginBottom: 8 }}>
                <strong>{item.label}:</strong> {item.value}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <Empty description="请选择视频文件并点击预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );
}
