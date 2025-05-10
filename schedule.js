// 전역 변수
let schedules = [];
let editingScheduleId = null;
let editingRecurringType = null; // 'single', 'future', 'all' 중 하나의 값을 가질 수 있음
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let isResizingSchedule = false;
let currentResizingElement = null;
let startX = 0;
let startWidth = 0;
let isDraggingSchedule = false;
let currentDragElement = null;
let startY = 0;
let originalLineNumber = 0;
let currentLineNumber = 0;

// DOM 요소
const scheduleList = document.getElementById('scheduleList');
const addScheduleBtn = document.getElementById('addScheduleBtn');
const scheduleModal = document.getElementById('scheduleModal');
const recurringEditModal = document.getElementById('recurringEditModal');
const scheduleForm = document.getElementById('scheduleForm');
const saveScheduleBtn = document.getElementById('saveScheduleBtn');
const cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
const deleteScheduleBtn = document.getElementById('deleteScheduleBtn');
const editSingleBtn = document.getElementById('editSingleBtn');
const editFutureBtn = document.getElementById('editFutureBtn');
const editAllBtn = document.getElementById('editAllBtn');
const cancelRecurringEditBtn = document.getElementById('cancelRecurringEditBtn');
const reminderSetting = document.getElementById('scheduleReminder');
const reminderTime = document.getElementById('scheduleReminderTime');
const resizer = document.getElementById('resizer');
const sidebar = document.querySelector('.sidebar');
const saveSchedulesBtn = document.getElementById('saveSchedulesBtn');
const loadSchedulesBtn = document.getElementById('loadSchedulesBtn');
const fileInput = document.getElementById('fileInput');
const clearSchedulesBtn = document.getElementById('clearSchedulesBtn');
const sortSchedulesBtn = document.getElementById('sortSchedulesBtn');
const categoryFilter = document.getElementById('categoryFilter');

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    try {
        loadSchedules();
        renderScheduleList();
        renderCalendar();
        setupEventListeners();
        
        // DOM 요소 검증
        console.log('DOM 요소 검증 시작');
        const domElements = {
            scheduleModal: document.getElementById('scheduleModal'),
            recurringEditModal: document.getElementById('recurringEditModal'),
            editSingleBtn: document.getElementById('editSingleBtn'),
            editFutureBtn: document.getElementById('editFutureBtn'),
            editAllBtn: document.getElementById('editAllBtn'),
            deleteFutureBtn: document.getElementById('deleteFutureBtn'),
            cancelRecurringEditBtn: document.getElementById('cancelRecurringEditBtn')
        };
        
        // 요소 존재 여부 확인
        Object.entries(domElements).forEach(([name, element]) => {
            if (element) {
                console.log(`✅ ${name} 요소가 존재합니다.`);
            } else {
                console.error(`❌ ${name} 요소를 찾을 수 없습니다!`);
            }
        });
        
        // 각 버튼에 직접 이벤트 리스너 설정
        console.log('직접 이벤트 리스너 설정');
        
        const editSingleBtn = document.getElementById('editSingleBtn');
        if (editSingleBtn) {
            editSingleBtn.onclick = function() {
                console.log('editSingleBtn 클릭됨 (직접 설정)');
                handleRecurringEdit('single');
            };
        }
        
        const editFutureBtn = document.getElementById('editFutureBtn');
        if (editFutureBtn) {
            editFutureBtn.onclick = function() {
                console.log('editFutureBtn 클릭됨 (직접 설정)');
                handleRecurringEdit('future');
            };
        }
        
        const editAllBtn = document.getElementById('editAllBtn');
        if (editAllBtn) {
            editAllBtn.onclick = function() {
                console.log('editAllBtn 클릭됨 (직접 설정)');
                handleRecurringEdit('all');
            };
        }
        
        const deleteFutureBtn = document.getElementById('deleteFutureBtn');
        if (deleteFutureBtn) {
            deleteFutureBtn.onclick = function() {
                console.log('deleteFutureBtn 클릭됨 (직접 설정)');
                deleteFutureRecurringEvents();
            };
        }
        
        const cancelRecurringEditBtn = document.getElementById('cancelRecurringEditBtn');
        if (cancelRecurringEditBtn) {
            cancelRecurringEditBtn.onclick = function() {
                console.log('cancelRecurringEditBtn 클릭됨 (직접 설정)');
                closeRecurringEditModal();
            };
        }
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
        showError('앱 초기화 중 오류가 발생했습니다.');
    }
});

// 에러 메시지 표시
function showError(message) {
    alert(message);
}

// 데이터 검증
function validateScheduleData(data) {
    if (!data.title.trim()) {
        throw new Error('일정명을 입력해주세요.');
    }
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('유효한 날짜를 입력해주세요.');
    }
    if (startDate > endDate) {
        throw new Error('시작일은 종료일보다 빨라야 합니다.');
    }
    return true;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    try {
        const eventListeners = [
            [addScheduleBtn, 'click', () => openScheduleModal()],
            [saveScheduleBtn, 'click', saveSchedule],
            [cancelScheduleBtn, 'click', closeScheduleModal],
            [reminderSetting, 'change', toggleReminderTime],
            [scheduleForm, 'submit', (e) => {
                e.preventDefault();
                saveSchedule();
            }],
            [saveSchedulesBtn, 'click', exportSchedulesToFile],
            [loadSchedulesBtn, 'click', () => fileInput.click()],
            [fileInput, 'change', importSchedulesFromFile],
            [clearSchedulesBtn, 'click', clearAllSchedules],
            [sortSchedulesBtn, 'click', sortAllSchedules],
            [categoryFilter, 'change', filterSchedulesByCategory],
            [document.getElementById('scheduleRepeat'), 'change', toggleRepeatEndDate],
            [editSingleBtn, 'click', () => handleRecurringEdit('single')],
            [editFutureBtn, 'click', () => handleRecurringEdit('future')],
            [editAllBtn, 'click', () => handleRecurringEdit('all')],
            [document.getElementById('deleteFutureBtn'), 'click', deleteFutureRecurringEvents],
            [cancelRecurringEditBtn, 'click', closeRecurringEditModal]
        ];

        // 리사이저 이벤트
        let isResizing = false;
        let lastDownX = 0;
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            lastDownX = e.clientX;
        });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const delta = e.clientX - lastDownX;
            const newWidth = sidebar.offsetWidth + delta;
            if (newWidth > 200 && newWidth < 500) {
                sidebar.style.width = `${newWidth}px`;
                lastDownX = e.clientX;
            }
        });
        document.addEventListener('mouseup', () => {
            isResizing = false;
        });

        // 이벤트 리스너 등록
        eventListeners.forEach(([element, event, handler]) => {
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`이벤트 리스너 등록 실패: ${event} 요소가 존재하지 않음`);
            }
        });
        window._eventListeners = eventListeners;
    } catch (error) {
        console.error('이벤트 리스너 설정 중 오류:', error);
        showError('이벤트 리스너 설정 중 오류가 발생했습니다.');
    }
}

