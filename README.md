# 🎵 Can♱ólico! - Modern Catholic Digital Hymnal

[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

**Can♱ólico!** is a comprehensive, modern digital hymnal platform designed specifically for Catholic liturgical music. Built with collaboration and accessibility at its core, it empowers musicians, pastoral agents, choirs, and communities to discover, share, and organize liturgical songs with unprecedented ease.

---

## ✨ Key Features

### 🎼 **Music Management**
- **Smart Search & Browse**: Find songs by liturgical moment, instrument, type, or free text
- **Chord Support**: Advanced chord notation using `markdown-it-chords` with real-time preview
- **Multiple Formats**: Support for chord sheets, sheet music, and audio content
- **Author Attribution**: Optional author field for proper credit and organization
- **Rich Media**: Attach Spotify links, YouTube videos, and direct audio files

### 🔄 **Collaborative Workflow**
- **Community Submissions**: Users can submit new songs for review
- **Moderation System**: Multi-level review process with admin approval
- **Version Control**: Track changes and maintain song history
- **Quality Assurance**: Built-in validation and formatting standards

### 📋 **Playlist & Organization**
- **Personal Playlists**: Create and manage custom song collections
- **Public Sharing**: Share playlists with the community
- **Liturgical Moments**: Organize by specific Mass parts (Entrance, Communion, etc.)
- **Smart Filtering**: Filter by instrument, song type, and liturgical season

### 👥 **User Management**
- **Role-Based Access**: User, Reviewer, and Admin roles with specific permissions
- **Profile Management**: Customizable user profiles with contribution tracking
- **Community Features**: User interaction and collaboration tools

### ⚙️ **Admin Dashboard**
- **Comprehensive Management**: Full control over songs, users, and playlists
- **Analytics & Insights**: Usage statistics and community metrics
- **Content Moderation**: Advanced tools for maintaining quality standards
- **System Configuration**: Banner management and site-wide settings

---

## 🛠️ Technical Stack

### **Frontend**
- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[Shadcn/ui](https://ui.shadcn.com/)** - Modern component library
- **[Lucide Icons](https://lucide.dev/)** - Beautiful icon system

### **Backend & Database**
- **[Supabase](https://supabase.com/)** - PostgreSQL database with real-time features
- **Server-Side Rendering** - Optimized performance and SEO

### **Music & Content**
- **[Markdown-it-Chords](https://github.com/moinism/markdown-it-chords)** - Advanced chord notation
- **[SimpleMDE](https://simplemde.com/)** - Markdown editor with live preview
- **Media Integration** - Support for audio files, YouTube, and Spotify


## 📱 Core Functionality

### **For Musicians & Users**
- Browse extensive song library with smart filters
- Submit new songs with guided workflow
- Create and share personal playlists
- Access chord charts and sheet music
- Contribute to community growth

### **For Pastoral Agents**
- Organize liturgical music by moment and season
- Plan complete Mass repertoires
- Access approved, high-quality content
- Collaborate with music teams

### **For Administrators**
- Comprehensive content management
- User moderation and role assignment
- System analytics and insights
- Quality control and approval workflows


---

## 📚 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (authprofile)/     # Profile and auth pages
│   ├── admin/             # Admin dashboard and management
│   ├── api/               # API routes and endpoints
│   ├── auth/              # Authentication pages
│   ├── musics/            # Music browsing and creation
│   └── playlists/         # Playlist management
├── components/            # Reusable UI components
│   ├── forms/            # Form components
│   ├── providers/        # Context providers
│   └── ui/               # Base UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and configurations
└── types/                # TypeScript type definitions
```

---

## 🔐 Authentication & Security

- **Clerk** authentication and session management
- **Role-based permissions** (User, Reviewer, Admin)
- **Secure API endpoints** with session validation
- **Content moderation** and spam prevention
- **Data privacy** compliance and user control

---

## 🌍 Community & Collaboration

Can♱ólico! is built for and by the Catholic music community. We encourage:

- **Song Contributions**: Share your liturgical compositions
- **Quality Feedback**: Help maintain high content standards
- **Feature Requests**: Suggest improvements and new features
- **Bug Reports**: Help us maintain a stable platform
- **Documentation**: Improve guides and tutorials

---

## 📄 License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0).

You are free to share and adapt the material for non-commercial purposes, provided appropriate credit is given. Commercial use requires prior written permission.

See [LICENSE.md](./LICENSE.md) for the full license terms.

[![License: CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/80x15.png)](https://creativecommons.org/licenses/by-nc/4.0/)


---

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development workflow
- Pull request process
- Issue reporting guidelines


---

## 🎯 Mission Statement

Can♱ólico! aims to strengthen Catholic liturgical music by making it more accessible, collaborative, and beautifully organized. We believe that music is prayer twice spoken, and technology should serve to enhance, not complicate, our worship experience.

---

**Built with ❤️ for the Catholic music community**



