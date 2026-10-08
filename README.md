# Face Match · Browser Identity Verification Demo

A modern web application for verifying student identity by comparing a live camera photo with an uploaded ID card image using AI-powered face recognition.

**Live demo →** [face-match-auth.vercel.app](https://face-match-auth.vercel.app) (needs camera access)

## Features

- 📸 **ID Card Upload**: Drag-and-drop or click-to-upload interface
- 📷 **Live Camera Capture**: Real-time face capture with visual guide
- 🤖 **AI Face Verification**: Uses face-api.js for face recognition and matching
- ✅ **Success Modal**: Clean modal with onboarding option
- 🔄 **Redirect to Cortexa**: Seamless redirect to Cortexa interview platform
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **HTML5**: Structure and semantic markup
- **CSS3**: Modern styling with gradients and animations
- **JavaScript (ES6+)**: Core functionality and face recognition
- **face-api.js**: AI-powered face detection and recognition library

## Setup Instructions

### Option 1: Local Development

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. For best results, use a local server:
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   ```
4. Navigate to `http://localhost:8000` in your browser

### Option 2: Deploy to Web Hosting

1. Upload all files to your web hosting service
2. Ensure HTTPS is enabled (required for camera access)
3. Access the website through your domain

## How It Works

1. **Upload ID Card**: User uploads their ID card image
2. **Face Capture**: User allows camera access and captures their live photo
3. **AI Verification**: The system compares the live photo with the ID card using face recognition
4. **Success & Redirect**: Upon successful verification, user can onboard to Cortexa

## Face Recognition

The website uses **face-api.js** with the following models:
- TinyFaceDetector (for fast face detection)
- FaceLandmark68Net (for facial landmarks)
- FaceRecognitionNet (for face descriptors)

**Matching Threshold**: 0.6 (euclidean distance)
- Lower distance = more similar faces
- Threshold of 0.6 is standard for same-person verification

## Configuration

To change the redirect URL, edit `script.js`:

```javascript
const CORTEXA_URL = 'https://cortexa-eight.vercel.app/';
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (may require HTTPS)
- Mobile browsers (iOS Safari, Chrome Mobile)

**Note**: Camera access requires HTTPS in production (except for localhost).

## File Structure

```
verification-website/
├── index.html          # Main HTML structure
├── styles.css          # All styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Troubleshooting

### Camera Not Working
- Ensure you're using HTTPS (or localhost)
- Check browser permissions for camera access
- Try a different browser

### Face Recognition Not Working
- Check browser console for errors
- Ensure internet connection (for loading face-api.js models)
- Models load from CDN on first use

### Verification Always Fails
- Ensure good lighting
- Face should be clearly visible in both images
- Try adjusting the threshold in `script.js` (line with `const threshold = 0.6`)

## Production Deployment

For production deployment:

1. **Use HTTPS**: Required for camera access
2. **Optimize Images**: Compress uploaded images if needed
3. **CDN**: Consider hosting face-api.js models on your own CDN
4. **Error Monitoring**: Add error tracking (e.g., Sentry)
5. **Analytics**: Add analytics to track usage

## Security Considerations

- This is a client-side verification system
- For production, consider adding server-side verification
- Implement rate limiting
- Add proper authentication/authorization
- Store verification results securely

## License

This project is provided as-is for educational and development purposes.