// 모든 일정 정렬 함수
function sortAllSchedules() {
    try {
        if (schedules.length === 0) {
            alert('정렬할 일정이 없습니다.');
            return;
        }
        schedules.sort((a, b) => {
            const startDiff = new Date(a.startDate) - new Date(b.startDate);
            if (startDiff !== 0) return startDiff;
            const durationA = new Date(a.endDate) - new Date(a.startDate);
            const durationB = new Date(b.endDate) - new Date(b.startDate);
            return durationB - durationA;
        });
        assignOrderToSchedules(schedules);
        saveSchedules();
        renderScheduleList();
        renderCalendar();
        alert('일정이 날짜순으로 정렬되었습니다.');
    } catch (error) {
        console.error('일정 정렬 중 오류:', error);
        showError('일정을 정렬하는 중 오류가 발생했습니다.');
    }
}

// 모든 일정 삭제 함수
function clearAllSchedules() {
    if (confirm('모든 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        schedules = [];
        saveSchedules();
        renderScheduleList();
        renderCalendar();
    }
}

// 이벤트 리스너 정리
function cleanup() {
    if (window._eventListeners) {
        window._eventListeners.forEach(([element, event, handler]) => {
            element.removeEventListener(event, handler);
        });
        window._eventListeners = null;
    }
}

// 반복 종료일 토글 함수
function toggleRepeatEndDate() {
    const repeatSelect = document.getElementById('scheduleRepeat');
    const repeatEndDateContainer = document.getElementById('repeatEndDateContainer');
    const repeatEndDate = document.getElementById('scheduleRepeatEndDate');
    
    if (repeatSelect.value !== 'none') {
        repeatEndDateContainer.style.display = 'block';
        // 기본값으로 1년 후 날짜 설정
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        repeatEndDate.value = formatDateToYYYYMMDD(oneYearFromNow);
        
        // 반복 정보 텍스트 추가
        const repeatInfo = document.querySelector('.repeat-info') || document.createElement('div');
        repeatInfo.className = 'repeat-info';
        repeatInfo.textContent = '* 종료일까지 반복 일정이 생성됩니다.';
        if (!repeatInfo.parentNode) {
            repeatSelect.parentNode.appendChild(repeatInfo);
        }
    } else {
        repeatEndDateContainer.style.display = 'none';
        // 반복 정보 텍스트 제거
        const repeatInfo = document.querySelector('.repeat-info');
        if (repeatInfo && repeatInfo.parentNode) {
            repeatInfo.parentNode.removeChild(repeatInfo);
        }
    }
}

// 반복 일정 생성 함수 - 사용자가 지정한 종료일까지 생성
function generateRecurringInstances(originalSchedule) {
    // 원본 일정의 기간 계산
    const startDate = new Date(originalSchedule.startDate);
    const endDate = new Date(originalSchedule.endDate);
    const duration = endDate.getTime() - startDate.getTime(); // 일정 기간 (밀리초)
    
    // 반복 종료일 (사용자 지정 또는 기본값 1년)
    let repeatEndDate;
    if (originalSchedule.repeatEndDate) {
        repeatEndDate = new Date(originalSchedule.repeatEndDate);
    } else {
        repeatEndDate = new Date();
        repeatEndDate.setFullYear(repeatEndDate.getFullYear() + 1);
    }
    
    // 첫 번째 반복 날짜 계산 (원본 일정 이후의 다음 발생일)
    let nextDate = getNextOccurrence(startDate, originalSchedule.repeat);
    
    // 종료일까지의 모든 반복 일정 생성
    while (nextDate <= repeatEndDate) {
        // 반복 일정의 종료일 계산 (기간 유지)
        const nextEndDate = new Date(nextDate.getTime() + duration);
        
        // 새 일정 인스턴스 생성
        const instance = {
            ...originalSchedule,
            id: `${originalSchedule.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            startDate: formatDateToYYYYMMDD(nextDate),
            endDate: formatDateToYYYYMMDD(nextEndDate),
            originalId: originalSchedule.id,
            isRecurringInstance: true
        };
        
        // 일정 목록에 추가
        schedules.push(instance);
        
        // 다음 반복일 계산
        nextDate = getNextOccurrence(nextDate, originalSchedule.repeat);
    }
    
    // 원본 일정을 반복 일정 원본으로 표시
    originalSchedule.isRecurring = true;
    originalSchedule.hasGeneratedInstances = true;
}

// 다음 반복 발생일 계산
function getNextOccurrence(date, repeatType) {
    const nextDate = new Date(date);
    switch (repeatType) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'monthly':
            const currentDay = nextDate.getDate();
            nextDate.setMonth(nextDate.getMonth() + 1);
            const newMonth = nextDate.getMonth();
            nextDate.setDate(1);
            nextDate.setMonth(newMonth + 1);
            nextDate.setDate(0);
            nextDate.setDate(Math.min(currentDay, nextDate.getDate()));
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
    }
    return nextDate;
}

// 반복 타입 표시 이름
function getRepeatDisplayName(repeatType) {
    const names = {
        'daily': '매일',
        'weekly': '매주',
        'monthly': '매월',
        'yearly': '매년',
        'none': '반복 안함'
    };
    return names[repeatType] || '반복 안함';
}

// 일정 저장
function saveSchedule() {
    try {
        // 폼 데이터 수집
        const scheduleData = {
            id: editingScheduleId || Date.now().toString(),
            title: document.getElementById('scheduleTitle').value,
            description: document.getElementById('scheduleDescription').value,
            startDate: document.getElementById('scheduleStart').value,
            endDate: document.getElementById('scheduleEnd').value,
            category: document.getElementById('scheduleCategory').value,
            color: document.getElementById('scheduleColor').value || getCategoryColor(document.getElementById('scheduleCategory').value),
            repeat: document.getElementById('scheduleRepeat').value,
            repeatEndDate: document.getElementById('scheduleRepeat').value !== 'none' ? document.getElementById('scheduleRepeatEndDate').value : null,
            reminder: document.getElementById('scheduleReminder').checked,
            reminderTime: document.getElementById('scheduleReminderTime').value,
            order: editingScheduleId ? schedules.find(s => s.id === editingScheduleId)?.order || 0 : 0
        };

        validateScheduleData(scheduleData);

        if (editingScheduleId) {
            // 수정 모드
            const index = schedules.findIndex(s => s.id === editingScheduleId);
            if (index === -1) throw new Error('수정하려는 일정을 찾을 수 없습니다.');

            const oldSchedule = schedules[index];

            if (editingRecurringType) {
                // 반복 일정 수정
                switch (editingRecurringType) {
                    case 'single':
                        // 이 일정만 수정
                        if (oldSchedule.isRecurringInstance) {
                            // 인스턴스 수정
                            schedules[index] = { ...oldSchedule, ...scheduleData, isRecurringInstance: true, repeat: 'none' };
                        } else {
                            // 원본 일정이지만 단일 일정으로 복사
                            scheduleData.id = Date.now().toString();
                            scheduleData.isRecurringInstance = false;
                            scheduleData.repeat = 'none';
                            schedules.push(scheduleData);
                        }
                        break;

                    case 'future':
                        // 이 일정 및 향후 일정 수정
                        console.log('향후 반복 일정 수정 처리 시작');
                        const originalId = oldSchedule.isRecurringInstance ? oldSchedule.originalId : oldSchedule.id;
                        console.log('원본 일정 ID:', originalId);
                        
                        const originalIndex = schedules.findIndex(s => s.id === originalId);
                        if (originalIndex === -1) throw new Error('원본 일정을 찾을 수 없습니다.');

                        console.log('원본 일정 인덱스:', originalIndex);
                        
                        const currentDate = new Date(scheduleData.startDate);
                        console.log('현재 일정 날짜:', currentDate);

                        // 관련 반복 인스턴스 개수 확인
                        const futureInstanceCount = schedules.filter(s => s.originalId === originalId).length;
                        console.log(`기존 반복 인스턴스 개수: ${futureInstanceCount}개`);
                        
                        // 향후 인스턴스만 삭제 (현재 일정 포함)
                        const beforeInstances = schedules.filter(s => {
                            if (s.originalId === originalId) {
                                const scheduleDate = new Date(s.startDate);
                                return scheduleDate < currentDate; // 현재 날짜 이전의 인스턴스만 유지
                            }
                            return true; // 다른 일정은 모두 유지
                        });
                        
                        const deletedCount = schedules.length - beforeInstances.length;
                        console.log(`삭제된 향후 인스턴스 개수: ${deletedCount}개`);
                        
                        schedules = beforeInstances;
                        
                        if (oldSchedule.isRecurringInstance) {
                            // 현재 인스턴스가 반복 인스턴스인 경우
                            console.log('현재 일정이 반복 인스턴스임');
                            
                            // 새로운 시리즈 시작 (현재 일정을 새 반복 시리즈의 원본으로 설정)
                            const newOriginalSchedule = {
                                ...scheduleData,
                                id: Date.now().toString(), // 새 ID 생성
                                isRecurring: true,
                                isRecurringInstance: false,
                                hasGeneratedInstances: false, // 새 인스턴스 생성 예정
                                originalId: null // 원본이므로 originalId는 없음
                            };
                            
                            // 새 원본 일정 추가
                            schedules.push(newOriginalSchedule);
                            console.log('새 원본 일정 생성:', newOriginalSchedule);
                            
                            // 새로운 반복 인스턴스 생성
                            if (scheduleData.repeat !== 'none') {
                                console.log('새 반복 인스턴스 생성 시작');
                                generateRecurringInstances(newOriginalSchedule);
                                
                                // 생성된 인스턴스 개수 확인
                                const futureNewInstanceCount = schedules.filter(s => s.originalId === newOriginalSchedule.id).length;
                                console.log(`새로 생성된 반복 인스턴스 개수: ${futureNewInstanceCount}개`);
                            }
                        } else {
                            // 현재 일정이 원본 일정인 경우
                            console.log('현재 일정이 원본 일정임');
                            
                            // 원본 일정 업데이트
                            schedules[originalIndex] = { 
                                ...schedules[originalIndex], 
                                ...scheduleData, 
                                hasGeneratedInstances: false // 새로 인스턴스 생성 예정
                            };
                            
                            console.log('수정된 원본 일정:', schedules[originalIndex]);
                            
                            // 새로운 반복 인스턴스 생성
                            if (scheduleData.repeat !== 'none') {
                                console.log('새 반복 인스턴스 생성 시작');
                                generateRecurringInstances(schedules[originalIndex]);
                                
                                // 생성된 인스턴스 개수 확인
                                const futureOriginInstanceCount = schedules.filter(s => s.originalId === originalId).length;
                                console.log(`새로 생성된 반복 인스턴스 개수: ${futureOriginInstanceCount}개`);
                            } else {
                                console.log('반복 설정이 없어 인스턴스 생성하지 않음');
                            }
                        }
                        break;

                    case 'all':
                        // 모든 반복 일정 수정
                        console.log('모든 반복 일정 수정 처리 시작');
                        const origId = oldSchedule.isRecurringInstance ? oldSchedule.originalId : oldSchedule.id;
                        console.log('원본 일정 ID:', origId);
                        
                        const origIndex = schedules.findIndex(s => s.id === origId);
                        if (origIndex === -1) throw new Error('원본 일정을 찾을 수 없습니다.');
                        
                        console.log('원본 일정 인덱스:', origIndex);
                        console.log('수정 전 원본 일정:', schedules[origIndex]);
                        
                        // 관련 반복 인스턴스 개수 확인
                        const origInstanceCount = schedules.filter(s => s.originalId === origId).length;
                        console.log(`기존 반복 인스턴스 개수: ${origInstanceCount}개`);

                        // 모든 관련 인스턴스 삭제
                        schedules = schedules.filter(s => s.originalId !== origId);
                        
                        // 원본 일정 업데이트 - 원본 ID 유지
                        const updatedOriginalSchedule = {
                            ...scheduleData,
                            id: origId,  // 원본 ID 유지
                            isRecurring: true,
                            hasGeneratedInstances: false // 새로 인스턴스 생성 예정
                        };
                        
                        // 원본 일정을 배열에서 업데이트
                        schedules[origIndex] = updatedOriginalSchedule;
                        console.log('수정 후 원본 일정:', schedules[origIndex]);

                        // 새로운 반복 인스턴스 생성
                        if (scheduleData.repeat !== 'none') {
                            console.log('새 반복 인스턴스 생성 시작');
                            generateRecurringInstances(schedules[origIndex]);
                            
                            // 생성된 인스턴스 개수 확인
                            const origNewInstanceCount = schedules.filter(s => s.originalId === origId).length;
                            console.log(`새로 생성된 반복 인스턴스 개수: ${origNewInstanceCount}개`);
                        } else {
                            console.log('반복 설정이 없어 인스턴스 생성하지 않음');
                        }
                        break;
                }
            } else {
                // 일반 일정 수정
                schedules[index] = { ...oldSchedule, ...scheduleData };
                if (oldSchedule.repeat !== scheduleData.repeat && oldSchedule.hasGeneratedInstances) {
                    schedules = schedules.filter(s => s.originalId !== editingScheduleId);
                    schedules[index].hasGeneratedInstances = false;
                    if (scheduleData.repeat !== 'none') {
                        generateRecurringInstances(schedules[index]);
                    }
                } else if (scheduleData.repeat !== 'none' && !oldSchedule.hasGeneratedInstances) {
                    generateRecurringInstances(schedules[index]);
                }
            }
        } else {
            // 추가 모드
            schedules.push(scheduleData);
            if (scheduleData.repeat !== 'none') {
                generateRecurringInstances(scheduleData);
            }
        }

        // 변경사항 저장 및 UI 업데이트
        saveSchedules();
        renderScheduleList();
        renderCalendar();
        closeScheduleModal();
        alert(`일정이 성공적으로 ${editingRecurringType ? editingRecurringType + ' 범위로' : ''} 저장되었습니다.`);
        editingRecurringType = null;
    } catch (error) {
        showError(error.message);
    }
}

// 날짜의 시간 정보 제거
function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// 월 컨테이너 생성
function createMonthContainer(month, year) {
    const container = document.createElement('div');
    container.className = 'month-container';
    container.setAttribute('data-month', month);
    container.setAttribute('data-year', year);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    container.style.setProperty('--days-in-month', daysInMonth);
    const title = document.createElement('div');
    title.className = 'month-title';
    title.textContent = `${year}년 ${month + 1}월`;
    const daysGrid = document.createElement('div');
    daysGrid.className = 'days-grid';
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = createDayCell(year, month, day);
        daysGrid.appendChild(cell);
    }
    container.appendChild(title);
    container.appendChild(daysGrid);
    return container;
}

// 캘린더 업데이트
function updateCalendar() {
    const calendar = document.querySelector('.calendar');
    const monthContainer = calendar.querySelector(`[data-month="${currentMonth}"][data-year="${currentYear}"]`);
    if (monthContainer) {
        const daysGrid = monthContainer.querySelector('.days-grid');
        daysGrid.innerHTML = '';
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        monthContainer.style.setProperty('--days-in-month', daysInMonth);
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = createDayCell(currentYear, currentMonth, day);
            daysGrid.appendChild(cell);
        }
    } else {
        renderCalendar();
    }
}

// 일정 저장
function saveSchedules() {
    try {
        localStorage.setItem('schedules', JSON.stringify(schedules));
    } catch (error) {
        console.error('일정 저장 실패:', error);
        showError('일정 저장 중 오류가 발생했습니다.');
    }
}

// 일정 불러오기
function loadSchedules() {
    try {
        const saved = localStorage.getItem('schedules');
        if (saved) {
            schedules = JSON.parse(saved);
            // 기존 일정 중 반복 일정 재생성
            schedules.forEach(schedule => {
                if (schedule.repeat !== 'none' && !schedule.hasGeneratedInstances && !schedule.isRecurringInstance) {
                    generateRecurringInstances(schedule);
                }
            });
            saveSchedules();
        }
    } catch (error) {
        console.error('일정 로드 실패:', error);
        schedules = [];
        showError('일정 로드 중 오류가 발생했습니다.');
    }
}

// 일정 삭제
function deleteSchedule(id) {
    if (confirm('정말로 이 일정을 삭제하시겠습니까?')) {
        const schedule = schedules.find(s => s.id === id);
        if (schedule && schedule.isRecurring) {
            schedules = schedules.filter(s => s.id !== id && s.originalId !== id);
        } else {
            schedules = schedules.filter(s => s.id !== id);
        }
        saveSchedules();
        renderScheduleList();
        renderCalendar();
    }
}

// 일정 수정
function editSchedule(id) {
    console.log('일정 수정 함수 호출:', id);
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) {
        console.warn('해당 ID의 일정을 찾을 수 없습니다:', id);
        return;
    }

    editingScheduleId = id;
    console.log('일정 정보:', schedule);
    console.log('편집 중인 일정 ID 설정:', editingScheduleId);

    // 반복 일정인 경우 옵션 모달 표시
    if (schedule.isRecurring || schedule.isRecurringInstance) {
        console.log('반복 일정 감지 - 모달 표시 시도');
        if (recurringEditModal) {
            console.log('반복 편집 모달 표시');
            recurringEditModal.classList.add('active');
            recurringEditModal.setAttribute('data-schedule-id', id); // data 속성에 ID 저장
            console.log('recurringEditModal에 data-schedule-id 속성 추가:', id);
            // 이벤트 리스너는 setupEventListeners에서 이미 등록됨
        } else {
            console.error('recurringEditModal을 찾을 수 없습니다');
            fillScheduleForm(schedule);
            openScheduleModal();
        }
    } else {
        console.log('일반 일정 - 바로 편집');
        fillScheduleForm(schedule);
        openScheduleModal();
        deleteScheduleBtn.style.display = 'block';
        deleteScheduleBtn.onclick = () => {
            closeScheduleModal();
            deleteSchedule(id);
        };
        document.getElementById('modalTitle').textContent = '일정 수정';
    }
}

// 폼 채우기
function fillScheduleForm(schedule) {
    document.getElementById('scheduleTitle').value = schedule.title;
    document.getElementById('scheduleDescription').value = schedule.description || '';
    document.getElementById('scheduleStart').value = schedule.startDate;
    document.getElementById('scheduleEnd').value = schedule.endDate;
    document.getElementById('scheduleCategory').value = schedule.category;
    document.getElementById('scheduleColor').value = schedule.color || getCategoryColor(schedule.category);
    document.getElementById('scheduleRepeat').value = schedule.repeat || 'none';
    
    // 반복 종료일 설정
    if (schedule.repeatEndDate) {
        document.getElementById('scheduleRepeatEndDate').value = schedule.repeatEndDate;
    } else if (schedule.repeat && schedule.repeat !== 'none') {
        // 기본 종료일 설정 (1년 후)
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        document.getElementById('scheduleRepeatEndDate').value = formatDateToYYYYMMDD(oneYearFromNow);
    }
    
    toggleRepeatEndDate(); // 반복 설정에 따라 UI 업데이트
    
    document.getElementById('scheduleReminder').checked = schedule.reminder;
    document.getElementById('scheduleReminderTime').value = schedule.reminderTime;
    toggleReminderTime();
}

// 모달 열기
function openScheduleModal() {
    scheduleModal.classList.add('active');
    if (!editingScheduleId) {
        scheduleForm.reset();
        deleteScheduleBtn.style.display = 'none';
        document.getElementById('modalTitle').textContent = '일정 추가';
        
        // 반복 종료일 컨테이너 초기 상태
        document.getElementById('repeatEndDateContainer').style.display = 'none';
    }
}

// 모달 닫기
function closeScheduleModal() {
    scheduleModal.classList.remove('active');
    editingScheduleId = null;
    scheduleForm.reset();
    deleteScheduleBtn.onclick = null;
    const repeatInfo = document.querySelector('.repeat-info');
    if (repeatInfo && repeatInfo.parentNode) {
        repeatInfo.parentNode.removeChild(repeatInfo);
    }
}

// 알림 설정 토글
function toggleReminderTime() {
    reminderTime.disabled = !reminderSetting.checked;
}

// 일정 목록  렌더링
function renderScheduleList(categoryFilter = 'all') {
    scheduleList.innerHTML = '';
    const sortedSchedules = [...schedules].sort((a, b) => {
        const startDiff = new Date(a.startDate) - new Date(b.startDate);
        if (startDiff !== 0) return startDiff;
        const durationA = new Date(a.endDate) - new Date(a.startDate);
        const durationB = new Date(b.endDate) - new Date(b.startDate);
        return durationB - durationA;
    });
    const filteredSchedules = categoryFilter === 'all'
        ? sortedSchedules
        : sortedSchedules.filter(schedule => schedule.category === categoryFilter);
    filteredSchedules.forEach((schedule, index) => {
        const card = createScheduleCard(schedule, index + 1);
        scheduleList.appendChild(card);
    });
    if (filteredSchedules.length === 0 && categoryFilter !== 'all') {
        const noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results-message';
        noResultsMsg.textContent = `"${getCategoryDisplayName(categoryFilter)}" 카테고리의 일정이 없습니다.`;
        scheduleList.appendChild(noResultsMsg);
    }
}

// 일정 카드 생성
function createScheduleCard(schedule, number) {
    const card = document.createElement('div');
    card.className = 'schedule-card';
    card.setAttribute('data-schedule-id', schedule.id);
    if (schedule.isRecurring) {
        card.setAttribute('data-is-recurring', 'true');
    }
    if (schedule.isRecurringInstance) {
        card.setAttribute('data-is-recurring-instance', 'true');
    }
    card.addEventListener('dblclick', () => editSchedule(schedule.id));
    const categoryColor = schedule.color || getCategoryColor(schedule.category);
    const categoryName = getCategoryDisplayName(schedule.category);
    const repeatIcon = (schedule.repeat && schedule.repeat !== 'none')
        ? `<span class="repeat-icon" title="${getRepeatDisplayName(schedule.repeat)} 반복">🔄</span>`
        : '';
    card.innerHTML = `
        <div class="schedule-card-header">
            <div class="schedule-number">${number}</div>
            <div class="schedule-color" style="background-color: ${categoryColor}"></div>
            <div class="schedule-title">${schedule.title}${repeatIcon}</div>
            <button class="delete-btn" onclick="deleteSchedule('${schedule.id}')">삭제</button>
        </div>
        <div class="schedule-category">
            <span class="schedule-date">${formatDate(schedule.startDate)} ~ ${formatDate(schedule.endDate)}</span>
            <span class="category-badge" style="color: ${categoryColor}; font-weight: bold;">${categoryName}</span>
        </div>
    `;
    return card;
}

// 캘린더 렌더링
function renderCalendar() {
    const calendar = document.querySelector('.calendar');
    calendar.innerHTML = '';
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const startMonth = currentMonth - 12;
    const startYear = currentYear + Math.floor(startMonth / 12);
    const adjustedStartMonth = (startMonth % 12 + 12) % 12;
    const endMonth = currentMonth + 12;
    const endYear = currentYear + Math.floor(endMonth / 12);
    const adjustedEndMonth = endMonth % 12;
    cleanupOldSchedules();
    const months = [];
    let year = startYear;
    let month = adjustedStartMonth;
    while (year < endYear || (year === endYear && month <= adjustedEndMonth)) {
        months.push({ month, year });
        month++;
        if (month > 11) {
            month = 0;
            year++;
        }
    }
    months.forEach(({ month, year }) => {
        const monthContainer = createMonthContainer(month, year);
        calendar.appendChild(monthContainer);
    });
    setTimeout(() => {
        const currentMonthElement = calendar.querySelector(`[data-month="${currentMonth}"][data-year="${currentYear}"]`);
        if (currentMonthElement) {
            currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// 오래된 일정 정리
function cleanupOldSchedules() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oldSchedules = schedules.filter(schedule => {
        const endDate = new Date(schedule.endDate);
        return endDate < oneYearAgo;
    });
    if (oldSchedules.length > 0) {
        console.log(`${oldSchedules.length}개의 오래된 일정 삭제 중...`);
        schedules = schedules.filter(schedule => {
            const endDate = new Date(schedule.endDate);
            return endDate >= oneYearAgo;
        });
        saveSchedules();
    }
}

// 일정 드래그 종료
function stopScheduleDrag(e) {
    if (!isDraggingSchedule) return;
    isDraggingSchedule = false;
    currentDragElement.classList.remove('dragging');
    currentDragElement.style.zIndex = '';
    currentDragElement.style.opacity = '';
    const scheduleId = currentDragElement.getAttribute('data-schedule-id');
    if (scheduleId && currentLineNumber !== originalLineNumber) {
        const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
        if (scheduleIndex !== -1) {
            schedules[scheduleIndex].order = currentLineNumber;
            saveSchedules();
            const dateStr = currentDragElement.closest('.day-cell').getAttribute('data-date');
            if (dateStr) {
                const date = new Date(dateStr);
                const schedulesContainer = currentDragElement.closest('.schedules-container');
                if (schedulesContainer) {
                    const cell = schedulesContainer.closest('.day-cell');
                    const dayNum = parseInt(cell.querySelector('.day-number').textContent);
                    const newCell = createDayCell(date.getFullYear(), date.getMonth(), dayNum);
                    cell.parentNode.replaceChild(newCell, cell);
                }
            }
            setTimeout(() => {
                renderCalendar();
            }, 100);
        }
    }
    currentDragElement = null;
    document.removeEventListener('mousemove', handleScheduleDrag);
    document.removeEventListener('mouseup', stopScheduleDrag);
}

// 날짜 셀 생성
function createDayCell(year, month, day) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    const date = new Date(year, month, day);
    const dateStr = formatDateToYYYYMMDD(date);
    cell.setAttribute('data-date', dateStr);
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    
    // 요일에 따라 색상 지정
    const dayOfWeek = date.getDay(); // 0: 일요일, 6: 토요일
    if (dayOfWeek === 0) { // 일요일
        dayNumber.classList.add('sunday');
    } else if (dayOfWeek === 6) { // 토요일
        dayNumber.classList.add('saturday');
    }
    
    cell.appendChild(dayNumber);
    
    const schedulesContainer = document.createElement('div');
    schedulesContainer.className = 'schedules-container';
    const daySchedules = getAllSchedulesForDate(date);
    daySchedules.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        } else if (a.order !== undefined) {
            return -1;
        } else if (b.order !== undefined) {
            return 1;
        }
        const startDiff = new Date(a.startDate) - new Date(b.startDate);
        if (startDiff !== 0) return startDiff;
        const aEnd = new Date(a.endDate);
        const aStart = new Date(a.startDate);
        const bEnd = new Date(b.endDate);
        const bStart = new Date(b.startDate);
        return (aEnd - aStart) - (bEnd - bStart);
    });
    const scheduleLines = {};
    let maxLine = 0;
    const scheduleNumbers = {};
    schedules.forEach((schedule, index) => {
        scheduleNumbers[schedule.id] = index + 1;
    });
    daySchedules.forEach(schedule => {
        if (schedule.order !== undefined) {
            scheduleLines[schedule.id] = schedule.order;
            maxLine = Math.max(maxLine, schedule.order);
            return;
        }
        const overlappingSchedules = daySchedules.filter(s => {
            if (s === schedule) return false;
            const sStart = new Date(s.startDate);
            const sEnd = new Date(s.endDate);
            const scheduleStart = new Date(schedule.startDate);
            const scheduleEnd = new Date(schedule.endDate);
            const isOverlapping = (scheduleStart <= sEnd && scheduleEnd >= sStart);
            return isOverlapping && scheduleLines[s.id] !== undefined;
        });
        let lineNumber = 0;
        let foundLine = false;
        const usedLines = overlappingSchedules.map(s => scheduleLines[s.id]);
        while (!foundLine) {
            if (!usedLines.includes(lineNumber)) {
                foundLine = true;
            } else {
                lineNumber++;
            }
        }
        scheduleLines[schedule.id] = lineNumber;
        maxLine = Math.max(maxLine, lineNumber);
    });
    daySchedules.forEach(schedule => {
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        if (isSameDate(date, startDate) || (date.getDate() === 1 && date >= startDate && date <= endDate)) {
            const line = document.createElement('div');
            line.className = 'schedule-line';
            line.setAttribute('data-schedule-id', schedule.id);
            line.setAttribute('data-line-number', scheduleLines[schedule.id]);
            line.setAttribute('draggable', 'true');
            const backgroundColor = schedule.color || getCategoryColor(schedule.category);
            line.style.backgroundColor = backgroundColor;
            line.style.color = getContrastColor(backgroundColor);
            const monthEndDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const strippedDate = stripTime(date);
            const strippedEndDate = stripTime(endDate);
            const periodEndDate = strippedEndDate < monthEndDate ? strippedEndDate : monthEndDate;
            const duration = Math.max(1, Math.round((periodEndDate - strippedDate) / (1000 * 60 * 60 * 24)) + 1);
            line.style.width = `calc(${duration * 100}% - 5%)`;
            const scheduleNumber = scheduleNumbers[schedule.id] || '';
            line.innerHTML = `<span class="schedule-line-text">${scheduleNumber}. ${schedule.title}</span>`;
            line.title = `${schedule.title}\n${formatDate(schedule.startDate)} ~ ${formatDate(schedule.endDate)} (${duration}일)`;
            const lineNumber = scheduleLines[schedule.id];
            line.style.top = `${lineNumber * 22}px`;
            const resizer = document.createElement('div');
            resizer.className = 'schedule-line-resizer';
            line.appendChild(resizer);
            resizer.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                isResizingSchedule = true;
                currentResizingElement = line;
                startX = e.clientX;
                startWidth = line.offsetWidth;
                resizer.classList.add('active');
                document.addEventListener('mousemove', handleScheduleResize);
                document.addEventListener('mouseup', stopScheduleResize);
            });
            line.addEventListener('mousedown', (e) => {
                if (e.target === resizer) return;
                isDraggingSchedule = true;
                currentDragElement = line;
                originalLineNumber = parseInt(line.getAttribute('data-line-number'));
                currentLineNumber = originalLineNumber;
                startY = e.clientY;
                line.classList.add('dragging');
                document.addEventListener('mousemove', handleScheduleDrag);
                document.addEventListener('mouseup', stopScheduleDrag);
                e.preventDefault();
            });
            line.onclick = (e) => {
                if (isDraggingSchedule || Math.abs(e.clientY - startY) > 5) {
                    e.stopPropagation();
                    return;
                }
                editSchedule(schedule.id);
            };
            schedulesContainer.appendChild(line);
        }
    });
    const totalLines = maxLine + 1;
    if (totalLines > 0) {
        const containerHeight = totalLines * 22 + 8;
        schedulesContainer.style.height = `${containerHeight}px`;
        cell.style.minHeight = `${Math.max(100, containerHeight + 40)}px`;
    }
    cell.appendChild(schedulesContainer);
    return cell;
}

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 일정 리사이저 처리
function handleScheduleResize(e) {
    if (!isResizingSchedule) return;
    const delta = e.clientX - startX;
    const newWidth = Math.max(100, Math.min(300, startWidth + delta));
    currentResizingElement.style.width = `${newWidth}px`;
}

// 일정 리사이저 종료
function stopScheduleResize() {
    if (!isResizingSchedule) return;
    const activeResizer = document.querySelector('.schedule-line-resizer.active');
    if (activeResizer) {
        activeResizer.classList.remove('active');
    }
    const scheduleId = currentResizingElement.getAttribute('data-schedule-id');
    if (scheduleId) {
        const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
        if (scheduleIndex !== -1) {
            const schedule = schedules[scheduleIndex];
            const startDate = new Date(schedule.startDate);
            const originalEndDate = new Date(schedule.endDate);
            const originalDuration = Math.ceil((originalEndDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const dayWidth = 100;
            const newWidth = currentResizingElement.offsetWidth;
            const parentWidth = currentResizingElement.parentNode.offsetWidth;
            const newDuration = Math.max(1, Math.round((newWidth / parentWidth) * 7));
            const newEndDate = new Date(startDate);
            newEndDate.setDate(startDate.getDate() + newDuration - 1);
            schedules[scheduleIndex].endDate = formatDateToYYYYMMDD(newEndDate);
            saveSchedules();
            renderScheduleList();
            renderCalendar();
        }
    }
    isResizingSchedule = false;
    currentResizingElement = null;
    document.removeEventListener('mousemove', handleScheduleResize);
    document.removeEventListener('mouseup', stopScheduleResize);
}

// 날짜 비교
function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 특정 날짜의 모든 일정
function getAllSchedulesForDate(date) {
    const dateStr = formatDateToYYYYMMDD(date);
    return schedules.filter(schedule => {
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        const currentDate = new Date(dateStr);
        return currentDate >= startDate && currentDate <= endDate;
    });
}

// 카테고리 색상
function getCategoryColor(category) {
    const colors = {
        'work': '#3b82f6',
        'personal': '#10b981',
        'meeting': '#f59e0b',
        'study': '#ef4444',
        'travel': '#8b5cf6',
        'event': '#6366f1',
        'other': '#6b7280'
    };
    return colors[category] || colors['other'];
}

// 카테고리 이름
function getCategoryDisplayName(category) {
    const displayNames = {
        'work': '업무',
        'personal': '개인',
        'meeting': '회의',
        'study': '학습',
        'travel': '여행',
        'event': '행사',
        'other': '기타'
    };
    return displayNames[category] || '기타';
}

// 대비 색상
function getContrastColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
}

// 날짜 포맷팅
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 일정 드래그 처리
function handleScheduleDrag(e) {
    if (!isDraggingSchedule) return;
    const deltaY = e.clientY - startY;
    const lineHeight = 22;
    const lineDelta = Math.round(deltaY / lineHeight);
    const newLineNumber = Math.max(0, originalLineNumber + lineDelta);
    if (newLineNumber !== currentLineNumber) {
        currentLineNumber = newLineNumber;
        currentDragElement.style.top = `${currentLineNumber * lineHeight}px`;
        currentDragElement.setAttribute('data-line-number', currentLineNumber);
        currentDragElement.style.zIndex = '50';
        currentDragElement.style.opacity = '0.8';
    }
}

// 파일로 일정 내보내기
async function exportSchedulesToFile() {
    try {
        let fileContent = '';
        schedules.forEach(schedule => {
            const line = `${schedule.startDate}|${schedule.endDate}|${schedule.title}|${schedule.description || ''}|${schedule.color}\n`;
            fileContent += line;
        });
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'Scheduler-dh.txt',
                    types: [{
                        description: '텍스트 파일',
                        accept: {'text/plain': ['.txt']},
                    }],
                });
                const writable = await fileHandle.createWritable();
                await writable.write(fileContent);
                await writable.close();
                alert('일정이 파일로 저장되었습니다.');
                return;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    throw err;
                }
                console.log('파일 저장이 취소되었거나 API가 지원되지 않습니다. 대체 방식을 시도합니다.');
            }
        }
        const exportModal = document.createElement('div');
        exportModal.className = 'modal active';
        exportModal.innerHTML = `
            <div class="modal-content">
                <h3>일정 내보내기</h3>
                <p>아래 내용을 복사하여 텍스트 파일로 저장하세요.</p>
                <textarea id="exportContent" style="width: 100%; height: 200px; margin: 10px 0;" readonly>${fileContent}</textarea>
                <div class="modal-buttons">
                    <button id="copyExportBtn">복사</button>
                    <button id="downloadExportBtn">다운로드</button>
                    <button id="closeExportBtn">닫기</button>
                </div>
            </div>
        `;
        document.body.appendChild(exportModal);
        const exportContent = document.getElementById('exportContent');
        exportContent.select();
        document.getElementById('copyExportBtn').addEventListener('click', () => {
            exportContent.select();
            document.execCommand('copy');
            alert('클립보드에 복사되었습니다.');
        });
        document.getElementById('downloadExportBtn').addEventListener('click', () => {
            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Scheduler-dh.txt';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        document.getElementById('closeExportBtn').addEventListener('click', () => {
            document.body.removeChild(exportModal);
        });
    } catch (error) {
        console.error('일정 내보내기 중 오류:', error);
        showError('일정을 파일로 저장하는 중 오류가 발생했습니다.');
    }
}

// 파일에서 일정 가져오기
function importSchedulesFromFile(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const lines = content.split('\n').filter(line => line.trim());
                const importedSchedules = [];
                lines.forEach(line => {
                    const parts = line.split('|');
                    if (parts.length >= 5) {
                        const startDate = parts[0];
                        const endDate = parts[1];
                        const title = parts[2];
                        const description = parts[3];
                        const color = parts[4];
                        const schedule = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            title,
                            description,
                            startDate,
                            endDate,
                            color,
                            category: 'other',
                            repeat: 'none',
                            reminder: false,
                            reminderTime: '30',
                            order: 0
                        };
                        importedSchedules.push(schedule);
                    }
                });
                if (importedSchedules.length > 0) {
                    importedSchedules.sort((a, b) => {
                        const startDiff = new Date(a.startDate) - new Date(b.startDate);
                        if (startDiff !== 0) return startDiff;
                        return new Date(a.endDate) - new Date(b.endDate);
                    });
                    assignOrderToSchedules(importedSchedules);
                    schedules = importedSchedules;
                    saveSchedules();
                    renderScheduleList();
                    renderCalendar();
                    alert(`기존 일정이 삭제되고 ${importedSchedules.length}개의 새 일정을 불러왔습니다.`);
                } else {
                    alert('불러올 일정이 없거나 파일 형식이 올바르지 않습니다.');
                }
            } catch (error) {
                console.error('파일 파싱 중 오류:', error);
                showError('파일 내용을 분석하는 중 오류가 발생했습니다.');
            }
        };
        reader.onerror = function() {
            showError('파일을 읽는 중 오류가 발생했습니다.');
        };
        reader.readAsText(file);
        event.target.value = '';
    } catch (error) {
        console.error('일정 가져오기 중 오류:', error);
        showError('파일에서 일정을 가져오는 중 오류가 발생했습니다.');
    }
}

// 일정에 order 값 할당
function assignOrderToSchedules(schedules) {
    if (schedules.length === 0) return schedules;
    schedules.forEach(schedule => {
        schedule.order = 0;
    });
    const dateRangeMap = {};
    schedules.forEach(schedule => {
        const start = new Date(schedule.startDate);
        const end = new Date(schedule.endDate);
        const dateList = [];
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = formatDateToYYYYMMDD(new Date(date));
            dateList.push(dateStr);
            if (!dateRangeMap[dateStr]) {
                dateRangeMap[dateStr] = [];
            }
            dateRangeMap[dateStr].push(schedule.id);
        }
    });
    const scheduleLines = {};
    Object.keys(dateRangeMap).sort().forEach(dateStr => {
        const schedulesForDate = dateRangeMap[dateStr];
        const usedLines = new Set();
        schedulesForDate.forEach(scheduleId => {
            const schedule = schedules.find(s => s.id === scheduleId);
            if (schedule && scheduleLines[scheduleId] !== undefined) {
                usedLines.add(scheduleLines[scheduleId]);
            }
        });
        schedulesForDate.forEach(scheduleId => {
            const schedule = schedules.find(s => s.id === scheduleId);
            if (schedule && scheduleLines[scheduleId] === undefined) {
                let line = 0;
                while (usedLines.has(line)) {
                    line++;
                }
                scheduleLines[scheduleId] = line;
                usedLines.add(line);
            }
        });
    });
    Object.keys(scheduleLines).forEach(scheduleId => {
        const schedule = schedules.find(s => s.id === scheduleId);
        if (schedule) {
            schedule.order = scheduleLines[scheduleId];
        }
    });
    return schedules;
}

// 카테고리별 필터링
function filterSchedulesByCategory() {
    const selectedCategory = categoryFilter.value;
    renderScheduleList(selectedCategory);
}

// 반복 편집 모달 닫기
function closeRecurringEditModal() {
    console.log('반복 편집 모달 닫기 함수 호출됨');
    if (recurringEditModal) {
        recurringEditModal.classList.remove('active');
    } else {
        console.warn('recurringEditModal 요소를 찾을 수 없습니다');
    }
    // 편집 모달을 닫을 때 ID를 지우지 않음
    // editingScheduleId는 유지하고 editingRecurringType만 리셋
    console.log('현재 편집 중인 일정 ID 유지:', editingScheduleId);
    editingRecurringType = null;
}

// 반복 일정 편집 처리
function handleRecurringEdit(type) {
    console.log('반복 일정 편집 처리:', type);
    console.log('편집할 일정 ID (전역변수):', editingScheduleId);
    
    // 만약 전역변수가 널이면 data 속성에서 ID 가져오기
    if (!editingScheduleId && recurringEditModal) {
        const dataId = recurringEditModal.getAttribute('data-schedule-id');
        if (dataId) {
            console.log('data 속성에서 ID 복구:', dataId);
            editingScheduleId = dataId;
        }
    }
    
    editingRecurringType = type;
    closeRecurringEditModal();
    
    console.log('모달 닫은 후 편집할 일정 ID:', editingScheduleId);
    const schedule = schedules.find(s => s.id === editingScheduleId);
    
    if (!schedule) {
        console.error('일정을 찾을 수 없습니다. ID:', editingScheduleId);
        showError('선택한 일정을 찾을 수 없습니다.');
        return;
    }
    
    console.log('찾은 일정 정보:', schedule);
    
    // 폼에 일정 정보 채우기
    try {
        fillScheduleForm(schedule);
        openScheduleModal();
        deleteScheduleBtn.style.display = 'block';
        deleteScheduleBtn.onclick = () => {
            closeScheduleModal();
            deleteSchedule(editingScheduleId);
        };
        document.getElementById('modalTitle').textContent = '일정 수정';
    } catch (error) {
        console.error('일정 폼 채우기 실패:', error);
        showError('일정 수정 폼을 열 수 없습니다.');
    }
}

// 현재 일정부터 반복 일정 삭제
function deleteFutureRecurringEvents() {
    console.log('향후 반복 일정 삭제 함수 호출됨');
    const schedule = schedules.find(s => s.id === editingScheduleId);
    if (!schedule) return;

    try {
        const originalId = schedule.isRecurringInstance ? schedule.originalId : schedule.id;
        const currentDate = new Date(schedule.startDate);
        
        // 현재 일정 포함 향후 인스턴스 개수 계산
        const deletedCount = schedules.filter(s => {
            if (s.originalId === originalId) {
                const scheduleDate = new Date(s.startDate);
                return scheduleDate >= currentDate; // 현재 날짜부터 모든 인스턴스 계산 (포함)
            }
            return false;
        }).length;
        
        // 현재 인스턴스인 경우 본인도 삭제해야 함
        let currentScheduleDeleted = false;
        if (schedule.isRecurringInstance) {
            currentScheduleDeleted = true;
        }
        
        // 실제 삭제 실행 - 현재 날짜부터 모든 인스턴스 삭제
        schedules = schedules.filter(s => {
            // 원본 ID가 일치하는 경우
            if (s.originalId === originalId) {
                const scheduleDate = new Date(s.startDate);
                return scheduleDate < currentDate; // 현재 날짜 이전의 인스턴스만 유지
            }
            // 현재 편집 중인 인스턴스인 경우 (본인도 삭제)
            if (s.id === editingScheduleId && schedule.isRecurringInstance) {
                return false;
            }
            return true; // 다른 일정은 모두 유지
        });
        
        saveSchedules();
        renderScheduleList();
        renderCalendar();
        closeRecurringEditModal();
        
        alert(`이 일정부터 반복 일정 ${deletedCount}개가 삭제되었습니다.`);
    } catch (error) {
        console.error('반복 일정 삭제 중 오류:', error);
        showError('반복 일정을 삭제하는 중 오류가 발생했습니다.');
    }
}