# 在线部署说明

目前本文件包已经整理成可部署结构，只要把整个文件夹上传到静态网站托管平台即可生成在线访问链接。

## 方式一：Netlify Drop，最快

1. 打开 Netlify Drop 页面。
2. 将整个 `parasite_lifecycle_adventure_v3_offline_package` 文件夹拖进去。
3. 等待上传完成。
4. Netlify 会自动生成一个在线访问链接。
5. 打开链接即可在线游玩。

适合：最快获得可分享链接。

## 方式二：GitHub Pages

1. 新建一个 GitHub 仓库。
2. 上传本文件夹中的所有文件：`index.html`、`css/`、`js/`、`assets/`、`.nojekyll`。
3. 进入仓库 Settings。
4. 找到 Pages。
5. Source 选择 `Deploy from a branch`。
6. Branch 选择 `main`，目录选择 `/root`。
7. 保存后等待 1-3 分钟。
8. GitHub 会生成一个 Pages 链接。

适合：长期保存和迭代。

## 方式三：学校服务器 / 班级网站

将文件夹上传到任意支持静态网页的服务器，确保 `index.html` 位于访问目录根部即可。

## 注意事项

- 不需要 Node.js。
- 不需要 Python。
- 不需要数据库。
- 不需要后端。
- 这是纯静态 HTML + CSS + JS 游戏。
