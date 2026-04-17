import express from 'express';
import authRoutes from '@routes/authRoutes';
import userRoutes from '@routes/userRoutes';
import eventRoutes from '@routes/eventRoutes';
import bookingRoutes from '@routes/bookingRoutes';
import waitlistRoutes from '@routes/waitlistRoutes';
import favoriteRoutes from '@routes/favoriteRoutes';
import reviewRoutes from '@routes/reviewRoutes';
import reportRoutes from '@routes/reportRoutes';
import notificationRoutes from '@routes/notificationRoutes';
import { errorHandler } from '@middlewares/errorHandler';
import { notFound } from '@middlewares/notFound';
import { env } from '@config/env';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/waitlists', waitlistRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});