# Design Competency Framework

A quarterly assessment platform for design teams. Designers self-assess their skills on a 6-point scale, managers add evaluations, and the results visualise as interactive spider/radar charts at individual and team level.

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start both servers (backend :3002, frontend dev :3001)
npm run dev
```

Visit **http://localhost:3002** in development.

## Default Admin Login

| Username | Password |
|----------|----------|
| `admin`  | `admin123` |

> Change the password immediately after first login via the admin portal.

## Architecture

| Layer | Tech | Port |
|-------|------|------|
| Backend API | Express + better-sqlite3 | 3002 |
| Frontend | React + Vite + Tailwind + Recharts | 3001 (dev) |

## Features

- **Designer portal** — quarterly self-assessment, spider chart history
- **Admin portal** — team overview, individual view, user management, skill/year configuration
- **Manager assessments** — admins can add manager scores for any designer
- **Quarterly cadence** — Q1–Q4 per year, multiple years supported
- **Skill management** — add/disable skills globally; changes propagate to all assessments
- **User management** — add, edit, reset passwords, delete designers

## Scale Labels (0–5)

| Score | Label |
|-------|-------|
| 0 | Cannot do |
| 1 | Heavy Supervision |
| 2 | Frequent Support |
| 3 | Zero Support |
| 4 | Supports Others |
| 5 | Teaches the Teacher |
