import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import Layout from './components/Layout';
import Home from './pages/Home';
import ImageTool from './pages/tools/ImageTool';
import FileTool from './pages/tools/FileTool';
import AudioTool from './pages/tools/AudioTool';
import Settings from './pages/Settings';

function App() {
  type RouterFuture =
    NonNullable<Parameters<typeof createBrowserRouter>[1]> extends {
      future?: infer F;
    }
      ? F
      : never;

  const routerOptions: Parameters<typeof createBrowserRouter>[1] = {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    } as unknown as RouterFuture,
  };

  const router = createBrowserRouter(
    [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'tools/image', element: <ImageTool /> },
          { path: 'tools/file', element: <FileTool /> },
          { path: 'tools/audio', element: <AudioTool /> },
          { path: 'settings', element: <Settings /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
    routerOptions,
  );

  return (
    <AntdApp>
      <RouterProvider router={router} />
    </AntdApp>
  );
}

export default App;
