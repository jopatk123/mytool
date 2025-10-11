/**
 * 应用配置
 */
export interface AppConfig {
  windowSize: {
    width: number;
    height: number;
  };
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
}
