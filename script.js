import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 1. FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAi4DBUIOtMmNOkjsQSXW_EdT7yU36DKJA",
  authDomain: "ladies-special-express-26.firebaseapp.com",
  projectId: "ladies-special-express-26",
  storageBucket: "ladies-special-express-26.firebasestorage.app",
  messagingSenderId: "208345432745",
  appId: "1:208345432745:web:fbe7204c6f84ff2eb4dfb8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const carriagesCol = collection(db, "mens_day_carriages");

let globalTrainData = [];

// HELPER: AUTOMATIC IMAGE RESIZER & COMPRESSOR
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Scale down while maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width = Math.round((width * maxWidth) / height);
                        height = maxWidth;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to compressed Base64 JPEG string
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// 2. FORM LOGIC (Saves to Cloud with Auto Resizing)
document.getElementById('submitBtn').onclick = async function() {
    const fileInput = document.getElementById('photoInput');
    const senderInput = document.getElementById('senderName');
    const receiverInput = document.getElementById('receiverName');
    const msgInput = document.getElementById('msg');

    if(!fileInput.files[0] || !senderInput.value || !receiverInput.value) {
        return alert("Please fill the names and pick a photo! 🚂");
    }

    try {
        // Automatically resize and compress photo before uploading
        const compressedBase64Photo = await compressImage(fileInput.files[0]);

        await addDoc(carriagesCol, {
            from: senderInput.value,
            to: receiverInput.value,
            message: msgInput.value || "Wishing you a wonderful Men's Day! 👔",
            photo: compressedBase64Photo,
            timestamp: serverTimestamp() 
        });

        // Visual feedback
        const counter = document.getElementById('coach-count');
        if (counter) {
            counter.classList.add('count-bump');
            setTimeout(() => counter.classList.remove('count-bump'), 300);
        }

        // Reset form
        senderInput.value = ''; receiverInput.value = ''; msgInput.value = ''; fileInput.value = ''; 
        alert("Carriage joined the Global Express! 🌍");
    } catch (e) {
        console.error("Firestore write error:", e);
        alert("Error uploading carriage: " + (e.message || e));
    }
};

// 3. RENDER FUNCTION
function renderTrain(data) {
    globalTrainData = data;
    const container = document.getElementById('carriage-container');
    if (!container) return;
    
    const trainHTML = `
        <div class="train-unit">
            <div class="engine-box">
                <div class="banner">MEN'S EXPRESS 👔</div>
                <div class="steam-box">
                    <div class="steam s1">💨</div><div class="steam s2">💨</div>
                    <div class="steam s3">💨</div><div class="steam s4">💨</div>
                </div>
                <div class="engine-emoji">🚂</div>
            </div>
            ${data.map((item, index) => `
                <div class="carriage-box">
                    <div class="tag-container">
                        <div class="to-tag">To: ${item.to}</div>
                        <div class="from-tag">By: ${item.from}</div>
                    </div>
                    <img src="${item.photo}" class="carriage-photo" onclick="openMsg(${index})">
                    <div class="carriage-emoji">🚃</div>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = `<div class="train-group">${trainHTML}${trainHTML}</div>`;
}

// 4. POPUP & SPEED
window.openMsg = function(index) {
    const item = globalTrainData[index];
    let overlay = document.getElementById('msgOverlay');
    if(!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'msgOverlay';
        overlay.className = 'message-overlay';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div class="message-box">
            <h2 style="color: var(--accent);">👔 For ${item.to} 👔</h2>
            <p>"${item.message}"</p>
            <p><strong>— From ${item.from}</strong></p>
            <button class="close-btn" onclick="closeMsg()">Close 🚂</button>
        </div>
    `;
    overlay.style.display = 'flex';
    const trainGroup = document.querySelector('.train-group');
    if (trainGroup) trainGroup.style.animationPlayState = 'paused';
};

window.closeMsg = function() {
    const overlay = document.getElementById('msgOverlay');
    if (overlay) overlay.style.display = 'none';
    const trainGroup = document.querySelector('.train-group');
    if (trainGroup) trainGroup.style.animationPlayState = 'running';
};

function updateTrainSpeed(count) {
    const train = document.querySelector('.train-group');
    if(!train) return;
    let newSpeed = 10 + (count * 2); 
    train.style.animationDuration = newSpeed + "s";
}

// 5. THE GLOBAL LISTENER
const q = query(carriagesCol, orderBy("timestamp", "asc"));

onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const countElement = document.getElementById('coach-count');
    if (countElement) {
        countElement.innerText = data.length; 
        countElement.classList.add('count-bump');
        setTimeout(() => countElement.classList.remove('count-bump'), 300);
    }

    renderTrain(data);
    updateTrainSpeed(data.length);
    
}, (error) => {
    console.error("Firebase error:", error);
});
