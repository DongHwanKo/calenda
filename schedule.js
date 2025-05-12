// 전역 변수
let schedules = [];
let editingScheduleId = null;
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

// 카테고리 관리
let categories = JSON.parse(localStorage.getItem('categories')) || [
    { id: 'work', name: '업무', color: '#3b82f6' },
    { id: 'personal', name: '개인', color: '#10b981' },
    { id: 'meeting', name: '회의', color: '#f59e0b' },
    { id: 'study', name: '학습', color: '#8b5cf6' },
    { id: 'travel', name: '여행', color: '#ec4899' },
    { id: 'event', name: '행사', color: '#ef4444' },
    { id: 'other', name: '기타', color: '#6b7280' }
];

// DOM 요소
const scheduleList = document.getElementById('scheduleList');
const addScheduleBtn = document.getElementById('addScheduleBtn');
const scheduleModal = document.getElementById('scheduleModal');
const scheduleForm = document.getElementById('scheduleForm');
const saveScheduleBtn = document.getElementById('saveScheduleBtn');
const cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
const deleteScheduleBtn = document.getElementById('deleteScheduleBtn');
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
        loadSchedules();
        renderScheduleList();
        renderCalendar();
        
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
            [categoryFilter, 'change', filterSchedulesByCategory]
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
            element.addEventListener(event, handler);
        });

        // 이벤트 리스너 정리를 위한 참조 저장
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
        
        // 일정 정렬 (시작일 빠른순 → 기간 긴순)
        schedules.sort((a, b) => {
            // 시작일 기준 정렬
            const startDiff = new Date(a.startDate) - new Date(b.startDate);
            if (startDiff !== 0) return startDiff;
            
            // 시작일이 같으면 기간 긴 순
            const durationA = new Date(a.endDate) - new Date(a.startDate);
            const durationB = new Date(b.endDate) - new Date(b.startDate);
            return durationB - durationA; // 기간이 긴 것이 먼저
        });
        
        // 일정 겹침 방지를 위한 order 값 재할당
        assignOrderToSchedules(schedules);
        
        // 변경사항 저장 및 UI 업데이트
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

// 일정 저장
function saveSchedule() {
    try {
        // 기존 일정에서 order 값을 가져옴
        let currentOrder = 0;
        if (editingScheduleId) {
            const existingSchedule = schedules.find(s => s.id === editingScheduleId);
            if (existingSchedule && existingSchedule.order !== undefined) {
                currentOrder = existingSchedule.order;
            }
        }
        
        const scheduleData = {
            id: editingScheduleId || Date.now().toString(),
            title: document.getElementById('scheduleTitle').value,
            description: document.getElementById('scheduleDescription').value,
            startDate: document.getElementById('scheduleStart').value,
            endDate: document.getElementById('scheduleEnd').value,
            category: document.getElementById('scheduleCategory').value,
            color: document.getElementById('scheduleColor').value || getCategoryColor(document.getElementById('scheduleCategory').value),
            repeat: document.getElementById('scheduleRepeat').value,
            reminder: document.getElementById('scheduleReminder').checked,
            reminderTime: document.getElementById('scheduleReminderTime').value,
            order: currentOrder // 기존 순서값 사용
        };

        validateScheduleData(scheduleData);

        if (editingScheduleId) {
            const index = schedules.findIndex(s => s.id === editingScheduleId);
            if (index !== -1) {
                // 기존 order 값 보존하며 데이터 병합
                const existingSchedule = schedules[index];
                schedules[index] = {
                    ...existingSchedule,
                    ...scheduleData,
                    order: existingSchedule.order !== undefined ? existingSchedule.order : 0
                };
            }
        } else {
            // 새 일정인 경우, 적절한 order 값 할당
            const startDate = new Date(scheduleData.startDate);
            const endDate = new Date(scheduleData.endDate);
            
            // 이 날짜 범위에 해당하는 일정들을 가져와 사용 중인 order 값 확인
            const overlappingSchedules = schedules.filter(s => {
                const sStart = new Date(s.startDate);
                const sEnd = new Date(s.endDate);
                return (startDate <= sEnd && endDate >= sStart);
            });
            
            // 사용 중인 order 값 수집
            const usedOrders = new Set();
            overlappingSchedules.forEach(s => {
                if (s.order !== undefined) {
                    usedOrders.add(s.order);
                }
            });
            
            // 사용 가능한 가장 낮은 order 값 찾기
            let order = 0;
            while (usedOrders.has(order)) {
                order++;
            }
            
            scheduleData.order = order;
            schedules.push(scheduleData);
        }

        saveSchedules();
        renderScheduleList();
        // 전체 캘린더를 다시 렌더링하여 모든 월에 변경사항 적용
        renderCalendar(); 
        closeScheduleModal();
    } catch (error) {
        showError(error.message);
    }
}

