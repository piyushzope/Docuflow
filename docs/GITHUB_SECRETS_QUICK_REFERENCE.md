# GitHub Secrets Quick Reference

## Quick Setup Checklist

Use these exact values when setting up your GitHub Actions secrets:

### Secret 1: LINODE_HOST
```
172.234.249.76
```

### Secret 2: LINODE_USER
```
root
```

### Secret 3: LINODE_SSH_PRIVATE_KEY

**To get this value, run on your Linode server:**

```bash
ssh root@172.234.249.76
cat ~/.ssh/linode_deploy
```

**Copy the ENTIRE output**, which should look like:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACAludc8usugN/BBvQdrB8jkT5hSNY3OefjZ+KGSgiqaAwAAAJh1yv9ldcr/
ZQAAAAtzc2gtZWQyNTUxOQAAACAludc8usugN/BBvQdrB8jkT5hSNY3OefjZ+KGSgiqaAw
AAAECGKs68vUDc1dTudlRM9VvZHaWLc4PUNKGLAQWMpZy0xyW51zy6y6A38EG9B2sHyORP
mFI1jc55+Nn4oZKCKpoDAAAAFWdpdGh1Yi1hY3Rpb25zLWxpbm9kZQ==
-----END OPENSSH PRIVATE KEY-----
```

⚠️ **IMPORTANT**: Make sure you copy the complete key including both BEGIN and END lines!

## Where to Add These Secrets

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click **"New repository secret"** for each one
3. Paste the values above

## Verification

After adding secrets, test the workflow:
- Go to **Actions** tab
- Run **"Deploy to Linode"** workflow manually
- Check that it connects successfully

## Need Help?

See the full guide: [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)
