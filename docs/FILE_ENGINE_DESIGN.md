# File Engine Design Document

**Engine**: 6 of 7  
**Status**: 🔄 IN PROGRESS  
**Version**: 0.7.0-alpha.1 (target)  
**Dependencies**: Vault Engine (for cloud credentials)

## Overview

The File Engine provides comprehensive file operations including local file management, cloud storage integration (S3, Google Drive, Dropbox), compression/archiving, file watching, and batch operations.

## Core Capabilities

### 1. Local File Operations
- Read/write files (text and binary)
- Copy/move/delete files
- Create directories
- List directory contents
- File metadata (size, dates, permissions)
- Recursive operations

### 2. Cloud Storage Integration
- **AWS S3**: Upload, download, list, delete
- **Google Drive**: Upload, download, search, share
- **Dropbox**: Upload, download, list, delete
- Unified interface across providers

### 3. Compression & Archiving
- **ZIP**: Create, extract, list contents
- **TAR**: Create, extract (with gzip support)
- **GZIP**: Compress, decompress individual files
- Stream-based for large files

### 4. File Watching
- Watch files/directories for changes
- Debounced change events
- Filter by patterns
- Recursive watching

### 5. Batch Operations
- Bulk copy/move/delete
- Pattern-based selection (glob)
- Progress tracking
- Error recovery

## Architecture

```
┌─────────────┐
│   Claude    │
│   (User)    │
└──────┬──────┘
       │ MCP Tools
       ▼
┌────────────────────────────────────┐
│         File Engine                │
│      (FileEngine.ts)               │
├────────────────────────────────────┤
│ ┌──────────────┐  ┌─────────────┐ │
│ │   Local      │  │   Cloud     │ │
│ │   Manager    │  │   Manager   │ │
│ └──────────────┘  └─────────────┘ │
│ ┌──────────────┐  ┌─────────────┐ │
│ │ Compression  │  │    Watch    │ │
│ │   Manager    │  │   Manager   │ │
│ └──────────────┘  └─────────────┘ │
└────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│ Vault Engine │
│ (cloud creds)│
└──────────────┘
```

## Component Design

### 1. Local File Manager (`LocalFileManager.ts`)

**Purpose**: Handle local file system operations

**Features**:
- Read/write files (UTF-8, binary, JSON)
- Copy/move files with overwrite protection
- Delete files/directories (recursive)
- Create directories (recursive)
- List directory contents
- File metadata and stats
- Stream-based operations for large files

### 2. Cloud Storage Manager (`CloudStorageManager.ts`)

**Purpose**: Unified interface for cloud storage providers

**Providers**:
- **S3**: AWS SDK v3
- **Google Drive**: Google APIs
- **Dropbox**: Dropbox SDK

**Operations**:
- Upload file (with progress)
- Download file
- List files/folders
- Delete files
- Get file metadata
- Share/get public URL

### 3. Compression Manager (`CompressionManager.ts`)

**Purpose**: Handle file compression and archiving

**Features**:
- Create ZIP archives
- Extract ZIP archives
- Create TAR archives (with gzip)
- Extract TAR archives
- Compress/decompress GZIP
- List archive contents
- Stream-based for memory efficiency

### 4. File Watch Manager (`FileWatchManager.ts`)

**Purpose**: Monitor file system changes

**Features**:
- Watch files/directories
- Debounced events (prevent spam)
- Event types: add, change, delete
- Pattern filtering (glob)
- Recursive watching
- Stop watching

## MCP Tools

### `file_read`

Read file contents:

```typescript
file_read({
  path: "/path/to/file.txt",
  encoding: "utf8" // or "binary"
})
```

### `file_write`

Write file contents:

```typescript
file_write({
  path: "/path/to/file.txt",
  content: "Hello World",
  encoding: "utf8",
  overwrite: true
})
```

### `file_copy`

Copy file:

```typescript
file_copy({
  source: "/path/to/source.txt",
  destination: "/path/to/dest.txt",
  overwrite: false
})
```

### `file_move`

Move/rename file:

```typescript
file_move({
  source: "/path/to/source.txt",
  destination: "/path/to/dest.txt",
  overwrite: false
})
```

### `file_delete`

Delete file/directory:

```typescript
file_delete({
  path: "/path/to/file.txt",
  recursive: false
})
```

### `file_list`

List directory contents:

```typescript
file_list({
  path: "/path/to/directory",
  recursive: false,
  pattern: "*.txt" // glob pattern
})
```

### `file_compress`

Create archive:

```typescript
file_compress({
  source: "/path/to/folder",
  destination: "/path/to/archive.zip",
  format: "zip" // or "tar", "tar.gz"
})
```

### `file_extract`

Extract archive:

```typescript
file_extract({
  source: "/path/to/archive.zip",
  destination: "/path/to/extract",
  format: "zip"
})
```

### `file_watch`

Watch for changes:

```typescript
file_watch({
  path: "/path/to/watch",
  recursive: true,
  pattern: "*.js",
  debounce: 1000 // ms
})
```

### `file_upload_cloud`

Upload to cloud:

