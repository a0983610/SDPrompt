// --- 自動調整高度函式 ---
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// --- 狀態管理 ---
let activeTab = "character";
let activeGroupIndex = -1; // -1 表示顯示全部
let tagValueToLabel = {}; // 用於反查 Label
let draggedItemIndex = null; // 拖曳項目的索引

const positiveInput = document.getElementById("positive-input");
const negativeInput = document.getElementById("negative-input");
const countDisplay = document.getElementById("positive-count");
const tabsContainer = document.getElementById("tabs-container");
const subTabsContainer = document.getElementById("sub-tabs-container");
const tagsGrid = document.getElementById("tags-grid");
const notification = document.getElementById("notification");
const negativeContent = document.getElementById("negative-content");
const negativeChevron = document.getElementById("negative-chevron");
const selectedTagsContainer = document.getElementById("selected-tags-container");
const selectedTagsWrapper = document.getElementById("selected-tags-wrapper");
let notificationTimeout;

// --- 初始化 ---
function init() {
    lucide.createIcons();

    // 建立 Value -> Label 對照表 (需要遍歷新的結構)
    for (const catKey in tagCategories) {
        const cat = tagCategories[catKey];
        cat.groups.forEach(group => {
            group.tags.forEach(t => {
                tagValueToLabel[t.value] = t.label;
            });
        });
    }

    renderTabs();
    renderSubTabs();
    renderTags();
    updateCount();
    renderSelectedTags();

    // 監聽輸入變化
    positiveInput.addEventListener('input', () => {
        updateCount();
        renderTags(); // 更新選中狀態
        renderSelectedTags(); // 更新已選標籤區塊
        autoResize(positiveInput);
    });
    // 初始化高度
    autoResize(positiveInput);
    autoResize(negativeInput);

    // 監聽鍵盤事件以改變游標樣式
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Control') {
            document.body.classList.add('ctrl-pressed');
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Control') {
            document.body.classList.remove('ctrl-pressed');
        }
    });
}

// --- Magic Button Logic ---
function addMagicPrompt() {
    const magicTags = ["masterpiece", "best quality", "highres", "ultra-detailed", "8k"];
    let currentTags = positiveInput.value.split(',').map(t => t.trim()).filter(t => t);

    // 找出尚未存在的 magic tags
    const missingTags = magicTags.filter(tag => !currentTags.includes(tag));

    if (missingTags.length === 0) {
        showNotification("高品質詞彙已存在！");
        return;
    }

    // 將缺失的 tags 加到最前面
    const newTags = [...missingTags, ...currentTags];

    positiveInput.value = newTags.join(', ');
    updateCount();
    renderTags();
    renderSelectedTags();
    autoResize(positiveInput);
    showNotification("已加入高品質起手式！");
}

// --- 拖曳排序處理 ---
function handleDragStart(e, index) {
    // 如果沒有按住 Ctrl，阻止拖曳，讓點擊事件正常觸發
    if (!e.ctrlKey) {
        e.preventDefault();
        return;
    }
    draggedItemIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index); // 雖然只用變數，但設置 data 是好習慣

    // 加入視覺回饋
    setTimeout(() => {
        e.target.classList.add('dragging');
    }, 0);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedItemIndex = null;
}

function handleDragOver(e) {
    // 必須阻止預設行為才能允許放置
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e, targetIndex) {
    e.preventDefault();

    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

    let currentTags = positiveInput.value.split(',').map(t => t.trim()).filter(t => t);

    // 移動元素
    const itemToMove = currentTags[draggedItemIndex];
    currentTags.splice(draggedItemIndex, 1); // 移除
    currentTags.splice(targetIndex, 0, itemToMove); // 插入新位置

    // 更新並重新渲染
    positiveInput.value = currentTags.join(', ');
    updateCount();
    renderSelectedTags();
    // 注意：renderTags 是下方選擇區，不需重繪，因為選擇狀態沒變
}

