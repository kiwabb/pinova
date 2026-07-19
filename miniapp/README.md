# 星期八拼豆微信小程序

基于 Taro 4 + React 的微信小程序工作台。图片转换、编辑和预览均在本机完成，不上传源图片。

## 已实现

- 相册/相机选图，JPG、PNG 解码
- 像素、插画、真人宠物、风景照片四种转换模式
- CIELAB/CIEDE2000 色板匹配、限色、背景清理、孤立色块清理和可选抖动
- Canvas 画笔、橡皮、吸色、区域填充、撤销和重做
- 48 色体验色板、材料数量、尺寸和 29 格拼板统计
- 二维 SDF 融豆预览，包含摆豆、轻烫、标准和重烫预设
- 图纸/预览保存到相册，本地自动保存项目

## 开发

```bash
npm install
npm run dev:weapp
```

微信开发者工具导入目录：

```text
miniapp/
```

当前 `project.config.json` 使用 `touristappid`，发布前替换为正式小程序 AppID。

## 验证

```bash
npm run build:weapp
npx tsc --noEmit
npm run smoke:weapp
```

自动化截图输出到 `artifacts/`。冒烟测试会验证页面渲染、宠物示例转换、Canvas 编辑与撤销、烫后预览和控制台错误。

## 当前边界

- 48 色为体验色板，生产使用前需要替换为经过实物校准且有授权的品牌色卡。
- 当前转换在页面线程本地执行，并在开始前让出一帧显示加载状态；高分辨率批量处理再迁移到 `wx.createWorker`。
- 融豆预览为微信 Canvas 兼容的二维 SDF 近似效果，网页版仍使用 Three.js Shader。
