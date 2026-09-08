# TinaCMS 后台启用指引（你已注册，从这里往下做）

> 你已完成：注册 TinaCMS、绑定 GitHub 仓库。
> 这份指引只做**你需要自己运行的操作**，共 5 步。
>
> ⚠️ 顺序很重要，别跳步。第 3 步做完之前不要改构建命令，否则云端构建会失败。

---

## 开始前必须知道的一件事

**你现在的部署方式是 `vercel --prod`（本地直传），这和 TinaCMS 的工作方式不匹配。**

TinaCMS 在 `/admin` 里保存内容时，是把改动**提交到你的 GitHub 仓库**，不是直接改线上网站。所以：

- 你在后台改完照片标题 → GitHub 多一个 commit → **但线上网站不会变**
- 必须再手动 `git pull` + `vercel --prod`，改动才会上线

这个流程很别扭。**建议在第 5 步顺手切换成 GitHub 自动部署**：以后 `git push` 就自动上线，后台改完内容也自动生效，不用再手动部署。我会在第 5 步给出具体操作。

如果你坚持用 CLI 直传也能跑，只是每次都要多两步手动操作。

---

## 第 1 步：从 TinaCloud 拿两个值

打开你已经进过的那个项目页面（Overview 页）：

`https://app.tina.io/projects/3b69d295-228e-4694-8060-5081cb989f5c/overview`

页面上找到这两个值并复制：

| 值 | 通常位置 | 形如 |
| --- | --- | --- |
| **Client ID** | Overview 页，一般直接显示 | 一串 UUID，`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| **Token** | Overview 页，可能需要点 "Show" 或去 Settings | 一长串字母数字 |

> ⚠️ **这两个值不要发给我**，也不要截图。Token 等同于后台写入权限，泄露了别人就能改你网站内容。填进 `.env` 就行，那个文件已被 `.gitignore` 排除，永远不会进仓库。
>
> 如果怀疑泄露，回 TinaCloud 后台重新生成一个即可，旧的立即失效。

---

## 第 2 步：把值填进本地 `.env`

新开一个 PowerShell 窗口（**必须新开**，否则 PATH 里没有 Node）：

```powershell
cd D:\Projects\photo-portfolio
Copy-Item .env.example .env
notepad .env
```

记事本打开后，把这两行的等号后面替换成你的真实值：

```
TINA_CLIENT_ID=粘贴你的ClientID
TINA_TOKEN=粘贴你的Token
```

`TINA_TOKEN_LOCAL=` 那行**留空不用管**。保存并关闭记事本。

✅ 验证是否填对了（**这条命令只会显示长度，不会打印内容**）：

```powershell
Get-Content .env | ForEach-Object { if ($_ -match '^(\w+)=(.*)$') { "$($matches[1]) 长度=$($matches[2].Length)" } }
```

正常应看到 `TINA_CLIENT_ID 长度=36` 左右、`TINA_TOKEN 长度=` 一个较大的数字。如果显示 `长度=0` 或还是中文占位符，说明没填进去。

---

## 第 3 步：本地生成 lock 文件并后台产物

```powershell
cd D:\Projects\photo-portfolio
npm run build:cms
```

这条命令依次做三件事：提取 EXIF → `tinacms build`（生成 `tina/tina-lock.json` 和 `public/admin/`）→ `astro build`。

**成功标志**：最后看到 `10 page(s) built` 且没有红色 error。

**如果报错**，最常见两种：

| 报错关键词 | 原因 | 解决 |
| --- | --- | --- |
| `You provided clientId: ` 后面是空的 | `.env` 没被读到 | 确认 `.env` 在项目根目录 `D:\Projects\photo-portfolio`，不是别的文件夹 |
| `project not found` / 404 | Client ID 填错或项目未绑定仓库 | 回 TinaCloud Overview 页重新复制 Client ID |

> 我已验证过：TinaCMS CLI 会自动用 dotenv 加载项目根目录的 `.env`，你不需要手动 export 环境变量。这个行为我读过 CLI 源码确认。

跑完后确认产物：

```powershell
Test-Path tina\tina-lock.json
Test-Path public\admin\index.html
```

两个都应输出 `True`。**`tina-lock.json` 必须提交进仓库**（它记录内容模型，团队共享）；`public/admin/` 是构建产物，已被忽略，不用管。

---

## 第 4 步：把凭据加到 Vercel

⚠️ 这一步必须在改构建命令**之前**做完，否则云端构建会因为拿不到凭据而失败。

1. 打开 `https://vercel.com`，进入你的 `photo-portfolio` 项目
2. **Settings → Environment Variables**
3. 添加两个变量，**Environment 三个框都勾上**（Production / Preview / Development）：

   | Name | Value |
   | --- | --- |
   | `TINA_CLIENT_ID` | 你的 Client ID |
   | `TINA_TOKEN` | 你的 Token |

4. 点 Save

> 这两个值要你自己粘贴，我无法代填。Vercel 会加密存储，且不会显示在构建日志里。

---

## 第 5 步：改构建命令并部署

