import { Card, Empty } from 'antd';
import { useAudioToolStore } from './store';

export function PreviewPlayer() {
  const preview = useAudioToolStore((state) => state.preview);

  return (
    <Card title="音频预览" size="small" style={{ marginTop: 16 }}>
      {preview ? (
        <audio controls src={preview.fileUrl} style={{ width: '100%' }}>
          您的浏览器不支持音频播放。
        </audio>
      ) : (
        <Empty description="请选择音频文件并点击预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );
}
