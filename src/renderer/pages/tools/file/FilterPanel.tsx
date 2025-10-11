import React from 'react';
import { Checkbox, Input, InputNumber, Space, Card, Row, Col, Typography } from 'antd';
import { useFileToolStore } from './store';

const { Text } = Typography;

/**
 * 文件过滤器面板组件
 * 提供大小、扩展名和文件名过滤选项
 */
export const FilterPanel: React.FC = () => {
  const { scanOptions, setScanOptions, isScanning } = useFileToolStore();
  const filter = scanOptions.filter || {};

  const updateFilter = (updates: Partial<typeof filter>) => {
    setScanOptions({
      ...scanOptions,
      filter: {
        ...filter,
        ...updates,
      },
    });
  };

  return (
    <Card title="过滤器设置" size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 大小过滤 */}
        <div>
          <Checkbox
            checked={filter.enableSizeFilter}
            onChange={(e) => updateFilter({ enableSizeFilter: e.target.checked })}
            disabled={isScanning}
          >
            文件大小过滤
          </Checkbox>
          {filter.enableSizeFilter && (
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={12}>
                <Space>
                  <Text>最小:</Text>
                  <InputNumber
                    min={0}
                    // 当未设置时显示为空
                    value={
                      filter.minSize !== undefined ? filter.minSize / (1024 * 1024) : undefined
                    }
                    onChange={(value) =>
                      updateFilter({
                        minSize:
                          value !== undefined && value !== null ? value * 1024 * 1024 : undefined,
                      })
                    }
                    disabled={isScanning}
                    addonAfter="MB"
                    style={{ width: 150 }}
                  />
                </Space>
              </Col>
              <Col span={12}>
                <Space>
                  <Text>最大:</Text>
                  <InputNumber
                    min={0}
                    // 当未设置时显示为空
                    value={
                      filter.maxSize !== undefined ? filter.maxSize / (1024 * 1024) : undefined
                    }
                    onChange={(value) =>
                      updateFilter({
                        maxSize:
                          value !== undefined && value !== null ? value * 1024 * 1024 : undefined,
                      })
                    }
                    disabled={isScanning}
                    addonAfter="MB"
                    style={{ width: 150 }}
                  />
                </Space>
              </Col>
            </Row>
          )}
        </div>

        {/* 扩展名过滤 */}
        <div>
          <Checkbox
            checked={filter.enableExtensionFilter}
            onChange={(e) => updateFilter({ enableExtensionFilter: e.target.checked })}
            disabled={isScanning}
          >
            文件扩展名过滤
          </Checkbox>
          {filter.enableExtensionFilter && (
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 8 }}>
                <Checkbox
                  checked={!!filter.excludeExtensions}
                  onChange={(e) => updateFilter({ excludeExtensions: e.target.checked })}
                  disabled={isScanning}
                >
                  排除这些扩展名（反向过滤）
                </Checkbox>
              </div>
              <Input
                placeholder="输入扩展名，用空格分隔，例如: .jpg .png .pdf"
                value={(filter.extensions || []).join(' ')}
                onChange={(e) => {
                  const extensions = e.target.value
                    .split(/\s+/)
                    .filter((ext) => ext.trim().length > 0);
                  updateFilter({ extensions });
                }}
                disabled={isScanning}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                默认: .jpg .jpeg .png
              </Text>
            </div>
          )}
        </div>

        {/* 文件名关键字过滤 */}
        <div>
          <Checkbox
            checked={filter.enableNameFilter}
            onChange={(e) => updateFilter({ enableNameFilter: e.target.checked })}
            disabled={isScanning}
          >
            文件名关键字过滤
          </Checkbox>
          {filter.enableNameFilter && (
            <div style={{ marginTop: 8 }}>
              <Input
                placeholder="输入文件名关键字"
                value={filter.nameKeyword || ''}
                onChange={(e) => updateFilter({ nameKeyword: e.target.value })}
                disabled={isScanning}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                只显示文件名包含该关键字的文件
              </Text>
            </div>
          )}
        </div>
      </Space>
    </Card>
  );
};
