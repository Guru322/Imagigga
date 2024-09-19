import express from 'express';
import multer from 'multer';
import axios from 'axios';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { promises as fs } from 'fs';
import FormData from 'form-data';

dotenv.config();

const app = express();
const port = process.env.PORT || 9060;

const upload = multer({ storage: multer.memoryStorage() });

const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

async function uploadToImgBB(imageData) {
  const formData = new FormData();
  formData.append('image', imageData);

  const response = await axios.post(IMGBB_API_URL, formData, {
    params: {
      key: process.env.IMGBB_API_KEY,
    },
    headers: formData.getHeaders(),
  });

  return response.data.data;
}

app.use(express.json());

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    let imageData;

    if (req.file) {
      imageData = req.file.buffer.toString('base64');
    } else if (req.body.imagePath) {
      const fileBuffer = await fs.readFile(req.body.imagePath);
      imageData = fileBuffer.toString('base64');
    } else if (req.body.imageBuffer) {
      imageData = req.body.imageBuffer;
    } else {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const imgbbData = await uploadToImgBB(imageData);

    const imageUrl = imgbbData.url;
    const rawImageUrl = imgbbData.image.url;

    const ourDomainUrl = `${req.protocol}://${req.get('host')}/images/${Buffer.from(rawImageUrl).toString('base64')}`;

    res.json({
      creator: "Guru Sensei",
      output: ourDomainUrl,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

app.use('/images/:encodedUrl', (req, res, next) => {
  const rawImageUrl = Buffer.from(req.params.encodedUrl, 'base64').toString('ascii');
  createProxyMiddleware({
    target: rawImageUrl,
    changeOrigin: true,
    pathRewrite: (path, req) => '',
  })(req, res, next);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});