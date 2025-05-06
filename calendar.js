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

// Firebase 초기화 (호환성 모드)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
console.log("Firebase 호환성 모드로 초기화 완료");

let currentDate = new Date();
let selectedDate = null;
let dateMemosStorage = {
    dates: {},
    regular: [],
    previews: {}
};
let isLoading = true; // 데이터 로딩 중 상태
let currentUser = null; // 현재 로그인한 사용자

// 로그인 상태 확인
function checkLogin() {
    currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    loadUserData();
}

// 사용자 데이터 로드
function loadUserData() {
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[currentUser]) {
        dateMemosStorage = users[currentUser].events || {
            dates: {},
            regular: [],
            previews: {}
        };
        initCalendar();
        loadMemos();
    }
}

// 사용자 데이터 저장
function saveUserData() {
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[currentUser]) {
        users[currentUser].events = dateMemosStorage;
        localStorage.setItem('users', JSON.stringify(users));
    }
}

// 로그아웃
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// 전역 키워드 설정 (기본값)
let keywords = [
    { word: "이사", class: "orange-bg" },
    { word: "전출", class: "orange-bg" },
    { word: "전입", class: "orange-bg" },
    { word: "리모", class: "orange-bg" },
    { word: "헬스", class: "green-bg" },
    { word: "골프", class: "green-bg" },
    { word: "탁구", class: "green-bg" },
    { word: "커뮤", class: "green-bg" },
    { word: "공지", class: "purple-bg" },
    { word: "공고", class: "purple-bg" },
    { word: "공문", class: "purple-bg" },
    { word: "회의", class: "purple-bg" },
    { word: "누수", class: "navy-bg" },
    { word: "스위치", class: "navy-bg" },
    { word: "점검", class: "navy-bg" },
    { word: "청소", class: "navy-bg" },
    { word: "콘센트", class: "navy-bg" },
    { word: "전등", class: "navy-bg" },
    { word: "에어컨", class: "navy-bg" },
    { word: "보일러", class: "navy-bg" },
    { word: "누전", class: "navy-bg" },
    { word: "화장실", class: "navy-bg" },
    { word: "거실", class: "navy-bg" },
    { word: "방", class: "navy-bg" },
    { word: "주방", class: "navy-bg" },
    { word: "베란다", class: "navy-bg" },
    { word: "실외기", class: "navy-bg" },
    { word: "세탁", class: "navy-bg" },
    { word: "소장", class: "red-bg" },
    // 사용자가 요청한 기본 단어 추가
    { word: "음식", class: "yellow-bg" },
    { word: "데크", class: "blue-bg" },
    { word: "긴급", class: "red-bg" },
    { word: "팀장", class: "red-bg" }
];

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function initCalendar() {
    const calendar = document.getElementById('calendar');
    const currentMonthElement = document.getElementById('currentMonth');
    calendar.innerHTML = '';

    currentMonthElement.textContent = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    days.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day day-header';
        dayElement.textContent = day;
        calendar.appendChild(dayElement);
    });

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    for (let i = 0; i < firstDayOfMonth.getDay(); i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day empty-day';
        calendar.appendChild(dayElement);
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.dataset.day = i;

        const dateNumber = document.createElement('div');
        dateNumber.className = 'date-number';
        dateNumber.textContent = i;
        dayElement.appendChild(dateNumber);

        const loopDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);

        const today = new Date();
        if (loopDate.getFullYear() === today.getFullYear() &&
            loopDate.getMonth() === today.getMonth() &&
            loopDate.getDate() === today.getDate()) {
            dayElement.classList.add('today');
        }

        if (selectedDate &&
            loopDate.getFullYear() === selectedDate.getFullYear() &&
            loopDate.getMonth() === selectedDate.getMonth() &&
            loopDate.getDate() === selectedDate.getDate()) {
            dayElement.classList.add('selected');
        }

        dayElement.onclick = () => selectDate(i);
        dayElement.ondblclick = () => showEditCalendarDialog(i);
        calendar.appendChild(dayElement);

        const dateKey = getDateKey(loopDate);
        if (dateMemosStorage.previews[dateKey] && dateMemosStorage.previews[dateKey].length > 0) {
            const memoPreview = document.createElement('div');
            memoPreview.className = 'memo-preview';
            memoPreview.dataset.dateKey = dateKey;

            // 미리보기 내용 생성 및 키워드 강조 처리
            let previewHTML = '';
            dateMemosStorage.previews[dateKey].forEach((memoText, index) => {
                const firstLine = memoText.split('\n')[0];
                const highlightedText = highlightKeywords(firstLine);
                previewHTML += highlightedText;
                if (index < dateMemosStorage.previews[dateKey].length - 1) {
                    previewHTML += '<br>';
                }
            });
            
            // HTML로 설정하여 스타일이 적용된 키워드 표시
            memoPreview.innerHTML = previewHTML;

            memoPreview.onclick = (event) => {
                event.stopPropagation();
                selectDate(i);
            };
            memoPreview.ondblclick = (event) => {
                event.stopPropagation();
                editCalendarPreview(event.target);
            };
            dayElement.appendChild(memoPreview);

            const editTextArea = document.createElement('textarea');
            editTextArea.className = 'calendar-edit-textarea';
            editTextArea.dataset.dateKey = dateKey;
            editTextArea.onblur = (event) => saveCalendarPreviewEdit(event.target);
            editTextArea.oninput = (event) => adjustTextareaHeightForCalendar(event.target);
            dayElement.appendChild(editTextArea);
        }
    }

    const totalCells = firstDayOfMonth.getDay() + lastDayOfMonth.getDate();
    const remainingDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remainingDays; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day empty-day';
        calendar.appendChild(dayElement);
    }
}

