# Simple Load Testing Guide

## Test Database Performance

### Step 1: Create test data
```sql
-- Insert 10,000 test users
INSERT INTO users (gamertag, email, gender, language)
SELECT 
  'testuser' || generate_series,
  'test' || generate_series || '@test.com',
  CASE (random() * 2)::int WHEN 0 THEN 'male' WHEN 1 THEN 'female' ELSE 'custom' END,
  CASE (random() * 3)::int WHEN 0 THEN 'en' WHEN 1 THEN 'es' ELSE 'fr' END
FROM generate_series(1, 10000);
```

### Step 2: Test query speed
```sql
-- Test WITHOUT index (slow)
EXPLAIN ANALYZE SELECT * FROM users WHERE gender = 'male';
-- Look for: Seq Scan (bad) vs Index Scan (good)
-- Note the execution time

-- Add index
CREATE INDEX idx_users_gender ON users(gender);

-- Test WITH index (fast)
EXPLAIN ANALYZE SELECT * FROM users WHERE gender = 'male';
-- Compare execution times
```

### Expected Results:
- **Without index**: 50-500ms for 10k users
- **With index**: 5-50ms for 10k users
- **Scales linearly**: 100k users = 10x slower without index

---

## Test WebSocket Connections

### Using Artillery (load testing tool)
```bash
# Install
npm install -g artillery

# Create test script (artillery-ws-test.yml)
# Then run:
artillery run artillery-ws-test.yml
```

### Watch memory usage
```bash
# Monitor while running load test
watch -n 1 'ps aux | grep node'
```

### Expected Results:
- 100 connections = ~50-100MB memory
- 1,000 connections = ~500MB-1GB memory  
- 5,000 connections = ~2-4GB memory
- Beyond this = server becomes unstable

---

## Test API Pagination

### Current (loads all data)
```bash
time curl http://localhost:5000/api/users
# Note: response time and size
```

### With 10,000 users:
- Current: 5-10 seconds, 10MB response
- With pagination: <100ms, 100KB response

---

## Test Voice Call Connections

### Manual test:
1. Open 2 browsers (or use 2 devices)
2. Try to connect voice call
3. Check browser console for WebRTC connection state
4. Note: "failed" or "disconnected" = NAT issues

### Expected Results:
- Same network: 90% success rate
- Different networks: 40-60% success rate (without TURN)
- With TURN server: 95%+ success rate