// 날짜의 시간 정보를 제거하는 헬퍼 함수 추가
function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// 캘린더 렌더링
function renderCalendar() {
    const calendar = document.querySelector('.calendar');
    calendar.innerHTML = '';

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // 표시할 월 범위 계산 (현재 기준 -12개월 ~ +12개월, 총 25개월)
    const startMonth = currentMonth - 12;
    const startYear = currentYear + Math.floor(startMonth / 12);
    const adjustedStartMonth = (startMonth % 12 + 12) % 12; // 음수 처리
    
    const endMonth = currentMonth + 12;
    const endYear = currentYear + Math.floor(endMonth / 12);
    const adjustedEndMonth = endMonth % 12;
    
    // 오래된 일정 삭제 (1년 이상 지난 일정)
    cleanupOldSchedules();
    
    // 표시할 모든 월 생성
    const months = [];
    
    // 시작 년월부터 종료 년월까지 모든 월 추가
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
    
    // 캘린더 렌더링
    months.forEach(({ month, year }) => {
        const monthContainer = createMonthContainer(month, year);
        calendar.appendChild(monthContainer);
    });
    
    // 현재 월로 스크롤
    setTimeout(() => {
        const currentMonthElement = calendar.querySelector(`[data-month="${currentMonth}"][data-year="${currentYear}"]`);
        if (currentMonthElement) {
            currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// 월 컨테이너 생성 함수
function createMonthContainer(month, year) {
    const container = document.createElement('div');
    container.className = 'month-container';
    container.setAttribute('data-month', month);
    container.setAttribute('data-year', year);
    
    const title = document.createElement('div');
    title.className = 'month-title';
    title.textContent = `${year}년 ${month + 1}월`;
    
    const daysGrid = document.createElement('div');
    daysGrid.className = 'days-grid';
    
    // 해당 월의 첫 날과 마지막 날 계산
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 첫 날의 요일 계산 (0: 일요일, 6: 토요일)
    const firstDayOfWeek = firstDay.getDay();
    
    // 이전 달의 빈 셀 추가
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        daysGrid.appendChild(emptyCell);
    }
    
    // 현재 달의 날짜들 추가
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const cell = createDayCell(year, month, day);
        daysGrid.appendChild(cell);
    }
    
    // 다음 달의 빈 셀 추가 (6주를 채우기 위해)
    const totalCells = 42; // 6주 * 7일
    const remainingCells = totalCells - (firstDayOfWeek + lastDay.getDate());
    
    // 마지막 주에 날짜가 없는 경우 해당 주를 표시하지 않음
    const lastWeekEmpty = remainingCells >= 7;
    const cellsToAdd = lastWeekEmpty ? remainingCells - 7 : remainingCells;
    
    for (let i = 0; i < cellsToAdd; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        daysGrid.appendChild(emptyCell);
    }
    
    container.appendChild(title);
    container.appendChild(daysGrid);
    return container;
}

// 날짜 셀 생성 함수
function createDayCell(year, month, day) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    
    const date = new Date(year, month, day);
    const dateStr = formatDateToYYYYMMDD(date);
    cell.setAttribute('data-date', dateStr);
    
    // 더블클릭 이벤트 추가
    cell.addEventListener('dblclick', () => {
        if (!cell.classList.contains('empty')) {
            openScheduleModalWithDate(dateStr);
        }
    });
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    
    const weekday = document.createElement('span');
    weekday.className = 'weekday';
    weekday.textContent = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    
    const dayNum = document.createElement('span');
    dayNum.className = 'day-num';
    if (date.getDay() === 0) {
        dayNum.classList.add('sunday');
    } else if (date.getDay() === 6) {
        dayNum.classList.add('saturday');
    }
    dayNum.textContent = day;
    
    dayNumber.appendChild(weekday);
    dayNumber.appendChild(dayNum);
    cell.appendChild(dayNumber);
    
    const schedulesContainer = document.createElement('div');
    schedulesContainer.className = 'schedules-container';
    
    const daySchedules = getAllSchedulesForDate(date);
    
    // 일정 정렬 - 사용자 지정 순서(order)로 우선 정렬
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
    
    // 각 일정의 줄 번호 결정
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
    
    // 일정 요소 생성 및 배치
    daySchedules.forEach(schedule => {
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        
        // 각 주의 첫 날 또는 월의 첫 날에 일정 막대 생성
        if (isSameDate(date, startDate) || 
            (date.getDay() === 0 && date >= startDate && date <= endDate) ||
            (date.getDate() === 1 && date >= startDate && date <= endDate)) {
            
            const line = document.createElement('div');
            line.className = 'schedule-line';
            line.setAttribute('data-schedule-id', schedule.id);
            line.setAttribute('data-line-number', scheduleLines[schedule.id]);
            line.setAttribute('draggable', 'true');
            
            const backgroundColor = schedule.color || getCategoryColor(schedule.category);
            line.style.backgroundColor = backgroundColor;
            line.style.color = getContrastColor(backgroundColor);
            
            // 일정 기간에 따른 너비 계산
            const weekStartDate = new Date(date);
            weekStartDate.setDate(date.getDate() - date.getDay()); // 해당 주의 시작일 (일요일)
            
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekStartDate.getDate() + 6); // 해당 주의 종료일 (토요일)
            
            const monthEndDate = new Date(date.getFullYear(), date.getMonth() + 1, 0); // 현재 월의 마지막 날
            
            const strippedDate = stripTime(date);
            const strippedEndDate = stripTime(endDate);
            
            // 현재 주에서의 일정 기간 계산
            let periodStart = strippedDate;
            let periodEnd = strippedEndDate;
            
            // 시작일이 현재 주보다 이전인 경우
            if (strippedDate < weekStartDate) {
                periodStart = weekStartDate;
            }
            
            // 종료일이 현재 주보다 이후인 경우
            if (strippedEndDate > weekEndDate) {
                periodEnd = weekEndDate;
            }
            
            // 종료일이 현재 월의 마지막 날보다 이후인 경우
            if (periodEnd > monthEndDate) {
                periodEnd = monthEndDate;
            }
            
            const duration = Math.max(1, Math.round((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1);
            line.style.width = `calc(${duration * 100}% - 8px)`;
            
            const scheduleNumber = schedules.findIndex(s => s.id === schedule.id) + 1;
            line.innerHTML = `<span class="schedule-line-text">${scheduleNumber}. ${schedule.title}</span>`;
            line.title = `${schedule.title}\n${formatDate(schedule.startDate)} ~ ${formatDate(schedule.endDate)} (${duration}일)`;
            
            const lineNumber = scheduleLines[schedule.id];
            line.style.top = `${lineNumber * 22}px`;
            
            const resizer = document.createElement('div');
            resizer.className = 'schedule-line-resizer';
            line.appendChild(resizer);
            
            // 이벤트 리스너 추가
            setupScheduleLineEventListeners(line, resizer, schedule);
            
            schedulesContainer.appendChild(line);
        }
    });
    
    // 컨테이너 높이 설정
    const totalLines = maxLine + 1;
    if (totalLines > 0) {
        const containerHeight = totalLines * 22 + 8;
        schedulesContainer.style.height = `${containerHeight}px`;
        cell.style.minHeight = `${Math.max(100, containerHeight + 40)}px`;
    }
    
    cell.appendChild(schedulesContainer);
    return cell;
}

// 일정 라인 이벤트 리스너 설정
function setupScheduleLineEventListeners(line, resizer, schedule) {
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
        schedules = schedules.filter(schedule => schedule.id !== id);
        saveSchedules();
        renderScheduleList();
        renderCalendar();
    }
}

// 일정 수정
function editSchedule(id) {
    const schedule = schedules.find(s => s.id === id);
    if (schedule) {
        editingScheduleId = id;
        fillScheduleForm(schedule);
        openScheduleModal();
        
        // 삭제 버튼 표시
        deleteScheduleBtn.style.display = 'block';
        deleteScheduleBtn.onclick = () => {
            closeScheduleModal();
            deleteSchedule(id);
        };
        
        // 모달 제목 변경
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
    document.getElementById('scheduleRepeat').value = schedule.repeat;
    document.getElementById('scheduleReminder').checked = schedule.reminder;
    document.getElementById('scheduleReminderTime').value = schedule.reminderTime;
    toggleReminderTime();
}

// 선택한 날짜로 일정 추가 모달 열기
function openScheduleModalWithDate(dateStr) {
    editingScheduleId = null;
    scheduleForm.reset();
    
    // 시작일과 종료일을 선택한 날짜로 설정
    document.getElementById('scheduleStart').value = dateStr;
    document.getElementById('scheduleEnd').value = dateStr;
    
    // 모달 제목 변경
    document.getElementById('modalTitle').textContent = '일정 추가';
    
    // 삭제 버튼 숨김
    deleteScheduleBtn.style.display = 'none';
    
    // 모달 표시
    scheduleModal.classList.add('active');
}

// 기존 openScheduleModal 함수 수정
function openScheduleModal() {
    scheduleModal.classList.add('active');
    if (!editingScheduleId) {
        scheduleForm.reset();
        // 새 일정 추가 시 삭제 버튼 숨김
        deleteScheduleBtn.style.display = 'none';
        document.getElementById('modalTitle').textContent = '일정 추가';
    }
}

// 모달 닫기
function closeScheduleModal() {
    scheduleModal.classList.remove('active');
    editingScheduleId = null;
    scheduleForm.reset();
    
    // 이벤트 리스너 제거
    deleteScheduleBtn.onclick = null;
}

// 알림 설정 토글
function toggleReminderTime() {
    reminderTime.disabled = !reminderSetting.checked;
}

// 일정 목록 렌더링
function renderScheduleList(categoryFilter = 'all') {
    scheduleList.innerHTML = '';

    // 날짜순, 기간순으로 정렬
    const sortedSchedules = [...schedules].sort((a, b) => {
        // 시작일 기준 정렬
        const startDiff = new Date(a.startDate) - new Date(b.startDate);
        if (startDiff !== 0) return startDiff;
        
        // 시작일이 같으면 기간 긴 순
        const durationA = new Date(a.endDate) - new Date(a.startDate);
        const durationB = new Date(b.endDate) - new Date(b.startDate);
        return durationB - durationA;
    });

    // 필터링된 일정 목록
    const filteredSchedules = categoryFilter === 'all' 
        ? sortedSchedules 
        : sortedSchedules.filter(schedule => schedule.category === categoryFilter);

    // 일정 카드 추가 (번호 부여)
    filteredSchedules.forEach((schedule, index) => {
        const card = createScheduleCard(schedule, index + 1);
        scheduleList.appendChild(card);
    });
    
    // 필터링된 결과가 없을 때 메시지 표시
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
    
    // 더블클릭 이벤트 추가
    card.addEventListener('dblclick', () => editSchedule(schedule.id));
    
    // 카테고리 색상과 이름
    const categoryColor = schedule.color || getCategoryColor(schedule.category);
    const categoryName = getCategoryDisplayName(schedule.category);
    
    card.innerHTML = `
        <div class="schedule-card-header">
            <div class="schedule-number">${number}</div>
            <div class="schedule-color" style="background-color: ${categoryColor}"></div>
            <div class="schedule-title">${schedule.title}</div>
            <button class="delete-btn" onclick="deleteSchedule('${schedule.id}')">삭제</button>
        </div>
        <div class="schedule-category">
            <span class="schedule-date">${formatDate(schedule.startDate)} ~ ${formatDate(schedule.endDate)}</span>
            <span class="category-badge" style="color: ${categoryColor}; font-weight: bold;">${categoryName}</span>
        </div>
    `;
    return card;
}

// 오래된 일정 정리 (1년 이상 지난 일정 삭제)
function cleanupOldSchedules() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // 종료일이 1년 이상 지난 일정 필터링
    const oldSchedules = schedules.filter(schedule => {
        const endDate = new Date(schedule.endDate);
        return endDate < oneYearAgo;
    });
    
    if (oldSchedules.length > 0) {
        console.log(`${oldSchedules.length}개의 오래된 일정 삭제 중...`);
        
        // 오래된 일정 삭제
        schedules = schedules.filter(schedule => {
            const endDate = new Date(schedule.endDate);
            return endDate >= oneYearAgo;
        });
        
        // 변경사항 저장
        saveSchedules();
    }
}

// 일정 드래그 종료
function stopScheduleDrag(e) {
    if (!isDraggingSchedule) return;
    
    // 드래그 상태 초기화
    isDraggingSchedule = false;
    
    // 스타일 복원
    currentDragElement.classList.remove('dragging');
    currentDragElement.style.zIndex = '';
    currentDragElement.style.opacity = '';
    
    // 일정 ID 가져오기
    const scheduleId = currentDragElement.getAttribute('data-schedule-id');
    
    if (scheduleId && currentLineNumber !== originalLineNumber) {
        // 일정의 우선순위/순서 변경
        const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
        
        if (scheduleIndex !== -1) {
            // 일정에 순서 정보 저장
            const schedule = schedules[scheduleIndex];
            schedule.order = currentLineNumber;
            
            // 변경 내용 저장
            saveSchedules();
            
            // 현재 날짜의 일정들 다시 가져오기
            const dateStr = currentDragElement.closest('.day-cell').getAttribute('data-date');
            if (dateStr) {
                const date = new Date(dateStr);
                const schedulesContainer = currentDragElement.closest('.schedules-container');
                
                // 현재 날짜 셀만 리렌더링
                if (schedulesContainer) {
                    const cell = schedulesContainer.closest('.day-cell');
                    const dayNum = parseInt(cell.querySelector('.day-number').textContent);
                    const newCell = createDayCell(date.getFullYear(), date.getMonth(), dayNum);
                    cell.parentNode.replaceChild(newCell, cell);
                }
            }
            
            // 다른 날짜 셀들도 갱신 (전체 캘린더 다시 렌더링)
            setTimeout(() => {
                renderCalendar();
            }, 100);
        }
    }
    
    currentDragElement = null;
    
    document.removeEventListener('mousemove', handleScheduleDrag);
    document.removeEventListener('mouseup', stopScheduleDrag);
}

// 날짜 비교 함수 추가
function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 특정 날짜에 해당하는 모든 일정 가져오기 (이전 달의 일정 포함)
function getAllSchedulesForDate(date) {
    const dateStr = formatDateToYYYYMMDD(date);
    return schedules.filter(schedule => {
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        const currentDate = new Date(dateStr);
        
        // 현재 날짜가 일정의 시작일과 종료일 사이에 있는지 확인
        return currentDate >= startDate && currentDate <= endDate;
    });
}

// 카테고리 색상 가져오기
function getCategoryColor(category) {
    const colors = {
        'work': '#3b82f6',     // 파란색
        'personal': '#10b981', // 초록색
        'meeting': '#f59e0b',  // 주황색
        'study': '#ef4444',    // 빨간색
        'travel': '#8b5cf6',   // 보라색
        'event': '#6366f1',    // 남색
        'other': '#6b7280'     // 회색
    };
    return colors[category] || colors['other'];
}

// 카테고리 이름 표시 
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

// 대비 색상 가져오기
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
    const lineHeight = 22; // 한 줄의 높이
    
    // 드래그 거리에 따라 줄 번호 계산
    const lineDelta = Math.round(deltaY / lineHeight);
    const newLineNumber = Math.max(0, originalLineNumber + lineDelta);
    
    if (newLineNumber !== currentLineNumber) {
        // 줄 번호가 변경되면 위치 업데이트
        currentLineNumber = newLineNumber;
        currentDragElement.style.top = `${currentLineNumber * lineHeight}px`;
        
        // 표시용 줄 번호 업데이트
        currentDragElement.setAttribute('data-line-number', currentLineNumber);
        
        // 드래그 중인 요소 스타일 강조
        currentDragElement.style.zIndex = '50';
        currentDragElement.style.opacity = '0.8';
    }
}