function selectDate(day) {
    const editingTextarea = document.querySelector('.calendar-edit-textarea:not([style*="display: none"])');
    if (editingTextarea) {
        editingTextarea.blur();
    }

    const previouslySelectedElement = document.querySelector('.calendar-day.selected');
    if (previouslySelectedElement) {
        previouslySelectedElement.classList.remove('selected');
    }

    selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

    const currentDayElement = document.querySelector(`.calendar-day[data-day="${day}"]`);
    if (currentDayElement) {
        currentDayElement.classList.add('selected');
    } else {
        console.error(`selectDate: 요소를 찾을 수 없음 - data-day ${day}`);
    }

    document.getElementById('selectedDateDisplay').textContent =
        `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;
    document.getElementById('memoSection').classList.add('active');
    updateMemoSectionUI();
    loadMemos();
}

function loadMemos() {
    const importantMemosContainer = document.getElementById('importantMemos');
    const regularMemosContainer = document.getElementById('regularMemos');

    importantMemosContainer.innerHTML = '';
    if (selectedDate) {
        const dateKey = getDateKey(selectedDate);
        if (dateMemosStorage.dates[dateKey] && dateMemosStorage.dates[dateKey].important && dateMemosStorage.dates[dateKey].important.length > 0) {
            dateMemosStorage.dates[dateKey].important.forEach(memo => {
                createMemoElement('important', memo);
            });
        } else {
            importantMemosContainer.innerHTML = '<div class="no-date-message">선택한 날짜에 중요 일정가 없습니다.</div>';
        }
    } else {
        importantMemosContainer.innerHTML = '<div class="no-date-message">날짜를 선택하면 중요 일정가 표시됩니다.</div>';
    }

    regularMemosContainer.innerHTML = '';
    if (Array.isArray(dateMemosStorage.regular) && dateMemosStorage.regular.length > 0) {
        dateMemosStorage.regular.forEach(memo => {
            createMemoElement('regular', memo);
        });
    } else {
        regularMemosContainer.innerHTML = '<div class="no-date-message">일반 일정가 없습니다.</div>';
    }
}

function addMemo(type) {
    const input = document.getElementById(`${type}MemoInput`);
    const inputValue = input.value.trim();
    if (inputValue === '') return;

    let containerId = `${type}Memos`;
    let storageRef;
    let dateKey;

    if (type === 'important') {
        if (!selectedDate) {
            alert('중요 일정를 위해 날짜를 선택해주세요');
            return;
        }
        dateKey = getDateKey(selectedDate);
        if (!dateMemosStorage.dates[dateKey]) {
            dateMemosStorage.dates[dateKey] = { important: [] };
        }
        storageRef = dateMemosStorage.dates[dateKey].important;
    } else {
        if (!Array.isArray(dateMemosStorage.regular)) {
            dateMemosStorage.regular = [];
        }
        storageRef = dateMemosStorage.regular;
    }

    storageRef.push(inputValue);

    const container = document.getElementById(containerId);
    const noMemoMsg = container.querySelector('.no-date-message');
    if (noMemoMsg) noMemoMsg.remove();

    createMemoElement(type, inputValue);
    input.value = '';
    
    // 사용자 데이터 저장
    saveUserData();
    
    // 상시일정인 경우 모든 사용자에게 공유
    if (type === 'regular') {
        const users = JSON.parse(localStorage.getItem('users')) || {};
        Object.keys(users).forEach(username => {
            if (username !== currentUser) {
                if (!users[username].events.regular) {
                    users[username].events.regular = [];
                }
                users[username].events.regular.push(inputValue);
            }
        });
        localStorage.setItem('users', JSON.stringify(users));
    }
}

function createMemoElement(type, text) {
    const memosContainer = document.getElementById(`${type}Memos`);
    const memoItem = document.createElement('div');
    memoItem.className = 'memo-item';

    const memoContent = document.createElement('textarea');
    memoContent.className = 'memo-content';

    const isCompleted = text.startsWith('.');
    memoContent.value = isCompleted ? text.replace(/^\.\s*/, '') : text;

    let currentTextData = text;

    // 키워드 배경색 적용
    keywords.forEach(keyword => {
        if (text.includes(keyword.word)) {
            memoContent.classList.add(keyword.class);
        }
    });

    setTimeout(() => adjustTextareaHeight(memoContent), 0);

    memoContent.addEventListener('input', function() {
        adjustTextareaHeight(this);
    });

    memoContent.addEventListener('focus', () => adjustTextareaHeight(memoContent));
    memoContent.addEventListener('blur', () => {
        const currentUiValue = memoContent.value;
        let textToSave = isCompleted ? '. ' + currentUiValue : currentUiValue;

        if (currentTextData !== textToSave) {
            updateMemoContent(type, currentTextData, textToSave);
            currentTextData = textToSave;

            memoContent.classList.remove(...keywords.map(k => k.class));
            keywords.forEach(keyword => {
                if (textToSave.includes(keyword.word)) {
                    memoContent.classList.add(keyword.class);
                }
            });
        }
    });

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'memo-buttons';

    const completeButton = document.createElement('button');
    completeButton.className = 'complete-btn';
    completeButton.title = '완료';
    completeButton.innerHTML = '✅';
    completeButton.onclick = () => {
        const currentUiValue = memoContent.value;
        const originalTextData = currentTextData;
        let isNowCompleted = originalTextData.startsWith('.');

        let newTextDataValue;
        let newUiValue;

        if (!isNowCompleted) {
            newTextDataValue = '. ' + currentUiValue;
            newUiValue = currentUiValue;
            memoContent.classList.add('completed');
            memoContent.style.fontSize = '12px';  // 완료 시 글씨 크기 줄임
        } else {
            newTextDataValue = currentUiValue;
            newUiValue = newTextDataValue;
            memoContent.classList.remove('completed');
            memoContent.style.fontSize = '14px';  // 완료 해제 시 원래 크기로
        }

        memoContent.value = newUiValue;
        updateMemoContent(type, originalTextData, newTextDataValue);
        currentTextData = newTextDataValue;
        adjustTextareaHeight(memoContent);

        memoContent.classList.remove(...keywords.map(k => k.class));
        keywords.forEach(keyword => {
            if (newTextDataValue.includes(keyword.word)) {
                memoContent.classList.add(keyword.class);
            }
        });
    };

    const importantButton = document.createElement('button');
    importantButton.className = 'important-btn';
    importantButton.title = '달력에 표시/제거';
    importantButton.innerHTML = '💓';
    importantButton.onclick = () => {
        const currentUiValue = memoContent.value;
        const firstLine = currentUiValue.split('\n')[0];
        const isCompleted = currentTextData.startsWith('. ');
        const textForPreview = isCompleted ? '. ' + firstLine : firstLine;
        toggleMemoInCalendarPreview(textForPreview);
    };

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-btn';
    deleteButton.title = '삭제';
    deleteButton.innerHTML = '✂';
    deleteButton.onclick = () => {
        const memoTextToDelete = currentTextData;
        deleteMemoContent(type, memoTextToDelete);
        memoItem.remove();
        loadMemos();
    };

    buttonContainer.appendChild(completeButton);
    if (type === 'important') {
        buttonContainer.appendChild(importantButton);
    }
    buttonContainer.appendChild(deleteButton);

    memoItem.appendChild(memoContent);
    memoItem.appendChild(buttonContainer);
    memosContainer.appendChild(memoItem);

    if (isCompleted) {
        memoContent.classList.add('completed');
        setTimeout(() => adjustTextareaHeight(memoContent), 0);
    }
}

function updateMemoContent(type, oldText, newText) {
    let updated = false;
    let dateKey;

    if (type === 'important') {
        if (!selectedDate) return;
        dateKey = getDateKey(selectedDate);
        if (dateMemosStorage.dates[dateKey] && dateMemosStorage.dates[dateKey].important) {
            const index = dateMemosStorage.dates[dateKey].important.indexOf(oldText);
            if (index > -1) {
                dateMemosStorage.dates[dateKey].important[index] = newText;
                updated = true;
                if (dateMemosStorage.previews[dateKey]) {
                    const previewIndex = dateMemosStorage.previews[dateKey].indexOf(oldText);
                    if (previewIndex > -1) {
                        dateMemosStorage.previews[dateKey][previewIndex] = newText;
                    }
                }
            }
        }
    } else if (type === 'regular') {
        if (dateMemosStorage.regular) {
            const index = dateMemosStorage.regular.indexOf(oldText);
            if (index > -1) {
                dateMemosStorage.regular[index] = newText;
                updated = true;
            }
        }
    }

    if (updated) {
        autoSave();
    }
}

function deleteMemoContent(type, text) {
    if (type === 'important') {
        const dateKey = getDateKey(selectedDate);
        if (dateMemosStorage.dates[dateKey] && dateMemosStorage.dates[dateKey].important) {
            dateMemosStorage.dates[dateKey].important = dateMemosStorage.dates[dateKey].important.filter(memo => memo !== text);
        }
    } else {
        dateMemosStorage.regular = dateMemosStorage.regular.filter(memo => memo !== text);
        
        // 상시일정 삭제 시 모든 사용자에게 반영
        const users = JSON.parse(localStorage.getItem('users')) || {};
        Object.keys(users).forEach(username => {
            if (users[username].events.regular) {
                users[username].events.regular = users[username].events.regular.filter(memo => memo !== text);
            }
        });
        localStorage.setItem('users', JSON.stringify(users));
            }
    
    // 사용자 데이터 저장
    saveUserData();
    
        loadMemos();
}

function adjustTextareaHeight(textarea) {
    if (!textarea) return;

    if (textarea.classList.contains('calendar-edit-textarea')) {
        adjustTextareaHeightForCalendar(textarea);
        return;
    }

    const isMemoContent = textarea.classList.contains('memo-content');
    const lineHeight = 19;
    const minLines = 1;
    const maxLines = 5;
    const minHeight = lineHeight * minLines;
    const maxHeight = lineHeight * maxLines;

    textarea.style.height = 'auto';
    const text = textarea.value || textarea.placeholder;
    const lines = text.split('\n').length;
    let calculatedHeight = lines * lineHeight;

    if (calculatedHeight < minHeight) {
        calculatedHeight = minHeight;
    } else if (calculatedHeight > maxHeight) {
        calculatedHeight = maxHeight;
        textarea.style.overflowY = 'auto';
    } else {
        textarea.style.overflowY = 'hidden';
    }

    textarea.style.height = calculatedHeight + 'px';
}

function initTextareaHandlers() {
    ['important', 'regular'].forEach(type => {
        const textarea = document.getElementById(`${type}MemoInput`);
        if (textarea) {
            adjustTextareaHeight(textarea);
            textarea.addEventListener('input', () => adjustTextareaHeight(textarea));
            textarea.addEventListener('paste', () => setTimeout(() => adjustTextareaHeight(textarea), 0));
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    addMemo(type);
                }
            });
        }
    });
}

function editCalendarPreview(previewElement) {
    const dayElement = previewElement.parentElement;
    const editTextArea = dayElement.querySelector('.calendar-edit-textarea');
    const dateKey = previewElement.dataset.dateKey;

    if (!editTextArea || !dateKey || !dateMemosStorage.previews[dateKey]) return;

    const otherEditing = document.querySelector('.calendar-edit-textarea:not([style*="display: none"])');
    if (otherEditing && otherEditing !== editTextArea) {
        const otherDayElement = otherEditing.closest('.calendar-day');
        if (otherDayElement) otherDayElement.classList.remove('editing');
        otherEditing.blur();
    }

    // 편집 모드 스타일 적용
    dayElement.classList.add('editing');
    
    previewElement.style.display = 'none';
    editTextArea.style.display = 'block';
    editTextArea.value = dateMemosStorage.previews[dateKey].join('\n');

    adjustTextareaHeightForCalendar(editTextArea);
    editTextArea.focus();
    editTextArea.selectionStart = editTextArea.selectionEnd = editTextArea.value.length;
}

function saveCalendarPreviewEdit(textAreaElement) {
    const dateKey = textAreaElement.dataset.dateKey;
    const dayElement = textAreaElement.parentElement;
    const previewElement = dayElement.querySelector('.memo-preview');

    // 편집 모드 스타일 제거
    dayElement.classList.remove('editing');
    
    if (!dateKey || !previewElement) {
        if (textAreaElement) textAreaElement.style.display = 'none';
        return;
    }

    const newValue = textAreaElement.value.trim();
    const newMemoLines = newValue.split('\n').filter(line => line.trim() !== '');

    let changed = false;
    if (newMemoLines.length > 0) {
        if (!dateMemosStorage.previews[dateKey] || dateMemosStorage.previews[dateKey].join('\n') !== newMemoLines.join('\n')) {
            dateMemosStorage.previews[dateKey] = newMemoLines;
            changed = true;
        }
    } else {
        if (dateMemosStorage.previews[dateKey]) {
            delete dateMemosStorage.previews[dateKey];
            changed = true;
        }
    }

    if (changed) {
        autoSave();
    }

    textAreaElement.style.display = 'none';
    if (dateMemosStorage.previews[dateKey]) {
        const firstLines = dateMemosStorage.previews[dateKey].map(memoText => memoText.split('\n')[0]);
        previewElement.textContent = firstLines.join('\n');
        previewElement.style.display = 'block';
    } else {
        previewElement.textContent = '';
        previewElement.style.display = 'none';
    }
}

function adjustTextareaHeightForCalendar(textarea) {
    if (!textarea) return;
    const minHeight = 80;
    const maxHeight = 200;

    textarea.style.height = 'auto';
    let scrollHeight = textarea.scrollHeight;

    if (scrollHeight > maxHeight) {
        textarea.style.height = maxHeight + 'px';
        textarea.style.overflowY = 'auto';
    } else {
        textarea.style.height = Math.max(minHeight, scrollHeight) + 'px';
        textarea.style.overflowY = 'hidden';
    }
}

function toggleMemoInCalendarPreview(memoText) {
    if (!selectedDate) return;
    const dateKey = getDateKey(selectedDate);

    if (!dateMemosStorage.previews[dateKey]) {
        dateMemosStorage.previews[dateKey] = [];
    }

    const index = dateMemosStorage.previews[dateKey].indexOf(memoText);

    if (index === -1) {
        dateMemosStorage.previews[dateKey].push(memoText);
    } else {
        dateMemosStorage.previews[dateKey].splice(index, 1);
        if (dateMemosStorage.previews[dateKey].length === 0) {
            delete dateMemosStorage.previews[dateKey];
        }
    }
    autoSave();
    initCalendar();
}

function removeMemoFromCalendarPreview(memoText) {
    if (!selectedDate) return;
    const dateKey = getDateKey(selectedDate);

    if (dateMemosStorage.previews[dateKey]) {
        const index = dateMemosStorage.previews[dateKey].indexOf(memoText);
        if (index > -1) {
            dateMemosStorage.previews[dateKey].splice(index, 1);
            if (dateMemosStorage.previews[dateKey].length === 0) {
                delete dateMemosStorage.previews[dateKey];
            }
            autoSave();
            initCalendar();
        }
    }
}

function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    selectedDate = null;
    initCalendar();
    updateMemoSectionUI();
    loadMemos();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    selectedDate = null;
    initCalendar();
    updateMemoSectionUI();
    loadMemos();
}

function goToToday() {
    currentDate = new Date();
    selectedDate = new Date();
    initCalendar();
    document.getElementById('selectedDateDisplay').textContent =
        `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;
    document.getElementById('memoSection').classList.add('active');
    updateMemoSectionUI();
    loadMemos();
}

