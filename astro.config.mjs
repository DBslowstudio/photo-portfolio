// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  /**
   * 指南 6.1 要求的正式域名。这个值同时决定：
   * - 详情页二维码扫描后跳转的地址（QrCode 由它推导 canonical URL）
   * - SEO 的 canonical / sitemap 链接
   *
   * ⚠️ 生效前提：必须先在 Vercel 后台 Settings → Domains 绑定该域名，
   * 并在域名服务商配好 DNS（见部署清单）。域名生效前，二维码会指向一个
   * 暂时打不开的地址——这是预期行为，DNS 生效后自动正确，无需改代码。
   * 若想先用 Vercel 的临时网址验证，把下面这行换成 *.vercel.app 地址即可。
   */
  site: 'https://dbslowstudio.cn',
  output: 'static',
  /**
   * 必须与 vercel.json 的 cleanUrls:true + trailingSlash:false 保持一致。
   * 不设这项时 Astro 默认 'ignore'，Astro.url.pathname 会带上尾斜杠，
   * 导致详情页二维码编码出 https://dbslowstudio.cn/photos/xxx/（带斜杠），
   * 而线上真实网址不带斜杠 —— 扫码会多一次 301 重定向。
   * 二维码常印在名片、展签上，重定向一旦失效就完全扫不开，且印出去无法补救。
   */
  trailingSlash: 'never',
  // mdx() 用于解析 src/content/photos/*.mdx（TinaCMS 的内容载体）
  integrations: [mdx()],
  vite: {
    // @tailwindcss/vite 是 Vite 插件，不是 Astro 集成，只能放在这里。
    // 原先 integrations 和 vite.plugins 各放了一份（重复注册），
    // Astro 7 目前容忍了这种写法，但属于配置错误，已移除 integrations 里的那份。
    plugins: [tailwindcss()],
  },
});
