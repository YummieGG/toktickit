import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestersRouter } from './routes/requesters';
import { categoriesRouter } from './routes/categories';
import { relatedSystemsRouter } from './routes/related-systems';
import { ticketsRouter } from './routes/tickets';
import { attachmentsRouter, ticketAttachmentsRouter } from './routes/attachments';
import { authRouter } from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.APP_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('TokTickIT API Server Running');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'TokTickIT API'
  });
});

// API Routes
app.use('/api/categories', categoriesRouter);
app.use('/api/requesters', requestersRouter);
app.use('/api/related-systems', relatedSystemsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/tickets/:ticketId/attachments', ticketAttachmentsRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