async function saveAllMemosToFile() {
    let allContent = "=== 전체 일정 내용 ===\n\n";
    let hasContent = false;

    allContent += "=== 달력 내용 (미리보기) ===\n";
    let previewContentAdded = false;
    const sortedDateKeys = Object.keys(dateMemosStorage.previews).sort();
    for (const dateKey of sortedDateKeys) {
        if (dateMemosStorage.previews[dateKey] && dateMemosStorage.previews[dateKey].length > 0) {
            const [year, month, day] = dateKey.split('-');
            allContent += `[${year}년 ${parseInt(month)}월 ${parseInt(day)}일]\n`;
            dateMemosStorage.previews[dateKey].forEach((previewMemo, index) => {
                allContent += `${index + 1}. ${previewMemo}\n`;
            });
            allContent += "\n";
            previewContentAdded = true;
            hasContent = true;
        }
    }
    if (!previewContentAdded) allContent += "(내용 없음)\n";
    allContent += "-------------------\n\n";

    allContent += "=== 날짜별 중요 일정 ===\n";
    let importantContentAdded = false;
    const sortedImportantDateKeys = Object.keys(dateMemosStorage.dates).sort();
    for (const dateKey of sortedImportantDateKeys) {
        const memos = dateMemosStorage.dates[dateKey];
        if (memos && memos.important && memos.important.length > 0) {
            const [year, month, day] = dateKey.split('-');
            allContent += `[${year}년 ${parseInt(month)}월 ${parseInt(day)}일]\n`;
            memos.important.forEach((memo, index) => {
                allContent += `${index + 1}. ${memo}\n`;
            });
            allContent += "\n";
            importantContentAdded = true;
            hasContent = true;
        }
    }
    if (!importantContentAdded) allContent += "(내용 없음)\n";
    allContent += "-------------------\n\n";

    allContent += "=== 일반 일정 ===\n";
    if (dateMemosStorage.regular && dateMemosStorage.regular.length > 0) {
        hasContent = true;
        dateMemosStorage.regular.forEach((memo, index) => {
            allContent += `${index + 1}. ${memo}\n`;
        });
    } else {
        allContent += "(내용 없음)\n";
    }
    allContent += "\n-------------------\n";

    if (!hasContent) {
        alert('저장할 일정가 없습니다.');
        return;
    }

    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        const seconds = String(today.getSeconds()).padStart(2, '0');
        const dateTimeString = `${year}${month}${day}_${hours}${minutes}${seconds}`;
        const defaultFileName = `일정표_동환_${dateTimeString}.txt`;

        if ('showSaveFilePicker' in window) {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFileName,
                types: [
                    {
                        description: '텍스트 파일',
                        accept: { 'text/plain': ['.txt'] },
                    },
                ],
            });
            const writable = await handle.createWritable();
            await writable.write(allContent);
            await writable.close();
            alert('일정표가 성공적으로 저장되었습니다.');
        } else {
            const blob = new Blob([allContent], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultFileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            alert(`이 브라우저는 저장 위치 선택을 지원하지 않습니다.\n일정표가 '${defaultFileName}'로 다운로드 폴더에 저장되었습니다.`);
        }
    } catch (error) {
        console.error('파일 저장 중 오류 발생:', error);
        if (error.name === 'AbortError') {
            alert('저장이 취소되었습니다.');
        } else {
            alert('파일 저장 중 오류가 발생했습니다.');
        }
    }
}

