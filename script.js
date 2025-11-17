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
        if (typeof faceapi !== 'undefined') {
            resolve();
            return;
        }
        
        // Wait for it to load (max 10 seconds)
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds (100 * 100ms)
        
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof faceapi !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                reject(new Error('face-api.js library failed to load within timeout'));
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
        
        // Try multiple CDN sources for better reliability
        const MODEL_URLS = [
            'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/',
            'https://unpkg.com/face-api.js@0.22.2/weights/',
            'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/'
        ];
        
        let modelUrl = MODEL_URLS[0];
        let loadError = null;
        
        // Try first CDN
        try {
            console.log('Trying to load models from:', modelUrl);
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
                faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
                faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
            ]);
            
            modelsLoaded = true;
            console.log('Face models loaded successfully from', modelUrl);
            
            // Hide loading indicator
            if (modelStatus) {
                modelStatus.classList.add('hidden');
            }
            
            if (statusMessage) {
                statusMessage.querySelector('p').textContent = 'Models loaded. Ready for verification.';
            }
            return;
        } catch (firstError) {
            console.warn('First CDN failed, trying alternative...', firstError);
            loadError = firstError;
            modelUrl = MODEL_URLS[1];
        }
        
        // Try alternative CDNs
        for (let i = 1; i < MODEL_URLS.length; i++) {
            try {
                modelUrl = MODEL_URLS[i];
                console.log(`Trying to load models from CDN ${i + 1}:`, modelUrl);
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
                    faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
                    faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
                ]);
                
                modelsLoaded = true;
                console.log(`Face models loaded successfully from CDN ${i + 1}`);
                
                // Hide loading indicator
                if (modelStatus) {
                    modelStatus.classList.add('hidden');
                }
                
                if (statusMessage) {
                    statusMessage.querySelector('p').textContent = 'Models loaded. Ready for verification.';
                }
                return;
            } catch (cdnError) {
                console.warn(`CDN ${i + 1} failed:`, cdnError);
                if (i === MODEL_URLS.length - 1) {
                    throw cdnError;
                }
            }
        }
        
    } catch (error) {
        console.error('Error loading face models:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        
        modelsLoaded = false;
        
        // Update loading indicator with error
        if (modelStatus) {
            modelStatus.innerHTML = '<span style="color: #e74c3c;">⚠️ Failed to load face recognition system</span>';
        }
        
        if (statusMessage) {
            statusMessage.querySelector('p').textContent = 'Error loading face recognition models. Please refresh the page.';
        }
        
        // More helpful error message
        const errorMsg = 'Unable to load face recognition system.\n\n' +
            'Possible causes:\n' +
            '• No internet connection\n' +
            '• Firewall blocking CDN access\n' +
            '• Browser security restrictions\n\n' +
            'Please check your connection and refresh the page.';
        
        alert(errorMsg);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Upload area click
    uploadArea.addEventListener('click', () => idCardInput.click());
    
    // File input change
    idCardInput.addEventListener('change', handleIdCardUpload);
    
    // Change ID card button
    changeIdCardBtn.addEventListener('click', () => {
        idCardInput.click();
    });
    
    // Proceed to verification
    proceedBtn.addEventListener('click', () => {
        if (idCardImageData) {
            switchToVerificationPage();
        }
    });
    
    // Back to upload
    backToUploadBtn.addEventListener('click', () => {
        stopCamera();
        switchToUploadPage();
    });
    
    // Capture photo
    capturePhotoBtn.addEventListener('click', capturePhoto);
    
    // Retake photo
    retakePhotoBtn.addEventListener('click', () => {
        capturedPhotoContainer.classList.add('hidden');
        capturePhotoBtn.style.display = 'block';
        capturedPhoto = null;
        startCamera();
    });
    
    // Verify face
    verifyFaceBtn.addEventListener('click', verifyFace);
    
    // Onboard button
    onboardButton.addEventListener('click', () => {
        window.location.href = CORTEXA_URL;
    });
    
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
    statusMessage.querySelector('p').textContent = 'Verifying your identity...';
    
    try {
        let match = false;
        
        // Only use Face-API.js for face recognition (no fallback)
        match = await performFaceRecognition();
        
        verificationLoader.classList.add('hidden');
        
        if (match) {
            statusMessage.querySelector('p').textContent = 'Verification successful!';
            showSuccessModal();
        } else {
            statusMessage.querySelector('p').textContent = 'Verification failed. Please try again.';
            alert('Face verification failed. The face in your photo does not match the ID card. Please ensure:\n\n• Good lighting\n• Face is clearly visible\n• Same person in both images\n• No obstructions (glasses, masks, etc.)');
            verifyFaceBtn.disabled = false;
            retakePhotoBtn.click();
        }
    } catch (error) {
        console.error('Verification error:', error);
        verificationLoader.classList.add('hidden');
        statusMessage.querySelector('p').textContent = 'Error during verification. Please try again.';
        alert('An error occurred during verification. Please try again.');
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
        
        // Use more accurate face detection options
        const detectionOptions = new faceapi.TinyFaceDetectorOptions({
            inputSize: 416, // Higher resolution for better accuracy
            scoreThreshold: 0.5 // Minimum confidence for face detection
        });
        
        // Detect faces with landmarks and descriptors
        const idCardDetection = await faceapi
            .detectSingleFace(idCardImg, detectionOptions)
            .withFaceLandmarks68()
            .withFaceDescriptor();
        
        const capturedDetection = await faceapi
            .detectSingleFace(capturedImg, detectionOptions)
            .withFaceLandmarks68()
            .withFaceDescriptor();
        
        // Validate that faces were detected
        if (!idCardDetection || !capturedDetection) {
            console.log('Could not detect faces in one or both images');
            alert('Could not detect a face in one or both images. Please ensure your face is clearly visible.');
            return false;
        }
        
        // Additional validation: Check face detection confidence
        // Require high confidence (0.75) for both face detections
        if (idCardDetection.detection.score < 0.75 || capturedDetection.detection.score < 0.75) {
            console.log('Low face detection confidence:', {
                idCard: idCardDetection.detection.score,
                captured: capturedDetection.detection.score
            });
            alert('Face detection confidence is low. Please ensure good lighting and clear face visibility.');
            return false;
        }
        
        // Validate face size (faces should be reasonably sized)
        const idCardBox = idCardDetection.detection.box;
        const capturedBox = capturedDetection.detection.box;
        
        const idCardFaceArea = idCardBox.width * idCardBox.height;
        const capturedFaceArea = capturedBox.width * capturedBox.height;
        const idCardImageArea = idCardImg.width * idCardImg.height;
        const capturedImageArea = capturedImg.width * capturedImg.height;
        
        // Face should be at least 5% of the image area
        if (idCardFaceArea < idCardImageArea * 0.05 || capturedFaceArea < capturedImageArea * 0.05) {
            console.log('Face too small in image');
            alert('Face is too small in the image. Please get closer to the camera or use a larger face image.');
            return false;
        }
        
        // Calculate distance between face descriptors
        const distance = faceapi.euclideanDistance(
            idCardDetection.descriptor,
            capturedDetection.descriptor
        );
        
        // Stricter threshold for face match (lower is more similar)
        // 0.35-0.4 is very strict - only very similar faces will match
        // 0.45 is strict but allows for slight variations (lighting, angle)
        const threshold = 0.4; // Very strict threshold for maximum accuracy
        
        const isMatch = distance < threshold;
        
        console.log('Face detection scores:', {
            idCard: idCardDetection.detection.score,
            captured: capturedDetection.detection.score
        });
        console.log('Face distance:', distance.toFixed(4), 'Threshold:', threshold, 'Match:', isMatch);
        
        // Additional check: If distance is very high, definitely not a match
        if (distance > 0.7) {
            console.log('Face distance too high, definitely not a match');
            return false;
        }
        
        return isMatch;
    } catch (error) {
        console.error('Face recognition error:', error);
        alert('Error during face recognition. Please try again.');
        return false;
    }
}

// Basic image comparison (fallback)
async function performBasicVerification() {
    // This fallback should NOT automatically pass verification
    // It should fail if face-api.js models are not loaded
    return new Promise((resolve) => {
        setTimeout(() => {
            // Always fail if models are not loaded - we need proper face recognition
            console.warn('Face recognition models not loaded. Verification cannot proceed.');
            alert('Face recognition system is not available. Please refresh the page and try again.');
            resolve(false);
        }, 1000);
    });
}

// Show success modal
function showSuccessModal() {
    successModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
});

