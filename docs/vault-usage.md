# Oktyv Vault Engine - Usage Guide

The Vault Engine provides secure, encrypted credential storage with OS-native keychain integration.

## Features

- **AES-256-GCM Encryption**: Authenticated encryption prevents tampering
- **OS Keychain Integration**: Master keys stored in macOS Keychain, Windows Credential Manager, or Linux Secret Service
- **Multi-Vault Support**: Organize credentials into separate vaults
- **Audit Logging**: Security compliance logging for all operations
- **Zero Plaintext on Disk**: All credentials encrypted at rest

## Architecture

```
┌─────────────┐
│   Claude    │
│   (User)    │
└──────┬──────┘
       │ MCP Tools (vault_set, vault_get, etc.)
       ▼
┌─────────────────────────────┐
│      Vault Engine           │
│  (VaultEngine.ts)           │
├─────────────────────────────┤
│ ┌─────────┐  ┌────────────┐│
│ │ Crypto  │  │  Keychain  ││
│ │ Layer   │  │  Adapter   ││
│ └─────────┘  └────────────┘│
│ ┌─────────┐  ┌────────────┐│
│ │ Storage │  │   Audit    ││
│ │ Layer   │  │   Logger   ││
│ └─────────┘  └────────────┘│
└─────────────────────────────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌─────────────┐
│ ~/.oktyv/    │  │  OS Keychain│
│ vaults/      │  │  (Master    │
│ *.vault      │  │  Keys)      │
└──────────────┘  └─────────────┘
```

## File Locations

- **Vault Files**: `~/.oktyv/vaults/<vault-name>.vault`
- **Audit Logs**: `~/.oktyv/logs/vault-audit.log`
- **Master Keys**: OS Keychain (service: `oktyv-vault`, account: `<vault-name>`)

## MCP Tools

### `vault_set`

Store an encrypted credential in a vault.

```typescript
vault_set({
  vaultName: "my-app",
  credentialName: "api-key",
  value: "sk-abc123def456"
})
```

### `vault_get`

Retrieve and decrypt a credential.

```typescript
vault_get({
  vaultName: "my-app",
  credentialName: "api-key"
})
// Returns: { success: true, credentialName: "api-key", value: "sk-abc123def456" }
```

### `vault_list`

List all credential names in a vault (values not returned).

```typescript
vault_list({
  vaultName: "my-app"
})
// Returns: { success: true, vaultName: "my-app", credentials: ["api-key", "db-password"], count: 2 }
```

### `vault_delete`

Delete a specific credential.

```typescript
vault_delete({
  vaultName: "my-app",
  credentialName: "old-api-key"
})
```

### `vault_delete_vault`

Delete an entire vault including all credentials and master key.

```typescript
vault_delete_vault({
  vaultName: "my-app"
})
```

### `vault_list_vaults`

List all vaults.

```typescript
vault_list_vaults()
// Returns: { success: true, vaults: ["my-app", "production", "staging"], count: 3 }
```

## Security Properties

### Encryption

- **Algorithm**: AES-256-GCM (Authenticated Encryption with Associated Data)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes, randomly generated per encryption)
- **Auth Tag**: 128 bits (prevents tampering)

### Non-Deterministic

Each encryption operation generates a unique IV, so the same plaintext produces different ciphertext each time. This prevents pattern analysis.

### Tamper Detection

The GCM authentication tag ensures that any modification to the ciphertext will be detected during decryption.

## Usage Examples

### Store API Credentials

```typescript
// Store OpenAI API key
await vault_set({
  vaultName: "openai",
  credentialName: "api-key",
  value: "sk-proj-abc123..."
})

// Store GitHub token
await vault_set({
  vaultName: "github",
  credentialName: "personal-access-token",
  value: "ghp_xyz789..."
})
```

### Organize by Environment

```typescript
// Production credentials
await vault_set({
  vaultName: "production",
  credentialName: "db-password",
  value: "prod_password_123"
})

// Staging credentials
await vault_set({
  vaultName: "staging",
  credentialName: "db-password",
  value: "staging_password_456"
})
```