function autoSave() {
    try {
        console.log("자동 저장 시작");
        
        // 이전 로컬 스토리지 저장도 유지 (백업용)
        localStorage.setItem('dateMemosStorage', JSON.stringify(dateMemosStorage));
        console.log("로컬 스토리지에 백업 완료");
        
        // Firebase에 데이터 저장
        try {
            const dataRef = database.ref('calendar-memos');
            console.log("Firebase 데이터 저장 시작");
            
            dataRef.set(dateMemosStorage)
                .then(() => {
                    console.log('Firebase에 데이터 저장 성공');
                })
                .catch((error) => {
                    console.error('Firebase 저장 오류:', error);
                    alert('온라인 저장에 실패했습니다. 인터넷 연결을 확인해 주세요.');
                });
        } catch (firebaseError) {
            console.error("Firebase 저장 실패:", firebaseError);
            // Firebase 오류 시 적어도 로컬은 저장되었으므로 true 반환
            return true;
        }
        
        return true;
    } catch (e) {
        console.error('자동 저장 중 오류 발생:', e);
        return false;
    }
}

function loadSavedMemos() {
    isLoading = true;
    console.log("데이터 로딩 시작");
    
    try {
        const dataRef = database.ref('calendar-memos');
        console.log("Firebase 데이터 참조 생성");
        
        // 실시간 동기화 대신 한 번만 데이터를 가져오도록 수정
        dataRef.once('value')
            .then((snapshot) => {
                try {
                    console.log("Firebase 데이터 스냅샷 받음:", snapshot.exists());
                    const data = snapshot.val();
                    if (data) {
                        console.log("Firebase 데이터 내용:", Object.keys(data));
                        dateMemosStorage.dates = (data.dates && typeof data.dates === 'object') ? data.dates : {};
                        dateMemosStorage.regular = Array.isArray(data.regular) ? data.regular : [];
                        dateMemosStorage.previews = (data.previews && typeof data.previews === 'object') ? data.previews : {};
                        console.log('Firebase에서 데이터 로드 성공');
                    } else {
                        loadFromLocalStorage();
                    }
                    
                    // 데이터 로딩 완료 후 UI 업데이트
                    if (isLoading) {
                        initCalendar();
                        updateMemoSectionUI();
                        loadMemos();
                        isLoading = false;
                    }
                    
                } catch (e) {
                    console.error('저장된 일정 불러오기 오류:', e);
                    loadFromLocalStorage();
                }
            })
            .catch((error) => {
                console.error('Firebase 데이터 읽기 오류:', error);
                loadFromLocalStorage();
            });
    } catch (initError) {
        console.error("Firebase 참조 생성 중 오류:", initError);
        loadFromLocalStorage();
    }
}

