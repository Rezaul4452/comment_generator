// Cache configuration
const cache = new Map();
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Initialize Firebase with error handling and offline persistence
let db = null;
const firebaseConfig = {
    apiKey: "AIzaSyCYfcO-BhXJRL6a-K_C1tAOVJTTTnAud1E",
    authDomain: "movementregister.firebaseapp.com",
    projectId: "movementregister",
    storageBucket: "movementregister.appspot.com",
    messagingSenderId: "342109687892",
    appId: "1:342109687892:web:8c528213a737e6a0ca5dc1"
};

// Initialize Firebase when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        
        // Enable offline persistence
        await db.enablePersistence()
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                } else if (err.code == 'unimplemented') {
                    console.warn('The current browser\'s doesn\'t support offline persistence');
                }
            });

        // Load saved comments after Firebase is initialized
        await loadSavedComments();
        // Ensure correct initial visibility
        savedCommentsSection.style.display = 'none';
        viewReferenceBtn.style.display = 'block';
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        db = null; // Ensure db is set to null if initialization fails
    }
});

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyB9VsHhooGb_cptyyWC9PJO0-1xf1V6YYk';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// DOM Elements
const employeeCommentInput = document.getElementById('employeeComment');
const referenceCommentInput = document.getElementById('referenceComment');
const generateBtn = document.getElementById('generateBtn');
const generatedComment1 = document.getElementById('generatedComment1');
const generatedComment2 = document.getElementById('generatedComment2');
const generatedComment3 = document.getElementById('generatedComment3');
const copyBtn1 = document.getElementById('copyBtn1');
const copyBtn2 = document.getElementById('copyBtn2');
const copyBtn3 = document.getElementById('copyBtn3');
const saveCommentBtn = document.getElementById('saveCommentBtn');
const savedCommentsDiv = document.getElementById('savedComments');
const viewReferenceBtn = document.getElementById('viewReferenceBtn');
const hideReferenceBtn = document.getElementById('hideReferenceBtn');
const savedCommentsSection = document.querySelector('.saved-comments-section');

// Calculate similarity score between two texts
function calculateSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
}

// Fetch similar historical comments from Firebase with enhanced analysis
async function getSimilarComments(employeeComment) {
    try {
        const commentsSnapshot = await db.collection('comments')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        const historicalComments = [];
        commentsSnapshot.forEach(doc => {
            const comment = doc.data();
            // Enhanced similarity calculation considering word patterns
            const similarity = calculateSimilarity(employeeComment, comment.employeeComment);
            if (similarity > 0.3) { // Only consider comments with meaningful similarity
                historicalComments.push({ ...comment, similarity });
            }
        });

        // Sort by similarity and get top 5 most relevant comments
        return historicalComments
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5);
    } catch (error) {
        console.error('Error fetching similar comments:', error);
        return [];
    }
}

// Generate settlement comment using Gemini API with enhanced context
async function generateSettlementComment(employeeComment) {
    // Show loading state
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    generatedComment1.textContent = 'Loading...';
    generatedComment2.textContent = 'Loading...';
    generatedComment3.textContent = 'Loading...';
    try {
        // Check cache first
        const cacheKey = employeeComment.trim();
        const cachedResult = cache.get(cacheKey);
        if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_EXPIRY) {
            return cachedResult.response;
        }
        const similarComments = await getSimilarComments(employeeComment);
        let contextPrompt = 'Generate 2-3 professional Bengali language settlement comments for this case. Each comment should be separated by "###". Do not include any labels or prefixes like "কমেন্ট ১:" in the comments. Consider these similar previous cases and maintain consistency with their response patterns:\n\n';
        
        if (similarComments.length > 0) {
            similarComments.forEach(comment => {
                if (comment.settlementComment) {
                    contextPrompt += `Previous Case:\nEmployee Comment: ${comment.employeeComment}\nSettlement Response: ${comment.settlementComment}\n\n`;
                }
            });
        }
        
        contextPrompt += `Current Case:\n${employeeComment}\n\nGenerate settlement comments that follow similar patterns to previous responses while being specific to this case.`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: contextPrompt
                    }]
                }],
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            throw new Error('Invalid API response structure');
        }

        const generatedText = data.candidates[0].content.parts[0].text || 'No comment generated. Please try again.';
        const comments = generatedText.split('###').map(comment => comment.trim()).filter(comment => comment);
        return comments.slice(0, 3).join('\n\n###\n\n');
    } catch (error) {
        console.error('Error generating comment:', error);
        if (error.message.includes('HTTP error!')) {
            return 'API request failed. Please check your internet connection and try again.';
        } else if (error.message.includes('Invalid API response')) {
            return 'Unexpected API response. Please try again later.';
        } else {
            return 'Error generating comment. Please try again later.';
        }
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Settlement Comment';
    }
}

