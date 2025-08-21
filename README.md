# Job Board - Resume Management Platform

A full-stack job board application with AI-powered resume management, built with React, Node.js, MySQL, and LLM agents.

## Features

- **Resume Management**: Add, update, and manage applicant resumes
- **AI-Powered Matching**: LLM agents for job-resume matching
- **Full-Stack Architecture**: React frontend + Node.js backend
- **Database**: MySQL with optimized schema
- **No-Code Integration**: Built with Jules and other no-code tools

## Tech Stack

- **Frontend**: React.js, Material-UI, Axios
- **Backend**: Node.js, Express.js, JWT Authentication
- **Database**: MySQL with Sequelize ORM
- **AI/LLM**: OpenAI GPT integration for resume analysis
- **Deployment**: Docker, AWS/Vercel ready

## Quick Start

```bash
# Clone repository
git clone https://github.com/1234-ad/job-board-fullstack.git
cd job-board-fullstack

# Install dependencies
npm run install-all

# Setup database
npm run db:setup

# Start development servers
npm run dev
```

## Project Structure

```
job-board-fullstack/
├── client/                 # React frontend
├── server/                 # Node.js backend
├── database/              # MySQL schemas & migrations
├── docs/                  # Documentation
└── docker-compose.yml     # Container setup
```

## Database Schema

- **users**: User authentication and profiles
- **resumes**: Resume data and metadata
- **jobs**: Job postings
- **applications**: Job applications tracking
- **skills**: Skills taxonomy
- **resume_skills**: Resume-skill relationships

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/resumes` - Get user resumes
- `POST /api/resumes` - Create/update resume
- `GET /api/jobs` - Browse jobs
- `POST /api/applications` - Apply to jobs

## No-Code Integration

This project is designed to work with:
- **Jules**: For rapid prototyping and deployment
- **Zapier**: For workflow automation
- **Airtable**: For data management
- **Bubble**: For visual development

## License

MIT License - see LICENSE file for details