// --- 渲染已選標籤 ---
function renderSelectedTags() {
    const currentTags = positiveInput.value.split(',').map(t => t.trim()).filter(t => t);

    if (currentTags.length > 0) {
        selectedTagsWrapper.classList.remove('hidden');
    } else {
        selectedTagsWrapper.classList.add('hidden');
        return;
    }

    selectedTagsContainer.innerHTML = currentTags.map((tag, index) => {
        const label = tagValueToLabel[tag] || tag;
        return `
        <button 
            draggable="true"
            ondragstart="handleDragStart(event, ${index})"
            ondragend="handleDragEnd(event)"
            ondragover="handleDragOver(event)"
            ondrop="handleDrop(event, ${index})"
            onclick="removeTag('${tag.replace(/'/g, "\\'")}')"
            class="draggable-tag group flex items-center gap-1 px-3 py-1 bg-zinc-800/80 border border-zinc-700/50 rounded-full text-xs text-zinc-300 hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-300 transition-all select-none"
            title="點擊移除，按住 Ctrl 拖曳排序"
        >
            <span>${label}</span>
            <i data-lucide="x" width="12" height="12" class="opacity-50 group-hover:opacity-100 pointer-events-none"></i>
        </button>
    `}).join('');

    lucide.createIcons();
}

function removeTag(tagToRemove) {
    let currentTags = positiveInput.value.split(',').map(t => t.trim()).filter(t => t);
    currentTags = currentTags.filter(t => t !== tagToRemove);
    positiveInput.value = currentTags.join(', ');
    updateCount();
    renderTags();
    renderSelectedTags();
    autoResize(positiveInput);
}

function toggleNegative() {
    const isHidden = negativeContent.classList.contains('hidden');
    if (isHidden) {
        negativeContent.classList.remove('hidden');
        negativeChevron.style.transform = 'rotate(180deg)';
        autoResize(negativeInput);
    } else {
        negativeContent.classList.add('hidden');
        negativeChevron.style.transform = 'rotate(0deg)';
    }
}

// --- 渲染大分類 Tabs ---
function renderTabs() {
    tabsContainer.innerHTML = Object.keys(tagCategories).map(key => {
        const isActive = activeTab === key;
        const activeClasses = "border-blue-500 text-blue-400 bg-zinc-800";
        const inactiveClasses = "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30";
        return `
            <button 
                onclick="switchTab('${key}')"
                class="px-5 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 outline-none focus:outline-none ${isActive ? activeClasses : inactiveClasses}"
            >
                ${tagCategories[key].name}
            </button>
        `;
    }).join('');
}

// --- 渲染子分類 Tabs ---
function renderSubTabs() {
    const groups = tagCategories[activeTab].groups;

    // "全部" 選項
    const allActive = activeGroupIndex === -1;
    const allBtnClass = allActive
        ? "bg-blue-600 text-white border-blue-500"
        : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200";

    let html = `
        <button 
            onclick="switchSubTab(-1)"
            class="px-3 py-1.5 text-xs rounded-full border transition-all whitespace-nowrap ${allBtnClass}"
        >
            全部
        </button>
    `;

    // 其他群組選項
    html += groups.map((group, index) => {
        const isActive = activeGroupIndex === index;
        const activeClasses = "bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]";
        const inactiveClasses = "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200";
        return `
            <button 
                onclick="switchSubTab(${index})"
                class="px-3 py-1.5 text-xs rounded-full border transition-all whitespace-nowrap ${isActive ? activeClasses : inactiveClasses}"
            >
                ${group.name}
            </button>
        `;
    }).join('');

    subTabsContainer.innerHTML = html;
}

// --- 切換大分類 ---
function switchTab(key) {
    activeTab = key;
    activeGroupIndex = -1; // 重置為顯示全部
    renderTabs();
    renderSubTabs();
    renderTags();
}

