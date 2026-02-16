# NEXUS - How to Use Guide

## Quick Start (5 minutes)

### 1. Prerequisites

```bash
# Check Node.js version (need 18+)
node --version

# Install pnpm if not installed
npm install -g pnpm@8

# Verify pnpm
pnpm --version
```

### 2. Clone and Setup

```bash
git clone https://github.com/diesdaas/nexus7.git
cd nexus7

# Install all dependencies
pnpm install

# Build all packages
pnpm build
```

### 3. Start Local Environment

```bash
# Start infrastructure (Redis, PostgreSQL, Prometheus, Grafana)
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 4. Run Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Watch mode
pnpm test -- --watch
```

### 5. Start NEXUS Core Service

```bash
# In development mode
cd services/nexus-core
pnpm dev

# Or run built version
pnpm start
```

---

## Core Concepts

### What is NEXUS?

NEXUS is a decentralized framework for coordinating multiple AI agents. Think of it as:
- **Central Nervous System** for AI agents
- **Task Router** that assigns work intelligently
- **Security Manager** for agent authentication and encryption
- **Performance Monitor** for system health

### Key Components

```
User/App
    ↓
API Gateway (nexus-core)
    ↓
Task Orchestrator (decompose & route)
    ↓
Agent Registry (find best agent)
    ↓
Neural Mesh (send messages)
    ↓
Agents (process tasks)
```

---

## Common Workflows

### 1. Register an Agent

```typescript
import { AgentRegistry } from '@nexus/agent-registry';
import { AgentMetadata } from '@nexus/shared';

const registry = new AgentRegistry();

const agent: AgentMetadata = {
  id: 'nlp-agent-1',
  name: 'NLP Processing Agent',
  type: 'llm',
  capabilities: [
    {
      name: 'sentiment-analysis',
      version: '1.0',
      description: 'Analyze sentiment of text',
      inputSchema: { text: 'string' },
      outputSchema: { sentiment: 'string', score: 'number' },
    },
    {
      name: 'text-classification',
      version: '1.0',
      description: 'Classify text into categories',
      inputSchema: { text: 'string' },
      outputSchema: { category: 'string' },
    },
  ],
  reputationScore: 1.0,
  lastHeartbeat: new Date(),
  status: 'online',
};

// Register the agent
registry.register(agent);

// Verify registration
console.log(registry.getAgent('nlp-agent-1'));
```

### 2. Create and Assign a Task

```typescript
import { TaskOrchestrator } from '@nexus/task-orchestrator';

const orchestrator = new TaskOrchestrator(registry);

// Create a job
const job = orchestrator.createJob(
  'user-123',
  'Analyze Customer Feedback',
  'Process and classify customer reviews'
);

// Decompose into tasks
const tasks = orchestrator.decomposeTasks(job.id, [
  {
    name: 'Extract Sentiments',
    objective: 'Find sentiment in each review',
    metadata: { requiredCapability: 'sentiment-analysis' },
  },
  {
    name: 'Classify Reviews',
    objective: 'Categorize reviews by type',
    metadata: { requiredCapability: 'text-classification' },
  },
]);

// Route and assign tasks
const router = new TaskRouter(registry);
for (const task of tasks) {
  const decision = router.findBestAgent(task);
  if (decision) {
    orchestrator.assignTask(task.id, decision.agentId);
    console.log(`Task ${task.id} assigned to ${decision.agentId}`);
  }
}
```

### 3. Encrypt Sensitive Data

```typescript
import { SecureVault } from '@nexus/secure-vault';

const vault = new SecureVault();

// Encrypt
const plaintext = Buffer.from('customer-secret-data');
const encrypted = vault.encryptData(plaintext);

console.log('Encrypted:', encrypted.ciphertext);

// Decrypt
const decrypted = vault.decryptData(encrypted);
console.log('Decrypted:', decrypted.toString());
```

### 4. Authenticate User

```typescript
const vault = new SecureVault();

// Authenticate
const credentials = vault.authenticate('user@example.com', 'password');
console.log('Token:', credentials.token);
console.log('Expires:', credentials.expiresAt);

// Verify token later
const verified = vault.verifyToken(credentials.token);
console.log('Verified user:', verified.userId);

// Refresh token
const newCredentials = vault.refreshToken(credentials.token);
console.log('New token:', newCredentials.token);
```

### 5. Monitor Performance

```typescript
import { PerformanceMonitor } from '@nexus/shared';

const monitor = new PerformanceMonitor();

// Set SLO target
monitor.setThreshold('task-execution', 5000); // 5 seconds

// Measure operation
const end = monitor.startMeasure('task-execution');

// ... do work ...
await executeTask();

end(); // Record the measurement

// Get statistics
const stats = monitor.getStatistics('task-execution');
console.log(`P95: ${stats?.p95}ms, P99: ${stats?.p99}ms`);
```

