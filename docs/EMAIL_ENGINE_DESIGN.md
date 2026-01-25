# Email Engine Design Document

**Engine**: 4 of 7  
**Status**: 🔄 IN PROGRESS  
**Version**: 0.6.0-alpha.1 (target)  
**Dependencies**: Vault Engine (for credentials), API Engine (for Gmail OAuth)

## Overview

The Email Engine provides comprehensive email capabilities including Gmail API integration, SMTP sending, IMAP receiving, email parsing, and attachment handling. Built for both transactional emails and email automation workflows.

## Core Capabilities

### 1. Gmail Integration (via Google API)
- OAuth 2.0 authentication
- Send emails with attachments
- Read emails with filtering
- Search emails (advanced queries)
- Label management
- Draft management
- Thread management

### 2. SMTP Sending
- Standard SMTP protocol
- TLS/SSL support
- Authentication (PLAIN, LOGIN, CRAM-MD5)
- HTML and plain text emails
- Attachments (inline and regular)
- CC, BCC support
- Custom headers

### 3. IMAP Receiving
- Connect to IMAP servers
- Fetch emails with filters
- Mark as read/unread
- Move between folders
- Delete emails
- Search emails

### 4. Email Parsing
- Parse MIME messages
- Extract headers
- Extract body (HTML and plain text)
- Parse attachments
- Handle multipart messages
- Decode encoded content

### 5. Attachment Handling
- Upload attachments (base64 encoding)
- Download attachments
- Inline images
- Multiple attachments per email

## Architecture

```
┌─────────────┐
│   Claude    │
│   (User)    │
└──────┬──────┘
       │ MCP Tools
       ▼
┌────────────────────────────────────┐
│         Email Engine               │
│      (EmailEngine.ts)              │
├────────────────────────────────────┤
│ ┌──────────────┐  ┌─────────────┐ │
│ │    Gmail     │  │    SMTP     │ │
│ │   Manager    │  │   Manager   │ │
│ └──────────────┘  └─────────────┘ │
│ ┌──────────────┐  ┌─────────────┐ │
│ │    IMAP      │  │   Email     │ │
│ │   Manager    │  │   Parser    │ │
│ └──────────────┘  └─────────────┘ │
│ ┌──────────────┐                  │
│ │ Attachment   │                  │
│ │   Handler    │                  │
│ └──────────────┘                  │
└────────────────────────────────────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌─────────────┐
│ API Engine   │  │  Vault      │
│ (OAuth)      │  │  Engine     │
└──────────────┘  └─────────────┘
```

## Component Design

### 1. Gmail Manager (`GmailManager.ts`)

**Purpose**: Manage Gmail API operations using OAuth

**Features**:
- OAuth 2.0 authentication via API Engine
- Send emails with Gmail API
- Read emails with filtering
- Search with Gmail query syntax
- Label management
- Thread operations

**Gmail API Endpoints**:
```
POST /gmail/v1/users/me/messages/send
GET  /gmail/v1/users/me/messages
GET  /gmail/v1/users/me/messages/{id}
POST /gmail/v1/users/me/messages/{id}/modify
DELETE /gmail/v1/users/me/messages/{id}/trash
```

### 2. SMTP Manager (`SmtpManager.ts`)

**Purpose**: Send emails via SMTP protocol

**Features**:
- Connect to any SMTP server
- TLS/SSL encryption
- Authentication methods
- HTML and plain text
- Attachments support
- CC, BCC, Reply-To

**Configuration**:
```typescript
{
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: "user@gmail.com",
    pass: "app-password"
  }
}
```

### 3. IMAP Manager (`ImapManager.ts`)

**Purpose**: Receive and manage emails via IMAP

**Features**:
- Connect to IMAP servers
- Fetch emails by criteria
- Search emails
- Folder operations
- Mark read/unread
- Delete/move emails

**Configuration**:
```typescript
{
  host: "imap.gmail.com",
  port: 993,
  secure: true,
  auth: {
    user: "user@gmail.com",
    pass: "app-password"
  }
}
```

### 4. Email Parser (`EmailParser.ts`)

