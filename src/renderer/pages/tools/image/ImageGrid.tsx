import { Checkbox, Empty, Image, List, Space, Typography } from 'antd';
import type { ImageAsset } from '@shared/types';
import { formatFileSize } from '@shared/utils/helpers';

const { Text } = Typography;

interface ImageGridProps {
  assets: ImageAsset[];
  selectedAssetIds: string[];
  onToggle(assetId: string): void;
}

export function ImageGrid({ assets, selectedAssetIds, onToggle }: ImageGridProps) {
  if (assets.length === 0) {
    return <Empty description="没有找到图片，请重新选择文件夹" />;
  }

  return (
    <List
      grid={{ gutter: 16, column: 4 }}
      dataSource={assets}
      renderItem={item => {
        const checked = selectedAssetIds.includes(item.id);
        return (
          <List.Item key={item.id}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Checkbox checked={checked} onChange={() => onToggle(item.id)}>
                选择
              </Checkbox>
              <Image
                src={item.fileUrl}
                alt={item.name}
                height={160}
                width="100%"
                style={{ objectFit: 'cover' }}
                preview={{ mask: '查看大图' }}
              />
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text strong ellipsis>
                  {item.name}
                </Text>
                <Text type="secondary">{formatFileSize(item.size)}</Text>
                <Text type="secondary" ellipsis>
                  {item.relativePath}
                </Text>
              </Space>
            </Space>
          </List.Item>
        );
      }}
    />
  );
}
