#!/bin/bash
# Setup script for connecting local repository to GitHub remote

set -e

echo "🔗 Setting up GitHub remote repository"
echo ""

# Check if remote already exists
if git remote get-url origin 2>/dev/null; then
    echo "⚠️  Remote 'origin' already exists:"
    git remote -v
    echo ""
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

# Get repository URL
echo "Please provide your GitHub repository URL."
echo "Examples:"
echo "  - https://github.com/username/docuflow.git"
echo "  - git@github.com:username/docuflow.git"
echo ""
read -p "GitHub repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ No URL provided. Exiting."
    exit 1
fi

# Add or update remote
if git remote get-url origin 2>/dev/null; then
    git remote set-url origin "$REPO_URL"
    echo "✅ Updated remote 'origin' to: $REPO_URL"
else
    git remote add origin "$REPO_URL"
    echo "✅ Added remote 'origin': $REPO_URL"
fi

# Verify remote
echo ""
echo "Remote configuration:"
git remote -v

# Push to remote
echo ""
read -p "Push to remote now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Pushing to remote..."
    
    # Push main branch
    git push -u origin main
    
    # Push checkpoint tag
    git push origin checkpoint/2025-11-06-initial-repo-setup
    
    echo ""
    echo "✅ Successfully pushed to remote!"
    echo "   Branch: main"
    echo "   Tag: checkpoint/2025-11-06-initial-repo-setup"
else
    echo ""
    echo "To push later, run:"
    echo "  git push -u origin main"
    echo "  git push origin checkpoint/2025-11-06-initial-repo-setup"
fi

