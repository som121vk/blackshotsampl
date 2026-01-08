# 2FA Integration Guide for Blackshot Admin Panel

## Overview
Your admin panel now has a **mock 2FA (Two-Factor Authentication)** system. This guide explains how it works and how to implement **real 2FA** for production use.

---

## Current Mock Implementation

### What It Does:
1. **Generates a QR Code**: Uses an external API to create a TOTP QR code
2. **Accepts Any 6-Digit Code**: For testing, any numerical 6-digit code is accepted
3. **Creates Backup Codes**: 10 random backup codes are generated for recovery
4. **Stores Settings**: All 2FA settings are saved in localStorage

### How to Test:
1. Login to admin panel (`admin123` or your current password)
2. Go to **Security** tab
3. Click **Enable 2FA**
4. Scan the QR code with any authenticator app (Google Authenticator, Authy, etc.)
5. Enter any 6-digit number to "verify" (mock mode)
6. Save the backup codes displayed

---

## **For Production: Real 2FA Implementation**

To implement real 2FA, you need a backend server because:
- TOTP verification requires server-side secret storage
- Client-side verification is insecure
- Production apps should never expose secrets to the browser

### Option 1: Using `speakeasy` (Node.js Backend)

#### Step 1: Install Dependencies
```bash
npm install speakeasy qrcode express
```