// 로컬 스토리지에서 데이터 로드하는 함수 추가
function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('dateMemosStorage');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            dateMemosStorage.dates = (parsedData.dates && typeof parsedData.dates === 'object') ? parsedData.dates : {};
            dateMemosStorage.regular = Array.isArray(parsedData.regular) ? parsedData.regular : [];
            dateMemosStorage.previews = (parsedData.previews && typeof parsedData.previews === 'object') ? parsedData.previews : {};
            console.log("로컬 스토리지에서 데이터 복구 성공");
        } else {
            dateMemosStorage = { dates: {}, regular: [], previews: {} };
        }
    } catch (e) {
        console.error("로컬 스토리지 복구 중 오류:", e);
        dateMemosStorage = { dates: {}, regular: [], previews: {} };
    }
    
    initCalendar();
    updateMemoSectionUI();
    loadMemos();
    isLoading = false;
}

function loadMemosFromFile() {
    if (confirm('파일을 불러오면 현재 모든 일정표 내용이 대체됩니다.\n계속하시겠습니까?')) {
        document.getElementById('fileInput').click();
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            parseAndLoadMemos(content);
        } catch (error) {
            console.error('파일 읽기 오류:', error);
            alert('파일을 읽는 중 오류가 발생했습니다.');
        }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
}