// Save comment pair to Firebase
async function saveCommentToFirebase(employeeComment, settlementComment) {
    try {
        await db.collection('comments').add({
            employeeComment,
            settlementComment,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error saving to Firebase:', error);
    }
}

// Load and display saved comments
async function loadSavedComments() {
    try {
        const commentsSnapshot = await db.collection('comments')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        savedCommentsDiv.innerHTML = '';
        commentsSnapshot.forEach(doc => {
            const comment = doc.data();
            const commentElement = document.createElement('div');
            commentElement.className = 'saved-comment-item';
            commentElement.innerHTML = `
                <strong>Employee Comment:</strong>
                <p>${comment.employeeComment}</p>
                ${comment.settlementComment ? `
                    <strong>Settlement Comment:</strong>
                    <p>${comment.settlementComment}</p>
                ` : ''}
            `;
            savedCommentsDiv.appendChild(commentElement);
        });
    } catch (error) {
        console.error('Error loading saved comments:', error);
    }
}

// Event Listeners
generateBtn.addEventListener('click', async () => {
    const employeeComment = employeeCommentInput.value.trim();
    if (!employeeComment) {
        alert('Please enter an employee comment.');
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    const settlementComment = await generateSettlementComment(employeeComment);
    const comments = settlementComment.split('###').map(comment => comment.trim()).filter(comment => comment);
    
    // Clear previous comments
    generatedComment1.textContent = '';
    generatedComment2.textContent = '';
    generatedComment3.textContent = '';

    // Display new comments
    if (comments[0]) generatedComment1.textContent = comments[0];
    if (comments[1]) generatedComment2.textContent = comments[1];
    if (comments[2]) generatedComment3.textContent = comments[2];
    
    // Only save the employee comment for future reference
    await saveCommentToFirebase(employeeComment, '');
    await loadSavedComments();

    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Settlement Comment';
});

// Copy button event listeners
copyBtn1.addEventListener('click', () => {
    const commentText = generatedComment1.textContent;
    if (commentText) {
        navigator.clipboard.writeText(commentText);
        alert('Comment 1 copied to clipboard!');
    }
});

copyBtn2.addEventListener('click', () => {
    const commentText = generatedComment2.textContent;
    if (commentText) {
        navigator.clipboard.writeText(commentText);
        alert('Comment 2 copied to clipboard!');
    }
});

copyBtn3.addEventListener('click', () => {
    const commentText = generatedComment3.textContent;
    if (commentText) {
        navigator.clipboard.writeText(commentText);
        alert('Comment 3 copied to clipboard!');
    }
});

saveCommentBtn.addEventListener('click', async () => {
    const referenceComment = referenceCommentInput.value.trim();

    if (!referenceComment) {
        alert('Please enter a reference comment to save.');
        return;
    }

    try {
        await saveCommentToFirebase(referenceComment, '');
        await loadSavedComments();
        referenceCommentInput.value = '';
        alert('Comment saved successfully!');
    } catch (error) {
        console.error('Error saving comment:', error);
        alert('Failed to save comment. Please try again.');
    }
});

// Toggle reference comments visibility
viewReferenceBtn.addEventListener('click', () => {
    savedCommentsSection.style.display = 'block';
    viewReferenceBtn.style.display = 'none';
});

hideReferenceBtn.addEventListener('click', () => {
    savedCommentsSection.style.display = 'none';
    viewReferenceBtn.style.display = 'block';
});

// Load saved comments when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadSavedComments();
    // Ensure correct initial visibility
    savedCommentsSection.style.display = 'none';
    viewReferenceBtn.style.display = 'block';
});