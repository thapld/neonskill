# neonskill

Bộ **8 skill `neon-*`** chuẩn hóa quy trình phát triển phần mềm cho **Gemini 4 Neon** và **Gemini 4 Hydrogen** trên **T3 Code / Antigravity**.

## Tổng quan quy trình

```text
neon-init  ──▶  neon-plan (Explore + Adaptive Grill + Mode Routing)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   neon-slice             neon-teamwork
   (1 luồng)         (nhiều worktree song song)
        └───────────┬───────────┘
                    ▼
               neon-review  ◀──┐
                    │          │ (tối đa 3 vòng;
         ┌──────────┴────┐     │  2-strike check lại SPEC)
         ▼ (0 sev 1-2)   ▼     │
     neon-ship       neon-fix ─┘

  * Bất kỳ lúc nào gần chạm 512K context / limit 5h: /compact hoặc neon-handoff
```

## Danh sách 8 Skill

| Skill | Vai trò | Model & Thinking khuyến nghị |
| :--- | :--- | :--- |
| `neon-init` | Khởi tạo `AGENTS.md` (tĩnh, auto-load), `DECISIONS.md` và `.gitignore` cho repo | Gemini 4 Neon · `HIGH` |
| `neon-plan` | Lập `10-line Codebase Map`, **Adaptive Grill** trước khi viết `SPEC.md`, chọn mode chạy | Gemini 4 Neon · `HIGH` |
| `neon-slice` | Thực thi 1 slice trong worktree: Zero-Stub, cấm nới test, dán log thật | Gemini 4 Hydrogen · `MEDIUM`/`HIGH` |
| `neon-teamwork` | Điều phối nhiều slice song song qua `delegate_task` worktrees + merge theo thứ tự | Coordinator: Neon `HIGH` · Workers: Hydrogen |
| `neon-review` | Mở file test đầu tiên, kiểm tra từng `file:line`, chạy `<TEST_CMD>` & audit `SPEC.md` | Gemini 4 Neon · `HIGH` (nâng `XHIGH` nếu fail/rủi ro cao) |
| `neon-fix` | Sửa lỗi severity 1–2 theo kiểu test-first, có 2-strike plan-check & cap 3 vòng | Gemini 4 Hydrogen · `MEDIUM`/`HIGH` |
| `neon-ship` | Lọc file tạm, cập nhật docs (`README.md`, 3-line `CHANGELOG.md`), mở Draft PR (+ `IMPROVE`/`ITERATE`) | Gemini 4 Hydrogen · `LOW`/`MEDIUM` |
| `neon-handoff` | Lưu trạng thái, `file:line` đang dở, blockers và 3 lệnh tiếp theo vào `HANDOFF.md` | Main thread / Coordinator |

---

## Cài đặt

### Cách 1: Cài toàn cục (dùng cho mọi project trên máy)
```bash
git clone https://github.com/thapld/neonskill.git
cd neonskill
chmod +x install.sh
./install.sh --global
```
*(Skill sẽ được cài vào `~/.gemini/config/skills/neon-*`. Nếu muốn sửa trực tiếp từ repo này, thêm `--symlink`.)*

### Cách 2: Cài riêng cho một project
```bash
./install.sh --project /duong/dan/toi/repo-cua-ban
```
*(Skill sẽ được cài vào `<repo>/.agents/skills/neon-*`, tự động trở thành slash command `/neon-init`, `/neon-plan`, ... trong Antigravity / T3 Code.)*

---

## Hướng dẫn sử dụng trong Project

### Bước 1: Khởi tạo repo (`neon-init`)
Chạy một lần khi mới bắt đầu áp dụng bộ skill cho repo:
```text
Dùng skill neon-init để thiết lập AGENTS.md và DECISIONS.md cho repo này.
```
Skill sẽ tự kiểm tra stack, lệnh test/lint/typecheck và tạo:
- `AGENTS.md` (không có frontmatter, giữ **100% tĩnh** để tối ưu prompt cache và được Antigravity tự nạp ở mọi lượt).
- `DECISIONS.md` (nhật ký các quyết định kiến trúc/phạm vi).

