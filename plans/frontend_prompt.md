# Frontend Development Prompt (Next.js)

## Context

You are building **DistributedCompute**, a GPU/Compute rental marketplace platform (similar to vast.ai). Please refer to the attached `technical_design_doc.md` for the complete architecture.

The Frontend is part of a **monorepo** that shares TypeScript interfaces with the Backend. This ensures type safety across the entire stack.

---

## Task

Create the Frontend using Next.js (App Router) integrated with the monorepo structure.

---

## Requirements

### 1. Monorepo Integration

The Frontend lives in `apps/frontend/` and imports shared types:

```
distributed-compute/
├── apps/
│   ├── backend/
│   └── frontend/         # Your Next.js app
├── packages/
│   └── shared-types/     # Import DTOs from here
└── turbo.json
```

```typescript
// Import shared types
import { HostNode, Rental, HeartbeatEvent } from '@distributed-compute/shared-types';
```

### 2. Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14+ | App Router, Server Components |
| Tailwind CSS | Styling |
| Shadcn/UI | UI components |
| Clerk | Authentication |
| TanStack Query | Server state management, polling |
| Recharts | Analytics charts |
| Lucide React | Icons |

### 3. Pages & Features

#### Landing Page (`/`)

A high-converting page with:

- **Hero Section**: Clear value proposition for both Renters and Hosts
- **ROI Calculator**: 
  - Input: GPU model (e.g., RTX 4090), electricity cost
  - Output: Estimated monthly earnings
  - Call to action: "Start Earning"
- **Live Map Visualization**: 
  - Mock/real map showing active nodes globally
  - Demonstrates platform scale
- **Feature Grid**: Highlight benefits for Rent vs Lease roles
- **Security Section**: Link to dedicated privacy/security blog

#### Lease Console - Host Dashboard (`/dashboard/host`)

For users who provide GPU resources:

- **Node List**: Table of registered machines with status indicators
- **Per-Node Details**:
  - Hardware specs (GPU, CPU, RAM, Disk)
  - Current status (Online/Busy/Maintenance/Offline)
  - Active rentals
- **Controls**:
  - **"Smart Pricing" Toggle**: Enable auto-match market rate
  - **"Maintenance Mode" Button**: Drain node (finish current jobs, reject new)
- **Analytics Charts** (Recharts):
  - GPU/CPU utilization over time (data from InfluxDB via Backend API)
  - Revenue trends
  - Number of clients

#### Rent Console - Client Dashboard (`/dashboard/rent`)

For users who rent GPU resources:

- **Marketplace Table**:
  - Filters: GPU VRAM, TFLOPS, Location, Price range
  - Columns: GPU Model, VRAM, CPU, RAM, Price/hr, Location, Availability
  - Sort by: Price, Performance, Location
- **Template Store**: Pre-configured environments
  - PyTorch 2.0 + CUDA 11.8
  - Stable Diffusion WebUI
  - TensorFlow
  - Jupyter Lab
  - Minecraft Server
- **"One-Click Rent" Modal**:
  - Select template or custom Docker image
  - Configure resources (GPU count, RAM limit)
  - Estimated cost preview
  - Confirm button
- **Active Rentals**:
  - Status indicator
  - **"Connect" Button**: Display SSH string
  - **"Open Jupyter" Button**: Opens Jupyter Lab via proxy (if applicable)
  - Time remaining / cost accumulator

#### Authentication Pages

- Use Clerk's hosted UI or embedded components
- Single account for both Rent and Lease roles
- Role selection during onboarding

### 4. State Management

**TanStack Query** for all server data:

```typescript
// Polling for node status updates
const { data: nodes } = useQuery({
  queryKey: ['host-nodes'],
  queryFn: fetchHostNodes,
  refetchInterval: 5000,  // Poll every 5 seconds
});

// Mutations for actions
const startRental = useMutation({
  mutationFn: createRental,
  onSuccess: () => queryClient.invalidateQueries(['rentals']),
});
```

### 5. Real-Time Updates

For live metrics display:
- Use TanStack Query polling for dashboard data
- Consider WebSocket connection for critical real-time updates (rental start/stop)

### 6. UI/UX Requirements

- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Support system preference
- **Loading States**: Skeleton loaders for async content
- **Error Handling**: Toast notifications for errors
- **Accessibility**: ARIA labels, keyboard navigation

---

## Expected Output

1. **Folder Structure** following Next.js App Router conventions:
   ```
   apps/frontend/
   ├── app/
   │   ├── layout.tsx
   │   ├── page.tsx           # Landing page
   │   └── dashboard/
   │       ├── host/page.tsx
   │       └── rent/page.tsx
   ├── components/
   │   ├── ui/               # Shadcn components
   │   ├── landing/
   │   ├── host/
   │   └── rent/
   ├── lib/
   │   ├── api.ts            # API client
   │   └── utils.ts
   └── hooks/
   ```

2. **`page.tsx`** for Landing page with ROI calculator
3. **`RentConsole`** component with marketplace and rental logic
4. **`LeaseConsole`** component with node management
5. **TanStack Query hooks** for data fetching
6. **Clerk integration** with protected routes
