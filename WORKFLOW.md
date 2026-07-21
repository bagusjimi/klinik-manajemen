# Workflow Guide — Branch & PR

## Aturan Utama
**JANGAN edit langsung di `main`.** Selalu buat branch baru untuk setiap perubahan.

---

## Alur Lengkap

### 1. Buat Branch Baru
```bash
git checkout main
git pull origin main
git checkout -b <nama-branch>
```

**Format nama branch:**
| Tipe | Format | Contoh |
|------|---------|--------|
| Fitur baru | `feat/...` | `feat/d1-database` |
| Perbaikan bug | `fix/...` | `fix/login-error` |
| Dokumentasi | `docs/...` | `docs/workflow-guide` |
| Refactor | `refactor/...` | `refactor/auth-module` |

### 2. Kerjakan Perubahan
Edit file, tambah code, fix bug, dll.

### 3. Commit
```bash
git add .
git commit -m "Deskripsi perubahan"
```

### 4. Push ke GitHub
```bash
git push -u origin <nama-branch>
```

### 5. Buat Pull Request
```bash
gh pr create --title "Judul PR" --body "Deskripsi perubahan"
```

Jika `gh` error karena tidak di dalam repo directory, gunakan:
```bash
gh pr create --repo bagusjimi/klinik-manajemen --head <nama-branch> --base main --title "Judul PR" --body "Deskripsi perubahan"
```

### 6. Merge di GitHub
- Buka link PR di browser
- Review perubahan
- Click **Merge**

### 7. Cleanup (setelah merge)
```bash
git checkout main
git pull origin main
git branch -d <nama-branch>
git push origin --delete <nama-branch>   # opsional, hapus remote branch
```

---

## Checklist Cepat

| Step | Command | Status |
|------|---------|--------|
| 1. Branch baru | `git checkout -b feat/xxx` | ⬜ |
| 2. Kerja perubahan | Edit file | ⬜ |
| 3. Commit | `git add . && git commit -m "..."` | ⬜ |
| 4. Push | `git push -u origin feat/xxx` | ⬜ |
| 5. PR | `gh pr create --title "..." --body "..."` | ⬜ |
| 6. Merge | Di GitHub browser | ⬜ |
| 7. Cleanup | `git checkout main && git pull && git branch -d feat/xxx` | ⬜ |

---

## Info Project

| Item | Detail |
|------|--------|
| Repo | `bagusjimi/klinik-manajemen` |
| Framework | SvelteKit v5 + TypeScript |
| Deploy | Cloudflare Workers |
| Database | D1 (binding: `DB`) |
| GitHub CLI | `gh` v2.87.3 — 3 account: `bagusjimi`, `sobatcecep`, `asepbudi2909-bot` |
| Git user | Julung / bagusa63@gmail.com |

---

## Tips

- **Selalu `git pull origin main`** sebelum buat branch baru — pastikan lokal up-to-date
- **Commit message jelas** — jelaskan apa yang diubah, bukan hanya "update"
- **PR description lengkap** — supaya review lebih mudah
- **Satu branch = satu task** — jangan campur banyak perubahan di satu branch
