import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestersRouter } from './routes/requesters';
import { categoriesRouter } from './routes/categories';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
