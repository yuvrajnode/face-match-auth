// Configuration
const CORTEXA_URL = 'https://cortexa-eight.vercel.app/';

// State management
let idCardImageData = null;
let capturedPhoto = null;
let modelsLoaded = false;
let stream = null;

// DOM Elements
const uploadPage = document.getElementById('uploadPage');
const verificationPage = document.getElementById('verificationPage');
const uploadArea = document.getElementById('uploadArea');
const idCardInput = document.getElementById('idCardInput');
const idCardPreview = document.getElementById('idCardPreview');
const idCardImage = document.getElementById('idCardImage');
const changeIdCardBtn = document.getElementById('changeIdCard');
const proceedBtn = document.getElementById('proceedToVerification');
const backToUploadBtn = document.getElementById('backToUpload');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const capturePhotoBtn = document.getElementById('capturePhoto');
const retakePhotoBtn = document.getElementById('retakePhoto');
const verifyFaceBtn = document.getElementById('verifyFace');
const capturedPhotoContainer = document.getElementById('capturedPhotoContainer');
const capturedPhotoImg = document.getElementById('capturedPhoto');
const verificationLoader = document.getElementById('verificationLoader');
const statusMessage = document.getElementById('statusMessage');
const successModal = document.getElementById('successModal');
const onboardButton = document.getElementById('onboardButton');

// Wait for face-api.js library to load
function waitForFaceAPI() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (typeof faceapi !== 'undefined' && faceapi.nets) {
            console.log('face-api.js library is already loaded');
            resolve();
            return;
        }
        
        // Wait for it to load (max 15 seconds)
        let attempts = 0;
        const maxAttempts = 150; // 15 seconds (150 * 100ms)
        
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof faceapi !== 'undefined' && faceapi.nets) {
                clearInterval(checkInterval);
                console.log('face-api.js library loaded after', attempts * 100, 'ms');
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                const error = new Error('face-api.js library failed to load. Check if the CDN script tag is correct in index.html.');
                console.error('face-api.js loading timeout. typeof faceapi:', typeof faceapi);
                reject(error);
            }
        }, 100);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for face-api.js to be fully loaded
        await waitForFaceAPI();
        console.log('face-api.js library loaded');
        
        await loadFaceModels();
        setupEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Face recognition library failed to load. Please check your internet connection and refresh the page.');
    }
});