// 파일로 일정 내보내기
async function exportSchedulesToFile() {
    try {
        // 파일에 저장할 내용 생성
        let fileContent = '';
        
        // 각 일정을 파일에 포맷에 맞게 추가
        schedules.forEach(schedule => {
            const line = `${schedule.startDate}|${schedule.endDate}|${schedule.title}|${schedule.description || ''}|${schedule.color}\n`;
            fileContent += line;
        });
        
        // 최신 브라우저 API인 showSaveFilePicker 사용 시도
        if ('showSaveFilePicker' in window) {
            try {
                // 파일 저장 대화상자 표시
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'Scheduler-dh.txt',
                    types: [{
                        description: '텍스트 파일',
                        accept: {'text/plain': ['.txt']},
                    }],
                });
                
                // 파일 쓰기 권한 획득
                const writable = await fileHandle.createWritable();
                await writable.write(fileContent);
                await writable.close();
                
                alert('일정이 파일로 저장되었습니다.');
                return;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    throw err; // 사용자가 취소한 경우가 아니면 오류 처리
                }
                // 취소된 경우 기존 방식으로 진행
                console.log('파일 저장이 취소되었거나 API가 지원되지 않습니다. 대체 방식을 시도합니다.');
            }
        }
        
        // 대체 방식: 텍스트 내보내기 모달 표시
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
        
        // 텍스트 영역 내용 선택
        const exportContent = document.getElementById('exportContent');
        exportContent.select();
        
        // 버튼 이벤트 리스너
        document.getElementById('copyExportBtn').addEventListener('click', () => {
            exportContent.select();
            document.execCommand('copy');
            alert('클립보드에 복사되었습니다.');
        });
        
        document.getElementById('downloadExportBtn').addEventListener('click', () => {
            // 전통적인 다운로드 방식
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
                        
                        // 기본 일정 객체 생성
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
                    // 날짜순으로 일정 정렬
                    importedSchedules.sort((a, b) => {
                        // 시작일 기준 정렬
                        const startDiff = new Date(a.startDate) - new Date(b.startDate);
                        if (startDiff !== 0) return startDiff;
                        
                        // 시작일이 같으면 종료일 기준 정렬
                        return new Date(a.endDate) - new Date(b.endDate);
                    });
                    
                    // 일정 겹침 방지를 위한 order 값 할당
                    assignOrderToSchedules(importedSchedules);
                    
                    // 기존 일정을 모두 삭제하고 새 일정만 불러오기
                    schedules = importedSchedules;
                    
                    // 변경사항 저장 및 UI 업데이트
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
        
        // 같은 파일을 다시 선택할 수 있도록 입력 필드 초기화
        event.target.value = '';
    } catch (error) {
        console.error('일정 가져오기 중 오류:', error);
        showError('파일에서 일정을 가져오는 중 오류가 발생했습니다.');
    }
}

