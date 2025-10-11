import { Menu, BrowserWindow, shell } from 'electron';
import { APP_NAME } from '../../shared/constants';

const isMac = process.platform === 'darwin';

export const setupAppMenu = (mainWindow: BrowserWindow | null): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    // App (macOS)
    ...(isMac
      ? [
          ({
            label: APP_NAME,
            submenu: [
              ({ role: 'about', label: `关于 ${APP_NAME}` } as Electron.MenuItemConstructorOptions),
              ({ type: 'separator' } as Electron.MenuItemConstructorOptions),
              // `services` 在某些 typings 中不可用，省略以避免类型问题
              ({ type: 'separator' } as Electron.MenuItemConstructorOptions),
              ({ role: 'hide', label: `隐藏 ${APP_NAME}` } as Electron.MenuItemConstructorOptions),
              ({ role: 'hideOthers', label: '隐藏其它' } as Electron.MenuItemConstructorOptions),
              ({ role: 'unhide', label: '显示全部' } as Electron.MenuItemConstructorOptions),
              ({ type: 'separator' } as Electron.MenuItemConstructorOptions),
              ({ role: 'quit', label: '退出' } as Electron.MenuItemConstructorOptions),
            ],
          } as Electron.MenuItemConstructorOptions),
        ]
      : []),

    // File（简化，只保留退出/关闭）
    {
      label: '文件',
      submenu: [
        (isMac
          ? ({ role: 'close', label: '关闭窗口' } as Electron.MenuItemConstructorOptions)
          : ({ role: 'quit', label: '退出' } as Electron.MenuItemConstructorOptions)),
      ],
    },

    // View
    {
      label: '视图',
      submenu: [
        ({ role: 'reload', label: '重新加载' } as Electron.MenuItemConstructorOptions),
        ({ role: 'forceReload', label: '强制重新加载' } as Electron.MenuItemConstructorOptions),
        ({ role: 'toggleDevTools', label: '切换开发者工具' } as Electron.MenuItemConstructorOptions),
        { type: 'separator' },
        ({ role: 'resetZoom', label: '重置缩放' } as Electron.MenuItemConstructorOptions),
        ({ role: 'zoomIn', label: '放大' } as Electron.MenuItemConstructorOptions),
        ({ role: 'zoomOut', label: '缩小' } as Electron.MenuItemConstructorOptions),
        ({ type: 'separator' } as Electron.MenuItemConstructorOptions),
        ({
          label: '切换全屏',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        } as Electron.MenuItemConstructorOptions),
      ],
    },

    // Window
    {
      label: '窗口',
      submenu: [
        ({ role: 'minimize', label: '最小化' } as Electron.MenuItemConstructorOptions),
        ({ role: 'zoom', label: '缩放' } as Electron.MenuItemConstructorOptions),
        ...(isMac
          ? [({ type: 'separator' } as Electron.MenuItemConstructorOptions), ({ role: 'front', label: '置于顶层' } as Electron.MenuItemConstructorOptions)]
          : [({ role: 'close', label: '关闭窗口' } as Electron.MenuItemConstructorOptions)]),
      ],
    },

    // Help
    {
      label: '帮助',
      role: 'help',
      submenu: [
        {
          label: '文档',
          click: () => {
            shell.openExternal('https://example.com/docs').catch(() => {});
          },
        },
        {
          label: '在 GitHub 上查看',
          click: () => {
            shell.openExternal('https://github.com/jopatk123/mytool').catch(() => {});
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

export default setupAppMenu;