```typescript
file_upload_cloud({
  provider: "s3", // or "gdrive", "dropbox"
  source: "/local/file.txt",
  destination: "bucket/folder/file.txt",
  vaultName: "cloud-creds",
  credentialName: "s3-access"
})
```

### `file_download_cloud`

Download from cloud:

```typescript
file_download_cloud({
  provider: "s3",
  source: "bucket/folder/file.txt",
  destination: "/local/file.txt",
  vaultName: "cloud-creds",
  credentialName: "s3-access"
})
```

## Dependencies

```json
{
  "@aws-sdk/client-s3": "^3.709.0",
  "archiver": "^7.0.1",
  "extract-zip": "^2.0.1",
  "tar": "^7.4.3",
  "chokidar": "^4.0.3",
  "glob": "^11.0.0"
}
```

## File Structure

```
src/tools/file/
├── FileEngine.ts           # Main orchestrator
├── LocalFileManager.ts     # Local file operations
├── CloudStorageManager.ts  # Cloud storage (S3, GDrive, Dropbox)
├── CompressionManager.ts   # ZIP, TAR, GZIP
├── FileWatchManager.ts     # File watching
└── tools.ts                # MCP tool definitions
```

## Testing Strategy

### Unit Tests
- File read/write operations
- Directory operations
- Compression/extraction
- File watching
- Cloud upload/download (mocked)

### Target: 40+ tests

## Implementation Plan

### Phase 1: Local File Operations (Day 1)
- [ ] LocalFileManager.ts - CRUD operations
- [ ] Tests: 15 tests

### Phase 2: Compression (Day 1-2)
- [ ] CompressionManager.ts - ZIP, TAR, GZIP
- [ ] Tests: 10 tests

### Phase 3: Cloud Storage (Day 2)
- [ ] CloudStorageManager.ts - S3, GDrive, Dropbox
- [ ] Tests: 10 tests

### Phase 4: File Watching (Day 2-3)
- [ ] FileWatchManager.ts - Change monitoring
- [ ] Tests: 5 tests

### Phase 5: Integration (Day 3)
- [ ] FileEngine.ts - Main orchestrator
- [ ] tools.ts - 11 MCP tools
- [ ] Tests: 5+ tests

### Total: 45+ tests, 3 days

## Example Workflows

### Workflow 1: Backup to Cloud

```typescript
// 1. Compress local folder
await file_compress({
  source: "/projects/myapp",
  destination: "/backups/myapp-2025-01-25.tar.gz",
  format: "tar.gz"
});

// 2. Upload to S3
await file_upload_cloud({
  provider: "s3",
  source: "/backups/myapp-2025-01-25.tar.gz",
  destination: "backups/myapp-2025-01-25.tar.gz",
  vaultName: "aws-creds",
  credentialName: "s3-backup"
});

// 3. Delete local archive
await file_delete({
  path: "/backups/myapp-2025-01-25.tar.gz"
});
```

### Workflow 2: Watch and Process

```typescript
// 1. Watch directory for new files
await file_watch({
  path: "/uploads",
  pattern: "*.csv",
  recursive: false
});

// 2. On new file event → process
// (handled by event listener)

// 3. After processing → archive
await file_compress({
  source: "/uploads/processed",
  destination: "/archives/processed-2025-01-25.zip",
  format: "zip"
});
```

### Workflow 3: Batch Copy with Pattern

```typescript
// 1. List all text files
const files = await file_list({
  path: "/documents",
  recursive: true,
  pattern: "*.txt"
});

// 2. Copy to backup (batch operation)
for (const file of files) {
  await file_copy({
    source: file.path,
    destination: `/backup${file.path}`,
    overwrite: false
  });
}
```

## Security Features

### 1. Path Validation
- Prevent path traversal attacks
- Validate allowed directories
- Normalize paths

### 2. Cloud Credentials
- Store in Vault Engine
- Support for IAM roles (S3)
- OAuth for Google Drive

### 3. File Permissions
- Respect file system permissions
- Safe overwrite protection
- Atomic operations where possible

## Error Handling

**Error Codes**:
- `FILE_NOT_FOUND` - File doesn't exist
- `FILE_ALREADY_EXISTS` - Destination exists (no overwrite)
- `PERMISSION_DENIED` - Insufficient permissions
- `DISK_FULL` - No space available
- `INVALID_PATH` - Path validation failed
- `COMPRESSION_FAILED` - Archive operation failed
- `CLOUD_UPLOAD_FAILED` - Cloud operation failed

## Performance Optimization

### 1. Streaming
- Stream large files instead of loading into memory
- Stream compression/decompression
- Stream cloud uploads/downloads

### 2. Batching
- Batch cloud operations where possible
- Parallel operations with concurrency limit

### 3. Caching
- Cache directory listings
- Cache file stats

## Next Steps

1. Install dependencies (archiver, extract-zip, tar, chokidar, glob, @aws-sdk/client-s3)
2. Create file structure
3. Implement Phase 1 (Local File Operations)
4. Implement Phase 2 (Compression)
5. Implement Phase 3 (Cloud Storage)
6. Implement Phase 4 (File Watching)
7. Implement Phase 5 (Integration)
8. Documentation
9. Version bump to 0.7.0-alpha.1

LFG! 📁
