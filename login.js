// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyCQ8D9E6x7SCL88RFTpHH8d9ypBjGHElH8",
    authDomain: "calenda-memo-6f551.firebaseapp.com",
    projectId: "calenda-memo-6f551",
    storageBucket: "calenda-memo-6f551.appspot.com",
    messagingSenderId: "835292337080",
    appId: "1:835292337080:web:8df929eb7d50dc434ef54d",
    databaseURL: "https://calenda-memo-6f551-default-rtdb.firebaseio.com/"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// 이메일을 안전한 키로 변환하는 함수
function emailToKey(email) {
    return email.replace(/[.#$\[\]]/g, '_');
}

// 메시지 박스 표시 함수
function showMessage(message) {
    // 오버레이 생성
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    // 메시지 박스 생성
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box';
    messageBox.innerHTML = `
        <p>${message}</p>
        <button onclick="closeMessageBox(this)">확인</button>
    `;
    document.body.appendChild(messageBox);

    // 메시지 박스 클릭 시 이벤트 전파 중단
    messageBox.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// 메시지 박스 닫기 함수
function closeMessageBox(button) {
    const messageBox = button.parentElement;
    const overlay = messageBox.previousElementSibling;
    messageBox.remove();
    overlay.remove();
}

// 커스텀 알림창 함수
function showAlert(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'alert-overlay';
        
        const alertBox = document.createElement('div');
        alertBox.className = 'alert-box';
        
        const messageElement = document.createElement('div');
        messageElement.className = 'alert-message';
        messageElement.textContent = message;
        
        const button = document.createElement('button');
        button.className = 'alert-button';
        button.textContent = '확인';
        button.onclick = () => {
            overlay.remove();
            resolve();
        };
        
        alertBox.appendChild(messageElement);
        alertBox.appendChild(button);
        overlay.appendChild(alertBox);
        document.body.appendChild(overlay);
    });
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Realtime Database에서 사용자 데이터 가져오기
        const snapshot = await database.ref('users/' + user.uid).once('value');
        const userData = snapshot.val();
        
        // 로컬 스토리지에 사용자 정보 저장 (백업용)
        localStorage.setItem('currentUser', user.uid);
        localStorage.setItem('userData', JSON.stringify(userData));
        
        await showAlert('로그인되었습니다.');
        window.location.href = 'calendar.html';
    } catch (error) {
        console.error('로그인 오류:', error);
        let errorMessage = '로그인 중 오류가 발생했습니다.';
        
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
                break;
            case 'auth/invalid-email':
                errorMessage = '유효하지 않은 이메일 형식입니다.';
                break;
        }
        await showAlert(errorMessage);
    }
}); 