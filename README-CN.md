<p >
    <br> <a href="README.md">English</a> | 中文
</p>
<p >
    基于AI的多功能语言学习工具。
</p>

## 更新日志

[更新日志](./CHANGELOG-CN.md)


## GPT-Tutor是什么

想象如果有这样一个老师：24h无条件、耐心向你解释所有学习问题，可以帮助你学习发音，学习和复习单词、解释你不懂的语法，帮助你精读文章、练习写作，它就是**GPT-Tutor**。

### GPT-Tutor如何工作

很简单：**你提问，GPT-Tutor回答**。

### GPT-Tutor的优点

- **24h、无条件、绝对耐心**，能够为你解释所有读音、单词、语法，并且帮助你阅读文章、练习写作。

- **支持学习多种语言**，包括英语、日语、法语、德语等多种语言的学习。

- **同时学习发音、单词、句子、语法和写作**，将整个学习过程串联在一起。

- **模拟母语学习**。GPT-Tutor能够让你像母语使用者一样学习并掌握一门语言。

- **自定义**。你能够根据你的学科、职业、学习习惯来**自定义**你的学习方法和学习内容。

### GPT-Tutor是否付费？

免费且开源。

### 下载和使用

心动了？通过[Chrome应用商店](https://chromewebstore.google.com/detail/gpt-tutor/icbphcgipdflenaemgkhmigfiaelpbnn?hl=en)下载使用！

> 有任何问题请查阅现有issue，或者[加入Telegram](https://t.me/+p5mMQhx1_rsxN2I1)询问.


# 如何安装

## 1.Chrome应用商店

你可以直接点击链接通过[Chrome应用商店](https://chromewebstore.google.com/detail/gpt-tutor/icbphcgipdflenaemgkhmigfiaelpbnn?hl=en)下载，但是有时候可能因为审核，应用商店上的gpt-tutor并不是最新的版本。


## 2.通过开发者模式直接加载最新版本的安装包

1.点击Release中的**最新版本**

![alt text](./public/image-1.png)

2.点击下载chromium.zip，**解压缩**到本地

![alt text](./public/image-2.png)

3.打开扩展程序，然后点击最下方的**管理扩展程序**

![alt text](./public/image-3.png)

4.打开**开发者模式**

![alt text](./public/image-4.png)

5.打开开发者模式之后，左上角会出现新的按钮，点击**加载已解压的扩展程序**

![alt text](./public/image-5.png)

6.将解压后的文件夹导入，注意需要先打开解压后的文件夹，然后再导入里面的同名文件夹

![alt text](./public/image-6.png)

7.最后点击管理扩展程序，然后将gpt-tutor固定在浏览器上

![alt text](./public/image-7.png)

# License

[LICENSE](./LICENSE)

# 开发者指南

想要参与GPT-Tutor的开发？以下是基本指引：

## 开发环境设置

1. 克隆仓库
2. 安装依赖：

```bash
pnpm install
```

## 开发者提示

### 常用命令

- 安装依赖：

```bash
pnpm install
```

- 开发模式（支持热更新）：

```bash
npm run watch
```

- 构建浏览器扩展：

```bash
make build-browser-extension
```

- 代码格式化：

```bash
npm run lint:fix    # 修复代码格式问题
npm run format     # 格式化代码
```

### 开发流程

1. Fork 项目并克隆到本地
2. 创建新的功能分支：`git checkout -b feature/your-feature-name`
3. 安装依赖：`pnpm install`
4. 启动开发模式：`npm run watch`
5. 在Chrome扩展管理页面加载`dist/browser-extension/chromium`目录
6. 开发完成后运行代码格式化：`npm run lint:fix && npm run format`
7. 提交代码并创建Pull Request

### 目录结构

- `src/browser-extension/`: 浏览器扩展相关代码
  - `background/`: 后台脚本
  - `content_script/`: 内容脚本
  - `popup/`: 弹出窗口
- `src/common/`: 共用组件和工具
- `public/`: 静态资源文件

### 注意事项

- 提交PR前请确保代码已经过格式化
- 新功能请添加相应的测试用例
- 遵循项目既定的代码风格
- 重要更新请更新CHANGELOG.md
