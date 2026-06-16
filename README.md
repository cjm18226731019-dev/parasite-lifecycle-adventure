# 寄生虫生命周期大冒险 V3

## 版本说明

这是《寄生虫生命周期大冒险》V3 离线打包版。  
该版本包含横向卷轴关卡、移动平台、开关门、检查点、药物分子、免疫细胞、生命周期知识卡，并保留移动端触屏虚拟按键适配。

## 文件结构

```text
parasite_lifecycle_adventure_v3_offline_package/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── game.js
├── assets/
│   └── README.txt
├── .nojekyll
└── DEPLOY.md
```

## 本地运行

直接双击 `index.html`，使用浏览器打开即可运行。

推荐浏览器：

- Chrome
- Edge
- Firefox
- Safari

## 操作方式

电脑端：

- A / D 或方向键：移动
- W / 空格：跳跃
- E：互动 / 开关 / 阶段门
- R：回检查点

手机端：

- 使用屏幕下方虚拟按键
- 左移、右移、跳跃、互动、检查点

## 说明

当前版本没有使用外部图片资源，所以离线打开不会缺图。  
所有画面元素由 Canvas 和 CSS 绘制。