// Load Face-API models
async function loadFaceModels() {
    const modelStatus = document.getElementById('modelStatus');
    
    try {
        // Show loading indicator on upload page
        if (modelStatus) {
            modelStatus.classList.remove('hidden');
        }
        
        // Check if statusMessage exists (might be on verification page)
        if (statusMessage) {
            statusMessage.querySelector('p').textContent = 'Loading face recognition models...';
        }
        
        console.log('Starting to load face recognition models...');
        
        // Verify faceapi is properly loaded
        if (!faceapi || !faceapi.nets) {
            throw new Error('face-api.js library is not properly loaded. Please refresh the page.');
        }
        
        console.log('face-api.js library verified:', {
            hasNets: !!faceapi.nets,
            hasTinyFaceDetector: !!faceapi.nets.tinyFaceDetector,
            hasFaceLandmark68Net: !!faceapi.nets.faceLandmark68Net,
            hasFaceRecognitionNet: !!faceapi.nets.faceRecognitionNet
        });
        
        // Use local models - path relative to src folder
        const MODEL_URL = '../models';
        
        if (modelStatus) {
            modelStatus.innerHTML = `<div class="spinner-small"></div><span>Loading local face recognition models...</span>`;
        }
        
        // Helper function to load a single model with timeout
        async function loadModelWithTimeout(model, url, timeout = 30000) {
            return Promise.race([
                model.loadFromUri(url),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Model load timeout after 30 seconds')), timeout)
                )
            ]);
        }
        
        // Load models sequentially with better error reporting
        try {
            console.log('Loading tinyFaceDetector...');
            await loadModelWithTimeout(faceapi.nets.tinyFaceDetector, MODEL_URL);
            console.log('✓ tinyFaceDetector loaded');
        } catch (err) {
            console.error('Failed to load tinyFaceDetector:', err);
            throw new Error(`Failed to load tinyFaceDetector: ${err.message}`);
        }
        
        try {
            console.log('Loading faceLandmark68Net...');
            await loadModelWithTimeout(faceapi.nets.faceLandmark68Net, MODEL_URL);
            console.log('✓ faceLandmark68Net loaded');
        } catch (err) {
            console.error('Failed to load faceLandmark68Net:', err);
            throw new Error(`Failed to load faceLandmark68Net: ${err.message}`);
        }
        
        try {
            console.log('Loading faceRecognitionNet...');
            await loadModelWithTimeout(faceapi.nets.faceRecognitionNet, MODEL_URL);
            console.log('✓ faceRecognitionNet loaded');
        } catch (err) {
            console.error('Failed to load faceRecognitionNet:', err);
            throw new Error(`Failed to load faceRecognitionNet: ${err.message}`);
        }
        
        // All models loaded successfully
        modelsLoaded = true;
        console.log('✓ All face models loaded successfully from local files');
        
        // Hide loading indicator
        if (modelStatus) {
            modelStatus.classList.add('hidden');
        }
        
        if (statusMessage) {
            statusMessage.querySelector('p').textContent = 'Models loaded. Ready for verification.';
        }
        
    } catch (error) {
        console.error('Error loading face models:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        modelsLoaded = false;
        
        // Update loading indicator with error
        if (modelStatus) {
            modelStatus.innerHTML = '<span style="color: #e74c3c;">⚠️ Failed to load face recognition system</span>';
        }
        
        if (statusMessage) {
            statusMessage.querySelector('p').textContent = 'Error loading face recognition models. Please refresh the page.';
        }
        
        // Check if it's a network/CORS error
        const isCorsError = error.message && (
            error.message.includes('CORS') ||
            error.message.includes('Access-Control')
        );
        const isNetworkError = error.message && (
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('timeout')
        );
        
        let errorMsg = 'Unable to load face recognition system.\n\n';
        errorMsg += `Error: ${error.message}\n\n`;
        
        if (isCorsError) {
            errorMsg += '⚠️ CORS Error Detected:\n';
            errorMsg += 'The models cannot be loaded due to browser security restrictions.\n';
            errorMsg += 'Solutions:\n';
            errorMsg += '1. Serve this page from a local web server (not file://)\n';
            errorMsg += '2. Use a browser extension to disable CORS for local testing\n';
            errorMsg += '3. Deploy to a web server with proper CORS headers\n\n';
        }
        
        if (isNetworkError) {
            errorMsg += '⚠️ Network Error Detected:\n';
            errorMsg += 'Please check your internet connection and refresh the page.\n\n';
        }
        
        errorMsg += 'Technical Details:\n';
        errorMsg += `• Error Type: ${error.name}\n`;
        errorMsg += `• Message: ${error.message}`;
        
        alert(errorMsg);
        
        throw error;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Upload area click
    uploadArea.addEventListener('click', () => idCardInput.click());

    idCardInput.addEventListener('change', handleIdCardUpload);

    changeIdCardBtn.addEventListener('click', () => idCardInput.click());

    proceedBtn.addEventListener('click', () => {
        uploadPage.classList.remove('active');
        verificationPage.classList.add('active');
        startCamera();
    });

    backToUploadBtn.addEventListener('click', () => {
        stopCamera();
        verificationPage.classList.remove('active');
        uploadPage.classList.add('active');
    });

    capturePhotoBtn.addEventListener('click', capturePhoto);

    retakePhotoBtn.addEventListener('click', () => {
        capturedPhotoContainer.classList.add('hidden');
        capturePhotoBtn.style.display = 'flex';
        statusMessage.querySelector('p').textContent = 'Please position your face in the frame';
    });

    verifyFaceBtn.addEventListener('click', verifyFace);

    // Onboard button - redirect to Cortexa
    onboardButton.addEventListener('click', redirectToTarget);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#764ba2';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#667eea';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

// Handle ID card upload
function handleIdCardUpload(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        idCardImage.src = e.target.result;
        idCardImage.onload = () => {
            idCardImageData = e.target.result; // Store base64
            uploadArea.classList.add('hidden');
            idCardPreview.classList.remove('hidden');
            proceedBtn.disabled = false;
        };
    };
    reader.readAsDataURL(file);
}

// Switch pages
function switchToVerificationPage() {
    uploadPage.classList.remove('active');
    verificationPage.classList.add('active');
    startCamera();
}

function switchToUploadPage() {
    verificationPage.classList.remove('active');
    uploadPage.classList.add('active');
    capturedPhotoContainer.classList.add('hidden');
    capturePhotoBtn.style.display = 'block';
}

// Camera functions
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        });
        video.srcObject = stream;
        statusMessage.querySelector('p').textContent = 'Position your face in the frame';
    } catch (error) {
        console.error('Error accessing camera:', error);
        statusMessage.querySelector('p').textContent = 'Camera access denied. Please allow camera access.';
        alert('Unable to access camera. Please check your permissions.');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

function capturePhoto() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    
    capturedPhotoImg.src = canvas.toDataURL('image/png');
    capturedPhotoContainer.classList.remove('hidden');
    capturePhotoBtn.style.display = 'none';
    capturedPhoto = canvas.toDataURL('image/png');
    
    stopCamera();
}