### 6. Track SLOs

```typescript
import { SLOTracker } from '@nexus/shared';

const sloTracker = new SLOTracker();

// Register SLO
sloTracker.registerSLO({
  name: 'task-completion-time',
  target: 95.0, // 95% of tasks complete in time
  window: 3600000, // 1 hour window
  description: 'Task completion SLO',
});

// Record measurements
sloTracker.recordMeasurement('task-completion-time', 94.5);
sloTracker.recordMeasurement('task-completion-time', 96.2);
sloTracker.recordMeasurement('task-completion-time', 93.1);

// Check status
const status = sloTracker.getStatus('task-completion-time');
console.log(`Status: ${status?.status}`); // healthy, warning, or violated
console.log(`Error Budget: ${status?.errorBudget}%`);
```

### 7. Use Caching

```typescript
import { Cache } from '@nexus/shared';

// Create cache for agent lookups
const agentCache = new Cache<string, AgentMetadata>({
  maxSize: 1000,
  ttl: 300000, // 5 minutes
  evictionPolicy: 'LRU',
});

// Store
agentCache.set('agent-1', agent);

// Retrieve
const cached = agentCache.get('agent-1');

// Check hit rate
const stats = agentCache.getStats();
console.log(`Hit Rate: ${stats.hitRate}%`);
```

---

## API Endpoints (Planning)

When running the core service, these endpoints will be available:

### Task Management

```bash
# Create job
POST /api/jobs
{
  "userId": "user-123",
  "title": "Process data",
  "objective": "Analyze 1000 records"
}

# Get job status
GET /api/jobs/:jobId

# List tasks for job
GET /api/jobs/:jobId/tasks

# Get task details
GET /api/tasks/:taskId

# Update task status
PATCH /api/tasks/:taskId
{
  "status": "completed",
  "result": { ... }
}
```

### Agent Management

```bash
# Register agent
POST /api/agents
{
  "id": "agent-1",
  "name": "NLP Agent",
  "type": "llm",
  "capabilities": [...]
}

# Get agent info
GET /api/agents/:agentId

# List all agents
GET /api/agents

# Update agent status
PATCH /api/agents/:agentId
{
  "status": "online"
}

# Get agent reputation
GET /api/agents/:agentId/reputation
```

### Security

```bash
# Authenticate
POST /api/auth/login
{
  "userId": "user@example.com",
  "password": "secret"
}

# Verify token
POST /api/auth/verify
{
  "token": "..."
}

# Refresh token
POST /api/auth/refresh
{
  "token": "..."
}

# Get audit log
GET /api/security/audit

# Get anomalies
GET /api/security/anomalies
```

### Monitoring

```bash
# Get system metrics
GET /api/metrics

# Get agent performance
GET /api/analytics/agents

# Get SLO status
GET /api/slos

# Get health check
GET /health

# Get readiness check
GET /ready
```

---

## Docker Deployment

### Build Docker Image

```bash
# Build
docker build -t nexus:latest .

# Run
docker run -p 8080:8080 \
  -e REDIS_HOST=redis \
  -e POSTGRES_HOST=postgres \
  nexus:latest
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f nexus-core

# Stop
docker-compose down

# Clean up volumes
docker-compose down -v
```

---

## Kubernetes Deployment

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace nexus

# Create secrets
kubectl create secret generic postgres-credentials \
  --from-literal=username=nexus \
  --from-literal=password=your-password \
  -n nexus

# Deploy
kubectl apply -k infrastructure/kubernetes/base -n nexus

# Check status
kubectl get pods -n nexus

# View logs
kubectl logs -f deployment/nexus-core -n nexus

# Port forward
kubectl port-forward svc/nexus-service 8080:80 -n nexus
```

### Scale Deployment

```bash
# Manual scaling
kubectl scale deployment nexus-core --replicas=5 -n nexus

# Auto-scaling
kubectl autoscale deployment nexus-core \
  --min=3 --max=10 --cpu-percent=70 \
  -n nexus
```

---

## Monitoring & Observability

### View Metrics

```bash
# Prometheus (local)
curl http://localhost:9090/api/v1/query?query=up

# Get specific metrics
curl http://localhost:9090/api/v1/query?query=nexus_tasks_total

# Query range
curl 'http://localhost:9090/api/v1/query_range?query=rate(nexus_errors_total[5m])&start=2024-01-01T00:00:00Z&end=2024-01-01T01:00:00Z&step=60'
```

### Grafana Dashboards

```bash
# Access Grafana
open http://localhost:3000

