import type { Client, InArgs, InStatement, ResultSet, Transaction, TransactionMode } from '@libsql/client'

/*
 * (pending modules S08b, 2026-10-11) A local `file:` database shared with another process — a probe's sqlite3, `npm run db:repair`
 * while a server runs — must never leave the server holding the file's lock. What did (reproduced, `design-source/verify/pending-modules/
 * verify-pm2-s08b.cjs` › the lock harness):
 *
 *  1. libsql opens every connection with NO busy timeout, so a statement that meets another process's lock fails at once with SQLITE_BUSY.
 *  2. @libsql/client runs each statement through `prepare().run()`, and libsql-js never resets a statement that failed: the half-run
 *     statement stays "active" until the garbage collector finalizes it. SQLite then
 *     · stops auto-committing later writes on that connection (an active writer is in progress) — they hold the write lock and are
 *       invisible to every other process: a failed BEGIN IMMEDIATE or autocommit write poisons the client's main connection;
 *     · keeps a SHARED lock after a COMMIT that failed and its ROLLBACK (a ROLLBACK with an active statement only downgrades to a read
 *       transaction) — on a transaction's own connection, which the client never touches again.
 *     Either way the lock stays until a GC happens to run, i.e. on an idle server until it restarts.
 *
 * The cure, at the root:
 *  · every connection waits up to BUSY_WAIT_MS for a lock (`timeout`, applied by the client to every connection it opens) — a collision
 *    with a short write or read simply waits for it, so statements don't fail in the first place;
 *  · a transaction ends through `executeMultiple` (libsql's exec, which finalizes its statement even when it fails), so a COMMIT that
 *    still meets a lock can be rolled back for real; a rollback after the transaction already ended is a no-op, so the first error is the
 *    one that surfaces;
 *  · a statement on the main connection that still fails with SQLITE_BUSY / SQLITE_LOCKED (a lock held longer than the wait) replaces
 *    that connection (`reconnect`) before the error goes on — the failed statement can't poison the writes that follow;
 *  · `batch` runs on its own write transaction ended the same way (the client's own batch commits through `prepare().run()`).
 * A remote libSQL database (Turso) has none of this; `guardLocalFile` returns its client untouched.
 */

/** How long a statement waits for another process's lock before it fails with SQLITE_BUSY. */
export const BUSY_WAIT_MS = 5000

export function isBusy(e: unknown): boolean {
  const code = typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined
  return code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED'
}

const asStatement = (s: InStatement | [string, InArgs?]): InStatement => (Array.isArray(s) ? { sql: s[0], args: s[1] ?? [] } : s)

/** A transaction that ends through exec: a failed COMMIT leaves no half-run statement behind, so the ROLLBACK after it releases the lock. */
class EndsCleanly implements Transaction {
  constructor(private readonly tx: Transaction) {}
  execute(stmt: InStatement): Promise<ResultSet> { return this.tx.execute(stmt) }
  batch(stmts: InStatement[]): Promise<ResultSet[]> { return this.tx.batch(stmts) }
  executeMultiple(sql: string): Promise<void> { return this.tx.executeMultiple(sql) }
  async commit(): Promise<void> { await this.tx.executeMultiple('COMMIT') }
  async rollback(): Promise<void> {
    if (this.tx.closed) return   // already ended (SQLite rolled it back itself) — the error that ended it is the one to report
    await this.tx.executeMultiple('ROLLBACK')
  }
  close(): void { this.tx.close() }
  get closed(): boolean { return this.tx.closed }
}

/** The client for a local file, with the rules above. Everything else passes straight through. */
class LocalFileClient implements Client {
  constructor(private readonly raw: Client) {}
  get closed(): boolean { return this.raw.closed }
  get protocol(): string { return this.raw.protocol }

  /** A statement that failed on a lock may stay half-run on its connection: start the next statement on a fresh one. */
  private recover(e: unknown): never {
    if (isBusy(e)) { try { this.raw.reconnect() } catch { /* the next statement opens one */ } }
    throw e
  }

  execute(stmt: InStatement): Promise<ResultSet>
  execute(sql: string, args?: InArgs): Promise<ResultSet>
  async execute(stmtOrSql: InStatement | string, args?: InArgs): Promise<ResultSet> {
    try {
      return typeof stmtOrSql === 'string' ? await this.raw.execute(stmtOrSql, args) : await this.raw.execute(stmtOrSql)
    } catch (e) { return this.recover(e) }
  }

  transaction(mode?: TransactionMode): Promise<Transaction>
  async transaction(mode: TransactionMode = 'write'): Promise<Transaction> {
    try { return new EndsCleanly(await this.raw.transaction(mode)) } catch (e) { return this.recover(e) }
  }

  /** All or nothing, as the client's batch — on a write transaction (a deferred one may need to take the write lock half-way, where
      SQLite refuses to wait), ended through exec. */
  async batch(stmts: Array<InStatement | [string, InArgs?]>, mode: TransactionMode = 'deferred'): Promise<ResultSet[]> {
    const tx = await this.transaction(mode === 'read' ? 'read' : 'write')
    try {
      const out = await tx.batch(stmts.map(asStatement))
      await tx.commit()
      return out
    } catch (e) {
      await tx.rollback().catch(() => {})
      throw e
    } finally {
      tx.close()
    }
  }

  migrate(stmts: InStatement[]): Promise<ResultSet[]> { return this.raw.migrate(stmts) }
  executeMultiple(sql: string): Promise<void> { return this.raw.executeMultiple(sql) }   // exec already finalizes what it runs
  sync() { return this.raw.sync() }
  close(): void { this.raw.close() }
  reconnect(): void { this.raw.reconnect() }
}

/** The client a server uses: a local file gets the rules above; any other database's client is returned as it is. */
export function guardLocalFile(raw: Client, url: string): Client {
  return url.startsWith('file:') ? new LocalFileClient(raw) : raw
}
