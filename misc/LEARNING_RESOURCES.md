# PostgreSQL Concurrency & Database Learning Resources

## Core PostgreSQL Concurrency Topics

### 1. MVCC (Multi-Version Concurrency Control)
- **PostgreSQL Official Docs**: https://www.postgresql.org/docs/current/mvcc.html
  - Fundamental concept - explains how PostgreSQL handles concurrent reads/writes
- **Theory & Practice**: https://www.postgresql.org/docs/current/transaction-iso.html
  - Transaction isolation levels and how they affect concurrency

### 2. Locking Mechanisms
- **Row-Level Locking**: https://www.postgresql.org/docs/current/explicit-locking.html
  - `FOR UPDATE`, `FOR SHARE` - row-level locks you'd use for race condition fixes
- **PostgreSQL Locking Deep Dive**: https://www.postgresql.org/docs/current/locking-tables.html
  - Different lock types and when to use them

### 3. Race Conditions & Transactions
- **PostgreSQL Concurrency Wiki**: https://wiki.postgresql.org/wiki/Lock_Monitoring
  - Practical examples and monitoring
- **Common Concurrency Issues**: 
  - Lost updates (exactly what you're dealing with)
  - Read-modify-write cycles
  - Transaction isolation

### 4. Practical Tutorials & Guides
- **2ndQuadrant Blog - PostgreSQL Concurrency**: 
  - Great practical examples of race conditions and solutions
- **Use The Index, Luke - Concurrency**: 
  - Performance implications of locking
- **Postgresql Performance Book (Free)**: https://use-the-index-luke.com/
  - Chapter on concurrency and locking

### 5. Atomic Operations & Functions
- **PostgreSQL Functions**: https://www.postgresql.org/docs/current/xfunc.html
  - How to write atomic database functions (like your `increment_win`)
- **PostgreSQL Stored Procedures**: https://www.postgresql.org/docs/current/plpgsql.html
  - Writing procedural code in PostgreSQL

## Specific Topics for Your Use Case

### Read-Modify-Write Race Conditions
- **Problem**: Reading a value, calculating new value in application, writing back
- **Solution**: Move calculation into database with `FOR UPDATE` locking
- **Example Pattern**:
```sql
-- Bad (has race condition):
SELECT elo_rating FROM user_ratings WHERE player_tag = 'X'; -- 1500
-- Calculate in app: 1500 + 20 = 1520
UPDATE user_ratings SET elo_rating = 1520 WHERE player_tag = 'X';

-- Good (atomic):
BEGIN;
SELECT elo_rating FROM user_ratings WHERE player_tag = 'X' FOR UPDATE; -- Locks row
UPDATE user_ratings SET elo_rating = elo_rating + calculated_value WHERE player_tag = 'X';
COMMIT;
```

### Optimistic vs Pessimistic Locking
- **Pessimistic** (FOR UPDATE): Lock row, prevent others from reading until you're done
- **Optimistic** (version column): Assume no conflict, check version on update, retry if changed
- **When to use**: Pessimistic for high-contention, Optimistic for low-contention

### Row-Level Security (RLS) + Concurrency
- **Your code uses RLS**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Performance**: RLS policies can affect lock contention
- **Best practices**: Keep policies simple, use indexes

## Database Design Patterns

### 1. Idempotency
- Operations that can be safely retried
- Your battle insertion uses unique constraints - this is idempotent

### 2. Event Sourcing vs Current State
- Current state: Update ELO in place (what you're doing)
- Event sourcing: Store each battle as immutable event, calculate ELO on read
- Trade-offs for both approaches

### 3. Batch Processing & Concurrency
- How to handle large batch operations safely
- Transaction boundaries and performance

## Advanced Topics (Once You're Comfortable)

- **Serializable Snapshot Isolation (SSI)**: PostgreSQL's strongest isolation level
- **Lock Queues & Deadlocks**: How PostgreSQL prevents and handles deadlocks
- **Connection Pooling**: Important for high concurrency (PgBouncer, Supabase handles this)
- **Partitioning**: For very large tables (might help if you scale to millions of battles)

## Recommended Learning Path

1. **Start Here**: PostgreSQL Official Docs on MVCC (30 min read)
2. **Practical**: Read about `FOR UPDATE` locking (15 min)
3. **Hands-on**: Try implementing atomic ELO update function (1-2 hours)
4. **Deep Dive**: Read about transaction isolation levels (1 hour)
5. **Real-world**: Study Supabase's architecture docs (they use PostgreSQL)

## Video Tutorials

- **PostgreSQL University**: Free courses on PostgreSQL internals
- **Citus Data (now Microsoft)**: Great blog posts on PostgreSQL concurrency
- **Crunchy Data**: Educational content on PostgreSQL features

## Books (If You Want Deep Understanding)

1. **"PostgreSQL: Up and Running"** by Regina Obe & Leo Hsu
   - Practical guide, includes concurrency
2. **"PostgreSQL High Performance"** by Gregory Smith
   - Performance tuning including lock contention
3. **"Mastering PostgreSQL in Application Development"** by Dimitri Fontaine
   - Advanced patterns including concurrency

## Supabase-Specific Resources

- **Supabase Postgres Docs**: https://supabase.com/docs/guides/database
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security
- **Database Functions**: https://supabase.com/docs/guides/database/functions
- **Connection Pooling**: https://supabase.com/docs/guides/platform/connection-pooling

## Testing Concurrency Issues

- **pgbench**: PostgreSQL's built-in benchmarking tool
- **Test scripts**: Simulate concurrent transactions
- **Monitor locks**: Use `pg_locks` system view to see active locks

