# AI-Powered Real-Time Teaching Feedback Tool

A dockerized web application for collecting and AI-grading student responses in real time. Features an admin interface for live sessions/questions management and a lightweight student interface for submitting answers.

## Setup & Deployment

1. **Clone & Install Docker**:
   ```bash
   git clone <repository-url> && cd ai_rt_fb
   # On Ubuntu VM without Docker: 
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER && newgrp docker
   ```

2. **Configure AI API Key**:
   Create `backend/.env` with your OpenRouter key (returns mocked AI scores if missing/invalid):
   ```env
   OPENROUTER_API_KEY=your_actual_openrouter_api_key_here
   ```

3. **Run the Application**:
   ```bash
   docker compose up -d --build
   ```

## URLs & Access

Ensure TCP ports `5173` and `8000` are open if deploying to a VM firewall.

- **Student Login**: `http://localhost:5173/` or `http://<vm-ip>:5173/`
- **Admin Dashboard**: `http://localhost:5173/admin/login`
  - **Username**: `admin` | **Password**: `admin`
- **Backend API Docs**: `http://localhost:8000/docs`

## E2E Testing

We use Playwright with a fully isolated ephemeral Docker stack to prevent test data from polluting your live database.

```bash
# First time setup
cd e2e_tests && npm install && npx playwright install chromium
cd ..

# Run the test suite
./e2e_tests/run_e2e.sh
``