#### Step 2: Backend Server (`server.js`)
```javascript
const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const app = express();

app.use(express.json());

// In-memory storage (use database in production)
let users = {
    admin: {
        secret: null,
        tempSecret: null,
        backupCodes: []
    }
};

// Generate 2FA Secret
app.post('/api/2fa/generate', async (req, res) => {
    const secret = speakeasy.generateSecret({
        name: 'Blackshot (admin)',
        issuer: 'Blackshot Store'
    });
    
    users.admin.tempSecret = secret.base32;
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    res.json({
        secret: secret.base32,
        qrCode: qrCodeUrl
    });
});

// Verify 2FA Code
app.post('/api/2fa/verify', (req, res) => {
    const { code } = req.body;
    
    const verified = speakeasy.totp.verify({
        secret: users.admin.tempSecret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow 60 seconds time window
    });
    
    if (verified) {
        // Move temp secret to permanent
        users.admin.secret = users.admin.tempSecret;
        users.admin.tempSecret = null;
        
        // Generate backup codes
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            backupCodes.push(
                Math.random().toString(36).substring(2, 10).toUpperCase()
            );
        }
        users.admin.backupCodes = backupCodes;
        
        res.json({ 
            success: true, 
            backupCodes 
        });
    } else {
        res.json({ 
            success: false, 
            error: 'Invalid code' 
        });
    }
});

// Login with 2FA
app.post('/api/login', (req, res) => {
    const { password, twoFactorCode } = req.body;
    
    // Check password first
    if (password !== 'your-actual-password') {
        return res.json({ success: false, error: 'Invalid password' });
    }
    
    // If 2FA is enabled, verify code
    if (users.admin.secret) {
        const verified = speakeasy.totp.verify({
            secret: users.admin.secret,
            encoding: 'base32',
            token: twoFactorCode,
            window: 2
        });
        
        if (!verified) {
            // Check backup codes
            const backupIndex = users.admin.backupCodes.indexOf(twoFactorCode);
            if (backupIndex === -1) {
                return res.json({ success: false, error: 'Invalid 2FA code' });
            }
            // Remove used backup code
            users.admin.backupCodes.splice(backupIndex, 1);
        }
    }
    
    res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

#### Step 3: Frontend Integration

Update `admin.js`:

```javascript
async function generate2FASecret() {
    try {
        const response = await fetch('http://localhost:3000/api/2fa/generate', {
            method: 'POST'
        });
        const data = await response.json();
        
        const qrSection = document.getElementById('2fa-qr-section');
        qrSection.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; display: inline-block;">
                <p style="margin-bottom: 10px; font-weight: 600;">Scan this QR Code</p>
                <img src="${data.qrCode}" alt="2FA QR Code">
                <p style="margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">
                    Manual Entry: ${data.secret}
                </p>
            </div>
        `;
        
        window.tempSecret = data.secret;
    } catch (error) {
        alert('Error generating 2FA secret');
    }
}

async function verify2FA() {
    const code = document.getElementById('2fa-verify-code').value;
    
    if (!code || code.length !== 6) {
        alert('Please enter a valid 6-digit code');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/2fa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Store.enable2FA(window.tempSecret);
            Store.save2FABackupCodes(data.backupCodes);
            
            // Show backup codes
            const backupSection = document.getElementById('backup-codes-section');
            const backupCodesDiv = document.getElementById('backup-codes');
            backupCodesDiv.innerHTML = data.backupCodes.map(c => `<div>${c}</div>`).join('');
            backupSection.style.display = 'block';
            
            alert('2FA enabled successfully! Save your backup codes.');
            
            setTimeout(() => {
                document.getElementById('2fa-setup').style.display = 'none';
                load2FAStatus();
            }, 5000);
        } else {
            alert('Invalid code. Please try again.');
        }
    } catch (error) {
        alert('Error verifying code');
    }
}
```

---

### Option 2: Using Auth0 (Cloud Service)

Auth0 provides managed 2FA with minimal setup:

1. **Sign up** at [https://auth0.com](https://auth0.com)
2. **Enable MFA** in your Auth0 dashboard
3. **Install Auth0 SDK**:
   ```bash
   npm install @auth0/auth0-spa-js
   ```
4. **Follow Auth0 docs** to integrate with your admin panel

Benefits:
- No backend code needed
- Professional UI
- SMS, Email, and Authenticator support
- Backup codes handled automatically

---

### Option 3: Firebase Authentication

Google Firebase includes built-in 2FA support:

```bash
npm install firebase
```

```javascript
import { getAuth, multiFactor, PhoneAuthProvider } from "firebase/auth";

// Enable MFA
const multiFactorUser = multiFactor(auth.currentUser);
```

Firebase handles all the complexity for you.

---

## Security Best Practices

1. **Never Store Secrets in localStorage**:
   - Use session cookies with httpOnly flag
   - Store secrets only on the server

2. **Use HTTPS**:
   - 2FA is useless without encrypted connections
   - All authentication should be over HTTPS

3. **Rate Limiting**:
   - Limit login attempts (5 max per 15 minutes)
   - Prevent brute force attacks

4. **Backup Codes**:
   - Provide 10-12 one-time use backup codes
   - Store them hashed in the database
   - Allow users to regenerate them

5. **Recovery Options**:
   - Email-based recovery link
   - SMS verification (fallback)
   - Contact admin support

---

## Testing the Mock 2FA

Since the current implementation is mock:

1. Any 6-digit number will work for verification
2. Backup codes are just display (not validated during login)
3. The secret is shown in the UI (never do this in production!)

For testing the workflow, this is sufficient. When you're ready to go live, implement one of the production options above.

---

## Summary

| Feature | Mock (Current) | Production (Recommended) |
|---------|----------------|-------------------------|
| Secret Generation | Client-side | Server-side (speakeasy) |
| Code Verification | Accepts any 6 digits | TOTP algorithm |
| Storage | localStorage | Database (encrypted) |
| QR Code | External API | Generated server-side |
| Security | ❌ Not secure | ✅ Secure |

**Next Steps**:
- Use current mock for development/testing
- Implement `speakeasy` backend when going to production
- Or use Auth0/Firebase for managed solution

---

**Resources**:
- speakeasy: https://github.com/speakeasyjs/speakeasy
- Auth0 MFA: https://auth0.com/docs/secure/multi-factor-authentication
- Firebase Auth: https://firebase.google.com/docs/auth/web/phone-auth
