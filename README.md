# AI-Powered Real-Time Teaching Feedback Tool

A dockerized web application for collecting and AI-grading student responses in real time. Features an admin interface for live sessions/questions management and a lightweight student interface for submitting answers.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

## Environment Setup

1. In the `backend` directory, create a `.env` file (or copy it if there is a template). At minimum, you need to configure your OpenRouter API key to enable the AI grading features.

    Create `backend/.env` with the following contents:
    ```env
    OPENROUTER_API_KEY=your_actual_openrouter_api_key_here
    SECRET_KEY=a_long_random_string_for_jwt_auth
    ```
    
    *Note: If `OPENROUTER_API_KEY` is completely missing or invalid, the backend will still function but will return mocked AI grading scores for student submissions.*

## Running the Application

1. Open a terminal in the root directory of this project (`/Users/kellerflint/Projects/ai_rt_fb`).
2. Build and start the containers using Docker Compose:
    ```bash
    docker-compose up -d --build
    ```
3. Wait a few seconds for the MySQL database to initialize and the backend server to start. 

## URLs & Access

### Student Access
- **URL**: [http://localhost:5173/](http://localhost:5173/)
- Students simply need the **Session Code** provided by the admin to join an active session.

### Admin Access
- **URL**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
- **Default Credentials**:
  - **Username**: `admin`
  - **Password**: `admin`

*Note: The default admin account is seeded automatically via `database/init.sql` on the first launch.*

## Troubleshooting

- **Backend Logs**: If something isn't working, check the backend logs: `docker-compose logs backend -f`
- **Database Logs**: `docker-compose logs db -f`
- **Rebuilding after changes**: `docker-compose up -d --build`
- **Clearing Database**: If you need to wipe the database and start fresh (this will delete all sessions and questions):
  ```bash
  docker-compose down -v
  docker-compose up -d --build
  ```
