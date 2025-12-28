Prompts for AI-Assisted Development

Copy and paste the specific section below into your LLM along with the content of technical_design_doc.md to generate the specific project components.

Prompt 1: Backend Development (NestJS)

Context: I am building a GPU renting platform. Please refer to the attached technical_design_doc.md for the architecture, protocols, and database strategy.

Task: Create the Backend using NestJS.

Requirements:

Architecture: Use a Domain-Driven Design (DDD) approach.

Modules: AuthModule (Clerk), MarketplaceModule (Search/Booking), FleetModule (Agent management), BillingModule (Per-minute calculation), ProxyModule (Tunnel management).

Database:

Setup Prisma with PostgreSQL for the entities defined in the design doc (User, HostNode, Rental).

Setup an InfluxDB service to write/query time-series data (Host Metrics).

Setup Redis for caching market search results and session management.

WebSockets:

Create a FleetGateway using socket.io or standard ws.

Implement the heartbeat listener that writes to InfluxDB.

Implement the start_instance emitter ensuring strictly typed JSON payloads.

Business Logic:

Smart Pricing: Create a service that calculates a suggested price for a HostNode based on its GPU model (e.g., RTX 4090) and current market averages.

Matching: Implement a search algorithm to find available nodes based on CPU/RAM/GPU requirements.

Security: Ensure all endpoints are guarded by Clerk Auth Guards.

Output: Provide the folder structure, app.module.ts, prisma.schema, and the core FleetGateway implementation.

Prompt 2: Host Agent Development (Python)

Context: I am building a GPU renting platform. Please refer to the attached technical_design_doc.md.

Task: Create the "System Agent" application in Python.

Requirements:

Tech Stack: Python 3.10+, docker (Python SDK), psutil, websockets (async), typer (CLI).

Core Features:

Hardware Handshake: On startup, use nvidia-smi (via subprocess or pynvml) to detect GPU VRAM, Drivers, and CUDA version. Use speedtest-cli for network bandwidth.

Container Orchestration:

Listen for start_instance WebSocket events.

Use the Docker SDK to pull the requested image.

CRITICAL: Bind the container to the Host's Docker Daemon via socket.

CRITICAL: Use --gpus all or specific device IDs mapping.

Tunneling: Integrate with a binary (like frpc). When a container starts, dynamically configure a tunnel to the Proxy Server and report the public address back to the Backend.

Heartbeat Loop: An asyncio loop running every 5 seconds to gather metrics and send to Backend.

Distribution:

Create a pyinstaller spec file to build a single executable .exe (Windows) and binary (Linux).

Create a Github Workflow to build these binaries automatically.

Output: Provide the main.py entry point, the DockerManager class, the HardwareDetector class, and the requirements.txt.

Prompt 3: Frontend Development (Next.js)

Context: I am building a GPU renting platform. Please refer to the attached technical_design_doc.md.

Task: Create the Frontend using Next.js (App Router).

Requirements:

Tech Stack: Next.js, Tailwind CSS, Shadcn/UI, Clerk (Auth), Recharts (Analytics), Lucide React (Icons).

Pages & Features:

Landing Page: A high-converting page with a "ROI Calculator". Allow users to input "RTX 4090" and electricity cost to see potential monthly earnings. Use a mock map component to show "Active Nodes".

Lease Console (Host):

Dashboard showing list of machines.

"Maintenance Mode" toggle.

"Smart Pricing" toggle (calls backend API).

Analytics charts (Recharts) fetching data from InfluxDB (via Backend API).

Rent Console (Client):

Marketplace table with filters (GPU VRAM, TFLOPS, Location, Price).

"One-Click Rent" modal that lets the user select a template (PyTorch, Stable Diffusion, Minecraft).

"Connect" button: Once rented, show the SSH string and a "Open Jupyter" button (if applicable).

State Management: Use React Query (Tanstack Query) for polling status updates.

Output: Provide the folder structure, the page.tsx for the Landing page, and the RentConsole component logic.

Prompt 4: Clean Code & Standards Strategy

Context: I am working on the DistributedCompute project (Next.js, NestJS, Python).

Task: Generate a set of strict coding standards and abstraction rules for the codebase.

Requirements:

Single Responsibility: Define strict rules for Service/Controller separation in NestJS and Component/Hook separation in React.

Configuration: All secrets (API keys, DB URLs) must be loaded from .env. Provide a script to validate .env schema (e.g., using zod or joi) on startup for both Backend and Frontend.

Error Handling:

Backend: Global Exception Filter for standardized JSON error responses.

Agent: Retry logic for WebSocket disconnection (exponential backoff).

Type Safety: Share DTOs (Data Transfer Objects) between Backend and Frontend (using a shared monorepo workspace or strict interfaces).

Output: Provide a CONTRIBUTING.md file and a sample EnvConfigService implementation for NestJS.