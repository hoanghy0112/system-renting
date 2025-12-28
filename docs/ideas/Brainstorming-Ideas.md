Give me prompt to write a whole decent project for a system renting website. (Like vast.ai)

# Frontend
Written in Nextjs
## Landing page
Have a landing page for introduce website, here is the list of feature to show on landing page:
* Have a general introduction about website.
* Choose a role (rent/lease)
* For rent:
   * Easy to setup
   * Security (Data is encrypted and hidden in host system to ensure data privacy), write a dedicated privacy and blog page to explain about security technique
   * Track host system availability/system configuration.
   * Deal with host owner to better deal.
   * Suitable for AI training, AI inference, pet project server.
   * Competitive pricing
* For lease:
   * Easy to setup. 
   * Highly managable (Refer the UI of System agent app below for more details)
## Lease console UI
* User can configure multiple host.
* For each host, user can split into multiple server (as long as it fit host limitation) and config pricing for each
* User can also configure a host as freely-renting mode (important), user will configure a list of options and pricing for each options.
* User can be able to configure renting hardware limitation and call backend to store that information, after that, this VM should only use that limitation.
* The UI also shows analytics information (Number of clients, total usage time, CPU/RAM/GPU/Disk usage in time series)
## Rent console UI
* User can search host system by location, availability, cost, cpu, ram, gpu, network (all hardware information and network benchmark will be shown to user)
* User can chat with host user, request deal/discount price.
* User can choose vm image to to start server (there is a given vm image to run ubuntu, windows)
## Authentication
* Use Clerk for authentication
* Each user have both Rent and Lease tab with single authentication account. (can use a single account for both Rent and Lease )

# System agent app (for managing host system)
* Write an app in Python, build into exe, sh so that it can run on windows, linux, macos
* This app have to collect current system information, timezone, location, ip, cpu, disk, gpu, ram, network speed (the limited configuration that user setup for Docker).
* This app also polling to backend to collect availability
* This app have an client to connect to backend via websocket and encrypt data to ensure security.
* When received start server event, it should run container (refer B section of the below Important Note for more details)
* Ensure security to not reveal user data in host system
* The flow is user run this app, it will log an url to sign in to this app with lease account, after that it can be managed in lease console UI
* Write github workflows to build and test in windows, linux, macos to make sure it can build and run in that system.

# Backend
* Written in Nestjs to handle all above features
* Organize in clean structure and appropriate abstract structure to easy to develop in future
* Use Prisma for managing PostgreSQL (main db)
* Use InfluxDB for store availability, analytics data (given from host app)
* Use redis for caching
* Write docker-compose and dockerfile

# Instruction to write prompt:
* Write the first prompt (in very details) to explain the core features, protocol, api schema, direction, general instruction to integrate frontend, backend and app in the same format/protocol. This prompt will be used to generate an app technical documentation which will be placed in every repo to context awareness and integration
* Write details prompt for frontend, backend, app
* Write prompt to ensure the code structure is clean, single-responsibility, abstract common logics, structure so that it's easy to develop more
* Constraint: 
   * store secret key, connection string in .env, while .env.example

# Important Note for improvement
A. The NAT/Connectivity Problem (Crucial)
The Problem: Most Hosts are residential (behind home routers). They cannot easily open ports. Renters need to SSH into the machine or access a Jupyter Notebook port (8888).

The Solution: You need a Tunneling / Reverse Proxy Service.

Don't ask Hosts to port forward manually (too hard, security risk).

Do: Implement a connection proxy.

Approach: The Host Agent opens a persistent connection (Tunnel) to your Proxy Server (can be a separate module in your backend infrastructure).

When a Renter connects to ssh user@node123.yourdomain.com, your Proxy Server routes that traffic through the tunnel to the specific Docker container on the Host.

Tech suggestion: Use Frp (Fast Reverse Proxy) or integrate a solution using WireGuard.

B. The "VM vs. Container" Distinction
The Idea: You mentioned "VM image".

The Reality: Running actual VMs (KVM/QEMU) inside Docker is heavy and slow. Vast.ai actually uses Docker Containers that act like VMs.

Refinement: Stick to OS-level virtualization (Containers).

It allows for "Passthrough" of GPU resources with near-native performance (essential for AI).

Use the NVIDIA Container Toolkit logic in your Host Agent to map the GPU to the container.

2. Frontend (Next.js) - Refined Features
Landing Page Enhancements
Dynamic ROI Calculator: "Calculate how much you earn." Allow hosts to input their GPU model (e.g., RTX 4090) and electricity cost to see potential profit.

Live Map Visualization: - Show active nodes globally to demonstrate scale.

Lease Console (Host Side)
"Smart Pricing" Toggle: Instead of fixed pricing, allow the Host to set "Auto-match market rate." Your backend calculates the average price for that specific GPU and adjusts automatically.

Maintenance Mode: A button to "Drain" the node. It stops accepting new jobs but lets current ones finish so the host can restart their PC.

Rent Console (Client Side)
Template Store: Don't just offer "Ubuntu" or "Windows". Offer:

PyTorch 2.0 + CUDA 11.8

Stable Diffusion WebUI

TensorFlow

Minecraft Server

Jupyter Lab Integration: If the user rents for AI, provide a "One-click Connect" button that opens Jupyter Lab in the browser (via your Proxy).

3. System App (The Host Agent) - Python
This is the most critical piece of software. It needs to be robust.

Tech Stack: Python, docker-py (SDK), psutil (for metrics), websockets.

Key Responsibilities:

Hardware Handshake:

Auto-detect GPU: Use nvidia-smi --query-gpu=... to get VRAM, Cores, and Driver version.

Auto-detect Network: Run a speed test (e.g., speedtest-cli) on startup to verify upload/download bandwidth.

Container Orchestration:

Instead of "Docker in Docker" (which is dangerous), use the Docker Socket Binding. The Host Agent interacts with the Host's Docker Daemon to spawn sibling containers.

Isolation: Use cgroups to strictly limit CPU/RAM as per the rental agreement.

The Heartbeat:

Send a JSON payload every 5 seconds via WebSocket to InfluxDB: { nodeId, cpu_temp, gpu_temp, gpu_utilization, ram_usage, status }.

Auto-Update:

The Agent should have a small "Watcher" process that can update the main Agent code when you push a new version.

4. Backend (NestJS) - Architecture
Organize using Domain-Driven Design (DDD) principles or a Modular Monolith.

Modules:

AuthModule: Wraps Clerk. handles JWT validation.

MarketplaceModule:

Matching engine: Matches a Rent Request -> Available Host.

Algorithm: Needs to handle "closest location" and "lowest price" sorting.

FleetModule (Host Management):

Handles the WebSocket Gateway.

Receives heartbeats and pushes to InfluxDB.

OrderModule:

Handles the "Lease" logic.

Calculates billing (Per minute billing is best for this).

ProxyModule:

Manages the SSH/HTTP tunnels (if you build the proxy logic within NestJS, or orchestrates an external Nginx/Frp service).

Database Strategy (Prisma + Influx):

Prisma (Postgres): Stores Users, Host Configurations, Order History, Transactions.

InfluxDB: Stores high-frequency time-series data (CPU usage every 5 seconds). Do not store this in Postgres or your DB will choke.