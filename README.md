# neonskill

Bộ **8 skill `neon-*`** + agent **`@verifier`** (`agents/verifier.md`) chuẩn hóa quy trình phát triển phần mềm cho **Gemini 4 Neon** và **Gemini 4 Hydrogen** trên **Antigravity**, **T3 Code** và **Orca** (`orca-cli` + `orchestration`), tích hợp đầy đủ với các lệnh native (`/grill-me`, `/goal`, `/boost`, `/swarm`, `/teamwork`).

## Tổng quan quy trình

```text
neon-init  ──▶  neon-plan (Explore + Adaptive Grill / /grill-me + Mode Routing)
                    │
        ┌───────────┼───────────────────┐
        ▼           ▼                   ▼
   neon-slice   neon-teamwork      /teamwork
  (+ /goal)     (swarm / T3 Code    (dự án nhiều
        │        / Orca workers)     milestone)
        └───────────┬───────────────────┘
                    ▼
               neon-review  ◀──┐
                    │          │ (tối đa 3 vòng;
         ┌──────────┴────┐     │  2-strike check SPEC + /boost)
         ▼ (0 sev 1-2)   ▼     │
     neon-ship       neon-fix ─┘

  * Gần chạm 512K context / limit 5h: /compact hoặc neon-handoff
```

## Cài đặt nhanh không cần clone (`npx`)

> Yêu cầu Node.js `>= 18`. Không phụ thuộc thư viện ngoài.

### 1. Cài toàn cục cho Antigravity / T3 Code
```bash
npx github:thapld/neonskill
```
Hoặc dùng URL `git+https`:
```bash
npx git+https://github.com/thapld/neonskill.git --global
```
*(Cài toàn bộ 8 skill vào `~/.gemini/config/skills/neon-*` và `@verifier` vào `~/.gemini/config/agents/verifier.md`.)*

### 2. Cài cho Orca (dùng chung cho Claude, Codex, Antigravity, Gemini, Hermes...)
```bash
npx github:thapld/neonskill --orca
```
Hoặc cài cho **cả Antigravity/T3 Code lẫn Orca universal** cùng lúc:
```bash
npx github:thapld/neonskill --target all
```
*(Cài vào `~/.agents/skills/neon-*` + `~/.agents/agents/verifier.md` với `--orca`, hoặc cả hai vị trí `~/.gemini/config/...` và `~/.agents/...` với `--target all`.)*

### 3. Cài riêng vào một project hiện tại (Antigravity, T3 Code & Orca đều tự nhận)
```bash
npx github:thapld/neonskill --project
```
Hoặc chỉ định đường dẫn repo (hỗ trợ cả `--project <dir>` lẫn `--project=<dir>`):
```bash
npx github:thapld/neonskill --project /duong/dan/toi/repo
```
*(Cài vào `<repo>/.agents/skills/neon-*` và `<repo>/.agents/agents/verifier.md`.)*

### 4. Các tùy chọn `npx` khác
```bash
npx github:thapld/neonskill --list                             # Liệt kê 8 skill & agent đi kèm
npx github:thapld/neonskill --only=neon-init,neon-plan         # Chỉ cài/gỡ vài skill cụ thể (không đụng verifier.md)
npx github:thapld/neonskill --no-agents                        # Chỉ cài/gỡ skills, bỏ qua agents/verifier.md
npx github:thapld/neonskill --dry-run --target all             # Xem trước đường dẫn cài/gỡ, không ghi file
npx github:thapld/neonskill --uninstall --target all           # Gỡ các skill neon-* và verifier.md đã cài
npx github:thapld/neonskill --uninstall --project              # Gỡ các skill neon-* và verifier.md khỏi project hiện tại
```

### 5. Cách cài bằng `install.sh` (nếu bạn clone repo)
```bash
git clone https://github.com/thapld/neonskill.git
cd neonskill
./install.sh --global            # hoặc --orca | --target all | --project /path/to/repo
./install.sh --symlink --global  # symlink cả neon-* và verifier.md để phát triển local
./install.sh --uninstall --target all  # hỗ trợ --no-agents và --dry-run
```

---

## Danh sách 8 Skill

