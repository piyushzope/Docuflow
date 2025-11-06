# Git Repository Setup Guide

## ✅ Completed Steps

1. **Repository Initialized**: Git repository created with all project files
2. **Initial Checkpoint Tag Created**: `checkpoint/2025-11-06-initial-repo-setup`

## 🔗 Setting Up Remote Repository

### Option 1: Use the Setup Script (Recommended)

```bash
./setup-remote.sh
```

The script will:
- Prompt for your GitHub repository URL
- Add/update the remote
- Optionally push the code and checkpoint tag

### Option 2: Manual Setup

#### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository (e.g., `docuflow` or `Docuflow_Cursor`)
3. **Do NOT** initialize with README, .gitignore, or license (we already have these)
4. Copy the repository URL (HTTPS or SSH)

#### Step 2: Add Remote and Push

```bash
# Add remote (replace with your actual URL)
git remote add origin https://github.com/yourusername/your-repo-name.git

# Or if using SSH:
# git remote add origin git@github.com:yourusername/your-repo-name.git

# Verify remote
git remote -v

# Push main branch and set upstream
git push -u origin main

# Push checkpoint tag
git push origin checkpoint/2025-11-06-initial-repo-setup
```

## 📋 Current Repository Status

- **Branch**: `main`
- **Commits**: 3
  - `1cf7613` - docs: add Git workflow and recovery procedures
  - `e4e83e9` - chore: initial project commit
  - `4d9c3b7` - fix: add apps/web as regular files instead of submodule
- **Checkpoint Tag**: `checkpoint/2025-11-06-initial-repo-setup`
- **Working Tree**: Clean ✅

## 🎯 Next Steps

After setting up the remote:

1. **Enable Branch Protection** (on GitHub):
   - Go to Settings → Branches
   - Add rule for `main` branch:
     - Require pull request reviews
     - Require status checks to pass
     - Require branches to be up to date
     - Include administrators

2. **Enable Auto-Checkpoint Action**:
   - Go to Settings → Actions → General
   - Ensure "Workflow permissions" is set to "Read and write permissions"
   - The auto-checkpoint workflow will run automatically on merges to `main`

3. **Test the Workflow**:
   - Create a feature branch: `git checkout -b feature/test-workflow`
   - Make a small change
   - Create a PR using the template
   - Merge to `main` and verify the checkpoint tag is created

## 📚 Resources

- Git workflow documentation: See `AGENTS.MD` section 14
- PR template: `.github/pull_request_template.md`
- Auto-checkpoint workflow: `.github/workflows/auto-checkpoint.yml`

