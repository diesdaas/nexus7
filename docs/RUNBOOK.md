# NEXUS Operations Runbook

## Incident Response

### Alert: High Error Rate

**Detection**: Error rate > 5% for 5 minutes

**Steps**:
1. Check service logs: `kubectl logs -f deployment/nexus-core -n nexus`
2. Review recent deployments: `kubectl rollout history deployment/nexus-core -n nexus`
3. Check agent health: `kubectl exec <pod> -- curl localhost:8080/agents/health`
4. If degraded, rollback: `kubectl rollout undo deployment/nexus-core -n nexus`
5. Investigate root cause in application logs
6. Deploy fix and roll out gradually

### Alert: High Memory Usage

**Detection**: Memory > 80% for 10 minutes

**Steps**:
1. Identify memory leak: `kubectl top pods -n nexus`
2. Check application logs for memory warnings
3. Restart affected pods:
   ```bash
   kubectl rollout restart deployment/nexus-core -n nexus
   ```
4. If issue persists, increase memory limits:
   - Edit deployment.yaml
   - Update `resources.limits.memory`
   - Reapply: `kubectl apply -k infrastructure/kubernetes/base -n nexus`

### Alert: Pod Restarts

**Detection**: Pod restart count > 5

**Steps**:
1. Get pod events: `kubectl describe pod <pod-name> -n nexus`
2. Check logs: `kubectl logs --previous <pod-name> -n nexus`
3. Check resource constraints
4. Verify configuration is correct
5. Check dependencies (Redis, PostgreSQL)

## Routine Operations

### Daily

- [ ] Monitor dashboard for anomalies
- [ ] Check error rates and response times
- [ ] Verify all pods are running: `kubectl get pods -n nexus`
- [ ] Review security alerts

### Weekly

- [ ] Review performance metrics
- [ ] Check disk usage
- [ ] Verify backup completion
- [ ] Review agent reputation scores
- [ ] Test health checks manually

### Monthly

- [ ] Update dependencies
- [ ] Security patching
- [ ] Performance review and tuning
- [ ] Capacity planning
- [ ] Test disaster recovery procedure

## Common Tasks

### Deploy New Version

```bash
# Build new image
docker build -t nexus:v1.1.0 .
docker push your-registry/nexus:v1.1.0

# Deploy
kubectl set image deployment/nexus-core \
  nexus-core=your-registry/nexus:v1.1.0 \
  -n nexus

# Verify
kubectl rollout status deployment/nexus-core -n nexus
```

### Scale Up

```bash
# Manual scaling
kubectl scale deployment nexus-core --replicas=5 -n nexus

# Enable auto-scaling
kubectl autoscale deployment nexus-core \
  --min=3 --max=10 --cpu-percent=70 \
  -n nexus
```

### Restart Service

```bash
# Graceful restart
kubectl rollout restart deployment/nexus-core -n nexus

# Wait for restart
kubectl rollout status deployment/nexus-core -n nexus
```

### View Logs

```bash
# Current logs
kubectl logs deployment/nexus-core -n nexus

# Follow logs
kubectl logs -f deployment/nexus-core -n nexus

# Last 100 lines
kubectl logs --tail=100 deployment/nexus-core -n nexus

# From all pods
kubectl logs -l app=nexus -n nexus -f
```

### Connect to Pod

```bash
# Shell into pod
kubectl exec -it <pod-name> -n nexus -- /bin/sh

# Run command
kubectl exec <pod-name> -n nexus -- curl localhost:8080/health
```

## Database Operations

### Backup

```bash
# Backup database
kubectl exec postgres-0 -n nexus -- \
  pg_dump -U nexus nexus > backup-$(date +%Y%m%d).sql

# Verify backup
ls -lh backup-*.sql
```

### Restore

```bash
# Restore from backup
kubectl exec -i postgres-0 -n nexus -- \
  psql -U nexus nexus < backup-20240101.sql
```

### Connect

```bash
# Connect to database
kubectl exec -it postgres-0 -n nexus -- \
  psql -U nexus -d nexus
```

## Security Operations

### Rotate Keys

```bash
# Connect to pod
kubectl exec -it <pod-name> -n nexus -- /bin/sh

# Trigger key rotation
curl -X POST localhost:8080/security/rotate-keys

# Verify
curl localhost:8080/security/status
```

### View Audit Log

```bash
kubectl exec <pod-name> -n nexus -- \
  curl localhost:8080/security/audit -s | jq
```

### Check for Anomalies

```bash
kubectl exec <pod-name> -n nexus -- \
  curl localhost:8080/security/anomalies -s | jq
```

## Metrics & Monitoring

### Query Prometheus

```bash
# Port forward to Prometheus
kubectl port-forward svc/prometheus-service 9090:9090 -n nexus

# Query examples:
# - Error rate: rate(nexus_errors_total[5m])
# - Request latency: histogram_quantile(0.95, nexus_request_duration_seconds)
# - Pod memory: container_memory_usage_bytes{pod=~"nexus.*"}
```

### Export Metrics

```bash
# Prometheus metrics export
curl http://localhost:9090/api/v1/query?query=up

# Grafana dashboard export
curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
  http://localhost:3000/api/dashboards/uid/nexus
```

## Troubleshooting

### Pods not becoming ready

```bash
# Check pod status
kubectl describe pod <pod-name> -n nexus

# Check logs
kubectl logs <pod-name> -n nexus

# Check readiness probe
kubectl get pod <pod-name> -n nexus -o yaml | grep -A 10 readinessProbe

# Wait longer
kubectl wait --for=condition=ready pod/<pod-name> -n nexus --timeout=300s
```

### High latency

```bash
# Check metrics
kubectl top nodes
kubectl top pods -n nexus

# Check network policies
kubectl get networkpolicies -n nexus

# Check service endpoints
kubectl get endpoints -n nexus
```

### Services can't communicate

```bash
# Check service DNS
kubectl exec <pod> -n nexus -- nslookup postgres-service

# Check network policies
kubectl get networkpolicies -n nexus

# Test connectivity
kubectl exec <pod> -n nexus -- curl -v postgres-service:5432
```

## Contact & Escalation

- **On-call Engineer**: Check PagerDuty
- **Team Lead**: @nexus-team-lead
- **Platform Team**: #nexus-platform (Slack)
- **Incident Commander**: Declare incident in #incidents
