import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

/** Always load backend/.env regardless of process.cwd() */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');

dotenv.config({ path: envPath });

export { envPath };
