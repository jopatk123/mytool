import { App as AntdApp, Spin } from 'antd';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';

// 懒加载工具页面以减少主 bundle 大小
const ImageTool = lazy(() => import('./pages/tools/ImageTool'));
const FileTool = lazy(() => import('./pages/tools/FileTool'));
const AudioTool = lazy(() => import('./pages/tools/AudioTool'));
const Settings = lazy(() => import('./pages/Settings'));

// 加载中的占位符
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

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
          {
            path: 'tools/image',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ImageTool />
              </Suspense>
            ),
          },
          {
            path: 'tools/file',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <FileTool />
              </Suspense>
            ),
          },
          {
            path: 'tools/audio',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AudioTool />
              </Suspense>
            ),
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <Settings />
              </Suspense>
            ),
          },
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