function parseAndLoadMemos(content) {
    try {
        dateMemosStorage = { dates: {}, regular: [], previews: {} };
        const lines = content.split('\n');
        let currentSection = null;
        let currentDateKey = null;
        let memoCount = 0;

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('---')) continue;

            if (line === "=== 달력 내용 (미리보기) ===") { currentSection = 'calendar'; currentDateKey = null; continue; }
            if (line === "=== 날짜별 중요 일정 ===") { currentSection = 'important'; currentDateKey = null; continue; }
            if (line === "=== 일반 일정 ===") { currentSection = 'regular'; currentDateKey = null; continue; }

            const dateMatch = line.match(/\[(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\]/);
            if (dateMatch) {
                const [, year, month, day] = dateMatch;
                const date = new Date(year, month - 1, day);
                currentDateKey = getDateKey(date);
                continue;
            }

            const memoMatch = line.match(/^\d+\.\s*(.+)/s);
            if (memoMatch) {
                const memoText = memoMatch[1];
                memoCount++;
                if (currentSection === 'calendar' && currentDateKey) {
                    if (!dateMemosStorage.previews[currentDateKey]) dateMemosStorage.previews[currentDateKey] = [];
                    dateMemosStorage.previews[currentDateKey].push(memoText);
                } else if (currentSection === 'important' && currentDateKey) {
                    if (!dateMemosStorage.dates[currentDateKey]) dateMemosStorage.dates[currentDateKey] = { important: [] };
                    dateMemosStorage.dates[currentDateKey].important.push(memoText);
                } else if (currentSection === 'regular') {
                    dateMemosStorage.regular.push(memoText);
                }
            } else if (currentSection === 'calendar' && currentDateKey && line !== "(내용 없음)") {
                if (!dateMemosStorage.previews[currentDateKey]) dateMemosStorage.previews[currentDateKey] = [];
                dateMemosStorage.previews[currentDateKey].push(line);
                memoCount++;
            }
        }

        autoSave();
        initCalendar();
        updateMemoSectionUI();
        selectedDate = null;
        loadMemos();

        document.getElementById('importantMemoInput').value = '';
        document.getElementById('regularMemoInput').value = '';
        alert(`파일에서 ${memoCount}개의 일정 항목을 불러왔습니다.`);
    } catch (error) {
        console.error('파일 파싱 및 로드 오류:', error);
        alert('파일 형식이 올바르지 않거나 처리 중 오류가 발생했습니다.');
        dateMemosStorage = { dates: {}, regular: [], previews: {} };
        selectedDate = null;
        initCalendar();
        loadMemos();
    }
}

