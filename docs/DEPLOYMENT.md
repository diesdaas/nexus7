# NEXUS Deployment Guide

## Local Development

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### Quick Start

```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Start local infrastructure
docker-compose up -d

# Run tests
pnpm test

# Start development mode
pnpm dev
```

### Docker Compose Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Clean up volumes
docker-compose down -v
```

Services:
- **Redis** (port 6379): Message broker
- **PostgreSQL** (port 5432): State storage
- **Prometheus** (port 9090): Metrics
- **Grafana** (port 3000): Dashboards (admin/admin)

## Kubernetes Deployment

### Prerequisites
- kubectl 1.24+
- Kubernetes 1.24+
- Container registry access

### Build and Push Docker Image

```bash
# Build image
docker build -t nexus:latest .

# Tag for registry
docker tag nexus:latest your-registry/nexus:latest

# Push to registry
docker push your-registry/nexus:latest
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace nexus

# Create secrets
kubectl create secret generic postgres-credentials \
  --from-literal=username=nexus \
  --from-literal=password=change-me \
  -n nexus

# Deploy using kustomize
kubectl apply -k infrastructure/kubernetes/base -n nexus

# Verify deployment
kubectl get deployments -n nexus
kubectl get pods -n nexus
kubectl get services -n nexus

# Check logs
kubectl logs -f deployment/nexus-core -n nexus

# Port forward
kubectl port-forward svc/nexus-service 8080:80 -n nexus
```

### Scaling

```bash
# Scale replicas
kubectl scale deployment nexus-core --replicas=5 -n nexus

# Auto-scaling with HPA
kubectl autoscale deployment nexus-core --min=3 --max=10 --cpu-percent=80 -n nexus
```

### Rolling Updates

```bash
# Update image
kubectl set image deployment/nexus-core \
  nexus-core=your-registry/nexus:v1.1.0 \
  -n nexus

# Check rollout status
kubectl rollout status deployment/nexus-core -n nexus

# Rollback if needed
kubectl rollout undo deployment/nexus-core -n nexus
```

## Health Checks & Monitoring

### Health Endpoints

```bash
# Liveness check
curl http://localhost:8080/health

# Readiness check
curl http://localhost:8080/ready

# Metrics endpoint
curl http://localhost:9090/metrics
```

### View Metrics in Grafana

1. Open http://localhost:3000
2. Login with admin/admin
3. Navigate to Dashboards
4. Select NEXUS Dashboard

### Alerting

Configure alerts in Prometheus for:
- Pod restarts
- High error rate
- Memory usage
- CPU usage
- Task failures

## Backup & Disaster Recovery

### Database Backup

```bash
# Backup PostgreSQL
docker exec nexus-postgres-1 pg_dump -U nexus nexus > backup.sql

# Restore from backup
docker exec -i nexus-postgres-1 psql -U nexus nexus < backup.sql
```

### State Persistence

- Redis data: `docker-compose down` preserves volumes
- PostgreSQL data: Persisted in named volume

### Disaster Recovery Plan

1. **Full Cluster Backup**
   ```bash
   kubectl get all -A -o yaml > cluster-backup.yaml
   ```

2. **Persistent Volume Backup**
   ```bash
   kubectl get pv -o yaml > pv-backup.yaml
   ```

3. **Configuration Backup**
   ```bash
   kubectl get configmap,secret -A -o yaml > config-backup.yaml
   ```

## Operations & Troubleshooting

### Common Issues

**Pods not starting**
```bash
kubectl describe pod <pod-name> -n nexus
kubectl logs <pod-name> -n nexus
```

**High memory usage**
```bash
kubectl top pods -n nexus
# Increase resource limits in deployment.yaml
```

**Database connection errors**
```bash
# Check database service
kubectl get svc postgres-service -n nexus
# Verify credentials secret
kubectl get secret postgres-credentials -n nexus
```

### Performance Tuning

1. **Increase replicas** for load balancing
2. **Adjust resource limits** based on metrics
3. **Enable horizontal pod autoscaling**
4. **Optimize database queries**
5. **Configure caching layers**

## Production Checklist

- [ ] Configure production environment variables
- [ ] Set up TLS/SSL certificates
- [ ] Configure network policies
- [ ] Set up RBAC for service accounts
- [ ] Enable audit logging
- [ ] Configure backup schedule
- [ ] Set up monitoring and alerts
- [ ] Test disaster recovery procedures
- [ ] Document operational runbooks
- [ ] Security review completed
