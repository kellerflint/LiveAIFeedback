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

3. **Set Up DNS**:
   Log into your domain registrar (Namecheap, GoDaddy, etc.) and create an **A Record**:
   | Type | Host | Value |
   |------|------|-------|
   | A | `feedback` (or any subdomain) | Your server's public IP |

4. **Configure Caddyfile**:
   Open `Caddyfile` and replace `YOUR_DOMAIN` with your actual domain:
   ```
   feedback.myname.com {
   ```

5. **Open Firewall Ports** (ports 5173/8000 can be closed):
   ```bash
   sudo ufw allow 80 && sudo ufw allow 443
   ```
   Also allow these in your cloud provider's firewall/security group if applicable. Caddy auto-provisions and renews Let's Encrypt SSL certificates.

6. **Run the Application**:
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

