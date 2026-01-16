import dotenv from 'dotenv';
import { createApp } from './src/config/app.js';

dotenv.config();

const port = process.env.PORT || 3000;
const app = createApp();

app.listen(port, () => {
    console.log(`BrandGuard API listening on port ${port}`);
});