// Face verification
async function verifyFace() {
    if (!idCardImageData || !capturedPhoto) {
        alert('Please complete all steps');
        return;
    }
    
    if (!modelsLoaded) {
        alert('Face recognition models are not loaded. Please refresh the page and try again.');
        return;
    }
    
    verificationLoader.classList.remove('hidden');
    verifyFaceBtn.disabled = true;
    statusMessage.querySelector('p').textContent = 'Analyzing facial features...';
    
    try {
        let match = false;
        
        // Only use Face-API.js for face recognition (no fallback)
        match = await performFaceRecognition();
        
        verificationLoader.classList.add('hidden');
        
        if (match) {
            statusMessage.querySelector('p').textContent = '✓ Identity verified successfully!';
            showSuccessModal();
        } else {
            statusMessage.querySelector('p').textContent = 'Verification failed. Please try again.';
            // Don't automatically retake - let user decide
            verifyFaceBtn.disabled = false;
        }
    } catch (error) {
        console.error('Verification error:', error);
        verificationLoader.classList.add('hidden');
        statusMessage.querySelector('p').textContent = 'Error during verification. Please try again.';
        
        // Provide specific error guidance
        if (error.message && error.message.includes('network')) {
            alert('Network error during verification. Please check your internet connection and try again.');
        } else if (error.message && error.message.includes('memory')) {
            alert('System memory error. Please try refreshing the page or using smaller image files.');
        } else {
            alert('An unexpected error occurred during verification. This could be due to:\n\n• Browser compatibility issues\n• Large image file sizes\n• System resource limitations\n\nPlease try refreshing the page and attempting verification again.');
        }
        
        verifyFaceBtn.disabled = false;
    }
}

// Face recognition using Face-API.js
async function performFaceRecognition() {
    try {
        // Convert base64 to image elements
        const idCardImg = new Image();
        const capturedImg = new Image();
        
        await new Promise((resolve, reject) => {
            idCardImg.onload = () => {
                capturedImg.onload = resolve;
                capturedImg.onerror = reject;
                capturedImg.src = capturedPhoto;
            };
            idCardImg.onerror = reject;
            idCardImg.src = idCardImageData;
        });
        
        // Preprocess images for better face detection
        const processedIdCard = await preprocessImage(idCardImg);
        const processedCaptured = await preprocessImage(capturedImg);
        
        // Use more accurate face detection options with higher resolution
        const detectionOptions = new faceapi.TinyFaceDetectorOptions({
            inputSize: 608, // Highest resolution for best accuracy
            scoreThreshold: 0.2 // Lower threshold for better detection rate
        });
        
        // Detect faces with landmarks and descriptors
        let idCardDetection = await faceapi
            .detectSingleFace(processedIdCard, detectionOptions)
            .withFaceLandmarks()
            .withFaceDescriptor();
            
        let capturedDetection = await faceapi
            .detectSingleFace(processedCaptured, detectionOptions)
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        // Second retry with even more lenient options
        if (!idCardDetection || !capturedDetection) {
            console.log('Retrying with different detection options...');
            const retryOptions = new faceapi.TinyFaceDetectorOptions({
                inputSize: 608,
                scoreThreshold: 0.1 // Very lenient threshold for retry
            });
            
            if (!idCardDetection) {
                idCardDetection = await faceapi
                    .detectSingleFace(processedIdCard, retryOptions)
                    .withFaceLandmarks()
                    .withFaceDescriptor();
            }
            
            if (!capturedDetection) {
                capturedDetection = await faceapi
                    .detectSingleFace(processedCaptured, retryOptions)
                    .withFaceLandmarks()
                    .withFaceDescriptor();
            }
        }
        
        // Validate that faces were detected
        if (!idCardDetection || !capturedDetection) {
            const missingIdCard = !idCardDetection;
            const missingCaptured = !capturedDetection;
            
            if (missingIdCard && missingCaptured) {
                alert('Could not detect faces in either image. Please ensure:\n• Clear face visibility in both photos\n• Good lighting conditions\n• Face is not covered by masks or glasses\n• Photos are not blurry');
            } else if (missingIdCard) {
                alert('Could not detect a face in your ID photo. Please ensure:\n• The ID photo shows a clear face\n• The face is not too small or cropped\n• Try uploading a different ID photo');
            } else {
                alert('Could not detect your face in the captured photo. Please:\n• Position your face clearly in the frame\n• Ensure good lighting\n• Remove glasses or masks if possible\n• Try capturing the photo again');
            }
            return false;
        }
        
        // Lower confidence threshold - just warn if low, don't block (0.3 instead of 0.5)
        if (idCardDetection.detection.score < 0.3 || capturedDetection.detection.score < 0.3) {
            console.log('Low face detection confidence (but continuing):', {
                idCard: idCardDetection.detection.score,
                captured: capturedDetection.detection.score
            });
            // Show warning but don't block - continue with verification
            console.warn('Low confidence detected, but proceeding with verification anyway');
        }
        
        // Validate face size (faces should be reasonably sized)
        const idCardBox = idCardDetection.detection.box;
        const capturedBox = capturedDetection.detection.box;
        
        const idCardFaceArea = idCardBox.width * idCardBox.height;
        const capturedFaceArea = capturedBox.width * capturedBox.height;
        const idCardImageArea = processedIdCard.width * processedIdCard.height;
        const capturedImageArea = processedCaptured.width * processedCaptured.height;
        
        // Face should be at least 3% of the image area (reduced from 5%)
        if (idCardFaceArea < idCardImageArea * 0.03 || capturedFaceArea < capturedImageArea * 0.03) {
            console.log('Face too small in image');
            if (idCardFaceArea < idCardImageArea * 0.03) {
                alert('The face in your ID photo is too small. Please upload an ID photo with a larger, clearer face image.');
            } else {
                alert('Your face is too small in the captured photo. Please get closer to the camera or position your face more prominently.');
            }
            return false;
        }
        
        // Calculate distance between face descriptors
        const distance = faceapi.euclideanDistance(
            idCardDetection.descriptor,
            capturedDetection.descriptor
        );
        
        // More lenient threshold for face match (0.65 allows more realistic variations)
        // 0.0 = same face, 1.0 = completely different
        const threshold = 0.65;
        const isMatch = distance < threshold;
        
        console.log('Face detection scores:', {
            idCard: idCardDetection.detection.score,
            captured: capturedDetection.detection.score
        });
        console.log('Face distance:', distance.toFixed(4), 'Threshold:', threshold, 'Match:', isMatch);
        
        // Additional check: If distance is very high, definitely not a match (raised to 0.85)
        if (distance > 0.85) {
            console.log('Face distance too high, definitely not a match');
            alert('Face verification failed. The faces do not appear to match. Please ensure:\n• You are the same person in both photos\n• Similar facial expression and angle\n• No significant changes in appearance');
            return false;
        }
        
        // Provide feedback for close matches - more lenient range
        if (distance >= threshold && distance <= 0.85) {
            alert('Face verification could not confirm a strong match. The faces appear similar but verification criteria were not fully met. Please try again with:\n• Better lighting\n• Similar facial expression\n• Face positioned at a similar angle');
        }
        
        return isMatch;
    } catch (error) {
        console.error('Face recognition error:', error);
        alert('An error occurred during face recognition. This could be due to:\n• Network connectivity issues\n• Browser compatibility\n• Large image sizes\n\nPlease try refreshing the page and attempting again.');
        return false;
    }
}

