"""
本地 AI 批量打标（零积分/零云费用）
用法：
  python scripts/ai_tag.py --test 8     # 先给前 8 张打标看效果（强烈建议先跑）
  python scripts/ai_tag.py              # 全量跑（跳过已生成 tags 的照片）

原理：读 public/photos 下每张图 → 发给本机 Ollama 的 qwen2.5vl:3b
→ 得到若干中文标签 → 只写入 mdx 里 tags 字段为空的那些文件。

安全设计：
- 只填空，绝不覆盖已有 tags（沿用你已验证的「手改绝对优先」原则）
- 支持断点续跑：中断后重跑会自动跳过已完成项
- 不提交 git，跑完人工确认后再提交
"""
import io, json, os, re, sys, base64, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "public", "photos")
CONTENT = os.path.join(ROOT, "src", "content", "photos")
OLLAMA = "http://127.0.0.1:11434/api/generate"
MODEL = "qwen2.5vl:3b"

PROMPT = (
    "你是摄影档案管理员。看这张照片，输出用于中文检索的标签。\n"
    "要求：4-8个词，涵盖【主体物体】【场景/地点类型】【天气或光线】【氛围/季节】。\n"
    "只输出一行，词与词之间用英文逗号分隔，不要编号、不要解释、不要引号、不要句号。\n"
    "示例格式：街景,行人,雨天,霓虹灯,夜景,城市"
)


def read_tags_from_mdx(text):
    m = re.search(r"^tags:\s*\[([^\]]*)\]", text, flags=re.M)
    if m:
        inner = m.group(1).strip()
        if not inner:
            return []
        return [x.strip().strip('"').strip("'") for x in inner.split(",") if x.strip()]
    m = re.search(r"^tags:\s*((?:\n\s*-\s*.+)+)", text, flags=re.M)
    if m:
        return [l.strip().lstrip("-").strip().strip('"').strip("'")
                for l in m.group(1).splitlines() if l.strip()]
    return None


def ask_ollama(img_path, tries=3):
    with open(img_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    payload = json.dumps({
        "model": MODEL, "prompt": PROMPT, "images": [b64],
        "stream": False, "options": {"temperature": 0.2},
    }).encode()
    for i in range(tries):
        try:
            req = urllib.request.Request(OLLAMA, data=payload,
                                         headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=240) as r:
                return json.loads(r.read().decode()).get("response", "")
        except Exception as e:
            if i == tries - 1:
                return f"__ERR__ {e}"
            time.sleep(3 * (i + 1))


def norm_tags(raw):
    raw = raw.replace("__ERR__", "")
    raw = re.sub(r"^(标签|tags|答案)[:：]\s*", "", raw.strip(), flags=re.I)
    parts = re.split(r"[,，\n、;；]", raw)
    out = []
    for p in parts:
        p = re.sub(r"^[\d\.\-\*\s\"'“”]+", "", p).strip().strip('"').strip("'")
        p = re.sub(r"[。\.]+$", "", p)
        if 1 <= len(p) <= 12 and "标签" not in p and p not in out:
            out.append(p)
    return out[:8]


def write_tags(slug, tags):
    fp = os.path.join(CONTENT, f"{slug}.mdx")
    if not os.path.exists(fp):
        fp = os.path.join(CONTENT, f"{slug}.md")
    if not os.path.exists(fp):
        return "no-mdx"
    t = io.open(fp, encoding="utf-8").read()
    line = "tags: [" + ", ".join(json.dumps(x, ensure_ascii=False) for x in tags) + "]"
    if re.search(r"^tags:", t, flags=re.M):
        t2 = re.sub(r"^tags:.*$", line, t, flags=re.M)
        t2 = re.sub(r"^tags:\s*\n(?:\s+-\s+.*\n)+", line + "\n", t2, flags=re.M)
    elif "---" in t:
        t2 = re.sub(r"^(---\n(?:.|\n)*?)^---", r"\1" + line + "\n---", t, count=1, flags=re.M)
    else:
        return "bad-mdx"
    io.open(fp, "w", encoding="utf-8", newline="").write(t2)
    return "ok"


def main():
    limit = None
    if "--test" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--test") + 1])

    files = sorted(f for f in os.listdir(PHOTOS) if re.search(r"\.(jpe?g|png|webp)$", f, re.I))
    todo = []
    for f in files:
        slug = re.sub(r"\.[^.]+$", "", f)
        for cand in (f"{slug}.mdx", f"{slug}.md"):
            fp = os.path.join(CONTENT, cand)
            if os.path.exists(fp):
                ex = read_tags_from_mdx(io.open(fp, encoding="utf-8").read())
                if ex:      # 已有非空 tags → 跳过（保护手改）
                    f = None
                break
        if f:
            todo.append((slug, os.path.join(PHOTOS, *[x for x in os.listdir(PHOTOS)
                                                    if re.sub(r"\.[^.]+$", "", x) == slug][0])))
    if limit:
        todo = todo[:limit]

    print(f"待打标 {len(todo)} 张（已有 tags 的自动跳过）")
    done = fail = 0
    t0 = time.time()
    for i, (slug, path) in enumerate(todo, 1):
        raw = ask_ollama(path)
        tags = norm_tags(raw)
        if raw.startswith("__ERR__") or not tags:
            fail += 1
            print(f"  [{i}/{len(todo)}] {slug} -> 失败/空，稍后重跑即可续上")
            continue
        write_tags(slug, tags)
        done += 1
        print(f"  [{i}/{len(todo)}] {slug} -> {','.join(tags)}  "
              f"({(time.time()-t0)/i:.0f}s/张, 剩余约 {(len(todo)-i)*(time.time()-t0)/i/60:.0f} 分钟)")
    print(f"\n完成 {done}，失败 {fail}。请抽查质量后执行：")
    print("  git add src/content && git commit -m 'chore: AI 批量打标' && git push")


main()