function updateMemoSectionUI() {
    const memoSection = document.getElementById('memoSection');
    const importantColumn = memoSection.querySelector('.memo-column:first-child');
    const regularColumn = memoSection.querySelector('.memo-column:last-child');

    importantColumn.style.opacity = selectedDate ? '1' : '0.3';
    importantColumn.style.pointerEvents = selectedDate ? 'all' : 'none';

    regularColumn.style.opacity = '1';
    regularColumn.style.pointerEvents = 'all';

    if (!selectedDate) {
        document.getElementById('selectedDateDisplay').textContent = '날짜를 선택해주세요';
    }
}

// 새로운 함수 추가: 달력 날짜 편집 다이얼로그 표시
function showEditCalendarDialog(day) {
    const dateKey = getDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    const dayElement = document.querySelector(`.calendar-day[data-day="${day}"]`);
    
    if (!dayElement) return;
    
    // 기존에 열려있는 편집 영역 닫기
    const openEditArea = document.querySelector('.calendar-edit-textarea:not([style*="display: none"])');
    if (openEditArea) {
        const openDayElement = openEditArea.closest('.calendar-day');
        if (openDayElement) openDayElement.classList.remove('editing');
        openEditArea.blur();
    }
    
    let editTextArea = dayElement.querySelector('.calendar-edit-textarea');
    let memoPreview = dayElement.querySelector('.memo-preview');
    
    // 미리보기와 편집 영역이 없으면 새로 생성
    if (!editTextArea) {
        editTextArea = document.createElement('textarea');
        editTextArea.className = 'calendar-edit-textarea';
        editTextArea.dataset.dateKey = dateKey;
        editTextArea.onblur = (event) => {
            saveCalendarPreviewEdit(event.target);
            dayElement.classList.remove('editing');
        };
        editTextArea.oninput = (event) => adjustTextareaHeightForCalendar(event.target);
        dayElement.appendChild(editTextArea);
    }
    
    if (!memoPreview) {
        memoPreview = document.createElement('div');
        memoPreview.className = 'memo-preview';
        memoPreview.dataset.dateKey = dateKey;
        memoPreview.onclick = (event) => {
            event.stopPropagation();
            selectDate(day);
        };
        memoPreview.ondblclick = (event) => {
            event.stopPropagation();
            editCalendarPreview(event.target);
        };
        dayElement.appendChild(memoPreview);
    }
    
    // 편집 모드 스타일 적용
    dayElement.classList.add('editing');
    
    // 편집 영역 설정
    if (memoPreview) memoPreview.style.display = 'none';
    editTextArea.style.display = 'block';
    
    // 기존 메모 데이터 불러오기
    if (dateMemosStorage.previews[dateKey]) {
        editTextArea.value = dateMemosStorage.previews[dateKey].join('\n');
    } else {
        editTextArea.value = '';
    }
    
    adjustTextareaHeightForCalendar(editTextArea);
    editTextArea.focus();
    editTextArea.selectionStart = editTextArea.selectionEnd = editTextArea.value.length;
}

// 설정 모달 관련 함수들
function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'block';
    loadKeywordsToSettingsUI();
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'none';
}

function loadKeywordsToSettingsUI() {
    const keywordList = document.getElementById('keywordList');
    keywordList.innerHTML = '';
    
    keywords.forEach((keyword, index) => {
        const keywordItem = document.createElement('div');
        keywordItem.className = 'keyword-item';
        
        const keywordColor = document.createElement('span');
        keywordColor.className = `keyword-color ${keyword.class}`;
        
        const keywordText = document.createElement('span');
        keywordText.className = 'keyword-text';
        keywordText.textContent = keyword.word;
        
        const keywordRemove = document.createElement('button');
        keywordRemove.className = 'keyword-remove';
        keywordRemove.innerHTML = '×';
        keywordRemove.onclick = () => removeKeyword(index);
        
        const leftContainer = document.createElement('div');
        leftContainer.style.display = 'flex';
        leftContainer.style.alignItems = 'center';
        
        leftContainer.appendChild(keywordColor);
        leftContainer.appendChild(keywordText);
        
        keywordItem.appendChild(leftContainer);
        keywordItem.appendChild(keywordRemove);
        keywordList.appendChild(keywordItem);
    });
}

