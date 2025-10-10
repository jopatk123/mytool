import { Card, Typography, Divider } from 'antd';
import { FolderSelector } from './file/FolderSelector';
import { FilterPanel } from './file/FilterPanel';
import { ActionPanel } from './file/ActionPanel';
import { FileTable } from './file/FileTable';

const { Title } = Typography;

/**
 * 文件工具主页面
 * 整合文件夹选择、过滤器、操作面板和文件列表
 */
function FileTool() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>文件工具</Title>
      
      <Card style={{ marginBottom: 16 }}>
        <FolderSelector />
        <Divider />
        <FilterPanel />
      </Card>

      <Card>
        <ActionPanel />
        <FileTable />
      </Card>
    </div>
  );
}

export default FileTool;
