import { useState, useEffect } from 'react';
import { Checkbox, Empty, Image, List, Typography, Row, Col, Card } from 'antd';
import type { ImageAsset } from '@shared/types';
import { formatFileSize } from '@shared/utils/helpers';

const { Text, Title } = Typography;

interface ImageGridProps {
  assets: ImageAsset[];
  selectedAssetIds: string[];
  onToggle(assetId: string): void;
}

export function ImageGrid({ assets, selectedAssetIds, onToggle }: ImageGridProps) {
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);

  // 当资源列表变化时，默认选择第一张图片
  useEffect(() => {
    if (assets.length > 0 && !currentImageId) {
      setCurrentImageId(assets[0].id);
    } else if (assets.length === 0) {
      setCurrentImageId(null);
    } else if (currentImageId && !assets.find(a => a.id === currentImageId)) {
      // 如果当前选中的图片不在列表中，重置为第一张
      setCurrentImageId(assets[0]?.id || null);
    }
  }, [assets, currentImageId]);

  if (assets.length === 0) {
    return <Empty description="没有找到图片,请重新选择文件夹" />;
  }

  const currentImage = assets.find(asset => asset.id === currentImageId);

  return (
    <Row gutter={16} style={{ height: '100%' }}>
      {/* 左侧图片列表 */}
      <Col span={8} style={{ height: '600px', overflowY: 'auto', borderRight: '1px solid #f0f0f0' }}>
        <List
          dataSource={assets}
          renderItem={item => {
            const checked = selectedAssetIds.includes(item.id);
            const isActive = item.id === currentImageId;
            return (
              <List.Item
                key={item.id}
                style={{
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#e6f7ff' : 'transparent',
                  padding: '8px 12px',
                  borderLeft: isActive ? '3px solid #1890ff' : '3px solid transparent',
                }}
                onClick={() => setCurrentImageId(item.id)}
              >
                <List.Item.Meta
                  avatar={
                    <Checkbox
                      checked={checked}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggle(item.id);
                      }}
                    />
                  }
                  title={
                    <Text strong={isActive} ellipsis style={{ fontSize: '14px' }}>
                      {item.name}
                    </Text>
                  }
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatFileSize(item.size)}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }} ellipsis>
                        {item.relativePath}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Col>

      {/* 右侧图片预览 */}
      <Col span={16} style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {currentImage ? (
          <Card
            style={{ width: '100%', height: '100%' }}
            bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Image
                src={currentImage.fileUrl}
                alt={currentImage.name}
                style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                preview={{ mask: '查看大图' }}
              />
            </div>
            <div style={{ marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
              <Title level={5} ellipsis>
                {currentImage.name}
              </Title>
              <Text type="secondary">文件大小: {formatFileSize(currentImage.size)}</Text>
              <br />
              <Text type="secondary">路径: {currentImage.relativePath}</Text>
              <br />
              <Text type="secondary">类型: {currentImage.mimeType}</Text>
            </div>
          </Card>
        ) : (
          <Empty description="请从左侧列表选择图片" />
        )}
      </Col>
    </Row>
  );
}