// 일정에 order 값 할당하여 겹침 방지
function assignOrderToSchedules(schedules) {
    if (schedules.length === 0) return schedules;
    
    // 모든 일정의 order를 0으로 초기화 (원본 수정)
    schedules.forEach(schedule => {
        schedule.order = 0;
    });
    
    // 각 일정이 적용되는 모든 날짜 범위를 계산
    const dateRangeMap = {};
    schedules.forEach(schedule => {
        const start = new Date(schedule.startDate);
        const end = new Date(schedule.endDate);
        
        // 시작일부터 종료일까지의 모든 날짜를 맵에 추가
        const dateList = [];
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = formatDateToYYYYMMDD(new Date(date));
            dateList.push(dateStr);
            
            // 날짜별 일정 배열 초기화
            if (!dateRangeMap[dateStr]) {
                dateRangeMap[dateStr] = [];
            }
            
            // 해당 날짜에 일정 추가
            dateRangeMap[dateStr].push(schedule.id);
        }
    });
    
    // 일정이 배치된 라인을 추적하는 맵
    const scheduleLines = {};
    
    // 각 날짜마다 일정 배치
    Object.keys(dateRangeMap).sort().forEach(dateStr => {
        const schedulesForDate = dateRangeMap[dateStr];
        const usedLines = new Set();
        
        // 이미 라인이 할당된 일정에 대해 라인 번호 수집
        schedulesForDate.forEach(scheduleId => {
            const schedule = schedules.find(s => s.id === scheduleId);
            if (schedule && scheduleLines[scheduleId] !== undefined) {
                usedLines.add(scheduleLines[scheduleId]);
            }
        });
        
        // 아직 라인이 할당되지 않은 일정에 대해 배치
        schedulesForDate.forEach(scheduleId => {
            const schedule = schedules.find(s => s.id === scheduleId);
            
            // 아직 라인이 할당되지 않은 경우만 처리
            if (schedule && scheduleLines[scheduleId] === undefined) {
                // 가장 낮은 빈 라인 찾기
                let line = 0;
                while (usedLines.has(line)) {
                    line++;
                }
                
                // 라인 할당
                scheduleLines[scheduleId] = line;
                usedLines.add(line);
            }
        });
    });
    
    // 최종 라인 정보를 일정 객체에 적용
    Object.keys(scheduleLines).forEach(scheduleId => {
        const schedule = schedules.find(s => s.id === scheduleId);
        if (schedule) {
            schedule.order = scheduleLines[scheduleId];
        }
    });
    
    return schedules;
}

