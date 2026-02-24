# Deployment Guide (Ubuntu VM)

This guide walks through deploying the AI Real-Time Feedback application on a fresh Ubuntu Virtual Machine.

## Prerequisites

1.  **Clone the Repository**:
    ```bash
    git clone <your-repository-url>
    cd ai_rt_fb
    ```

2.  **Install Docker**:
    If your Ubuntu VM does not have Docker installed, the easiest way is to use the official Docker convenience script:
    ```bash
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    
    # Add your user to the docker group so you don't have to type 'sudo' every time
    sudo usermod -aG docker $USER
    newgrp docker
    ```
    Verify the installation:
    ```bash
    docker compose version
    ```

## Configuration

1.  **Set up the AI API Key**:
    You need to write your OpenRouter API key to the `backend/.env` file so the Docker container can pick it up.
    ```bash
    cd ai_rt_fb
    nano backend/.env
    ```
    Paste the following, replacing the placeholder with your real key, then save (`Ctrl+O`, `Enter`, `Ctrl+X`):
    ```env
    OPENROUTER_API_KEY=your-actual-api-key-here
    ```

## Running the Application

1.  **Build and Start the Containers**:
    From the root directory of the project (where `docker-compose.yml` is located), spin up the detached environment:
    ```bash
    docker compose up --build -d
    ```

2.  **Verify the Containers are Running**:
    ```bash
    docker compose ps
    ```
    You should see `db`, `backend`, and `frontend` configured and in an `Up` state.

## Accessing the App

Once everything is booted, you can access the application using your Ubuntu VM's public IP address or domain:

*   **Student Join Screen:** `http://<your-vm-ip>:5173`
*   **Admin Dashboard:** `http://<your-vm-ip>:5173/admin/login`
*   **Backend API Docs (Swagger):** `http://<your-vm-ip>:8000/docs`

> **Firewall Note:** By default, the Vite frontend binds to port `5173` and the FastAPI backend to `8000`. Ensure your VM provider's Security Groups or the `ufw` firewall allows inbound TCP traffic on ports **5173** and **8000**.

## Troubleshooting

- **Containers failing to start?** View the orchestrator logs to see what crashed.
  ```bash
  docker compose logs -f
  ```
- **"Error connecting to AI service"?** This usually means OpenRouter rejected the request. Check the secure backend log:
  ```bash
  cat backend/ai_service.log
  ```
- **Database Connection Issues?** Give the MySQL container a few extra seconds to initialize its tables on the very first boot. Restarting the backend usually resolves race-conditions:
  ```bash
  docker compose restart backend
  ```
