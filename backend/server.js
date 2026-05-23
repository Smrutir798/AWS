require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { CognitoIdentityProviderClient, ForgotPasswordCommand, ConfirmForgotPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// AWS Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock'
    }
});

const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock'
    }
});

const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock'
    }
});

const upload = multer({ storage: multer.memoryStorage() });

function getSecretHash(username) {
    if (!process.env.COGNITO_CLIENT_SECRET) return undefined;
    const clientId = process.env.COGNITO_CLIENT_ID;
    const clientSecret = process.env.COGNITO_CLIENT_SECRET;
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(username + clientId);
    return hmac.digest('base64');
}

// PostgreSQL DB Connection (AWS RDS) - Setup for real deployment
/*
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 5432,
});
*/

// Mock database to simulate RDS for immediate local testing without AWS account
const hashedPwd = bcrypt.hashSync('password123', 10);
let mockUsers = [
    { id: 1, email: 'emp@test.com', password: hashedPwd, role: 'employee', name: 'Employee User' },
    { id: 2, email: 'mgr@test.com', password: hashedPwd, role: 'manager', name: 'Manager User' },
    { id: 3, email: 'smrutir798@gmail.com', password: hashedPwd, role: 'employee', name: 'Smruti (Admin)' },
    { id: 4, email: '2201020477@cgu-odisha.ac.in', password: hashedPwd, role: 'employee', name: 'Student' }
];
let mockLeaves = [
    { id: 1, employeeId: 1, employeeName: 'Employee User', startDate: '2026-06-01', endDate: '2026-06-05', reason: 'Vacation', type: 'Annual Leave', status: 'Pending', createdAt: new Date().toISOString() }
];
let mockId = 2;
let mockUserId = 3;

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'supersecret', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- ROUTES ---

// 1. Login Route (Simulating AWS Cognito / DB)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = mockUsers.find(u => u.email === email);
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name, email: user.email }, 
            process.env.JWT_SECRET || 'supersecret', 
            { expiresIn: '1h' }
        );
        res.json({ token, user: { id: user.id, role: user.role, name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// 1.5 Signup Route
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        if (mockUsers.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        
        const validRole = ['employee', 'manager'].includes(role) ? role : 'employee';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            id: mockUserId++,
            name,
            email,
            password: hashedPassword,
            role: validRole
        };
        
        mockUsers.push(newUser);
        
        const token = jwt.sign(
            { id: newUser.id, role: newUser.role, name: newUser.name, email: newUser.email }, 
            process.env.JWT_SECRET || 'supersecret', 
            { expiresIn: '1h' }
        );
        res.status(201).json({ token, user: { id: newUser.id, role: newUser.role, name: newUser.name, email: newUser.email } });
    } catch (err) {
        res.status(500).json({ error: 'Signup failed' });
    }
});

// 1.6 Forgot Password (AWS SES Link)
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const resetToken = jwt.sign({ email }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '15m' });
        const resetLink = `http://localhost:5173/forgot-password?token=${resetToken}`;

        // Attempt to send email via AWS SES
        const command = new SendEmailCommand({
            Source: process.env.SES_SENDER_EMAIL || "noreply@yourdomain.com", // You MUST verify this email in AWS SES
            Destination: { ToAddresses: [email] },
            Message: {
                Subject: { Data: "Password Reset Request" },
                Body: {
                    Text: { Data: `Click the following link to reset your password: ${resetLink}` },
                    Html: { Data: `<h3>Password Reset</h3><p>Click <a href="${resetLink}">here</a> to reset your password. The link expires in 15 minutes.</p>` }
                }
            }
        });
        
        console.log(`[LOCAL DEV LINK]: ${resetLink}`);
        
        // Only send if not using mock credentials
        if (process.env.AWS_ACCESS_KEY_ID !== 'mock' && process.env.AWS_ACCESS_KEY_ID !== undefined) {
            try {
                await sesClient.send(command);
            } catch (sesErr) {
                console.error("SES Send Error (Did you verify the sender email in AWS?):", sesErr.message);
                // Continue to return success so local dev works
            }
        }
        
        res.json({ message: 'Password reset link sent to your email.' });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ error: 'Failed to process forgot password request.' });
    }
});

// 1.7 Reset Password via Link
app.post('/api/auth/reset-password-link', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
        const email = decoded.email;
        
        // Update local mock database
        const user = mockUsers.find(u => u.email === email);
        if (user) {
            user.password = await bcrypt.hash(newPassword, 10);
            return res.json({ message: 'Password successfully reset' });
        }
        res.status(404).json({ error: 'User not found in database' });
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(400).json({ error: 'Invalid or expired reset token.' });
    }
});

// 2. Apply for Leave (Employee -> API Gateway -> EC2/Lambda -> RDS)
app.post('/api/leaves', authenticateToken, (req, res) => {
    if (req.user.role !== 'employee') return res.status(403).json({ error: 'Only employees can apply' });

    const { startDate, endDate, reason, type, documentUrl } = req.body;
    
    const newLeave = {
        id: mockId++,
        employeeId: req.user.id,
        employeeName: req.user.name,
        startDate,
        endDate,
        reason,
        type,
        documentUrl: documentUrl || null,
        status: 'Pending',
        createdAt: new Date().toISOString()
    };
    
    mockLeaves.push(newLeave);

    // Simulated AWS SNS/SES Notification
    console.log(`[AWS SNS/SES MOCK] Notification sent to manager for new leave request from ${req.user.name}`);

    res.status(201).json(newLeave);
});

// 3. Get Leaves (Employee checks status, Manager views all)
app.get('/api/leaves', authenticateToken, (req, res) => {
    if (req.user.role === 'employee') {
        const userLeaves = mockLeaves.filter(l => l.employeeId === req.user.id);
        return res.json(userLeaves);
    } else if (req.user.role === 'manager') {
        return res.json(mockLeaves);
    }
    res.status(403).json({ error: 'Unauthorized' });
});

// 4. Update Leave Status (Manager Approves/Rejects)
app.put('/api/leaves/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can update' });

    const leaveId = parseInt(req.params.id);
    const { status } = req.body; 

    const leaveIndex = mockLeaves.findIndex(l => l.id === leaveId);
    if (leaveIndex === -1) return res.status(404).json({ error: 'Leave not found' });

    mockLeaves[leaveIndex].status = status;

    // Simulated AWS SES/SNS Notification
    console.log(`[AWS SNS/SES MOCK] Notification sent to employee ${mockLeaves[leaveIndex].employeeName}: Leave ${status}`);
    
    res.json(mockLeaves[leaveIndex]);
});

// 5. Upload Document directly to S3 via backend proxy
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    const fileName = `${Date.now()}-${req.user.id}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME || 'mock-bucket',
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        });
        
        await s3Client.send(command);
        res.json({ fileName });
    } catch (err) {
        console.error("S3 Upload Error:", err);
        res.status(500).json({ error: 'Could not upload file to S3.' });
    }
});

// 6. Get presigned URL for viewing document
app.get('/api/documents/:fileName', authenticateToken, async (req, res) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME || 'mock-bucket',
            Key: req.params.fileName
        });
        
        const viewUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({ viewUrl });
    } catch (err) {
        console.error("S3 Get Document Error:", err);
        res.status(500).json({ error: 'Could not generate view URL' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