**Purpose**: Parse and extract email content

**Features**:
- Parse MIME messages
- Extract headers (from, to, subject, date)
- Extract body (HTML and plain text)
- Parse attachments
- Handle multipart messages
- Decode quoted-printable and base64

### 5. Attachment Handler (`AttachmentHandler.ts`)

**Purpose**: Handle email attachments

**Features**:
- Encode attachments to base64
- Decode attachments from base64
- Inline images (CID references)
- File type detection
- Size validation

## MCP Tools

### `email_gmail_send`

Send email via Gmail API:

```typescript
email_gmail_send({
  userId: "user@gmail.com",
  to: ["recipient@example.com"],
  subject: "Hello",
  body: "Email body",
  html: true,
  attachments: [{
    filename: "document.pdf",
    content: "base64-encoded-content"
  }]
})
```

### `email_gmail_read`

Read emails from Gmail:

```typescript
email_gmail_read({
  userId: "user@gmail.com",
  query: "is:unread label:inbox",
  maxResults: 10
})
```

### `email_gmail_search`

Search emails with Gmail query:

```typescript
email_gmail_search({
  userId: "user@gmail.com",
  query: "from:boss@company.com after:2025/01/01",
  maxResults: 50
})
```

### `email_smtp_send`

Send email via SMTP:

```typescript
email_smtp_send({
  connectionId: "smtp-server",
  from: "sender@example.com",
  to: ["recipient@example.com"],
  subject: "Test Email",
  text: "Plain text body",
  html: "<h1>HTML body</h1>",
  attachments: [{
    filename: "report.pdf",
    path: "/path/to/file.pdf"
  }]
})
```

### `email_imap_connect`

Connect to IMAP server:

```typescript
email_imap_connect({
  connectionId: "imap-server",
  host: "imap.gmail.com",
  port: 993,
  secure: true,
  vaultName: "email-creds",
  credentialName: "gmail-password"
})
```

### `email_imap_fetch`

Fetch emails via IMAP:

```typescript
email_imap_fetch({
  connectionId: "imap-server",
  folder: "INBOX",
  criteria: ["UNSEEN"],
  limit: 20
})
```

### `email_parse`

Parse email message:

```typescript
email_parse({
  raw: "MIME email content",
  includeAttachments: true
})
```

## Security Features

### 1. OAuth for Gmail
- Access tokens stored in Vault Engine
- Automatic token refresh via API Engine
- Scopes: gmail.send, gmail.readonly, gmail.modify

### 2. Credential Storage
- SMTP/IMAP passwords in Vault Engine
- No credentials in logs or error messages
- App-specific passwords recommended

### 3. Attachment Safety
- File type validation
- Size limits (default 25MB)
- Virus scanning integration points

## Error Handling

**Error Codes**:
- `EMAIL_SEND_FAILED` - Failed to send email
- `EMAIL_FETCH_FAILED` - Failed to fetch emails
- `EMAIL_AUTH_FAILED` - Authentication failed
- `EMAIL_PARSE_FAILED` - Failed to parse email
- `EMAIL_CONNECTION_FAILED` - Connection failed
- `EMAIL_ATTACHMENT_TOO_LARGE` - Attachment exceeds size limit
- `EMAIL_INVALID_ADDRESS` - Invalid email address

## Performance Optimization

### 1. Connection Pooling
- Reuse SMTP/IMAP connections
- Configurable pool size
- Automatic reconnection

### 2. Batch Operations
- Send multiple emails in batch
- Fetch multiple emails efficiently
- Bulk label operations (Gmail)

### 3. Caching
- Cache parsed emails
- Cache attachment metadata

## Dependencies

```json
{
  "nodemailer": "^6.9.14",
  "imap": "^0.8.19",
  "mailparser": "^3.7.1",
  "@google/generative-ai": "^0.21.0"
}
```

Note: We'll use the API Engine's HTTP client for Gmail API calls instead of a separate Gmail SDK.

## File Structure

