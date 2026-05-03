import express from 'express';
import authRoutes from '@routes/authRoutes';
import categoryRoutes from '@routes/categoryRoutes';
import userRoutes from '@routes/userRoutes';
import eventRoutes from '@routes/eventRoutes';
import bookingRoutes from '@routes/bookingRoutes';
import waitlistRoutes from '@routes/waitlistRoutes';
import favoriteRoutes from '@routes/favoriteRoutes';
import reviewRoutes from '@routes/reviewRoutes';
import reportRoutes from '@routes/reportRoutes';
import notificationRoutes from '@routes/notificationRoutes';
import adminRoutes from '@routes/adminRoutes';
import uploadRoutes from '@routes/uploadRoutes';
import { errorHandler } from '@middlewares/errorHandler';
import { notFound } from '@middlewares/notFound';
import { startEventbriteSyncJob } from '@jobs/eventbriteSyncJob';
import { env } from '@config/env';
import cors from 'cors';

const app = express();

app.use(
  cors({
    origin: '*',
    credentials: false,
  })
);

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/user', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/waitlists', waitlistRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
  startEventbriteSyncJob();
});