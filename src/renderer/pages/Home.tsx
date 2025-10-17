import {
    CustomerServiceOutlined,
    FolderOutlined,
    PictureOutlined,
    ToolOutlined,
} from '@ant-design/icons';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import { ToolConfig } from '@shared/types';
import { createLogger } from '@shared/utils/logger';
import { Card, Col, Row, Space, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const logger = createLogger('HomePage');

const { Title, Paragraph } = Typography;

function Home() {
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const electronAPI = useElectronAPI();
  const navigate = useNavigate();

  const loadTools = useCallback(async () => {
    try {
      const toolList = await electronAPI.getToolList();
      setTools(toolList);
      logger.success('Loaded tool list', { count: toolList.length });
    } catch (error) {
      logger.error('Failed to load tools', error);
    }
  }, [electronAPI]);

  useEffect(() => {
    void loadTools();
  }, [loadTools]);

  const getIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <PictureOutlined />;
      case 'file':
        return <FolderOutlined />;
      case 'audio':
        return <CustomerServiceOutlined />;
      case 'video':
        return <span style={{ fontSize: '24px' }}>🎬</span>;
      default:
        return <ToolOutlined />;
    }
  };

  return (
    <div>
      <div>
        <Title level={3}>工具列表</Title>
        <Row gutter={[16, 16]}>
          {tools.map((tool) => (
            <Col key={tool.id} span={8}>
              <Card
                hoverable
                style={{ height: '100%', cursor: 'pointer' }}
                onClick={() => {
                  // For built-in tool categories navigate to dedicated pages
                  if (tool.category === 'image') {
                    navigate('/tools/image');
                    return;
                  }

                  if (tool.category === 'file') {
                    navigate('/tools/file');
                    return;
                  }

                  if (tool.category === 'audio') {
                    navigate('/tools/audio');
                    return;
                  }

                  if (tool.category === 'video') {
                    navigate('/tools/video');
                    return;
                  }

                  // Fallback: call executeTool if other types are provided by main
                  try {
                    void electronAPI.executeTool(tool.id, {});
                  } catch (err) {
                    // ignore — executeTool may not be available in non-Electron env
                    logger.warn('executeTool not available or failed', err);
                  }
                }}
              >
                <Space direction="vertical" size="small">
                  <div style={{ fontSize: '32px' }}>{tool.icon || getIcon(tool.category)}</div>
                  <Title level={4} style={{ margin: 0 }}>
                    {tool.name}
                  </Title>
                  <Paragraph type="secondary" style={{ margin: 0 }}>
                    {tool.description}
                  </Paragraph>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
}

export default Home;
