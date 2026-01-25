# GitHub Actions Not Running - Troubleshooting Guide

## Symptoms
- Manual workflow trigger >10 minutes ago - no email, no results
- Multiple commits pushed - no workflow runs visible
- Empty commit created to force trigger - nothing

## Most Likely Causes

### 1. GitHub Actions Disabled on Repository ⚠️

**Check Now:**
1. Go to: `https://github.com/duke-of-beans/oktyv/settings/actions`
2. Look for "Actions permissions" section
3. Ensure one of these is selected:
   - ✅ "Allow all actions and reusable workflows" **OR**
   - ✅ "Allow enterprise, and select non-enterprise, actions and reusable workflows"
   
**If it says "Disable actions"** - That's the problem! Change it.

### 2. Workflow Permissions Issue

**Check:**
1. Same page: `https://github.com/duke-of-beans/oktyv/settings/actions`
2. Scroll to "Workflow permissions"
3. Should be:
   - ✅ "Read and write permissions" **OR**
   - ✅ "Read repository contents and packages permissions"

### 3. Branch Protection Rules

**Check:**
1. Go to: `https://github.com/duke-of-beans/oktyv/settings/branches`
2. If "main" has protection rules, ensure:
   - ✅ "Require status checks to pass before merging" is NOT blocking workflows
   - ✅ No restrictions on who can trigger workflows

### 4. Repository Settings

**Check:**
1. Go to: `https://github.com/duke-of-beans/oktyv/settings`
2. Scroll down to "Features"
3. Ensure "GitHub Actions" is **enabled** (should have checkmark)

## How to Fix

### Step 1: Enable GitHub Actions
```
https://github.com/duke-of-beans/oktyv/settings/actions
```

1. Under "Actions permissions":
   - Select: **"Allow all actions and reusable workflows"**
2. Click **"Save"**

### Step 2: Set Workflow Permissions
Same page, scroll down:
1. Under "Workflow permissions":
   - Select: **"Read and write permissions"**
2. Check: **"Allow GitHub Actions to create and approve pull requests"**
3. Click **"Save"**

### Step 3: Verify Actions Tab Exists
Go to:
```
https://github.com/duke-of-beans/oktyv/actions
```

**What you should see:**
- ✅ Tabs: "All workflows", "Test Suite", "Simple Test"
- ✅ List of workflow runs (if any have run)
- ✅ "Run workflow" button (top right)

**If you see:**
- ❌ "GitHub Actions is disabled" message
- ❌ 404 or forbidden error
- ❌ "No workflows found" (but .github/workflows/ exists)

→ Actions are disabled or blocked

## Immediate Diagnostics

### Check 1: Can you access the Actions page?
```
https://github.com/duke-of-beans/oktyv/actions
```

**Yes** → Actions enabled, check workflow runs
**No/404** → Actions disabled, follow Step 1 above

### Check 2: Do workflows appear in the list?
On the Actions page, left sidebar should show:
- Test Suite
- Simple Test

**Yes** → Workflows detected
**No** → Workflow files might not be in main branch

### Check 3: Can you manually trigger?
1. Go to: `https://github.com/duke-of-beans/oktyv/actions/workflows/simple-test.yml`
2. Click "Run workflow" button
3. Select branch "main"
4. Click green "Run workflow"

**Button appears** → Can trigger manually
**Button missing** → Permissions issue

## Alternative: Check Via GitHub CLI

If you have GitHub CLI installed:

```bash
# Check if Actions are enabled
gh api repos/duke-of-beans/oktyv | jq '.has_issues, .has_projects, .has_wiki'

# List workflow runs
gh run list --repo duke-of-beans/oktyv

# Check workflow status
gh workflow list --repo duke-of-beans/oktyv
```

## Nuclear Option: Re-sync Repository

If nothing else works:

1. **Backup your work** (it's already pushed, so safe)
2. Go to: `https://github.com/duke-of-beans/oktyv/settings`
3. Scroll to "Danger Zone"
4. **Do NOT delete** - just check settings
5. Ensure repository is not:
   - Archived
   - Private with restrictions
   - Part of an organization with disabled Actions

## Expected Behavior After Fix

Once Actions are enabled:

1. **Immediate:** Can access https://github.com/duke-of-beans/oktyv/actions
2. **30 seconds:** Can manually trigger workflows
3. **After next push:** Workflows auto-trigger
4. **2-5 minutes:** Workflow completes, email sent

## Test After Enabling

```bash
cd D:\Dev\oktyv
git commit --allow-empty -m "test: verify actions enabled"
git push origin main
```

Then:
1. Go to Actions page
2. Should see workflow start within 30 seconds
3. Email within 5 minutes

## What to Report Back

After checking settings, let me know:

1. **Can you access** `https://github.com/duke-of-beans/oktyv/actions`?
   - What do you see?

2. **Actions permissions setting:**
   - "Allow all actions" or "Disable actions" or something else?

3. **Do you see workflow runs** on the Actions page?
   - Any runs listed?
   - What status?

4. **Can you see the "Run workflow" button?**
   - On `https://github.com/duke-of-beans/oktyv/actions/workflows/simple-test.yml`

## Most Common Issue

**99% of the time:** GitHub Actions is disabled in repository settings.

**Fix:** 
```
Settings → Actions → General → 
Actions permissions → 
Select "Allow all actions and reusable workflows" → 
Save
```

Then push an empty commit to test.

---

**Priority:** Check repository settings immediately - this is likely a configuration issue, not a code issue.