| Skill | Vai trò | Model & Thinking khuyến nghị |
| :--- | :--- | :--- |
| `neon-init` | Khởi tạo `AGENTS.md` (tĩnh, auto-load), `DECISIONS.md` và gợi ý `.gitignore` | Gemini 4 Neon · `HIGH` |
| `neon-plan` | Lập `10-line Codebase Map`, **Adaptive Grill** trước khi viết `SPEC.md`, chọn mode chạy | Gemini 4 Neon · `HIGH` |
| `neon-slice` | Thực thi 1 slice trong worktree: Zero-Stub, cấm nới test, hỗ trợ Orca status/browser, gợi ý `/goal` & `/boost` | Gemini 4 Hydrogen · `MEDIUM`/`HIGH` |
| `neon-teamwork` | Chọn đúng engine: `/teamwork`, native `swarm`, **Orca `orchestration`**, hoặc T3 Code `delegate_task` | Coordinator: Neon `HIGH` · Workers: Hydrogen |
| `neon-review` | Mở file test đầu tiên, kiểm tra diff đã commit + chưa commit, dán ≥ 20 dòng cuối `<TEST_CMD>` | Gemini 4 Neon · `HIGH` (nâng `XHIGH` nếu fail/rủi ro cao) |
| `neon-fix` | Sửa lỗi severity 1–2 test-first, có 2-strike plan-check + leo thang `/boost` và hard cap 3 vòng | Gemini 4 Hydrogen · `MEDIUM`/`HIGH` |
| `neon-ship` | Lọc file tạm, chốt docs, mở Draft PR, tự link PR (T3 Code `link_pull_request` / Orca `worktree set --pr`) | Gemini 4 Hydrogen · `LOW`/`MEDIUM` |
| `neon-handoff` | Lưu trạng thái & blockers vào `HANDOFF.md`, hoặc hướng dẫn Orca full handoff | Main thread / Coordinator |
| `@verifier` (`agents/verifier.md`) | Subagent read-only cho `/swarm`: mở file test đầu tiên, đối chiếu `file:line`, chạy `<TEST_CMD>` và dán ≥ 20 dòng output trước khi kết luận `PASS`/`REJECT` | Context mới (`workspace: "inherit"`, khác model worker) |

---

## Hướng dẫn sử dụng trong Project & trên Orca

### Bước 1: Khởi tạo repo (`neon-init`)
```text
/neon-init Thiết lập AGENTS.md và DECISIONS.md cho repo này
```
Tự dò stack và lệnh test/lint/typecheck, tạo `AGENTS.md` tĩnh (được Antigravity, T3 Code và các agent trong Orca tự nạp) + `DECISIONS.md`.

### Bước 2: Lên kế hoạch & Grill Me (`neon-plan` + `/grill-me`)
```text
/neon-plan Thêm tính năng giới hạn tốc độ API theo gói người dùng
```
1. Đọc `AGENTS.md`, `DECISIONS.md`, code liên quan → xuất **Codebase Map (≤10 dòng)** + **Top 3 file rủi ro nhất (`path:line`)**.
2. **Adaptive Grill Gate**: hỏi ngược lại bạn (có `(Recommended)` đứng đầu) trước khi viết `SPEC.md`. Với bài toán lớn/nhiều ngã rẽ, bạn có thể chạy thẳng `/grill-me` trước hoặc cùng `/plan`.
3. Lưu quyết định vào `DECISIONS.md`, chọn mode chạy, xuất `SPEC.md` và **dừng chờ bạn duyệt**.

### Bước 3: Phối hợp theo từng môi trường (Antigravity / T3 Code / Orca)

| Tình huống | Antigravity / T3 Code | Trên **Orca** |
| :--- | :--- | :--- |
| 1 việc phụ đơn lẻ | `invoke_subagent` | `orca agent launch` / subagent |
| 1 slice gọn chạy tuần tự | `Dùng neon-slice thực hiện Slice 1` | `neon-slice` (+ `orca ports`, `orca worktree set --comment`) |
| 1 slice dài cần bằng chứng pass | `/goal Dùng neon-slice thực hiện Slice 1...` | Dùng `neon-slice` hoặc `orca orchestration` supervised |
| Bug khó / fail lặp 2 lần | `/boost Fix <bug> tại <file:line>...` | `neon-fix` 2-strike circuit breaker / escalate |
| Song song nhiều file (shared board) | Native `swarm` / `/swarm <task>` | `neon-teamwork` (**Orca Orchestration Mode**) |
| Song song tách worktree độc lập | `neon-teamwork` (`delegate_task` worktrees) | `neon-teamwork` (`orca orchestration worker-start --worktree new-child`) |
| Bàn giao một chiều sang agent khác | — | `neon-handoff` → `orca worktree create --no-parent --agent ...` |
| Dự án dài nhiều milestone | `/teamwork <goal>` | `neon-teamwork` (`run-create` + `task-create` DAG) |

