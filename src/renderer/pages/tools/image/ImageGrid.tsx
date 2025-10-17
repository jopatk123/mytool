import type { ImageAsset } from '@shared/types';
import {
  calculateAspectRatio,
  formatFileSize,
  formatImageResolution,
} from '@shared/utils/helpers';
import { Card, Checkbox, Col, Empty, Image, List, Row, Typography } from 'antd';
import { useEffect, useState } from 'react';

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
    } else if (currentImageId && !assets.find((a) => a.id === currentImageId)) {
      // 如果当前选中的图片不在列表中，重置为第一张
      setCurrentImageId(assets[0]?.id || null);
    }
  }, [assets, currentImageId]);

  if (assets.length === 0) {
    return <Empty description="没有找到图片,请重新选择文件夹" />;
  }

  const currentImage = assets.find((asset) => asset.id === currentImageId);

  return (
    <Row gutter={16} style={{ height: '100%' }}>
      {/* 左侧图片列表 */}
      <Col
        span={8}
        style={{ height: '600px', overflowY: 'auto', borderRight: '1px solid #f0f0f0' }}
      >
        <List
          dataSource={assets}
          renderItem={(item) => {
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
      <Col
        span={16}
        style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {currentImage ? (
          <Card
            style={{ width: '100%', height: '100%' }}
            styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}
          >
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Image
                src={currentImage.fileUrl}
                alt={currentImage.name}
                style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                preview={{ mask: '查看大图' }}
              />
            </div>
            <div style={{ marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '16px', maxHeight: '200px', overflowY: 'auto' }}>
              <Title level={5} ellipsis>
                {currentImage.name}
              </Title>

              {/* 基础文件信息 */}
              <div style={{ marginBottom: '12px' }}>
                <Text strong>文件信息</Text>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  <Text type="secondary">大小: {formatFileSize(currentImage.size)}</Text>
                  <br />
                  <Text type="secondary">类型: {currentImage.mimeType}</Text>
                </div>
              </div>

              {/* 分辨率和像素信息 */}
              {(currentImage.width || currentImage.height) && (
                <div style={{ marginBottom: '12px' }}>
                  <Text strong>图片尺寸</Text>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    <Text type="secondary">
                      分辨率: {formatImageResolution(currentImage.width, currentImage.height)}
                    </Text>
                    <br />
                    {calculateAspectRatio(currentImage.width, currentImage.height) && (
                      <>
                        <Text type="secondary">
                          纵横比: {calculateAspectRatio(currentImage.width, currentImage.height)}
                        </Text>
                        <br />
                      </>
                    )}
                    {currentImage.format && (
                      <Text type="secondary">像素格式: {currentImage.format}</Text>
                    )}
                  </div>
                </div>
              )}

              {/* 经纬度信息（单独显示，如果存在） */}
              {currentImage.exif?.gps && (
                <div style={{ marginBottom: '12px' }}>
                  <Text strong>经纬度</Text>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    <Text type="secondary">纬度: {currentImage.exif.gps.latitude?.toFixed(6)}</Text>
                    <br />
                    <Text type="secondary">经度: {currentImage.exif.gps.longitude?.toFixed(6)}</Text>
                  </div>
                </div>
              )}

              {/* EXIF信息 */}
              {currentImage.exif && Object.keys(currentImage.exif).length > 0 && (
                <div>
                  <Text strong>EXIF信息</Text>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    {currentImage.exif.model && (
                      <>
                        <Text type="secondary">设备: {currentImage.exif.model}</Text>
                        <br />
                      </>
                    )}
                    {currentImage.exif.dateTime && (
                      <>
                        <Text type="secondary">拍摄时间: {currentImage.exif.dateTime}</Text>
                        <br />
                      </>
                    )}
                    {currentImage.exif.fNumber && (
                      <>
                        <Text type="secondary">光圈: {currentImage.exif.fNumber}</Text>
                        <br />
                      </>
                    )}
                    {currentImage.exif.iso && (
                      <>
                        <Text type="secondary">ISO: {currentImage.exif.iso}</Text>
                        <br />
                      </>
                    )}
                    {currentImage.exif.exposureTime && (
                      <>
                        <Text type="secondary">快门速度: {currentImage.exif.exposureTime}</Text>
                        <br />
                      </>
                    )}
                    {currentImage.exif.focalLength && (
                      <>
                        <Text type="secondary">焦距: {currentImage.exif.focalLength}</Text>
                        <br />
                      </>
                    )}
                    {/* GPS 已在上方单独显示，避免重复 */}
                  </div>
                </div>
              )}

              {/* 文件路径 */}
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                <Text type="secondary" style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                  路径: {currentImage.relativePath}
                </Text>
              </div>
            </div>
          </Card>
        ) : (
          <Empty description="请从左侧列表选择图片" />
        )}
      </Col>
    </Row>
  );
}
