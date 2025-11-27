# Classly

> A trustless, decentralized learning platform with secure escrow payments and NFT-based course certificates

## Table of Contents
- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

## About

Classly reimagines online education by solving the trust and organization problems in local online tutoring. Traditional platforms like Coursera are centralized, requiring users to trust a third party with payments and credential verification. Classly eliminates this trust requirement.

**The Problem:** Local tutors and students lack a trustworthy platform for course delivery and payment. Students risk paying for incomplete courses, while tutors risk non-payment for delivered content.

**The Solution:** Classly uses Cardano smart contracts for trustless escrow payments and issues NFT certificates to prove course completion using a merkle branching algorithm. Payments are held in escrow and only released when course milestones are met, while NFTs provide verifiable proof of attendance and completion.

## Features

- 🎥 **Video Upload & Streaming** - Upload and stream course content seamlessly
- 🔒 **Escrow Payment System** - Trustless payment protection via Cardano smart contracts
- 🎓 **NFT Course Certificates** - Mint attendance and completion NFTs with merkle proof verification
- 🌐 **Decentralized & Trustless** - No central authority controlling payments or credentials
- 🔐 **Secure Authentication** - Google OAuth and traditional email/password via NextAuth

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **Authentication:** NextAuth.js (Google OAuth, Email/Password)
- **Styling:** Tailwind CSS
- **Blockchain:** Cardano
- **Smart Contracts:** [classly-contracts](https://github.com/Huey-dev/classly-contracts)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm/yarn/pnpm/bun

### Installation

1. Clone the repository
```bash
git clone https://github.com/huey-dev/classly.git
cd classly
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/classly"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Cardano (if applicable)
NEXT_PUBLIC_NETWORK="testnet"
```

4. Set up the database
```bash
npx prisma migrate dev
npx prisma generate
```

5. Run the development server
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## Contributing

We welcome contributions! Please follow these guidelines:

### Branch Naming Convention

- `feature/your-feature-name` - for new features
- `fix/bug-description` - for bug fixes
- `docs/what-you-updated` - for documentation
- `refactor/what-you-refactored` - for code refactoring

### Workflow

1. Fork the repository

2. Create your feature branch
```bash
git checkout -b feature/amazing-feature
```

3. Commit your changes (use conventional commits)
```bash
git commit -m "feat: add video streaming feature"
```

**Commit message format:**
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` formatting, missing semicolons, etc.
- `refactor:` code restructuring
- `test:` adding tests
- `chore:` maintenance tasks

4. Push to your branch
```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request with:
   - Clear description of changes
   - Screenshots (if UI changes)
   - Link to related issue (if applicable)

### Code Standards

- Write TypeScript (avoid `any` types)
- Follow existing code style
- Add comments for complex logic
- Update documentation as needed
- Test your changes before submitting PR

## Project Structure

```
classly/
├── app/              # Next.js app router pages
├── components/       # React components
├── lib/              # Utility functions
├── prisma/           # Database schema
├── public/           # Static assets
├── styles/           # Global styles
└── types/            # TypeScript types
```

## License

MIT

---

Built for decentralized education 🎓
