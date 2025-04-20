# Flowterview - AI-Powered Interview Platform

Flowterview is an AI-driven interview platform that automates and standardizes technical and non-technical interview processes. The platform allows organizations to create custom interview workflows, invite candidates, and evaluate their performance using our AI interviewer.

## Features

- **Organization Management**: Secure multi-tenant system for managing organizations and users
- **AI Interview Generation**: Create interview workflows automatically from job descriptions
- **Candidate Management**: Invite and track candidates through the interview process
- **Analytics Dashboard**: Measure and analyze interview performance and outcomes
- **Customizable Workflows**: Build interview flows with different question types and evaluation criteria

## Technology Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: Zustand, React Query

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Supabase account (for authentication)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/flowterview-app.git
cd flowterview-app
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase and database credentials

4. Run database migrations:

```bash
npm run db:migrate
```

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `src/app` - Next.js app router components and pages
- `src/components` - Reusable UI components
- `src/lib` - Utility functions and shared logic
- `src/lib/db` - Database schema and query utilities
- `src/lib/supabase.ts` - Supabase client configuration

## Authentication and Users

The application uses Supabase for authentication with the following user roles:

- **Admin**: Full access to organization settings and interview workflows
- **Interviewer**: Create and manage interviews within the organization
- **Candidate**: Limited access to take interviews only

## Database Schema

The database includes tables for:

- Organizations
- Users
- Interviews
- Candidates
- Interview Workflows
- Candidate Interviews

## Deployment

The application can be deployed on Vercel or any other platform that supports Next.js applications.

```bash
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
