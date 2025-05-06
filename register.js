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

document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const birthdate = document.getElementById('birthdate').value;
    
    // 생년월일 형식 검증 (YYMMDD)
    const birthdateRegex = /^([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$/;
    if (!birthdateRegex.test(birthdate)) {
        await showAlert('생년월일을 YYMMDD 형식으로 입력해주세요.');
        return;
    }
    
    if (password !== confirmPassword) {
        await showAlert('비밀번호가 일치하지 않습니다.');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // 사용자 프로필에 생년월일 추가
        await user.updateProfile({
            displayName: email.split('@')[0],
            photoURL: null
        });

        // 추가 사용자 정보를 Realtime Database에 저장
        const userData = {
            name: email.split('@')[0],
            email: email,
            birthdate: birthdate,
            createdAt: new Date().toISOString(),
            events: {
                dates: {},
                regular: [],
                previews: {}
            }
        };
        
        await database.ref('users/' + user.uid).set(userData);

        await showAlert('회원가입이 완료되었습니다.');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } catch (error) {
        console.error('회원가입 오류:', error);
        let errorMessage = '회원가입 중 오류가 발생했습니다.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = '이미 사용 중인 이메일입니다.';
                break;
            case 'auth/invalid-email':
                errorMessage = '유효하지 않은 이메일 형식입니다.';
                break;
            case 'auth/weak-password':
                errorMessage = '비밀번호가 너무 약합니다.';
                break;
        }
        await showAlert(errorMessage);
    }
}); 