# GitHub Actions Deployment Setup Guide

This guide explains how to configure GitHub Actions secrets for deploying to your Linode server.

## Required Secrets

You need to configure the following secrets in your GitHub repository:

### 1. LINODE_HOST
- **Value**: `172.234.249.76`
- **Description**: The IP address or hostname of your Linode server

### 2. LINODE_USER
- **Value**: `root`
- **Description**: The SSH username for connecting to the server

### 3. LINODE_SSH_PRIVATE_KEY
- **Value**: The complete private key content (see instructions below)
- **Description**: The SSH private key for authentication

## Setting Up GitHub Secrets

### Step 1: Get the Private Key

SSH into your Linode server and retrieve the private key:

```bash
ssh root@172.234.249.76
cat ~/.ssh/linode_deploy
```

Copy the **entire** output, including:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All the encoded content
- `-----END OPENSSH PRIVATE KEY-----`

**Important**: Make sure to copy the complete key without any truncation.

### Step 2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret:

#### Add LINODE_HOST
- **Name**: `LINODE_HOST`
- **Value**: `172.234.249.76`
- Click **Add secret**

#### Add LINODE_USER
- **Name**: `LINODE_USER`
- **Value**: `root`
- Click **Add secret**

#### Add LINODE_SSH_PRIVATE_KEY
- **Name**: `LINODE_SSH_PRIVATE_KEY`
- **Value**: Paste the complete private key (from Step 1)
- Click **Add secret**

**Important Notes for LINODE_SSH_PRIVATE_KEY**:
- Include the BEGIN and END lines
- Ensure there are no extra spaces or line breaks at the beginning/end
- The key should be on a single line or properly formatted with line breaks
- If copying from terminal, make sure the entire key is captured

### Step 3: Verify Key Format

The private key should look like this:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACAludc8usugN/BBvQdrB8jkT5hSNY3OefjZ+KGSgiqaAwAAAJh1yv9ldcr/
[... more lines ...]
-----END OPENSSH PRIVATE KEY-----
```

## Testing the Setup

After adding the secrets, you can test the deployment:

1. Go to the **Actions** tab in your GitHub repository
2. Select the **Deploy to Linode** workflow
3. Click **Run workflow** → **Run workflow**

The workflow will:
- Validate all secrets are configured
- Test SSH connection
- Build the application
- Deploy to your Linode server

## Troubleshooting

### Error: "Error loading key (stdin): error in libcrypto"

This usually means:
- The private key has incorrect line endings (Windows CRLF vs Unix LF)
- The key is truncated or missing parts
- There are extra spaces or characters

**Solution**: 
- Re-copy the entire key from the server
- Ensure you're copying from `cat ~/.ssh/linode_deploy` (not a truncated display)
- The workflow automatically handles line ending conversion, but ensure the key is complete

### Error: "Permission denied (publickey)"

This means:
- The public key isn't in the server's `~/.ssh/authorized_keys`
- The private key doesn't match the public key on the server

**Solution**:
```bash
# On your local machine or server
ssh-copy-id -i ~/.ssh/linode_deploy.pub root@172.234.249.76

# Or manually add the public key
cat ~/.ssh/linode_deploy.pub | ssh root@172.234.249.76 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

### Error: "Host key verification failed"

The workflow automatically adds the host to known_hosts, but if you see this:
- The host key might have changed
- Check the server's SSH configuration

## Security Best Practices

1. **Use a dedicated deployment user** (instead of root):
   ```bash
   # Create a deployment user
   adduser deploy
   usermod -aG sudo deploy
   mkdir -p /home/deploy/.ssh
   cp ~/.ssh/linode_deploy.pub /home/deploy/.ssh/authorized_keys
   chown -R deploy:deploy /home/deploy/.ssh
   chmod 700 /home/deploy/.ssh
   chmod 600 /home/deploy/.ssh/authorized_keys
   ```

2. **Restrict SSH access** in `/etc/ssh/sshd_config`:
   ```
   PermitRootLogin no
   PasswordAuthentication no
   PubkeyAuthentication yes
   ```

3. **Use environment-specific secrets** for different deployment environments

4. **Rotate keys periodically** for security

## Next Steps

After setting up the secrets:

1. Configure your application service (PM2, systemd, etc.) on the server
2. Set up environment variables on the server
3. Configure your reverse proxy (nginx, etc.) if needed
4. Test the deployment workflow

For more information, see the main [README.md](../README.md).
