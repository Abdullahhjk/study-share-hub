# Scholar Share — App Purpose & Design Theme

## App Purpose

**Scholar Share** is an educational marketplace connecting teachers and students through study notes.

- **Teachers** upload, share, and sell their study notes to a wider audience.
- **Students** access educational content — free notes download instantly, paid notes are purchased via Bank Account with a one-time secure download.
- **Admins** oversee the platform: approve teachers, manage users, handle reports, and track revenue.

The platform bridges the gap between content creators (teachers) and learners (students), making quality educational material accessible while giving teachers a channel to monetize their work. Teachers can manage multiple bank accounts and mobile wallets for receiving student payments, and students select from the teacher's listed methods during checkout.

### Core Business Model

- **Free notes** — immediate download, no payment required
- **Paid notes** — student pays teacher off-platform → receipt uploaded → teacher verifies → one-time download code issued
- **Payment Methods** — teachers register bank accounts (IBAN) or mobile wallets; students select from available methods during checkout
- **Platform revenue** — 15% commission on completed paid transactions

---

## Design Theme

### Brand Identity

Scholar Share uses a **clean, professional educational design** with a focus on trust and readability. The aesthetic balances modern UI patterns with a scholarly tone — befitting an academic marketplace.

### Color Palette

All colors defined as HSL via CSS custom properties in `src/index.css`.

#### Light Mode

| Token | Value | Description |
|-------|-------|-------------|
| `--background` | `210 20% 98%` | Near-white with blue tint |
| `--foreground` | `220 25% 10%` | Dark slate text |
| `--card` | `0 0% 100%` | Pure white cards |
| `--primary` | `217 91% 50%` | **Educational Blue** — trust, academia |
| `--secondary` | `220 14% 96%` | Soft gray |
| `--muted` | `220 14% 96%` | Light backgrounds |
| `--muted-foreground` | `220 9% 46%` | Medium gray text |
| `--accent` | `217 91% 95%` | Very light blue |
| `--success` | `142 76% 36%` | Green — free notes |
| `--warning` | `38 92% 50%` | Amber — paid notes |
| `--destructive` | `0 84% 60%` | Red — errors |
| `--border` | `220 13% 91%` | Light borders |
| `--ring` | `217 91% 50%` | Focus rings (matches primary) |

#### Dark Mode

Same hue values with adjusted lightness. Backgrounds invert to near-black, text inverts to near-white. Primary blue lightens for readability on dark surfaces.

#### Semantic Gradient Variables

| Variable | Gradient |
|----------|----------|
| `--gradient-hero` | Primary blue → Cyan |
| `--gradient-card` | White → Light gray |
| `--gradient-success` | Green shades |
| `--gradient-warning` | Amber shades |

### Typography

| Usage | Font | Weight |
|-------|------|--------|
| **Body / UI** | Inter | 300–700 |
| **Headings / Brand** | Poppins (`font-display`) | 500, 600, 700 |

Inter provides clean readability for long-form content and UI labels. Poppins adds a bold, modern presence for headings and the brand name.

### Spacing & Layout

- **Container**: centered, max-width `1400px` at 2xl, `2rem` padding
- **Border radius**: `0.75rem` (12px) base → `rounded-lg`, with `rounded-md` and `rounded-sm` for nested elements, `rounded-full` for badges/avatars
- **Shadows**: subtle (`--shadow-sm`), elevated (`--shadow-lg`), and interactive card shadows with blue tint (`--shadow-card-hover`)

### Animation Language

| Animation | Purpose |
|-----------|---------|
| `fade-in` | Page sections entering viewport |
| `slide-in` | Sidebar / menu appearances |
| `scale-in` | Dialog/modal open transitions |
| `accordion-down/up` | Collapsible sections |
| `textJump` (custom) | Loading text letter bounce |
| `shimmer` (custom) | Loading progress sweep |
| `animate-pulse` | Glowing / waiting states |

Animations are subtle and purposeful — they guide attention without being distracting.

### Component Patterns

- **Glass effect**: `bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60` — used on header, footer, and loading states
- **Cards**: Rounded borders, shadow, optional hover elevation with blue accent
- **Buttons**: `h-10` default, variants (default/destructive/outline/secondary/ghost/link), consistent `gap-2` icon spacing
- **Badges**: `rounded-full`, semantic colors for free (green) vs paid (amber) status
- **Dialogs**: Centered with overlay, scale+fade entrance, `sm:rounded-lg`
- **Responsive**: Mobile-first with `sm:` breakpoint for most layout shifts

### Dark Mode

Toggle via `next-themes` using `class` strategy (`.dark` class on `<html>`). All CSS variables swap seamlessly. The theme preference persists in localStorage under the `theme` key and respects system preference by default.

---

## Design Principles

1. **Trust through blue** — Educational blue as primary conveys reliability and professionalism
2. **Clarity over decoration** — Clean layouts with generous whitespace; animations serve a purpose
3. **Semantic color coding** — Users instantly recognize free (green), paid (amber), and destructive (red)
4. **Mobile-first** — All layouts work from small screens up
5. **Glass morphism accents** — Used sparingly on persistent UI (header, loading) for a modern feel without sacrificing readability
6. **Dark mode as a first-class citizen** — Not an afterthought; full palette designed for both modes