### Bước 4: Review, Sửa lỗi & Ship (`neon-review` → `neon-fix` → `neon-ship`)
* `neon-review` mở **file test đầu tiên** (bắt lỗi nới lỏng/skip test), audit cả thay đổi đã commit lẫn chưa commit, chạy `<TEST_CMD>` (ưu tiên unit test logic thuần trước browser và tách nhiễu 404 `/favicon.ico` khỏi lỗi thật) và (nếu được bật trong `SPEC.md`) kiểm tra browser (`preview_*` / `/browser` hoặc `orca-cli` `snapshot`/`screenshot`); PR lớn có thể chia vai read-only (`@simplicity`, `@edge-cases`, `@security`, `@ux`).
* `neon-fix` sửa severity 1–2 theo kiểu test-first (2-strike kiểm tra lại `SPEC.md` + gợi ý `/boost`, tối đa 3 vòng).
* `neon-ship` lọc `HANDOFF.md`, cập nhật `README.md` + 3-line `CHANGELOG.md`, mở Draft PR (tránh heredoc `<<` / `<<<` bằng `--body-file`), tự gắn PR vào thread T3 Code hoặc Orca worktree (`orca worktree set --pr` / `orca reference add`), sau đó gợi ý tùy chọn `IMPROVE` và `ITERATE`.

### Bước 5: Bảo toàn trạng thái (`neon-handoff`) & Thực hành tốt cho Gemini 4 Neon / `/swarm`
* Khi gần chạm **512K context** trên Antigravity app hoặc giới hạn 5 giờ/tuần: ưu tiên `/compact`; nếu cần reset sạch thì chạy `neon-handoff` ở thread chính để ghi `HANDOFF.md`, sau đó `/clear` và nạp lại từ `AGENTS.md` + `DECISIONS.md` + `HANDOFF.md`.
* **Thinking-level cost discipline:** Chi phí theo thinking level tăng theo đường cong `low` 1x · `medium` 2.5x · `high` 5x · `xhigh` 8.6x (~72% đắt hơn `high` nhưng lợi ích tăng thêm thường nhỏ). Mặc định planner, coordinator và reviewer ở **`HIGH`**, chỉ bật **`XHIGH`** khi thật sự kẹt hoặc ở domain rủi ro cao; trên repo lớn/lạ, chạy `/swarm` read-only audit trước khi cấp quyền ghi.
* **`/swarm` model pinning, output cost & Council of Models:** Frontmatter `.agents/agents/*.md` chỉ nhận tier `inherit | flash | pro` — hãy pin model cụ thể (như Carbon, Neon, Opus 5.5 cho `@verifier`) qua coordinator prompt hoặc tab Members; giữ báo cáo worker ngắn gọn có cấu trúc (output token chiếm phần lớn chi phí swarm); với kiến trúc hoặc UI chưa có test tự động, có thể dùng **Council of Models** `/swarm` read-only trong `neon-plan`.
* **Implicit Prompt Caching:** Giữ `AGENTS.md` ngắn gọn, 100% tĩnh ở đầu prompt (không ghi timestamp hay tiến độ đang chạy) để kích hoạt Gemini implicit caching (4.096+ token, giảm tới 95% chi phí input).
* **`gemini-api` CLI (`google-gemini/gemini-api-cli`):** Tùy chọn gọn nhẹ qua shell khi cần tạo/phân tích media (ảnh, video, TTS, PDF/screenshot) hoặc Deep Research chạy nền mà không cần cài thêm MCP server nặng.
* **Deep Debugging (`Measure before you theorize`):** Với bug hiệu năng hoặc lỗi phụ thuộc môi trường khó nhằn, đo và lập bảng thời gian từng chặng (kể cả tầng OS, disk, mount, DNS, CPU) trước khi đoán nguyên nhân hay sửa code (*"if you did not measure it, say 'not measured'"*).
* **Daily driver:** Khi chạy `neon-slice` thường ngày trên Antigravity, có thể chọn **`Orchestrator (Neon)`**; dùng **`/btw <câu hỏi>`** để hỏi nhanh không làm loãng context; đặt **`AI Credit Overages → Never`** khi theo dõi `/usage`.

---

## Cấu trúc thư mục

```text
neonskill/
├── package.json
├── bin/cli.mjs
├── install.sh
├── README.md
├── .gitignore
├── agents/
│   └── verifier.md
└── skills/
    ├── neon-init/SKILL.md
    ├── neon-plan/SKILL.md
    ├── neon-slice/SKILL.md
    ├── neon-teamwork/SKILL.md
    ├── neon-review/SKILL.md
    ├── neon-fix/SKILL.md
    ├── neon-ship/SKILL.md
    └── neon-handoff/SKILL.md
```