function addKeyword() {
    const keywordInput = document.getElementById('keywordInput');
    const colorSelect = document.getElementById('colorSelect');
    
    const word = keywordInput.value.trim();
    const colorClass = colorSelect.value;
    
    if (word === '') {
        alert('단어를 입력해주세요.');
        return;
    }
    
    // 중복 단어 확인
    const isDuplicate = keywords.some(kw => kw.word === word);
    if (isDuplicate) {
        alert('이미 등록된 단어입니다.');
        return;
    }
    
    keywords.push({ word, class: colorClass });
    
    keywordInput.value = '';
    loadKeywordsToSettingsUI();
}

function removeKeyword(index) {
    keywords.splice(index, 1);
    loadKeywordsToSettingsUI();
}

function saveSettings() {
    // Firebase에 키워드 저장
    try {
        const keywordsRef = database.ref('calendar-keywords');
        keywordsRef.set(keywords)
            .then(() => {
                console.log('키워드 설정 저장 성공');
                alert('설정이 저장되었습니다.');
                // 메모 다시 로드하여 변경된 키워드 적용
                refreshAllMemos();
                closeSettingsModal();
            })
            .catch((error) => {
                console.error('키워드 설정 저장 실패:', error);
                alert('설정 저장에 실패했습니다.');
            });
    } catch (e) {
        console.error('키워드 설정 저장 중 오류:', e);
        alert('설정 저장 중 오류가 발생했습니다.');
    }
    
    // 로컬스토리지에도 백업
    localStorage.setItem('keywords', JSON.stringify(keywords));
}

function loadKeywordsFromStorage() {
    try {
        // Firebase에서 키워드 불러오기
        const keywordsRef = database.ref('calendar-keywords');
        keywordsRef.once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const savedKeywords = snapshot.val();
                    if (Array.isArray(savedKeywords) && savedKeywords.length > 0) {
                        keywords = savedKeywords;
                        console.log('Firebase에서 키워드 설정 로드 성공');
                    }
                } else {
                    // Firebase에 데이터가 없으면 로컬스토리지 확인
                    const localKeywords = localStorage.getItem('keywords');
                    if (localKeywords) {
                        keywords = JSON.parse(localKeywords);
                        console.log('로컬스토리지에서 키워드 설정 로드 성공');
                    }
                }
            })
            .catch((error) => {
                console.error('Firebase에서 키워드 설정 로드 실패:', error);
                // 로컬스토리지에서 불러오기 시도
                const localKeywords = localStorage.getItem('keywords');
                if (localKeywords) {
                    keywords = JSON.parse(localKeywords);
                    console.log('로컬스토리지에서 키워드 설정 로드 성공');
                }
            });
    } catch (e) {
        console.error('키워드 설정 로드 중 오류:', e);
    }
}

// 모든 메모 항목을 다시 로드하여 키워드 스타일 적용
function refreshAllMemos() {
    // 캘린더 새로고침
    initCalendar();
    
    // 현재 표시된 메모들 다시 불러오기
    loadMemos();
}

// 텍스트에 키워드가 포함되어 있으면 색상 클래스 반환
function getKeywordClass(text) {
    for (const keyword of keywords) {
        if (text.includes(keyword.word)) {
            return keyword.class;
        }
    }
    return null;
}

// 텍스트에 키워드를 강조 표시하는 HTML 변환 함수
function highlightKeywords(text) {
    let highlightedText = text;
    
    keywords.forEach(keyword => {
        const regex = new RegExp(keyword.word, 'g');
        highlightedText = highlightedText.replace(regex, `<span class="keyword-highlight" style="color: ${getColorForClass(keyword.class)}">$&</span>`);
    });
    
    return highlightedText;
}

// 색상 클래스에 맞는 텍스트 색상 값 반환
function getColorForClass(colorClass) {
    const colorMap = {
        'red-bg': '#ff4500',
        'orange-bg': '#ff8c00',
        'yellow-bg': '#ffd700',
        'green-bg': '#228b22',
        'blue-bg': '#1e90ff',
        'navy-bg': '#000080',
        'purple-bg': '#8a2be2',
        'gray-bg': '#696969'
    };
    
    return colorMap[colorClass] || '#000000';
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
        <button onclick="this.parentElement.parentElement.remove(); this.parentElement.remove();">확인</button>
    `;
    document.body.appendChild(messageBox);
}

window.onload = function() {
    loadKeywordsFromStorage(); // 키워드 설정 먼저 로드
    loadSavedMemos();
    initCalendar();
    initTextareaHandlers();
    updateMemoSectionUI();
    loadMemos();
    console.log('페이지 로드 완료, 초기 데이터:', JSON.parse(JSON.stringify(dateMemosStorage)));
    
    // 모달 바깥 영역 클릭 시 닫기
    window.onclick = function(event) {
        const modal = document.getElementById('settingsModal');
        if (event.target === modal) {
            closeSettingsModal();
        }
    }

    // 로그아웃 버튼 추가
    const header = document.querySelector('.header');
    const logoutButton = document.createElement('button');
    logoutButton.textContent = '로그아웃';
    logoutButton.onclick = logout;
    logoutButton.style.marginLeft = '10px';
    header.appendChild(logoutButton);
}; 