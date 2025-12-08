<div align="center">
  <img src="https://github.com/caocchinh/photospark/blob/master/client/public/vteam-logo.webp?raw=true" alt="VTEAK Logo" width="167"/>
  <p>
    <strong>Silencio Queue Management System</strong>
  </p>
  <p>
    <strong>The virtual queuing platform for Vinschool Central Park Student Council's Silencio Haunted Houses</strong>
  </p>
  <p style="margin-top: 10px;">
    <a href="#-features">Features</a> •
    <a href="#️-tech-stack">Tech Stack</a> •
    <a href="#-getting-started">Getting Started</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
    <img src="https://img.shields.io/badge/status-production-green.svg" alt="Status" />
  </p>
  
  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS 4" />
    <img src="https://img.shields.io/badge/Neon-PostgreSQL-4A9EFF?logo=postgresql&logoColor=white" alt="Neon PostgreSQL" />
    <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?logo=drizzle&logoColor=black" alt="Drizzle ORM" />
    <img src="https://img.shields.io/badge/TanStack_Query-FF4154?logo=react-query&logoColor=white" alt="TanStack Query" />
  </p>
</div>

---

## 📖 Introduction

**Silencio Queue** is the student-facing web application dedicated to managing the high demand for Haunted House attractions at the Silencio event. To prevent physical overcrowding and ensure safety, this system allows students to reserve "virtual spots" or create group reservations, effectively digitizing the waiting line.

The system ensures fair access by verifying student ticket types and strictly managing queue capacities in real-time.

### ⚠️ The Challenge: Why this system exists?

Managing hundreds of students clamoring for limited Haunted House slots is a logistical challenge. This dedicated infrastructure solves key operational points:

- **The "Eternal Line" Problem**: Physical lines for popular attractions can block pathways and waste the entire event duration for attendees.
  - _Solution_: **Virtual Queuing** allows students to "get a number" and enjoy other parts of the event until their turn arrives.
- **The "Group Separation" Anxiety**: Students want to experience the haunted house with their specific friend group, not strangers.
  - _Solution_: **Group Reservation Codes** enable a leader to "Create a Room" and share a unique code, ensuring the entire group is placed in the queue together seamlessly.
- **The "Ticket Validity" Check**: Ensuring only students with the correct ticket tier can access premium attractions.
  - _Solution_: **Integrated Ticket Verification** checks the user's ticket type against the database upon login, automatically filtering eligibility.

## ✨ Features

### 🕒 Smart Virtual Queue

- **Instant Join**: Students can view available Haunted Houses and join the queue with a single tap.
- **Real-time Status**: The interface polls for updates every 30 seconds, keeping students informed of their spot and estimated wait time.
- **Capacity Management**: Automatically closes queues when they reach maximum capacity to prevent overbooking.

### 🤝 Group Reservations

- **"Create Room" Functionality**: A student can become a group leader, reserving a block of spots.
- **Code Sharing**: Generates a unique 6-digit code for friends to join the reservation.
- **Atomic Locking**: Ensures that if a group fits in the remaining capacity, all members get in; otherwise, the reservation is handled safely.

### 🛡️ Security & Access Control

- **Google Authentication**: Secure login via school email accounts.
- **Ticket Validation**: Restricts access based on `ticketType` (e.g., blocking unauthorized or basic tiers from premium queues).
- **Session Management**: Secure session verification with `better-auth` and robust error handling for expired sessions.

## 🛠️ Tech Stack

### Core

- **[Next.js 16](https://nextjs.org/)** - App Router & Turbopack.
- **[React 19](https://react.dev/)** - Latest concurrent features.
- **[TypeScript](https://www.typescriptlang.org/)** - Strict type safety.

### Data & State

- **[TanStack Query](https://tanstack.com/query/latest)** - Efficient server state management and polling.
- **[Neon PostgreSQL](https://neon.tech/)** - Serverless database.
- **[Drizzle ORM](https://orm.drizzle.team/)** - Type-safe database access.
- **[Better Auth](https://www.better-auth.com/)** - Secure authentication.

### UI / UX

- **[Tailwind CSS 4](https://tailwindcss.com/)** - Next-gen styling engine.
- **[Radix UI](https://www.radix-ui.com/)** - Accessible primitives for Tabs and Dialogs.
- **[Lucide React](https://lucide.dev/)** - Beautiful iconography.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Neon PostgreSQL Database
- Google OAuth Credentials

### Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/vteam/silencio-queue.git
    cd silencio-queue
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Copy the `.env` example and configure:

    ```bash
    cp .env.example .env
    ```

    _Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`_

4.  **Database Migration**:

    Push the schema to your Neon database:

    ```bash
    npm run db:migrate
    ```

5.  **Run Development Environment**:

    Start the Next.js app:

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser.

---

<div align="center">
  <p>Developed with ❤️ by Cao Cự Chính</p>
</div>
