import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Validate configuration
const validateConfig = () => {
  const requiredVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    const message = `Missing Cloudinary environment variables: ${missing.join(', ')}`;
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }
    
    console.warn(`Warning: ${message}`);
  }
};

validateConfig();

export { cloudinary };

