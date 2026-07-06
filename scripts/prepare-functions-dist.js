import fs from 'fs';
import path from 'path';

const distFunctionsDir = path.join(process.cwd(), 'dist/functions');

if (!fs.existsSync(distFunctionsDir)) {
  fs.mkdirSync(distFunctionsDir, { recursive: true });
}

const packageJsonContent = {
  "name": "zana-functions",
  "version": "0.0.0",
  "private": true,
  "main": "index.cjs",
  "type": "commonjs",
  "engines": {
    "node": "22"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "firebase-admin": "^13.10.0",
    "firebase-functions": "^7.2.5",
    "multer": "^2.2.0"
  }
};

fs.writeFileSync(
  path.join(distFunctionsDir, 'package.json'),
  JSON.stringify(packageJsonContent, null, 2),
  'utf-8'
);

console.log('Firebase Functions minimal package.json successfully created in dist/functions/');
