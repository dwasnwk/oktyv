# Vault Engine Architecture Design
**Version:** 1.0.0  
**Created:** 2026-01-25  
**Status:** Design → Implementation  
**Philosophy:** Option B Perfection - Security foundation for all engines

---

## OVERVIEW

The Vault Engine provides secure credential storage using AES-256-GCM encryption with OS keychain integration. This is the security foundation that all other engines will use for storing API keys, passwords, OAuth tokens, and other sensitive credentials.

---

## CORE PRINCIPLES

### Security First
- AES-256-GCM authenticated encryption (prevents tampering)
- Master keys stored in OS keychain (never in plain text)
- Vault data encrypted at rest
- Audit logging for all operations (compliance)
- No credentials ever logged (even in errors)

### OS Integration
- macOS: Keychain Services
- Windows: Credential Manager
- Linux: Secret Service (GNOME Keyring, KDE Wallet)
- Graceful fallback to encrypted file storage if keychain unavailable

### Multiple Vaults
- Separate vaults for different contexts (personal, work, project-specific)
- Each vault has independent master key
- Isolated credential namespaces

### Zero Trust
- Every operation requires master key
- No in-memory credential caching (retrieve fresh every time)
- Audit trail for compliance

---

## ARCHITECTURE

### Component Hierarchy

```
VaultEngine (orchestrator)
├── KeychainAdapter (OS keychain integration)
├── VaultStorage (encrypted file persistence)
├── CryptoUtils (AES-256-GCM operations)
└── AuditLogger (operation tracking)
```

### Data Flow

**Set Credential:**
```
User → vault_set tool
  → VaultEngine.set()
    → KeychainAdapter.getMasterKey() → OS Keychain
    → VaultStorage.load() → Read encrypted vault file
    → CryptoUtils.decrypt() → Decrypt vault
    → Add/update credential
    → CryptoUtils.encrypt() → Encrypt vault
    → VaultStorage.save() → Write encrypted vault file
    → AuditLogger.logAccess() → Append to audit log
```

**Get Credential:**
```
User → vault_get tool
  → VaultEngine.get()
    → KeychainAdapter.getMasterKey() → OS Keychain
    → VaultStorage.load() → Read encrypted vault file
    → CryptoUtils.decrypt() → Decrypt vault
    → Extract credential
    → AuditLogger.logAccess() → Append to audit log
    → Return credential (never logged)
```

---

## FILE STRUCTURE

### Vault Data Location
```
~/.oktyv/vaults/
├── default.vault.json          # Default vault (encrypted)
├── work.vault.json             # Work vault (encrypted)
├── project-x.vault.json        # Project-specific vault
└── .audit.log                  # Audit trail (append-only)
```

### Encrypted Vault Format
```json
{
  "version": "1.0.0",
  "algorithm": "aes-256-gcm",
  "data": "base64-encrypted-data",
  "iv": "base64-initialization-vector",
  "authTag": "base64-authentication-tag",
  "createdAt": "2026-01-25T10:30:00Z",
  "updatedAt": "2026-01-25T10:30:00Z"
}
```

### Decrypted Vault Structure (In-Memory Only)
```typescript
interface Vault {
  credentials: Record<string, {
    value: string;           // The actual secret
    type: CredentialType;    // api_key | password | token | ssh_key | certificate | env_var
    createdAt: string;       // ISO timestamp
    updatedAt: string;       // ISO timestamp
    rotatedAt?: string;      // Last rotation timestamp
    metadata?: {             // Optional user-defined metadata
      description?: string;
      expiresAt?: string;
      tags?: string[];
    };
  }>;
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Core Crypto (Foundation)
**File:** `src/tools/vault/crypto.ts`

```typescript
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;  // 128 bits
const KEY_LENGTH = 32; // 256 bits
const AUTH_TAG_LENGTH = 16;

export interface EncryptedData {
  data: string;      // base64
  iv: string;        // base64
  authTag: string;   // base64
}

export function generateMasterKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