```
src/tools/email/
├── EmailEngine.ts          # Main orchestrator
├── GmailManager.ts         # Gmail API integration
├── SmtpManager.ts          # SMTP sending
├── ImapManager.ts          # IMAP receiving
├── EmailParser.ts          # Email parsing
├── AttachmentHandler.ts    # Attachment handling
└── tools.ts                # MCP tool definitions
```

## Testing Strategy

### Unit Tests
- Email parsing
- Attachment encoding/decoding
- SMTP connection
- IMAP operations
- Gmail API calls

### Integration Tests
- Send email via SMTP
- Receive email via IMAP
- Gmail OAuth flow
- Parse real emails

### Target: 40+ tests

## Implementation Plan

### Phase 1: Email Parser & Attachments (Day 1)
- [ ] EmailParser.ts - MIME parsing
- [ ] AttachmentHandler.ts - Attachment handling
- [ ] Tests: 10 tests

### Phase 2: SMTP (Day 1-2)
- [ ] SmtpManager.ts - SMTP sending
- [ ] Connection pooling
- [ ] Tests: 10 tests

### Phase 3: IMAP (Day 2)
- [ ] ImapManager.ts - IMAP receiving
- [ ] Email fetching
- [ ] Tests: 10 tests

### Phase 4: Gmail (Day 2-3)
- [ ] GmailManager.ts - Gmail API
- [ ] OAuth integration with API Engine
- [ ] Tests: 10 tests

### Phase 5: Integration (Day 3)
- [ ] EmailEngine.ts - Main orchestrator
- [ ] tools.ts - 7 MCP tools
- [ ] Server integration
- [ ] Tests: 5+ tests

### Total: 45+ tests, 3 days

## Example Workflows

### Workflow 1: Send Email via Gmail

```typescript
// 1. Send email
await email_gmail_send({
  userId: "sender@gmail.com",
  to: ["recipient@example.com"],
  subject: "Project Update",
  body: "<h1>Status Report</h1><p>All systems operational.</p>",
  html: true,
  attachments: [{
    filename: "report.pdf",
    content: "base64-encoded-pdf-content"
  }]
});
```

### Workflow 2: Read Unread Emails

```typescript
// 1. Read unread emails
const emails = await email_gmail_read({
  userId: "user@gmail.com",
  query: "is:unread",
  maxResults: 10
});

// 2. Process each email
for (const email of emails) {
  console.log(`From: ${email.from}`);
  console.log(`Subject: ${email.subject}`);
  console.log(`Body: ${email.body}`);
  
  // Mark as read (modify labels)
}
```

### Workflow 3: SMTP + IMAP Workflow

```typescript
// 1. Connect to SMTP
await email_smtp_send({
  connectionId: "smtp",
  from: "automated@company.com",
  to: ["customer@example.com"],
  subject: "Order Confirmation",
  html: "<p>Your order #12345 has been confirmed.</p>"
});

// 2. Connect to IMAP
await email_imap_connect({
  connectionId: "imap",
  host: "imap.company.com",
  port: 993,
  secure: true,
  vaultName: "email-creds",
  credentialName: "imap-password"
});

// 3. Check for replies
const replies = await email_imap_fetch({
  connectionId: "imap",
  folder: "INBOX",
  criteria: ["SUBJECT", "Re: Order Confirmation"]
});
```

## Gmail Query Syntax Examples

```
is:unread                          # Unread emails
from:boss@company.com              # From specific sender
subject:urgent                     # Subject contains "urgent"
has:attachment                     # Has attachments
after:2025/01/01                   # After date
before:2025/12/31                  # Before date
label:important                    # Has label
is:starred                         # Starred
larger:10M                         # Larger than 10MB
filename:pdf                       # Attachment filename contains "pdf"
```

## Next Steps

1. Install dependencies (nodemailer, imap, mailparser)
2. Create file structure
3. Implement Phase 1 (Parser + Attachments)
4. Implement Phase 2 (SMTP)
5. Implement Phase 3 (IMAP)
6. Implement Phase 4 (Gmail)
7. Implement Phase 5 (Integration)
8. Documentation
9. Version bump to 0.6.0-alpha.1

LFG! 📧
