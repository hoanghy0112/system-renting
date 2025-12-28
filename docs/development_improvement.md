Initialize a Monorepo (using Turborepo or Nx). This will allow your Next.js frontend and NestJS backend to share TypeScript interfaces (DTOs), ensuring that if the Backend changes an API response, the Frontend knows immediately.

Start with the Backend prompt first. You need the database schema and WebSocket gateway running before the Python Agent has anything to talk to.

For the Proxy Server (the NAT solution), I recommend looking into an open-source project called FRP (Fast Reverse Proxy). You can run the frps (Server) on a cheap cloud VPS (DigitalOcean/Vultr) and bundle the frpc (Client) inside your Python Agent.