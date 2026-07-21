import multer from 'multer';
import { supabase, supabaseAdmin } from '../../config/supabase.js';
import { randomUUID } from 'crypto';

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

/**
 * Upload PDF to Supabase Storage
 */
export const uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const storageClient = supabaseAdmin || supabase;
    if (!storageClient) {
      return res.status(500).json({ error: 'Supabase client not configured' });
    }

    const file = req.file;
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${randomUUID()}.${fileExtension}`;
    const folderPath = 'curriculum-designs';
    const bucketName = 'curriculum-designs';

    const { error } = await storageClient.storage
      .from(bucketName)
      .upload(`${folderPath}/${fileName}`, file.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading to Supabase Storage:', error.message || error);
      if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
        return res.status(500).json({
          error: 'Storage bucket not found. Please create the "curriculum-designs" bucket in Supabase Storage and run the setup-storage.sql script.'
        });
      }
      return res.status(500).json({
        error: 'Failed to upload PDF: ' + (error.message || 'Unknown error')
      });
    }

    const { data: urlData } = storageClient.storage
      .from(bucketName)
      .getPublicUrl(`${folderPath}/${fileName}`);

    res.json({
      url: urlData.publicUrl,
      fileName: file.originalname,
      path: `${folderPath}/${fileName}`,
    });
  } catch (error) {
    console.error('Error in uploadPDF:', error.message || error);
    res.status(500).json({
      error: 'Failed to upload PDF',
      message: error.message
    });
  }
};

