const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const logWarning = "Local file logging is disabled for Vercel compatibility.";

const supabaseUrl = process.env.SUPABASE_URL || 'https://svopreloeopwtkrbexjw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2b3ByZWxvZW9wd3RrcmJleGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjYwMDUsImV4cCI6MjA4OTc0MjAwNX0.AtAQbI-6BXugCCwOJIPXrEzUtWPQyZKOjfn23UzCkA0';

// Serve frontend as static files
app.use(express.static(path.join(__dirname, 'frontend')));

// --- Native Fetch Proxy for Supabase ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        console.log(`[AUTH] Login attempt for: ${email}`);
        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error(`[AUTH] Login failed for ${email}:`, data.error_description || data.msg);
            return res.status(response.status).json({ error: data.error_description || data.msg || 'Login failed' });
        }
        console.log(`[AUTH] Login successful for: ${email}`);
        res.status(200).json({ user: data.user, session: data });
    } catch (err) {
        console.error(`[AUTH] Login exception:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/signup', async (req, res) => {
    const { email, password, fullName } = req.body;
    try {
        console.log(`[AUTH] Signup attempt for: ${email}`);
        const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, data: { full_name: fullName } })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error(`[AUTH] Signup failed for ${email}:`, data.message || data.msg);
            return res.status(response.status).json({ error: data.message || data.msg || 'Signup failed' });
        }
        console.log(`[AUTH] Signup successful for: ${email}`);
        // Return session if available (it might be null if email confirmation is enabled)
        res.status(200).json({ user: data.user || data, session: data.session || null, fullName });
    } catch (err) {
        console.error(`[AUTH] Signup exception:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sync-profile', async (req, res) => {
    const { profileData } = req.body;
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation,resolution=merge-duplicates'
            },
            body: JSON.stringify(profileData)
        });
        const data = await response.json();
        if (!response.ok) return res.status(400).json({ error: data.message || 'Profile sync failed' });
        res.status(200).json({ message: "Profile synced", data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to log a user login
app.post('/api/log-login', (req, res) => {
    const { userId, email, timestamp } = req.body;
    
    if (!userId || !email) {
        return res.status(400).json({ error: 'Missing userId or email' });
    }

    // Local file write disabled for Vercel, just logging to standard output
    console.log(`[LOGIN] User ${email} logged in. Timestamp: ${timestamp || new Date().toISOString()}`);
    res.status(200).json({ message: 'Login logged successfully to console' });
});

// Endpoint to view all login logs
app.get('/api/login-logs', (req, res) => {
    // Return empty logs or a disclaimer since local file logging was disabled
    res.status(200).json([{ email: 'disabled_on_vercel', timestamp: new Date().toISOString() }]);
});

// Handle all other requests by serving the index.html (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

// Export the app for Vercel Serverless Function compatibility
module.exports = app;
