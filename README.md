# 🚀 Notify-Flow

### Messages Build Business.

**Notify-Flow** is a multi-brand messaging and campaign management SaaS platform designed to help businesses communicate with their customers through WhatsApp, SMS, and Email — all from one centralized platform.

Manage multiple brands, organize customer contacts, create campaigns, automate communication, schedule messages, and monitor channel-wise usage with a prepaid messaging wallet.

🌐 **Website:** https://notify-flow.in

---

## ✨ Key Features

### 🏢 Multi-Brand Management
- Manage multiple brands under one platform.
- Independent brand workspaces.
- Brand owner and team member access.
- Brand-level messaging provider configuration.
- Separate prepaid wallet for each brand.

### 📢 Multi-Channel Messaging
- WhatsApp Business API integration.
- SMS messaging integration.
- Email campaign management.
- Channel-wise messaging configuration.
- Delivery status and campaign tracking.

### 👥 Contact Management
- Create and manage customer contacts.
- Organize contacts into groups.
- Import and manage customer lists.
- Target specific audiences for campaigns.

### ⚡ Campaign Management
- Create promotional and transactional campaigns.
- Select contact groups.
- Schedule campaigns.
- Manage campaign execution.
- Track messaging performance.

### 🤖 Automation
- Automate customer communication.
- Configure follow-up workflows.
- Schedule recurring campaigns.
- Trigger messages based on business events.

### 💳 Prepaid Wallet
- Independent wallet for each brand.
- Prepaid messaging balance.
- Channel-wise usage breakdown.
- Messaging transaction history.
- Usage and cost monitoring.

### 📊 Analytics & Reporting
- Campaign performance dashboard.
- Total messages sent.
- Delivered and failed messages.
- Channel-wise usage analytics.
- Brand-level messaging statistics.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| UI | React.js |
| Backend | NestJS |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT |
| Cloud Infrastructure | AWS |
| Containerization | Docker |
| Container Registry | Amazon ECR |
| Container Management | Amazon ECS |
| CI/CD | GitHub Actions |
| Messaging | WhatsApp API, SMS API, Email API |

---

## 🏗️ System Architecture

```text
                 ┌─────────────────────┐
                 │      Users          │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │   Next.js Frontend  │
                 │   Web Application   │
                 └──────────┬──────────┘
                            │
                       REST APIs
                            │
                 ┌──────────▼──────────┐
                 │    NestJS Backend   │
                 │                     │
                 │  Authentication     │
                 │  Brand Management   │
                 │  Contact Management │
                 │  Campaign Engine    │
                 │  Wallet Management  │
                 │  Messaging Services │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │     PostgreSQL      │
                 │       Prisma        │
                 └─────────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Messaging Providers│
                 └──────────┬──────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
        WhatsApp           SMS           Email
```

---

## 📁 Project Structure

```text
notify-flow/
│
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── public/
│   │
│   └── api/                  # NestJS backend
│       ├── src/
│       │   ├── auth/
│       │   ├── brands/
│       │   ├── contacts/
│       │   ├── campaigns/
│       │   ├── wallet/
│       │   ├── messaging/
│       │   └── prisma/
│       └── prisma/
│           └── schema.prisma
│
├── .github/
│   └── workflows/            # GitHub Actions
│
├── docker-compose.yml
├── package.json
└── README.md
```

*Note: Project structure represents the intended module organization and can be adjusted as development progresses.*

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have installed:

- Node.js 22+
- npm 10+
- PostgreSQL 18+
- Git
- Docker (optional)

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/notify-flow.git

cd notify-flow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env` files based on your application configuration.

Example:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/notifyflow_db"

JWT_SECRET="your-secret-key"

API_PORT=4000

NODE_ENV=development
```

Never commit actual secrets or production credentials.

### 4. Database Setup

Run Prisma migrations:

```bash
npx prisma generate

npx prisma migrate dev
```

### 5. Start Development Server

Start the backend:

```bash
npm run start:dev --workspace=apps/api
```

Start the frontend:

```bash
npm run dev --workspace=apps/web
```

---

## ☁️ AWS Deployment

Notify-Flow is designed for containerized deployment on AWS.

Deployment components:

- **Amazon ECS:** Container orchestration.
- **Amazon ECR:** Docker image repository.
- **Application Load Balancer:** Application traffic routing.
- **Amazon RDS:** Managed PostgreSQL database.
- **AWS IAM:** Access and permissions management.
- **GitHub Actions:** Automated CI/CD pipelines.

---

## 🔐 Security

- JWT-based authentication.
- Role-based access control.
- Brand-level data isolation.
- Secure API communication.
- Environment-based configuration.
- Secure provider credentials.
- Wallet transaction tracking.

---

## 🎯 Product Vision

Our mission is to simplify business communication by bringing multiple messaging channels into one intelligent platform.

Whether you're a startup, retailer, service provider, or growing enterprise, Notify-Flow helps you connect with customers, build relationships, and grow your business.

**One Platform. Multiple Channels. Stronger Customer Connections.**

---

## 🗺️ Roadmap

- [x] Project foundation
- [x] Next.js frontend setup
- [x] NestJS backend setup
- [x] PostgreSQL and Prisma integration
- [ ] Authentication and authorization
- [ ] Multi-brand management
- [ ] Contact and group management
- [ ] Prepaid wallet system
- [ ] WhatsApp API integration
- [ ] SMS API integration
- [ ] Email integration
- [ ] Campaign management
- [ ] Campaign scheduling
- [ ] Automation workflows
- [ ] Analytics dashboard
- [ ] Production deployment

---

## 🤝 Contributing

Contributions, ideas, and feature suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push your branch.
5. Open a Pull Request.

---

## 📄 License

This project is currently proprietary.

All rights reserved © Notify-Flow.

---

<p align="center">
  <strong>Notify-Flow</strong><br/>
  Messages Build Business.<br/>
  🌐 https://notify-flow.in
</p>