// 카테고리별 일정 필터링
function filterSchedulesByCategory() {
    const selectedCategory = categoryFilter.value;
    renderScheduleList(selectedCategory);
}

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 카테고리 저장
function saveCategories() {
    localStorage.setItem('categories', JSON.stringify(categories));
}

// 카테고리 목록 렌더링
function renderCategoryList() {
    const categoryList = document.getElementById('categoryList');
    const categorySelect = document.getElementById('scheduleCategory');
    
    // 카테고리 목록 렌더링
    categoryList.innerHTML = categories.map(category => `
        <div class="category-item" data-category-id="${category.id}">
            <div class="category-item-color" style="background-color: ${category.color}"></div>
            <div class="category-item-name">${category.name}</div>
            <div class="category-item-actions">
                <button type="button" class="small-btn edit-category-btn">수정</button>
                <button type="button" class="small-btn delete-category-btn">삭제</button>
            </div>
        </div>
    `).join('');

    // 카테고리 선택 옵션 업데이트
    categorySelect.innerHTML = categories.map(category => 
        `<option value="${category.id}">${category.name}</option>`
    ).join('');
}

// 카테고리 모달 열기
function openCategoryModal() {
    const modal = document.getElementById('categoryModal');
    modal.classList.add('active');
    renderCategoryList();
}

