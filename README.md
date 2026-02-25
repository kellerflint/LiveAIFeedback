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

3. **Configure Your Domain (SSL/HTTPS)**:
   - Open `Caddyfile` and replace `YOUR_DOMAIN` with your actual domain, e.g., `feedback.myname.com`.
   - In your DNS registrar, create an **A Record** pointing that domain to your server's public IP.
   - Ensure TCP ports **80** and **443** are open in your server firewall/security group.
   - Caddy will automatically provision and renew a free Let's Encrypt SSL certificate.

4. **Run the Application**:
   ```bash
   docker compose up -d --build
   ```

## URLs & Access

- **Student Login**: `https://your-domain.com/`
- **Admin Dashboard**: `https://your-domain.com/admin/login`
  - **Username**: `admin` | **Password**: `admin`

## E2E Testing

We use Playwright with a fully isolated ephemeral Docker stack to prevent test data from polluting your live database.

```bash
# First time setup
cd e2e_tests && npm install && npx playwright install chromium
cd ..

# Run the test suite
./e2e_tests/run_e2e.sh
```