// Image preprocessing function
async function preprocessImage(img) {
    // Create a canvas for preprocessing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match image
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw the original image
    ctx.drawImage(img, 0, 0);
    
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply histogram equalization for better contrast
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        histogram[Math.floor(gray)]++;
    }
    
    // Calculate cumulative distribution
    const cdf = new Array(256);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + histogram[i];
    }
    
    // Normalize to 0-255 range
    const cdfMin = cdf.find(val => val > 0);
    const cdfMax = cdf[255];
    const lut = new Array(256);
    
    for (let i = 0; i < 256; i++) {
        if (cdf[i] >= cdfMin) {
            lut[i] = Math.round(((cdf[i] - cdfMin) / (cdfMax - cdfMin)) * 255);
        } else {
            lut[i] = 0;
        }
    }
    
    // Apply the lookup table
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const normalizedValue = lut[Math.floor(gray)];
        const ratio = normalizedValue / (gray || 1);
        
        data[i] = Math.min(255, data[i] * ratio);
        data[i + 1] = Math.min(255, data[i + 1] * ratio);
        data[i + 2] = Math.min(255, data[i + 2] * ratio);
    }
    
    // Put the processed image back
    ctx.putImageData(imageData, 0, 0);
    
    // Convert back to image element
    const processedImg = new Image();
    processedImg.src = canvas.toDataURL();
    
    return new Promise((resolve) => {
        processedImg.onload = () => resolve(processedImg);
    });
}

// Show success modal
function showSuccessModal() {
    successModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Auto-redirect after 3 seconds
    setTimeout(() => {
        redirectToTarget();
    }, 3000);
}

// Redirect to target destination
function redirectToTarget() {
    // Use the existing CORTEXA_URL constant
    const targetUrl = CORTEXA_URL;
    
    // Show a brief message before redirect
    const modalContent = document.querySelector('.modal-content');
    const redirectMessage = document.createElement('div');
    redirectMessage.className = 'redirect-message';
    redirectMessage.innerHTML = `
        <p style="margin-top: 20px; color: var(--text-secondary); font-size: 14px;">
            Redirecting you to Cortexa Interview...
        </p>
    `;
    modalContent.appendChild(redirectMessage);
    
    // Perform redirect
    setTimeout(() => {
        window.location.href = targetUrl;
    }, 1500);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
});