# Login
Username: admin
Password: admin

# Import NEXUS dashboard
Dashboard → Import → nexus-dashboard.json
```

---

## Troubleshooting

### Issue: Services not starting

```bash
# Check Docker
docker-compose logs

# Check ports
lsof -i :6379   # Redis
lsof -i :5432   # PostgreSQL
lsof -i :9090   # Prometheus
```

### Issue: High memory usage

```bash
# Check metrics
kubectl top pods -n nexus

# Check cache hit rate
curl http://localhost:8080/metrics | grep cache_hit_rate

# Reduce cache size or TTL
```

### Issue: Slow task routing

```bash
# Check agent registry load
curl http://localhost:8080/metrics | grep agent_registry_size

# Check routing latency
curl http://localhost:8080/metrics | grep routing_latency

# Increase connection pool size
```

### Issue: Connection errors

```bash
# Test Redis
redis-cli -h localhost ping

# Test PostgreSQL
psql -h localhost -U nexus -d nexus -c "SELECT 1"

# Check network policies
kubectl get networkpolicies -n nexus
```

---

## Performance Tuning

### Optimize Task Routing

```typescript
// Use caching for frequently routed tasks
const routingCache = new Cache<string, RoutingDecision>({
  maxSize: 5000,
  ttl: 300000, // 5 minutes
  evictionPolicy: 'LRU',
});

// Cache hit rate target: > 80%
```

### Optimize Serialization

```typescript
// Use binary serialization for high throughput
import { BinarySerializer } from '@nexus/neural-mesh';

const mesh = new NeuralMesh({
  nodeId: 'nexus-1',
  serializationFormat: 'binary', // Instead of 'json'
});
```

### Tune Connection Pool

```typescript
const pool = new ConnectionPool({
  maxConnections: 200, // Increase for high concurrency
  maxConnectionIdleTime: 600000, // 10 minutes
  connectionTimeout: 30000,
});
```

---

## Best Practices

### 1. Agent Design

```typescript
// ✅ Good: Specific capabilities
capabilities: [
  { name: 'sentiment-analysis', version: '1.0', ... },
  { name: 'entity-extraction', version: '1.0', ... },
]

// ❌ Bad: Vague capabilities
capabilities: [
  { name: 'nlp', version: '1.0', ... },
]
```

### 2. Task Decomposition

```typescript
// ✅ Good: Independent tasks
[
  { name: 'Extract', objective: 'Extract entities' },
  { name: 'Classify', objective: 'Classify sentiment' },
  { name: 'Aggregate', objective: 'Aggregate results' },
]

// ❌ Bad: Monolithic task
[
  { name: 'Process', objective: 'Do everything' },
]
```

### 3. Error Handling

```typescript
// ✅ Good: Explicit error handling
try {
  await orchestrator.assignTask(task.id, agent.id);
} catch (error) {
  if (error.code === ErrorCode.AGENT_NOT_FOUND) {
    // Handle agent not found
  }
}

// ❌ Bad: Silent failures
orchestrator.assignTask(task.id, agent.id);
```

### 4. Monitoring

```typescript
// ✅ Good: Monitor key operations
const end = monitor.startMeasure('task-routing');
const decision = router.findBestAgent(task);
end();

// ❌ Bad: No monitoring
const decision = router.findBestAgent(task);
```

---

## Next Steps

1. **Explore Examples**: Check `services/test-harness/src/integration.test.ts`
2. **Read Architecture**: See `ARCHITECTURE.md` for system design
3. **Review Tests**: Look at unit tests in `packages/*/src/__tests__/`
4. **Join Community**: GitHub discussions for questions
5. **Contribute**: Submit PRs for improvements

---

## Support & Resources

- **GitHub**: https://github.com/diesdaas/nexus7
- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues for bugs/features
- **Discussions**: GitHub Discussions for questions

---

## Command Reference

```bash
# Development
pnpm install           # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm dev              # Watch mode
pnpm lint             # Lint code
pnpm format           # Format code

# Docker
docker-compose up -d  # Start services
docker-compose down   # Stop services
docker-compose logs   # View logs

# Kubernetes
kubectl apply -k infrastructure/kubernetes/base -n nexus
kubectl get pods -n nexus
kubectl logs -f deployment/nexus-core -n nexus
kubectl delete -k infrastructure/kubernetes/base -n nexus

# Git
git clone https://github.com/diesdaas/nexus7.git
git pull origin main
git push origin main
```

---

**Happy orchestrating! 🚀**