// --- 切換子分類 ---
function switchSubTab(index) {
    activeGroupIndex = index;
    renderSubTabs();
    renderTags();
}

// --- 渲染標籤 ---
function renderTags() {
    const currentTags = positiveInput.value.split(',').map(t => t.trim());
    const cat = tagCategories[activeTab];
    let html = '';

    // 根據 activeGroupIndex 決定顯示哪些標籤
    if (activeGroupIndex === -1) {
        // 顯示所有群組，並以分區方式顯示
        cat.groups.forEach((group, index) => {
            // 加入群組標題分隔線
            const mt = index === 0 ? '' : 'mt-6';
            html += `
                <div class="w-full flex items-center gap-2 ${mt} mb-2">
                    <div class="h-px bg-zinc-700/50 flex-grow"></div>
                    <span class="text-xs text-zinc-500 font-medium uppercase tracking-wider px-2">${group.name}</span>
                    <div class="h-px bg-zinc-700/50 flex-grow"></div>
                </div>
            `;
            // 渲染該群組的標籤
            group.tags.forEach(tag => {
                html += createTagButtonHTML(tag, currentTags);
            });
        });
    } else {
        // 顯示特定群組
        const group = cat.groups[activeGroupIndex];
        group.tags.forEach(tag => {
            html += createTagButtonHTML(tag, currentTags);
        });
    }

    tagsGrid.innerHTML = html;
}

// 輔助函數：生成標籤按鈕 HTML
function createTagButtonHTML(tag, currentTags) {
    const isSelected = currentTags.includes(tag.value);
    const selectedClasses = "bg-blue-600/20 border-blue-500 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)] transform scale-105";
    const unselectedClasses = "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-500 hover:text-zinc-200 hover:scale-105";
    const subTextClass = isSelected ? "text-blue-200" : "text-zinc-500 group-hover:text-zinc-400";

    return `
        <button 
            onclick="toggleTag('${tag.value}')"
            class="px-3 py-2 rounded-lg text-sm transition-all duration-200 border flex flex-col items-center justify-center min-w-[80px] group ${isSelected ? selectedClasses : unselectedClasses}"
        >
            <span class="font-bold text-zinc-100 mb-0.5 pointer-events-none">${tag.label}</span>
            <span class="text-xs font-mono opacity-60 pointer-events-none ${subTextClass}">
                ${tag.value}
            </span>
        </button>
    `;
}

// --- 處理標籤點擊 ---
function toggleTag(tagValue) {
    let currentTags = positiveInput.value.split(',').map(t => t.trim()).filter(t => t);

    if (currentTags.includes(tagValue)) {
        currentTags = currentTags.filter(t => t !== tagValue);
    } else {
        currentTags.push(tagValue);
    }

    positiveInput.value = currentTags.join(', ');
    updateCount();
    renderTags();
    renderSelectedTags();
    autoResize(positiveInput);
}

// --- 輔助功能 ---
function updateCount() {
    countDisplay.innerText = positiveInput.value.length;
}

function clearPrompt(type) {
    if (type === 'positive') {
        positiveInput.value = "";
        updateCount();
        renderTags();
        renderSelectedTags();
        autoResize(positiveInput);
    } else {
        negativeInput.value = "";
        autoResize(negativeInput);
    }
}

function copyToClipboard(type) {
    const text = type === 'positive' ? positiveInput.value : negativeInput.value;
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showNotification(`已複製 ${type === 'positive' ? '正面' : '負面'} 提示詞`);
    } catch (err) {
        showNotification("複製失敗");
    }
    document.body.removeChild(textarea);
}

function showNotification(msg) {
    notification.innerText = msg;
    notification.classList.remove('opacity-0');

    if (notificationTimeout) clearTimeout(notificationTimeout);

    notificationTimeout = setTimeout(() => {
        notification.classList.add('opacity-0');
    }, 2000);
}

// 啟動
init();