export function encrypt(plaintext: string, masterKey: Buffer): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return {
    data: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decrypt(encrypted: EncryptedData, masterKey: Buffer): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    masterKey,
    Buffer.from(encrypted.iv, 'base64')
  );
  
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));
  
  let decrypted = decipher.update(encrypted.data, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Tests:**
- Generate master key (32 bytes)
- Encrypt/decrypt roundtrip
- Auth tag verification (tamper detection)
- Invalid key rejection
- Corrupted data rejection

---

### Phase 2: OS Keychain Integration
**File:** `src/tools/vault/KeychainAdapter.ts`

**Library Choice:** `@napi-rs/keyring`
- Modern, actively maintained
- Cross-platform (macOS, Windows, Linux)
- Rust-based (secure, fast)
- 200+ stars, used in production

```typescript
import { Keyring } from '@napi-rs/keyring';

export class KeychainAdapter {
  private serviceName = 'oktyv-vault';
  
  async getMasterKey(vaultName: string): Promise<Buffer> {
    const keyring = new Keyring();
    const key = keyring.getPassword(this.serviceName, vaultName);
    
    if (!key) {
      throw new VaultError('MASTER_KEY_NOT_FOUND', `No master key for vault: ${vaultName}`);
    }
    
    return Buffer.from(key, 'base64');
  }
  
  async setMasterKey(vaultName: string, key: Buffer): Promise<void> {
    const keyring = new Keyring();
    keyring.setPassword(this.serviceName, vaultName, key.toString('base64'));
  }
  
  async deleteMasterKey(vaultName: string): Promise<void> {
    const keyring = new Keyring();
    keyring.deletePassword(this.serviceName, vaultName);
  }
  
  async hasMasterKey(vaultName: string): Promise<boolean> {
    try {
      await this.getMasterKey(vaultName);
      return true;
    } catch {
      return false;
    }
  }
}
```

**Tests:**
- Set/get master key
- Delete master key
- Key not found error
- Cross-platform compatibility

---

### Phase 3: Vault Storage
**File:** `src/tools/vault/VaultStorage.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface StoredVault {
  version: string;
  algorithm: string;
  data: string;      // base64 encrypted vault JSON
  iv: string;
  authTag: string;
  createdAt: string;
  updatedAt: string;
}

export class VaultStorage {
  private vaultsDir: string;
  
  constructor() {
    this.vaultsDir = path.join(os.homedir(), '.oktyv', 'vaults');
  }
  
  async ensureVaultsDirectory(): Promise<void> {
    await fs.mkdir(this.vaultsDir, { recursive: true });
  }
  
  private getVaultPath(vaultName: string): string {
    return path.join(this.vaultsDir, `${vaultName}.vault.json`);
  }
  
  async exists(vaultName: string): Promise<boolean> {
    try {
      await fs.access(this.getVaultPath(vaultName));
      return true;
    } catch {
      return false;
    }
  }
  
  async load(vaultName: string): Promise<StoredVault> {
    const vaultPath = this.getVaultPath(vaultName);
    const content = await fs.readFile(vaultPath, 'utf-8');
    return JSON.parse(content);
  }
  
  async save(vaultName: string, vault: StoredVault): Promise<void> {
    await this.ensureVaultsDirectory();
    const vaultPath = this.getVaultPath(vaultName);
    await fs.writeFile(vaultPath, JSON.stringify(vault, null, 2), 'utf-8');
  }
  
  async delete(vaultName: string): Promise<void> {
    const vaultPath = this.getVaultPath(vaultName);
    await fs.unlink(vaultPath);
  }
  
  async list(): Promise<string[]> {
    await this.ensureVaultsDirectory();
    const files = await fs.readdir(this.vaultsDir);
    return files
      .filter(f => f.endsWith('.vault.json'))
      .map(f => f.replace('.vault.json', ''));
  }
}
```

**Tests:**
- Create vaults directory
- Save/load vault
- Delete vault
- List vaults
- Handle missing files

---

### Phase 4: Audit Logger
**File:** `src/tools/vault/AuditLogger.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface AuditEntry {
  timestamp: string;
  operation: string;  // set | get | delete | rotate | export | import
  vaultName: string;
  credentialKey: string;
  success: boolean;
  error?: string;
}

export class AuditLogger {
  private auditLogPath: string;
  
  constructor() {
    this.auditLogPath = path.join(os.homedir(), '.oktyv', 'vaults', '.audit.log');
  }
  
  async logOperation(entry: AuditEntry): Promise<void> {
    const logLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(this.auditLogPath, logLine, 'utf-8');
  }
  
  async getAuditLog(vaultName?: string, limit?: number): Promise<AuditEntry[]> {
    try {
      const content = await fs.readFile(this.auditLogPath, 'utf-8');
      let entries = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line) as AuditEntry);
      
      if (vaultName) {
        entries = entries.filter(e => e.vaultName === vaultName);
      }
      
      if (limit) {
        entries = entries.slice(-limit);
      }
      
      return entries;
    } catch {
      return [];
    }
  }
}
```

**Tests:**
- Log operations
- Read audit log
- Filter by vault
- Limit results

---

### Phase 5: Vault Engine (Orchestrator)
**File:** `src/tools/vault/VaultEngine.ts`

```typescript
export type CredentialType = 'api_key' | 'password' | 'oauth_token' | 'ssh_key' | 'certificate' | 'env_var';

export interface Credential {
  value: string;
  type: CredentialType;
  createdAt: string;
  updatedAt: string;
  rotatedAt?: string;
  metadata?: {
    description?: string;
    expiresAt?: string;
    tags?: string[];
  };
}

export interface Vault {
  credentials: Record<string, Credential>;
}

export class VaultEngine {
  private keychain: KeychainAdapter;
  private storage: VaultStorage;
  private auditLogger: AuditLogger;
  
  constructor() {
    this.keychain = new KeychainAdapter();
    this.storage = new VaultStorage();
    this.auditLogger = new AuditLogger();
  }
  
  async set(
    vaultName: string,
    key: string,
    value: string,
    type: CredentialType,
    metadata?: Credential['metadata']
  ): Promise<void> {
    try {
      // Get or create master key
      let masterKey: Buffer;
      if (await this.keychain.hasMasterKey(vaultName)) {
        masterKey = await this.keychain.getMasterKey(vaultName);
      } else {
        masterKey = generateMasterKey();
        await this.keychain.setMasterKey(vaultName, masterKey);
      }
      
      // Load or create vault
      let vault: Vault;
      if (await this.storage.exists(vaultName)) {
        const stored = await this.storage.load(vaultName);
        const decrypted = decrypt(
          { data: stored.data, iv: stored.iv, authTag: stored.authTag },
          masterKey
        );
        vault = JSON.parse(decrypted);
      } else {
        vault = { credentials: {} };
      }
      
      // Add/update credential
      vault.credentials[key] = {
        value,
        type,
        createdAt: vault.credentials[key]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rotatedAt: vault.credentials[key] ? new Date().toISOString() : undefined,
        metadata,
      };
      
      // Encrypt and save
      const encrypted = encrypt(JSON.stringify(vault), masterKey);
      await this.storage.save(vaultName, {
        version: '1.0.0',
        algorithm: 'aes-256-gcm',
        ...encrypted,
        createdAt: vault.credentials[key].createdAt,
        updatedAt: new Date().toISOString(),
      });
      
      await this.auditLogger.logOperation({
        timestamp: new Date().toISOString(),
        operation: 'set',
        vaultName,
        credentialKey: key,
        success: true,
      });
    } catch (error) {
      await this.auditLogger.logOperation({
        timestamp: new Date().toISOString(),
        operation: 'set',
        vaultName,
        credentialKey: key,
        success: false,
        error: error.message,
      });
      throw error;
    }
  }
  
  async get(vaultName: string, key: string): Promise<string> {
    // Similar pattern: load, decrypt, extract, audit, return
  }
  
  async list(vaultName: string): Promise<Array<{ key: string; type: CredentialType; metadata?: Credential['metadata'] }>> {
    // Return credential keys (NOT values) with metadata
  }
  
  async delete(vaultName: string, key: string): Promise<void> {
    // Remove credential from vault
  }
  
  async rotate(vaultName: string, key: string, newValue: string): Promise<void> {
    // Update value, set rotatedAt timestamp
  }
  
  async export(vaultName: string, password: string): Promise<string> {
    // Export encrypted vault (re-encrypt with user password)
  }
  
  async import(vaultName: string, encryptedData: string, password: string): Promise<void> {
    // Import encrypted vault (decrypt with user password, re-encrypt with master key)
  }
}
```

---

### Phase 6: MCP Tools
**File:** `src/tools/vault/index.ts`

MCP tool definitions with Zod validation:

```typescript
const VaultSetSchema = z.object({
  vaultName: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  key: z.string().min(1).max(100),
  value: z.string().min(1),
  type: z.enum(['api_key', 'password', 'oauth_token', 'ssh_key', 'certificate', 'env_var']),
  metadata: z.object({
    description: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

// Tools:
// - vault_set
// - vault_get
// - vault_list
// - vault_delete
// - vault_rotate
// - vault_export
// - vault_import
// - vault_list_vaults (list all vault names)
```

---

## TESTING STRATEGY

### Unit Tests (tests/unit/vault/)

**crypto.test.ts:**
- Key generation produces 32 bytes
- Encrypt/decrypt roundtrip preserves data
- Auth tag prevents tampering
- Invalid key throws error
- Corrupted IV throws error

**KeychainAdapter.test.ts:**
- Set/get master key
- Delete master key
- hasMasterKey returns correct boolean
- Missing key throws proper error

**VaultStorage.test.ts:**
- Create vaults directory
- Save/load vault file
- List vaults
- Delete vault
- Handle non-existent vault

**AuditLogger.test.ts:**
- Log operations to file
- Read audit log
- Filter by vault name
- Limit results

**VaultEngine.test.ts:**
- Set credential creates vault if missing
- Set credential updates existing
- Get credential returns correct value
- List returns keys without values
- Delete removes credential
- Rotate updates value and timestamp
- Export/import preserves credentials
- All operations audit logged

**tools.test.ts:**
- Parameter validation (Zod schemas)
- Error handling
- Edge cases (empty strings, special characters)

### Integration Tests (tests/integration/vault/)

**end-to-end.test.ts:**
- Full lifecycle: set → get → rotate → delete
- Multiple vaults
- Export from one vault, import to another
- Audit trail verification

---

## DEPENDENCIES

**Production:**
```json
{
  "@napi-rs/keyring": "^1.0.0",  // OS keychain integration
  "zod": "^3.24.1"                 // Already installed
}
```

**Built-in (no install):**
- `crypto` - AES-256-GCM
- `fs/promises` - File operations
- `path` - Path manipulation
- `os` - Home directory

---

## ERROR CODES

```typescript
export enum VaultErrorCode {
  MASTER_KEY_NOT_FOUND = 'MASTER_KEY_NOT_FOUND',
  VAULT_NOT_FOUND = 'VAULT_NOT_FOUND',
  CREDENTIAL_NOT_FOUND = 'CREDENTIAL_NOT_FOUND',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  VAULT_ALREADY_EXISTS = 'VAULT_ALREADY_EXISTS',
  INVALID_VAULT_NAME = 'INVALID_VAULT_NAME',
  KEYCHAIN_ACCESS_DENIED = 'KEYCHAIN_ACCESS_DENIED',
}

export class VaultError extends Error {
  constructor(public code: VaultErrorCode, message: string) {
    super(message);
    this.name = 'VaultError';
  }
}
```

---

## SECURITY CONSIDERATIONS

### Threat Model

**Protected Against:**
- ✅ Credential theft from file system (encrypted at rest)
- ✅ Credential tampering (authenticated encryption)
- ✅ Unauthorized access (OS keychain required)
- ✅ Credential exposure in logs (never logged)

**NOT Protected Against:**
- ❌ Memory dumps while vault decrypted (acceptable - short-lived)
- ❌ Malicious code in same process (out of scope)
- ❌ OS compromise (OS keychain also compromised)

### Best Practices

1. **Never log credentials** - Even in debug mode
2. **Short-lived decryption** - Decrypt, use, discard
3. **No credential caching** - Retrieve fresh every time
4. **Audit everything** - All operations logged (except values)
5. **Fail closed** - Errors don't leak credentials

---

## PERFORMANCE TARGETS

- Set credential: <50ms
- Get credential: <50ms
- List credentials: <100ms (per vault)
- Export/import: <500ms (depends on vault size)

---

## NEXT STEPS

1. Implement crypto.ts + tests
2. Implement KeychainAdapter + tests
3. Implement VaultStorage + tests
4. Implement AuditLogger + tests
5. Implement VaultEngine + tests
6. Implement MCP tools + tests
7. Integration tests
8. Documentation
9. CI/CD (extend GitHub Actions)

---

**Status:** Ready for implementation  
**Estimated Complexity:** Medium-High (security critical)  
**Blockers:** None (all dependencies available)
