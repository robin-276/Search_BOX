
<div align="center">

# SearchBOX 🔍

### *A personal search engine for everything worth remembering.*

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](#)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](#)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](#)

</div>

---

## 📖 The Vision

> "I kept discovering useful websites, tools, and videos, but after a few weeks, I couldn't remember their names or URLs. Browser bookmarks became messy, and writing everything in a notebook wasn't practical. SearchBOX was created to solve this problem."

**SearchBOX** is a personal digital library that helps users save, organize, search, and rediscover websites, YouTube videos, GitHub repositories, PDFs, Google Drive files, web apps, and other online resources in one unified place.

---

## ✨ Features

* **⚡ Instant Search:** Find any saved item in milliseconds.
* **📂 Smart Categories & Tagging:** Organize your items with flexible structures.
* **⭐ Favorites:** Pin your most-used items for immediate access.
* **🖼️ Automatic Logo Fetching:** Instantly pulls favicons and logos for visual recognition.
* **🛡️ Duplicate Detection:** Prevents you from saving the same link twice.
* **🔐 Seamless Authentication:** Secure Google and Email/Password login.
* **📱 Fully Responsive:** A beautiful dashboard that works perfectly on desktop and mobile.
* **🗃️ Unified Personal Library:** Built to handle any URL-based resource effortlessly.

---

## 📸 Screenshots

*(Replace the placeholder URLs with actual images of your project)*

|                                              Login Page                                              |                                             Main Dashboard                                             |                                             Search & Filter                                             |
| :---------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------: |
| `<img src="https://placehold.co/400x250/252525/white?text=Login+Screen" alt="Login" width="100%"/>` | `<img src="https://placehold.co/400x250/252525/white?text=Dashboard" alt="Dashboard" width="100%"/>` | `<img src="https://placehold.co/400x250/252525/white?text=Search+Results" alt="Search" width="100%"/>` |

|                                                Add New Item                                                |                                             Categories View                                             |                                               Mobile UI                                               |
| :--------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------: |
| `<img src="https://placehold.co/400x250/252525/white?text=Add+Item+Modal" alt="Add Item" width="100%"/>` | `<img src="https://placehold.co/400x250/252525/white?text=Categories" alt="Categories" width="100%"/>` | `<img src="https://placehold.co/400x250/252525/white?text=Mobile+View" alt="Mobile" width="100%"/>` |

---

## 💻 Technical Architecture

SearchBOX is built with a modern, high-performance tech stack designed for speed and scale.

* **Framework:** [Next.js](https://nextjs.org/) (App Router)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
* **Language:** TypeScript & React
* **Forms & Validation:** React Hook Form & Zod
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL & Storage)
* **Deployment:** [Vercel](https://vercel.com/)

---

## 🗄️ Database Schema

The core technical architecture revolves around the `resources` table (referred to as **"Items"** in the UI).

### `resources` Table

| Column          | Data Type              | Details                                       |
| :-------------- | :--------------------- | :-------------------------------------------- |
| `id`          | `uuid`               | **Primary Key**                         |
| `user_id`     | `uuid`               | Foreign Key referencing the user's profile    |
| `title`       | `text`               | The display name of the saved item            |
| `description` | `text`               | Context or notes about the item               |
| `url`         | `text`               | The primary link to the resource              |
| `source_url`  | `text`               | The origin link (if applicable)               |
| `logo`        | `text`               | URL of the automatically fetched logo/favicon |
| `category_id` | `uuid`               | Foreign Key for organizational grouping       |
| `tags`        | `text[]` / `jsonb` | Array of tags applied to the item             |
| `favorite`    | `boolean`            | Starred status for quick access               |
| `created_at`  | `timestamptz`        | Auto-generated timestamp                      |

---

## 📂 Folder Structure

A clean, scalable architecture following Next.js best practices:

```text
📦 Search_BOX
 ┣ 📂 app/              # Next.js App Router (Pages & API routes)
 ┣ 📂 components/       # Reusable UI components (shadcn/ui, layout, etc.)
 ┣ 📂 lib/              # Utility functions, Supabase client initialization
 ┣ 📂 hooks/            # Custom React hooks
 ┣ 📂 types/            # TypeScript interfaces and type definitions
 ┣ 📂 public/           # Static assets (images, icons)
 ┣ 📜 .env.local        # Environment variables
 ┗ 📜 tailwind.config.ts# Tailwind styling rules
```
