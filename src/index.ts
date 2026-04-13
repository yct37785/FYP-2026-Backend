import express from 'express';
import noteRoutes from '@routes/noteRoutes';
import { errorHandler } from '@middlewares/errorHandler';
import { notFound } from '@middlewares/notFound';
import { env } from '@config/env';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

app.use('/api', noteRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});