// 카테고리 모달 닫기
function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    modal.classList.remove('active');
}

// 새 카테고리 추가
function addCategory() {
    const nameInput = document.getElementById('newCategoryName');
    const colorInput = document.getElementById('newCategoryColor');
    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (!name) {
        showError('카테고리 이름을 입력해주세요.');
        return;
    }

    const id = name.toLowerCase().replace(/\s+/g, '_');
    if (categories.some(cat => cat.id === id)) {
        showError('이미 존재하는 카테고리입니다.');
        return;
    }

    categories.push({ id, name, color });
    saveCategories();
    renderCategoryList();
    
    nameInput.value = '';
    colorInput.value = '#facc15';
}

// 카테고리 수정
function editCategory(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    const newName = prompt('새 카테고리 이름:', category.name);
    if (!newName) return;

    const newColor = prompt('새 카테고리 색상 (HEX):', category.color);
    if (!newColor) return;

    category.name = newName;
    category.color = newColor;
    saveCategories();
    renderCategoryList();
}

// 카테고리 삭제
function deleteCategory(categoryId) {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return;
    
    categories = categories.filter(cat => cat.id !== categoryId);
    saveCategories();
    renderCategoryList();
}

// 카테고리 색상 가져오기
function getCategoryColor(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.color : '#facc15';
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function() {
    // 기존 DOMContentLoaded 이벤트에 추가
    document.getElementById('addCategoryBtn').addEventListener('click', openCategoryModal);
    document.getElementById('closeCategoryModalBtn').addEventListener('click', closeCategoryModal);
    document.getElementById('saveCategoryBtn').addEventListener('click', addCategory);

    // 카테고리 목록 이벤트 위임
    document.getElementById('categoryList').addEventListener('click', function(e) {
        const categoryItem = e.target.closest('.category-item');
        if (!categoryItem) return;

        const categoryId = categoryItem.dataset.categoryId;
        if (e.target.classList.contains('edit-category-btn')) {
            editCategory(categoryId);
        } else if (e.target.classList.contains('delete-category-btn')) {
            deleteCategory(categoryId);
        }
    });

    // 카테고리 선택 시 색상 업데이트
    document.getElementById('scheduleCategory').addEventListener('change', function() {
        const color = getCategoryColor(this.value);
        document.getElementById('scheduleColor').value = color;
    });
}); 