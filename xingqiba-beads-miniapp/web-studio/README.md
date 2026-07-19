# 星期八拼豆工作台

一个在浏览器中完成照片转拼豆图纸、精细编辑和效果预览的 React 应用。

## 功能

- 照片在本地 Web Worker 中转换，不会主动上传原图
- 支持网格大小、色彩数量、亮度、对比度和裁剪位置调整
- 支持画笔、橡皮、取色、撤销和重做
- 提供拼豆画布、烫后 3D 效果预览和 PNG 导出
- 项目自动保存到浏览器本地存储

## 开发

```bash
npm install
npm run dev
```

如果 `5173` 端口已被占用：

```bash
npm run dev -- --port 5174
```

## 验证

```bash
npm test
npm run build
```

## 主要目录

- `src/components/`：画布和效果预览组件
- `src/domain/`：颜色、色板和项目数据模型
- `src/engine/`：图片转换与导出引擎
- `src/workers/`：非阻塞图片转换线程