### Bước 2: Lên kế hoạch & Grill Me (`neon-plan`)
Trước khi code bất kỳ tính năng mới nào:
```text
/neon-plan Thêm tính năng giới hạn tốc độ API theo gói người dùng
```
Agent sẽ thực hiện theo đúng thứ tự:
1. Đọc `AGENTS.md`, `DECISIONS.md` và code liên quan để dựng **Codebase Map (≤10 dòng)** + **Top 3 file rủi ro nhất (`path:line`)**.
2. **Adaptive Grill Gate**: hỏi ngược lại bạn (ưu tiên `ask_question` có sẵn lựa chọn `(Recommended)`) để chốt các ngã rẽ thiết kế, phạm vi ngày 1, vùng cấm đụng và tiêu chí `DONE WHEN`. *(Nếu bài toán rất lớn/mơ hồ, có thể dùng thêm `/grill-me`.)*
3. Ghi các quyết định đã chốt vào `DECISIONS.md`.
4. Chọn chế độ chạy phù hợp rồi mới xuất `SPEC.md` và **dừng chờ bạn duyệt** trước khi sửa code.

### Bước 3: Chọn chế độ thực thi theo hình dạng bài toán

| Hình dạng bài toán | Cách chạy khuyến nghị |
| :--- | :--- |
| 1 việc phụ đơn lẻ (research, chạy test) | `invoke_subagent` |
| 1 tính năng gọn hoặc chạy tuần tự | `neon-slice` |
| 1 bug khó, race condition, refactor sâu | Gợi ý chạy `/boost <task>` |
| Việc rộng tách sạch theo file trong cùng repo | Gợi ý chạy `/swarm <task>` |
| Nhiều slice cần tách worktree/port/DB độc lập trên T3 Code | `neon-teamwork` |
| Dự án lớn nhiều milestone dài ngày | Gợi ý chạy `/teamwork <goal>` |

### Bước 4: Triển khai (`neon-slice` hoặc `neon-teamwork`)
* **Chạy đơn luồng:**
  ```text
  Thực hiện Slice 1 trong SPEC.md bằng neon-slice.
  ```
* **Chạy song song trên T3 Code:**
  ```text
  Dùng neon-teamwork để điều phối các slice trong SPEC.md.
  ```
  Coordinator sẽ kiểm tra `orchestrator_capabilities`, cảnh báo chi phí trước khi fan-out, chạy mỗi slice trong 1 worktree riêng, và chỉ mình coordinator ghi tiến độ/blockers vào `HANDOFF.md`.

### Bước 5: Review & Sửa lỗi (`neon-review` → `neon-fix`)
Sau khi code xong hoặc merge các slice vào nhánh tích hợp:
```text
Chạy neon-review trên diff hiện tại so với SPEC.md.
```
* Reviewer mở **file test ra kiểm tra đầu tiên** (bắt lỗi nới lỏng hoặc skip test), kiểm chứng mọi `file:line`, dán ít nhất 20 dòng cuối output thật từ `<TEST_CMD>`.
* Nếu có lỗi `severity 1–2`, chạy `neon-fix` (viết failing test tái hiện lỗi trước rồi mới sửa, tối đa 3 vòng; nếu lặp 2 lần cùng lỗi sẽ lùi lại kiểm tra giả định trong `SPEC.md`).

### Bước 6: Đóng gói & Mở Draft PR (`neon-ship`)
Khi `severity 1–2` về `0`:
```text
Chạy neon-ship để hoàn thiện docs và mở Draft PR.
```
Skill sẽ tự lọc file tạm (`HANDOFF.md`), cập nhật `README.md` + `CHANGELOG.md` (3 dòng), commit, push nhánh, mở Draft PR kèm output test thật, và sau khi mở PR có thể gợi ý thêm 1 cải tiến cho `AGENTS.md` (`IMPROVE`) hoặc 3 ý tưởng v2 (`ITERATE`).

### Bước 7: Bảo toàn trạng thái khi dài phiên (`neon-handoff`)
Khi thread sắp chạm ngưỡng **512K context** trên Antigravity app hoặc sắp hết giới hạn 5 giờ/tuần:
1. Ưu tiên chạy `/compact`.
2. Nếu không khả dụng hoặc vẫn chật, chạy `neon-handoff` ở thread chính để ghi `HANDOFF.md` (`Done`, `Half-done với file:line`, `Blockers & Next Fix`, `Next 3 commands`), sau đó `/clear` và nạp lại từ `AGENTS.md` + `DECISIONS.md` + `HANDOFF.md`.

---

## Cấu trúc thư mục

```text
neonskill/
├── README.md
├── install.sh
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
