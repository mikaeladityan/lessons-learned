# lessons-learned

[English](README.md) · **Bahasa Indonesia**

Sebuah [Agent Skill](https://agentskills.io) yang membuat AI coding agent berhenti mengulang
kesalahan yang sama.

AI agent itu pelupa. Sesi berikutnya, atau agent lain, bisa mengulang error yang kemarin sudah
Anda perbaiki, kadang sambil memberi penjelasan meyakinkan yang ternyata tidak benar. Skill ini
memberi repo Anda ingatan bersama yang dibaca semua agent:

1. **Catat.** Saat ada yang salah dan penyebabnya sudah diketahui, agent menulis satu lesson:
   gejala, penyebab, satu kalimat aturan, penjaga yang mencegah terulang, dan bukti.
2. **Cari.** Sebelum mulai kerja, agent mencari lesson berdasarkan kata kunci tugasnya.
3. **Tutup.** Setiap tugas diakhiri dengan `Lessons: L0NN | none — <alasan>`.
4. **Fold.** Saat lesson menumpuk, setiap aturan dipindah ke file yang dibaca agent tepat saat
   kesalahan itu bisa terjadi (`AGENTS.md`, sebuah skill, sebuah test), lalu file lesson-nya
   dihapus.

Lesson disimpan sebagai Markdown biasa di repo Anda, bukan di memori pribadi satu tool. Claude
Code, Codex, opencode, Antigravity, Gemini CLI, dan Cursor semuanya membaca lesson yang sama.
Bisa dipakai di tech stack apa pun, karena script pembantunya hanya satu file Node tanpa
dependency.

## Pasang

```bash
npx skills add mikaeladityan/lessons-learned
```

[CLI `skills`](https://github.com/vercel-labs/skills) mendeteksi agent yang Anda punya dan
memasang skill ini untuk agent-agent tersebut.

- Pilih agent dengan `-a`, misalnya `-a claude-code -a codex`.
- Tambahkan `-g` agar terpasang untuk semua project.
- CLI-nya butuh Node ≥ 22.20. Script milik skill ini cukup Node ≥ 20.

## Pemakaian pertama

Minta agent Anda:

> set up lessons learned in this repo

Agent menjalankan `status`, melihat bahwa setup belum dilakukan, lalu menanyakan tiga hal:

1. **Blok pemicu.** Boleh menambahkan blok pendek yang selalu aktif ke file instruksi agent Anda
   (`AGENTS.md`, `CLAUDE.md`, dan `GEMINI.md` kalau ada)?
2. **Folder.** Simpan lesson di `docs/lessons/`?
3. **Area.** Area apa saja yang dipakai? Default-nya `code, test, security, review, process,
   shell, tooling, docs`, dan Anda bisa menambah sendiri.

Setelah itu agent menjalankan `init`, yang membuat:

```
repo-anda/
├── AGENTS.md / CLAUDE.md      ← blok di antara penanda <!-- lessons-learned:start/end -->
└── docs/lessons/
    ├── README.md              ← index: satu baris per lesson
    ├── config.json            ← area, pilihan pemicu, batas fold
    ├── lessons.mjs            ← salinan script, supaya semua agent dan CI pakai satu path
    └── L001-<slug>.md ...     ← satu file per lesson
```

Blok inilah yang membuat skill ini jalan lintas agent. Sebuah skill hanya aktif kalau agent
menilai skill itu cocok, padahal agent yang sedang akan mengulang kesalahan jarang menyadarinya.
File instruksi selalu dimuat setiap sesi. Teks Anda di luar penanda tidak pernah disentuh.

## Contoh lesson

```markdown
# L001 — Quote heredoc delimiters

Date: 2026-10-23 · Area: shell · Source: execution · Status: active
Keywords: heredoc, backtick, EOF, command substitution, shell

## Symptom
A heredoc that wrote a Markdown file ran `npm test` in the middle of the write.

## Cause
The delimiter was `<<EOF`, not `<<'EOF'`, so the shell expanded the backticks in the body.

## Rule
Quote the heredoc delimiter (`<<'EOF'`) whenever the body holds backticks, `$`, or code.

## Guard
A line in `AGENTS.md` under "Shell" cites L001.

## Evidence
The fix commit that rewrote the file with a quoted delimiter.
```

Isi lesson ditulis dalam bahasa Inggris supaya bisa dibaca semua model. Kalau tim Anda lebih
nyaman dengan bahasa lain, itu juga boleh. `check` hanya memeriksa struktur dan panjang kalimat.

## Siklus

```
kesalahan ──► find (sudah ada lesson-nya?) ──► new L0NN ──► isi 5 bagian ──► pindahkan aturan
                                                                             ke AGENTS.md /
                                                                             skill / test
tugas berikutnya ──► find <kata kunci> sebelum edit pertama
akhir tugas ──► check ──► "Lessons: L0NN | none — <alasan>"
> 15 aktif ──► audit ──► tabel fold ──► user setuju ──► aturan masuk ke file pemiliknya,
                                                      file lesson dihapus, baris index tetap
```

## Perintah

Jalankan salinan di repo dari folder mana pun di dalam repo:
`node docs/lessons/lessons.mjs <perintah>`.

| Perintah | Fungsi | Exit code |
|---|---|---|
| `status` | Menampilkan folder, index, pilihan pemicu, file instruksi mana yang sudah berisi blok, dan versi script. Mencetak `setup: needed` atau `setup: done`. | 0 |
| `init --targets AGENTS.md,CLAUDE.md` | Membuat atau memperbarui folder, index, config, salinan script, dan blok. Aman dijalankan ulang. Juga menerima `--no-hook`, `--dir <path>`, dan `--areas a,b`. | 0, atau 2 kalau error |
| `new --slug --title --area --source --rule --keywords` | Membuat `L0NN-<slug>.md` beserta baris index-nya. | 0, atau 2 kalau input salah |
| `find <kata kunci> ...` | Mencari di index (area, rule, keywords) tanpa membedakan huruf besar-kecil. Hasil yang sudah di-fold mencetak `→ read <file>`. | 0 |
| `check` | Memvalidasi semua lesson dan index. Memberi peringatan kalau batas fold terlewati. | 0, atau 1 kalau ada error |
| `audit` | Untuk setiap lesson aktif, mencetak guard-nya dan file yang menyebut id-nya. Dipakai saat fold. | 0 |

Semua perintah menerima `--dir <path>` untuk menunjuk folder lesson selain default.

## CI

Gagalkan build kalau ada lesson yang belum lengkap, atau aturan yang sudah di-fold kehilangan
rujukannya:

```yaml
# .github/workflows/lessons.yml
name: lessons
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: node docs/lessons/lessons.mjs check
```

## Agent yang didukung

| Agent | Membaca blok dari | Lokasi pasang skill |
|---|---|---|
| Claude Code | `CLAUDE.md` | `.claude/skills/` |
| Codex | `AGENTS.md` | `.agents/skills/` |
| opencode | `AGENTS.md` (atau `CLAUDE.md` kalau `AGENTS.md` tidak ada) | `.agents/skills/` |
| Antigravity | `AGENTS.md`, `GEMINI.md` | `.agents/skills/` |
| Gemini CLI | `GEMINI.md` (atau `AGENTS.md` lewat `context.fileName`) | `.agents/skills/` |
| Cursor | `AGENTS.md` | `.agents/skills/` |

Agent yang tidak memasang skill ini tetap mendapat blok dan script-nya, jadi masih bisa
menjalankan `find` dan `check`. Yang hilang hanya panduan langkah demi langkah untuk menulis dan
melakukan fold.

## FAQ

**Kenapa script-nya disalin ke repo saya?**
Lokasi skill yang terpasang berbeda untuk tiap agent: `.claude/skills/`, `.agents/skills/`, atau
folder global di home. Rekan setim yang meng-clone repo bisa saja tidak memasangnya sama sekali.
Dengan salinan ini, setiap agent, setiap rekan setim, dan CI punya satu perintah yang selalu
jalan.

**Bagaimana memperbarui salinannya?**
Perbarui skill-nya (`npx skills update`), lalu minta agent menjalankan `status`. Kalau keluar
`script: outdated`, agent menjalankan `init` tanpa flag, yang tetap memakai jawaban Anda sebelumnya
soal blok.

**Saya memilih folder sendiri dan menolak blok. Sekarang agent minta setup lagi.**
Tanpa blok, tidak ada yang memberi tahu agent baru di mana folder Anda. Pilihannya: terima
bloknya, atau beri tahu agent nama foldernya supaya ia memakai `--dir <folder>`.

**Boleh mengubah isi blok?**
Teks di luar penanda bebas diubah. Teks di dalam penanda akan diganti saat `init` berikutnya.

**Bagaimana cara uninstall?**
1. Hapus teks di antara `<!-- lessons-learned:start -->` dan `<!-- lessons-learned:end -->`.
2. Hapus folder lesson.
3. Jalankan `npx skills remove lessons-learned`.

**Apakah ini pengganti fitur memori milik agent saya?**
Bukan. Memori agent bersifat pribadi untuk satu tool dan satu user. Lesson adalah bagian dari
repo: direview di pull request, dibagi ke tim, dan dibaca semua agent.

## Pengembangan

```bash
npm test         # node --test skills/lessons-learned/scripts/lessons.test.mjs tests/repo.test.mjs
npm run check    # node --check skills/lessons-learned/scripts/lessons.mjs
```

Setiap perubahan pada `lessons.mjs` harus menaikkan `VERSION` dan versi di `package.json` bersamaan.
`init` hanya memperbarui salinan di repo kalau salinannya lebih lama, jadi perubahan tanpa kenaikan
versi tidak akan sampai ke user. `tests/repo.test.mjs` gagal sampai keduanya sama. Setelah menaikkan
versi, salin script ke `evals/fixtures/*/docs/lessons/`.

Folder `evals/` berisi prompt uji skill-creator dan repo fixture untuk menguji teks skill.

## Lisensi

[MIT](LICENSE) © mikaeladityan