### 5a. 把构建命令改成含后台的版本

我建议你让我改 `vercel.json`（版本可控，三台设备一致），但**必须等第 4 步的凭据加完**再改，否则构建失败。

改完 `vercel.json` 后，`buildCommand` 会从 `npm run build` 变成 `npm run build:cms`。

或者你也可以在 Vercel 后台改：**Settings → General → Build & Development Settings → Build Command**，填 `npm run build:cms`，注意要**取消勾选 "Override"旁边的默认**让它生效。

**推荐改 `vercel.json`**，理由：后台设置不随仓库走，你在另一台电脑或换部署方式时会丢失。告诉我一声我就帮你改并提交。

### 5b. 建议切换到 GitHub 自动部署（解决开头说的工作流问题）

1. Vercel 控制台 → 项目 → **Settings → Git**
2. 点 **Connect Git Repository**，选 `DBslowstudio/photo-portfolio`，分支 `main`
3. 授权 Vercel 访问你的 GitHub

连上之后：

- 以后 `git push` 自动触发构建部署，不用再跑 `vercel --prod`
- **在 `/admin` 里改内容 → TinaCMS 自动 commit 到 GitHub → 自动触发部署 → 线上更新**，全程无需手动干预
- 这才是 TinaCMS 的正确用法

> 切过去之后，`.vercel/project.json` 那套 CLI 关联就不需要了，但留着也无害。

### 5c. 部署

- 若已连 GitHub：`git push` 即可
- 若仍用 CLI：

```powershell
cd D:\Projects\photo-portfolio
git add tina/tina-lock.json
git commit -m "生成 TinaCMS lock 文件"
git push origin main
vercel --prod
```

---

## 第 6 步：验证后台真的能用

部署完成后：

1. 打开 `https://dbslowstudio.cn/admin`
2. 应该看到 TinaCMS 登录界面 → 用你的 TinaCloud 账号登录
3. 登录后能看到「照片管理」集合，里面 6 张照片
4. **随便改一个照片标题，点 Save**
5. 回 `https://dbslowstudio.cn` 看标题是否变了

第 5 步是否自动生效，取决于你在 5b 有没有连 GitHub：

- **连了** → 等 1-2 分钟自动上线
- **没连** → GitHub 里会有新 commit，但线上不变，需要你 `git pull` + `vercel --prod`

---

## 后台里你能改什么

| 字段 | 说明 |
| --- | --- |
| 照片标题 | 网格和详情页的大标题 |
| 照片文件 | 直接在后台上传新照片（会存到 `public/photos/`） |
| 拍摄日期 | `YYYY-MM-DD`，**决定作品排序**（新的排前面） |
| 拍摄地点 / 照片简介 | 详情页展示 |
| 显示线下扫码二维码 | 开关，关掉详情页就不显示二维码 |
| 二维码中心 Logo | 上传方形透明 PNG，叠在二维码中心（已配 H 级纠错，挡住中心也能扫） |
| 拍摄参数 | 相机/镜头/焦距/光圈/快门/ISO 六项 |

**EXIF 自动提取的行为**：你往 `public/photos/` 丢新照片后，下次构建时脚本会自动填 EXIF 字段，但**只填空字段**——你已经填过的内容绝不会被覆盖。这个行为我做过实测验证（备份 6 个文件 → 跑脚本 → 逐字节比对完全一致）。

---

## 如果 `/admin` 还是 404

按顺序排查：

1. `public\admin\index.html` 本地存在吗？不存在说明第 3 步没跑成功
2. Vercel 构建日志里有 `tinacms build` 的输出吗？没有说明构建命令没改过来
3. Vercel 环境变量加了吗？`vercel env ls` 可以查看
4. 构建日志有没有报 clientId / token 相关错误？

把构建日志的错误部分发给我，我帮你定位。

---

## 我这边已经准备好的

| 项目 | 状态 |
| --- | --- |
| `tina/config.ts` | ✅ 已写好，含正确的 `tina/` 路径（不是文档写的 `.tina/`）和 `build.publicFolder`/`outputFolder` |
| 后台产物输出配置 | ✅ `publicFolder: 'public'` + `outputFolder: 'admin'`，缺这个 `/admin` 必 404 |
| 内容模型 | ✅ 16 个字段，与 `src/content.config.ts` 的 schema 完全对应 |
| `.env.example` 模板 | ✅ 已备好，含安全提示 |
| `.gitignore` | ✅ 已排除 `.env`（凭据）和 `public/admin/`（产物），保留 `tina-lock.json` |
| `npm run build:cms` 脚本 | ✅ 已定义 |
| `allowScripts` 放行 | ✅ 已放行 `better-sqlite3`，否则云端构建会崩 |
| 配置结构验证 | ✅ 已用占位凭据实测，CLI 正确读出了 clientId/branch/token，失败原因是凭据无效而非配置错误 |

**我做不了的**：注册账号、读取你后台页面上的 Client ID 和 Token、在 Vercel 后台粘贴环境变量、用你的账号登录 `/admin`。这些都是账号级操作，只能你本人完成。
