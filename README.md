# neonskill

Bộ **8 skill `neon-*`** chuẩn hóa quy trình phát triển phần mềm cho **Gemini 4 Neon** và **Gemini 4 Hydrogen** trên **T3 Code / Antigravity**, tích hợp đầy đủ với các lệnh native của Antigravity (`/grill-me`, `/goal`, `/boost`, `/swarm`, `/teamwork`).

## Tổng quan quy trình

```text
neon-init  ──▶  neon-plan (Explore + Adaptive Grill / /grill-me + Mode Routing)
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   neon-slice   neon-teamwork  /teamwork
  (+ /goal)     (swarm /       (dự án nhiều
        │       worktrees)      milestone)
        └───────────┬───────────┘
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

### 1. Cài toàn cục (dùng cho mọi project trên máy)
```bash
npx github:thapld/neonskill
```
Hoặc dùng URL `git+https`:
```bash
npx git+https://github.com/thapld/neonskill.git --global
```
*(Cài toàn bộ 8 skill vào `~/.gemini/config/skills/neon-*`.)*

### 2. Cài riêng vào một project hiện tại
```bash
npx github:thapld/neonskill --project
```
Hoặc chỉ định đường dẫn repo (hỗ trợ cả `--project <dir>` lẫn `--project=<dir>`):
```bash
npx github:thapld/neonskill --project /duong/dan/toi/repo
```
*(Cài vào `<repo>/.agents/skills/neon-*`, tự động trở thành slash command `/neon-init`, `/neon-plan`, ... trong Antigravity / T3 Code.)*

### 3. Các tùy chọn `npx` khác
```bash
npx github:thapld/neonskill --list                       # Liệt kê 8 skill
npx github:thapld/neonskill --only=neon-init,neon-plan   # Chỉ cài vài skill cụ thể
npx github:thapld/neonskill --dry-run --project          # Xem trước đường dẫn cài, không ghi file
npx github:thapld/neonskill --uninstall                  # Gỡ các skill neon-* đã cài (global)
npx github:thapld/neonskill --uninstall --project        # Gỡ các skill neon-* khỏi project hiện tại
```

### 4. Cách cài bằng `install.sh` (nếu bạn clone repo)
```bash
git clone https://github.com/thapld/neonskill.git
cd neonskill
./install.sh --global          # hoặc ./install.sh --project /path/to/repo
```

---

## Danh sách 8 Skill

| Skill | Vai trò | Model & Thinking khuyến nghị |
| :--- | :--- | :--- |
| `neon-init` | Khởi tạo `AGENTS.md` (tĩnh, auto-load), `DECISIONS.md` và gợi ý `.gitignore` | Gemini 4 Neon · `HIGH` |
| `neon-plan` | Lập `10-line Codebase Map`, **Adaptive Grill** trước khi viết `SPEC.md`, chọn mode chạy | Gemini 4 Neon · `HIGH` |
| `neon-slice` | Thực thi 1 slice trong worktree: Zero-Stub, cấm nới test, gợi ý `/goal` cho slice dài và `/boost` khi kẹt bug khó | Gemini 4 Hydrogen · `MEDIUM`/`HIGH` |
| `neon-teamwork` | Chọn đúng engine: `/teamwork` (multi-milestone), native `swarm` (shared board + `@verifier`), hoặc `delegate_task` worktrees | Coordinator: Neon `HIGH` · Workers: Hydrogen |
| `neon-review` | Mở file test đầu tiên, kiểm chứng từng `file:line`, dán ≥ 20 dòng cuối `<TEST_CMD>`, audit `SPEC.md` | Gemini 4 Neon · `HIGH` (nâng `XHIGH` nếu fail/rủi ro cao) |
| `neon-fix` | Sửa lỗi severity 1–2 test-first, có 2-strike plan-check + leo thang `/boost` và hard cap 3 vòng | Gemini 4 Hydrogen · `MEDIUM`/`HIGH` |
| `neon-ship` | Lọc file tạm, chốt docs (`README.md`, 3-line `CHANGELOG.md`), mở Draft PR (+ `IMPROVE`/`ITERATE`) | Gemini 4 Hydrogen · `LOW`/`MEDIUM` |
| `neon-handoff` | Lưu trạng thái, `file:line` đang dở, blockers và 3 lệnh tiếp theo vào `HANDOFF.md` | Main thread / Coordinator |

---

## Hướng dẫn sử dụng trong Project

### Bước 1: Khởi tạo repo (`neon-init`)
```text
/neon-init Thiết lập AGENTS.md và DECISIONS.md cho repo này
```
Tự dò stack và lệnh test/lint/typecheck, tạo `AGENTS.md` tĩnh (được Antigravity tự nạp ở mọi lượt) + `DECISIONS.md`.

### Bước 2: Lên kế hoạch & Grill Me (`neon-plan` + `/grill-me`)
```text
/neon-plan Thêm tính năng giới hạn tốc độ API theo gói người dùng
```
1. Đọc `AGENTS.md`, `DECISIONS.md`, code liên quan → xuất **Codebase Map (≤10 dòng)** + **Top 3 file rủi ro nhất (`path:line`)**.
2. **Adaptive Grill Gate**: hỏi ngược lại bạn (có `(Recommended)` đứng đầu) trước khi viết `SPEC.md`. Với bài toán lớn/nhiều ngã rẽ, bạn có thể chạy thẳng `/grill-me` trước hoặc cùng `/plan`.
3. Lưu quyết định vào `DECISIONS.md`, chọn mode chạy, xuất `SPEC.md` và **dừng chờ bạn duyệt**.

### Bước 3: Phối hợp với các Slash Command native của Antigravity

| Tình huống | Cách gọi khuyến nghị |
| :--- | :--- |
| 1 việc phụ đơn lẻ (research, chạy test) | `invoke_subagent` |
| 1 slice gọn chạy tuần tự | `Dùng neon-slice thực hiện Slice 1 trong SPEC.md` |
| 1 slice dài / cần chạy tới khi có bằng chứng pass | `/goal Dùng neon-slice thực hiện Slice 1 trong SPEC.md: <TEST_CMD> pass và có test mới` |
| Gặp bug khó, race condition, thuật toán hoặc fail lặp 2 lần | `/boost Fix <mô tả bug> tại <file:line>; repro: <repro>; verify với <TEST_CMD>` |
| Nhiều file độc lập trong Antigravity (shared board) | Dùng `neon-teamwork` (engine native `swarm`) hoặc `/swarm <task>` |
| Nhiều slice cần tách worktree/port/DB trên T3 Code (hoặc cross-provider) | `Dùng neon-teamwork điều phối các slice trong SPEC.md` |
| Dự án dài nhiều milestone (vài giờ → nhiều ngày) | `/teamwork <goal> — bám theo SPEC.md và AGENTS.md` |

### Bước 4: Review & Sửa lỗi (`neon-review` → `neon-fix` → `/boost`)
```text
Chạy neon-review trên diff hiện tại so với SPEC.md.
```
* Reviewer mở **file test đầu tiên** (bắt lỗi nới lỏng hoặc skip test), mở lại mọi `file:line`, dán ít nhất 20 dòng cuối output thật.
* Nếu có lỗi `severity 1–2`, chạy `neon-fix` (viết failing test trước khi sửa, tối đa 3 vòng). Nếu cùng 1 lỗi fail 2 lần liên tiếp hoặc là bug sâu, skill sẽ kiểm tra lại giả định trong `SPEC.md` và xuất sẵn lệnh `/boost` để xử lý triệt để.

### Bước 5: Đóng gói & Mở Draft PR (`neon-ship`)
```text
Chạy neon-ship để hoàn thiện docs và mở Draft PR.
```
Lọc `HANDOFF.md` khỏi commit, cập nhật `README.md` + 3-line `CHANGELOG.md`, push nhánh, mở Draft PR kèm output test thật, sau đó gợi ý tùy chọn `IMPROVE` (1 cải tiến cho `AGENTS.md`) và `ITERATE` (3 ý tưởng v2).

### Bước 6: Bảo toàn trạng thái (`neon-handoff`) & Mẹo vận hành thực chiến
* Khi gần chạm **512K context** trên Antigravity app hoặc giới hạn 5 giờ/tuần: ưu tiên `/compact`; nếu cần reset sạch thì chạy `neon-handoff` ở thread chính để ghi `HANDOFF.md`, sau đó `/clear` và nạp lại từ `AGENTS.md` + `DECISIONS.md` + `HANDOFF.md`.
* **Daily driver:** Khi chạy `neon-slice` thường ngày trên Antigravity, có thể chọn model **`Orchestrator (Neon)`** (Neon lập kế hoạch/review, Hydrogen thực thi nhanh & tiết kiệm quota).
* **Hỏi nhanh không bẩn context:** Dùng **`/btw <câu hỏi>`** để tra cứu bên lề trong lúc agent chính đang chạy.
* **Kiểm soát quota:** Kiểm tra `/usage` trước khi chạy wave song song lớn và đặt **`AI Credit Overages → Never`** để hệ thống chờ refresh thay vì tiêu thêm credit ngoài ý muốn.

---

## Cấu trúc thư mục

```text
neonskill/
├── package.json
├── bin/cli.mjs
├── install.sh
├── README.md
├── .gitignore
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
