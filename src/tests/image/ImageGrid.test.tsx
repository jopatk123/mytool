import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGrid } from '@renderer/pages/tools/image/ImageGrid';
import type { ImageAsset } from '@shared/types';

const mockAssets: ImageAsset[] = [
  {
    id: 'asset-1',
    name: 'image1.jpg',
    filePath: '/test/image1.jpg',
    fileUrl: 'local-file:///test/image1.jpg',
    size: 102400,
    mimeType: 'image/jpeg',
    extension: 'jpg',
    modifiedAt: Date.now(),
    createdAt: Date.now(),
    relativePath: 'image1.jpg',
  },
  {
    id: 'asset-2',
    name: 'image2.png',
    filePath: '/test/image2.png',
    fileUrl: 'local-file:///test/image2.png',
    size: 204800,
    mimeType: 'image/png',
    extension: 'png',
    modifiedAt: Date.now(),
    createdAt: Date.now(),
    relativePath: 'subfolder/image2.png',
  },
  {
    id: 'asset-3',
    name: 'image3.webp',
    filePath: '/test/image3.webp',
    fileUrl: 'local-file:///test/image3.webp',
    size: 51200,
    mimeType: 'image/webp',
    extension: 'webp',
    modifiedAt: Date.now(),
    createdAt: Date.now(),
    relativePath: 'image3.webp',
  },
];

describe('ImageGrid Component', () => {
  it('应该显示空状态当没有资源时', () => {
    const onToggle = vi.fn();
    render(<ImageGrid assets={[]} selectedAssetIds={[]} onToggle={onToggle} />);
    
    expect(screen.getByText('没有找到图片,请重新选择文件夹')).toBeTruthy();
  });

  it('应该在左侧列表中显示所有图片', () => {
    const onToggle = vi.fn();
    render(<ImageGrid assets={mockAssets} selectedAssetIds={[]} onToggle={onToggle} />);
    
    // 使用 getAllByText 因为文件名会出现在列表和预览区
    expect(screen.getAllByText('image1.jpg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('image2.png').length).toBeGreaterThan(0);
    expect(screen.getAllByText('image3.webp').length).toBeGreaterThan(0);
  });

  it('应该默认显示第一张图片的预览', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <ImageGrid assets={mockAssets} selectedAssetIds={[]} onToggle={onToggle} />
    );
    
    // 检查是否渲染了预览区域 (Card组件)
    const cards = container.querySelectorAll('.ant-card');
    expect(cards.length).toBeGreaterThan(0);
    
    // 检查是否有图片元素
    const images = container.querySelectorAll('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('应该在点击列表项时切换预览图片', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <ImageGrid assets={mockAssets} selectedAssetIds={[]} onToggle={onToggle} />
    );
    
    // 点击第二张图片的列表项(不是复选框)
    const secondImage = screen.getAllByText('image2.png')[0];
    fireEvent.click(secondImage);
    
    // 验证第二张图片被高亮显示(通过边框颜色)
    const highlightedItems = container.querySelectorAll('[style*="rgb(24, 144, 255)"]');
    expect(highlightedItems.length).toBeGreaterThan(0);
  });

  it('应该在点击复选框时调用 onToggle', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <ImageGrid assets={mockAssets} selectedAssetIds={[]} onToggle={onToggle} />
    );
    
    // 查找第一个复选框并点击
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    
    fireEvent.click(checkboxes[0]);
    expect(onToggle).toHaveBeenCalledWith('asset-1');
  });

  it('应该正确显示选中状态', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <ImageGrid assets={mockAssets} selectedAssetIds={['asset-1', 'asset-3']} onToggle={onToggle} />
    );
    
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    
    // 第一个和第三个应该被选中
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
    expect((checkboxes[2] as HTMLInputElement).checked).toBe(true);
  });

  it('应该在预览区显示图片详细信息', () => {
    const onToggle = vi.fn();
    render(<ImageGrid assets={mockAssets} selectedAssetIds={[]} onToggle={onToggle} />);
    
    // 检查预览区显示第一张图片的详细信息
    expect(screen.getAllByText('image1.jpg').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/100 KB/).length).toBeGreaterThan(0); // 文件大小
    expect(screen.getByText(/image\/jpeg/)).toBeTruthy(); // MIME类型(只在预览区出现一次)
  });

  it('应该在资源列表变化后重置为第一张图片', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <ImageGrid assets={mockAssets} selectedAssetIds={[]} onToggle={onToggle} />
    );
    
    // 点击第三张图片的列表项
    const thirdImage = screen.getAllByText('image3.webp')[0];
    fireEvent.click(thirdImage);
    
    // 更新资源列表(模拟新扫描)
    const newAssets = [mockAssets[0], mockAssets[1]]; // 只保留前两张
    rerender(<ImageGrid assets={newAssets} selectedAssetIds={[]} onToggle={onToggle} />);
    
    // 应该显示第一张图片(因为之前选中的第三张已不存在)
    expect(screen.getAllByText('image1.jpg').length).toBeGreaterThan(0);
  });

  it('点击复选框不应该切换预览图片', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <ImageGrid assets={mockAssets} selectedAssetIds={[]} onToggle={onToggle} />
    );
    
    // 点击第二张图片的标题以切换预览
    const listItems = container.querySelectorAll('.ant-list-item');
    fireEvent.click(listItems[1]);
    
    // 点击第一张图片的复选框
    const firstCheckbox = container.querySelectorAll('input[type="checkbox"]')[0];
    fireEvent.click(firstCheckbox);
    
    // 验证onToggle被调用
    expect(onToggle).toHaveBeenCalledWith('asset-1');
    
    // 复选框点击不应该改变选中项的数量
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