### Retrieve Credentials

```typescript
// Get API key
const { value } = await vault_get({
  vaultName: "openai",
  credentialName: "api-key"
})

// Use in API call
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  headers: {
    "Authorization": `Bearer ${value}`
  }
})
```

### List Credentials

```typescript
// See what's stored
const { credentials } = await vault_list({
  vaultName: "production"
})

console.log("Production credentials:", credentials)
// Output: ["db-password", "api-key", "secret-token"]
```

### Rotation (Update Credential)

```typescript
// Rotate API key
await vault_set({
  vaultName: "github",
  credentialName: "personal-access-token",
  value: "ghp_new_token_abc..."  // Overwrites old value
})
```

### Clean Up

```typescript
// Delete single credential
await vault_delete({
  vaultName: "staging",
  credentialName: "old-api-key"
})

// Delete entire vault
await vault_delete_vault({
  vaultName: "staging"
})
```

## Error Handling

All vault operations return structured error responses:

```typescript
{
  success: false,
  error: {
    code: "CREDENTIAL_NOT_FOUND",
    message: "Credential not found: api-key in vault production"
  }
}
```

### Common Error Codes

- `VAULT_NOT_FOUND`: Vault doesn't exist
- `CREDENTIAL_NOT_FOUND`: Credential doesn't exist in vault
- `MASTER_KEY_NOT_FOUND`: Master key not found in OS keychain
- `KEYCHAIN_ACCESS_DENIED`: Cannot access OS keychain
- `DECRYPTION_FAILED`: Decryption failed (wrong key or corrupted data)
- `TAMPERED_DATA`: Data has been tampered with
- `INVALID_KEY_LENGTH`: Master key is not 32 bytes

## Best Practices

### Naming Conventions

- **Vaults**: Lowercase, alphanumeric, hyphens (e.g., `my-app`, `production`)
- **Credentials**: Lowercase, alphanumeric, hyphens, underscores (e.g., `api-key`, `db_password`)

### Organization

- Use separate vaults for different environments (production, staging, development)
- Group related credentials in the same vault
- Use descriptive credential names

### Security

- Never log credential values
- Use environment-specific vaults (don't mix prod and dev secrets)
- Rotate credentials regularly
- Delete vaults when no longer needed

### Audit Logging

Check audit logs for security investigations:

```bash
tail -f ~/.oktyv/logs/vault-audit.log
```

Log entries include:
- Timestamp
- Event type (VAULT_CREATED, CREDENTIAL_SET, CREDENTIAL_GET, etc.)
- Vault and credential names
- Success/failure status

## Implementation Details

### File Structure

Vault files are JSON with encrypted credentials:

```json
{
  "version": "1.0",
  "created": "2026-01-25T12:00:00.000Z",
  "updated": "2026-01-25T12:30:00.000Z",
  "credentials": {
    "api-key": {
      "data": "encrypted_base64_data",
      "iv": "random_iv_base64",
      "authTag": "auth_tag_base64"
    }
  }
}
```

### Master Key Storage

Master keys are stored in the OS keychain:
- **macOS**: Keychain Access (`oktyv-vault` service, vault name as account)
- **Windows**: Credential Manager
- **Linux**: Secret Service (GNOME Keyring, KWallet)

### Dependencies

- `@napi-rs/keyring@1.2.0`: OS keychain integration
- Node.js `crypto` module: AES-256-GCM encryption

## Troubleshooting

### Master Key Not Found

If you get `MASTER_KEY_NOT_FOUND` errors, the vault's master key was deleted from the OS keychain. You'll need to delete and recreate the vault.

### Keychain Access Denied

On macOS, if you get permission errors, check System Settings → Privacy & Security → App Management.

### Corrupted Vault File

If a vault file is corrupted, delete it manually:

```bash
rm ~/.oktyv/vaults/vault-name.vault
```

Then recreate the vault.

## Testing

Run vault tests:

```bash
npm test -- tests/unit/vault/*.test.ts
```

Test coverage:
- 8 crypto tests (encryption, decryption, validation)
- 14 integration tests (full workflow, persistence, security)
