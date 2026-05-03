import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import linkRoutes from './routes/link.routes';
import adminRoutes from './routes/admin.routes';
import deathRoutes from './routes/death.routes';
import documentsRoutes from './routes/documents.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',   // للـ Next.js frontend لاحقاً
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static('public/images'));
 

// إضافة هذا السطر الجديد
app.use('/uploads', express.static('uploads'));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);   // ← أضف هذا السطر
app.use('/api/link', linkRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/death', deathRoutes);
app.use('/api/documents', documentsRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: '🚀 نفوس API تعمل بنجاح!' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});