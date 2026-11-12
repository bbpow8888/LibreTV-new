// 豆瓣热门电影电视剧推荐功能

// 豆瓣标签列表 - 修改为默认标签
let defaultMovieTags = ['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '治愈'];
let defaultTvTags = ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片'];

// 用户标签列表 - 存储用户实际使用的标签（包含保留的系统标签和用户添加的自定义标签）
let movieTags = [];
let tvTags = [];

// 加载用户标签
function loadUserTags() {
    try {
        const savedMovieTags = localStorage.getItem('userMovieTags');
        const savedTvTags = localStorage.getItem('userTvTags');
        
        if (savedMovieTags) {
            movieTags = JSON.parse(savedMovieTags);
        } else {
            movieTags = [...defaultMovieTags];
        }
        
        if (savedTvTags) {
            tvTags = JSON.parse(savedTvTags);
        } else {
            tvTags = [...defaultTvTags];
        }
    } catch (e) {
        console.error('加载标签失败：', e);
        movieTags = [...defaultMovieTags];
        tvTags = [...defaultTvTags];
    }
}

// 保存用户标签
function saveUserTags() {
    try {
        localStorage.setItem('userMovieTags', JSON.stringify(movieTags));
        localStorage.setItem('userTvTags', JSON.stringify(tvTags));
    } catch (e) {
        console.error('保存标签失败：', e);
        showToast('保存标签失败', 'error');
    }
}

let doubanMovieTvCurrentSwitch = 'movie';
let doubanCurrentTag = '热门';
let doubanPageStart = 0;
const doubanPageSize = 16; // 一次显示的项目数量

// 初始化豆瓣功能
function initDouban() {
    const doubanToggle = document.getElementById('doubanToggle');
    if (doubanToggle) {
        const isEnabled = localStorage.getItem('doubanEnabled') === 'true';
        doubanToggle.checked = isEnabled;
        
        const toggleBg = doubanToggle.nextElementSibling;
        const toggleDot = toggleBg.nextElementSibling;
        if (isEnabled) {
            toggleBg.classList.add('bg-pink-600');
            toggleDot.classList.add('translate-x-6');
        }
        
        doubanToggle.addEventListener('change', function(e) {
            const isChecked = e.target.checked;
            localStorage.setItem('doubanEnabled', isChecked);
            
            if (isChecked) {
                toggleBg.classList.add('bg-pink-600');
                toggleDot.classList.add('translate-x-6');
            } else {
                toggleBg.classList.remove('bg-pink-600');
                toggleDot.classList.remove('translate-x-6');
            }
            
            updateDoubanVisibility();
        });
        
        updateDoubanVisibility();
        window.scrollTo(0, 0);
    }

    loadUserTags();
    renderDoubanMovieTvSwitch();
    renderDoubanTags();
    setupDoubanRefreshBtn();
    
    if (localStorage.getItem('doubanEnabled') === 'true') {
        renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
    }
}

// 根据设置更新豆瓣区域的显示状态
function updateDoubanVisibility() {
    const doubanArea = document.getElementById('doubanArea');
    if (!doubanArea) return;
    
    const isEnabled = localStorage.getItem('doubanEnabled') === 'true';
    const isSearching = document.getElementById('resultsArea') && 
        !document.getElementById('resultsArea').classList.contains('hidden');
    
    if (isEnabled && !isSearching) {
        doubanArea.classList.remove('hidden');
        if (document.getElementById('douban-results').children.length === 0) {
            renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
        }
    } else {
        doubanArea.classList.add('hidden');
    }
}

// 只填充搜索框，不执行搜索，让用户自主决定搜索时机
function fillSearchInput(title) {
    if (!title) return;
    
    const safeTitle = title
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        input.focus();
        showToast('已填充搜索内容，点击搜索按钮开始搜索', 'info');
    }
}

// 填充搜索框并执行搜索
function fillAndSearch(title) {
    if (!title) return;
    
    const safeTitle = title
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        search();
        
        try {
            const encodedQuery = encodeURIComponent(safeTitle);
            window.history.pushState(
                { search: safeTitle }, 
                `搜索: ${safeTitle} - LibreTV`, 
                `/s=${encodedQuery}`
            );
            document.title = `搜索: ${safeTitle} - LibreTV`;
        } catch (e) {
            console.error('更新浏览器历史失败:', e);
        }
    }
}

// 填充搜索框，确保豆瓣资源API被选中，然后执行搜索
async function fillAndSearchWithDouban(title) {
    if (!title) return;
    
    const safeTitle = title
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    
    if (typeof selectedAPIs !== 'undefined' && !selectedAPIs.includes('dbzy')) {
        const doubanCheckbox = document.querySelector('input[id="api_dbzy"]');
        if (doubanCheckbox) {
            doubanCheckbox.checked = true;
            
            if (typeof updateSelectedAPIs === 'function') {
                updateSelectedAPIs();
            } else {
                selectedAPIs.push('dbzy');
                localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
                
                const countEl = document.getElementById('selectedAPICount');
                if (countEl) {
                    countEl.textContent = selectedAPIs.length;
                }
            }
            
            showToast('已自动选择豆瓣资源API', 'info');
        }
    }
    
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        await search();
        
        try {
            const encodedQuery = encodeURIComponent(safeTitle);
            window.history.pushState(
                { search: safeTitle }, 
                `搜索: ${safeTitle} - LibreTV`, 
                `/s=${encodedQuery}`
            );
            document.title = `搜索: ${safeTitle} - LibreTV`;
        } catch (e) {
            console.error('更新浏览器历史失败:', e);
        }

        if (window.innerWidth <= 768) {
          window.scrollTo({
              top: 0,
              behavior: 'smooth'
          });
        }
    }
}

// 渲染电影/电视剧切换器
function renderDoubanMovieTvSwitch() {
    const movieToggle = document.getElementById('douban-movie-toggle');
    const tvToggle = document.getElementById('douban-tv-toggle');

    if (!movieToggle || !tvToggle) return;

    movieToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'movie') {
            movieToggle.classList.add('bg-pink-600', 'text-white');
            movieToggle.classList.remove('text-gray-300');
            
            tvToggle.classList.remove('bg-pink-600', 'text-white');
            tvToggle.classList.add('text-gray-300');
            
            doubanMovieTvCurrentSwitch = 'movie';
            doubanCurrentTag = '热门';

            renderDoubanTags(movieTags);
            setupDoubanRefreshBtn();
            
            if (localStorage.getItem('doubanEnabled') === 'true') {
                renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
            }
        }
    });
    
    tvToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'tv') {
            tvToggle.classList.add('bg-pink-600', 'text-white');
            tvToggle.classList.remove('text-gray-300');
            
            movieToggle.classList.remove('bg-pink-600', 'text-white');
            movieToggle.classList.add('text-gray-300');
            
            doubanMovieTvCurrentSwitch = 'tv';
            doubanCurrentTag = '热门';

            renderDoubanTags(tvTags);
            setupDoubanRefreshBtn();
            
            if (localStorage.getItem('doubanEnabled') === 'true') {
                renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
            }
        }
    });
}

// 渲染豆瓣标签选择器
function renderDoubanTags(tags) {
    const tagContainer = document.getElementById('douban-tags');
    if (!tagContainer) return;
    
    const currentTags = doubanMovieTvCurrentSwitch === 'movie' ? movieTags : tvTags;
    tagContainer.innerHTML = '';

    const manageBtn = document.createElement('button');
    manageBtn.className = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border border-[#333] hover:border-white';
    manageBtn.innerHTML = '<span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>管理标签</span>';
    manageBtn.onclick = function() {
        showTagManageModal();
    };
    tagContainer.appendChild(manageBtn);

    currentTags.forEach(tag => {
        const btn = document.createElement('button');
        let btnClass = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ';
        
        if (tag === doubanCurrentTag) {
            btnClass += 'bg-pink-600 text-white shadow-md border-white';
        } else {
            btnClass += 'bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border-[#333] hover:border-white';
        }
        
        btn.className = btnClass;
        btn.textContent = tag;
        
        btn.onclick = function() {
            if (doubanCurrentTag !== tag) {
                doubanCurrentTag = tag;
                doubanPageStart = 0;
                renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
                renderDoubanTags();
            }
        };
        
        tagContainer.appendChild(btn);
    });
}

// 设置换一批按钮事件
function setupDoubanRefreshBtn() {
const btn = document.getElementById('douban-refresh');
if (!btn) return;
btn.onclick = function() {
doubanPageStart += doubanPageSize;
if (doubanPageStart > 9 * doubanPageSize) {
doubanPageStart = 0;
}
renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
};
}
function fetchDoubanTags() {
const movieTagsTarget = https://douban.com;
fetchDoubanData(movieTagsTarget)
.then(data => {
movieTags = data.tags;
if (doubanMovieTvCurrentSwitch === 'movie') {
renderDoubanTags(movieTags);
}
})
.catch(error => {
console.error("获取豆瓣热门电影标签失败：", error);
});
const tvTagsTarget = https://douban.com;
fetchDoubanData(tvTagsTarget)
.then(data => {
tvTags = data.tags;
if (doubanMovieTvCurrentSwitch === 'tv') {
renderDoubanTags(tvTags);
}
})
.catch(error => {
console.error("获取豆瓣热门电视剧标签失败：", error);
});
}
// 渲染热门推荐内容
function renderRecommend(tag, pageLimit, pageStart) {
const container = document.getElementById("douban-results");
if (!container) return;
const loadingOverlayHTML = <div class="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10"> <div class="flex items-center justify-center"> <div class="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin inline-block"></div> <span class="text-pink-500 ml-4">加载中...</span> </div> </div>;
container.classList.add("relative");
container.insertAdjacentHTML('beforeend', loadingOverlayHTML);
const target = https://douban.com{doubanMovieTvCurrentSwitch}&tag=${tag}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart};
fetchDoubanData(target)
.then(data => {
renderDoubanCards(data, container);
})
.catch(error => {
console.error("获取豆瓣数据失败：", error);
container.innerHTML = <div class="col-span-full text-center py-8"> <div class="text-red-400">❌ 获取豆瓣数据失败，请稍后重试</div> <div class="text-gray-500 text-sm mt-2">提示：使用VPN可能有助于解决此问题</div> </div>;
});
}
// 已修复：跳过被豆瓣418拦截的 Cloudflare 本地代理，使用多路免封锁代理轮询
async function fetchDoubanData(url) {
const proxyList = [
https://codetabs.com{encodeURIComponent(url)},
https://corsproxy.io{encodeURIComponent(url)},
https://allorigins.win{encodeURIComponent(url)}
];
for (const proxyUrl of proxyList) {
try {
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 8000);
const response = await fetch(proxyUrl, { signal: controller.signal });
clearTimeout(timeoutId);
if (response.ok) {
const data = await response.json();
if (data && (data.subjects || data.tags)) {
return data;
}
}
} catch (err) {
console.warn("当前代理尝试失败，自动切换下一个：", proxyUrl);
}
}
throw new Error("所有豆瓣代理线路均请求失败");
}
// 抽取渲染豆瓣卡片的逻辑到单独函数
function renderDoubanCards(data, container) {
const fragment = document.createDocumentFragment();
if (!data.subjects || data.subjects.length === 0) {
const emptyEl = document.createElement("div");
emptyEl.className = "col-span-full text-center py-8";
emptyEl.innerHTML = <div class="text-pink-500">❌ 暂无数据，请尝试其他分类或刷新</div>;
fragment.appendChild(emptyEl);
} else {
data.subjects.forEach(item => {
const card = document.createElement("div");
card.className = "bg-[#111] hover:bg-[#222] transition-all duration-300 rounded-lg overflow-hidden flex flex-col transform hover:scale-105 shadow-md hover:shadow-lg";
const safeTitle = item.title
.replace(/</g, '<')
.replace(/>/g, '>')
.replace(/"/g, '"');
const safeRate = (item.rate || "暂无")
.replace(/</g, '<')
.replace(/>/g, '>');
// 已修复：解决重复声明变量和拼写错误，使用 weserv 全球图片代理绕过豆瓣 418
const originalCoverUrl = item.cover || '';
const proxiedCoverUrl = originalCoverUrl ? https://weserv.nl{encodeURIComponent(originalCoverUrl)} : '';
card.innerHTML = <div class="relative w-full aspect-[2/3] overflow-hidden cursor-pointer" onclick="fillAndSearchWithDouban('${safeTitle}')"> <img src="${proxiedCoverUrl}" alt="${safeTitle}"  class="w-full h-full object-cover transition-transform duration-500 hover:scale-110" onerror="this.onerror=null; this.src='${originalCoverUrl}'; this.classList.add('object-contain');" loading="lazy" referrerpolicy="no-referrer"> <div class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div> <div class="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm"> <span class="text-yellow-400">★</span> ${safeRate} </div> <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm hover:bg-[#333] transition-colors"> <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="在豆瓣查看" onclick="event.stopPropagation();"> 🔗 </a> </div> </div> <div class="p-2 text-center bg-[#111]"> <button onclick="fillAndSearchWithDouban('${safeTitle}')"  class="text-sm font-medium text-white truncate w-full hover:text-pink-400 transition" title="${safeTitle}"> ${safeTitle} </button> </div>;
fragment.appendChild(card);
});
}
container.innerHTML = "";
container.appendChild(fragment);
}
// 重置到首页
function resetToHome() {
resetSearchArea();
updateDoubanVisibility();
}
// 加载豆瓣首页内容
document.addEventListener('DOMContentLoaded', initDouban);
// 显示标签管理模态框
function showTagManageModal() {
let modal = document.getElementById('tagManageModal');
if (modal) {
document.body.removeChild(modal);
}
modal = document.createElement('div');
modal.id = 'tagManageModal';
modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40';
const isMovie = doubanMovieTvCurrentSwitch === 'movie';
const currentTags = isMovie ? movieTags : tvTags;
const defaultTags = isMovie ? defaultMovieTags : defaultTvTags;
modal.innerHTML = `

×
标签管理 (${isMovie ? '电影' : '电视剧'})
标签列表

恢复默认标签



${currentTags.length ? currentTags.map(tag => {
const canDelete = tag !== '热门';
return <div class="bg-[#1a1a1a] text-gray-300 py-1.5 px-3 rounded text-sm font-medium flex justify-between items-center group"> <span>${tag}</span> ${canDelete ? ✕: 必需} </div>;
}).join('') :
<div class="col-span-full text-center py-4 text-gray-500">无标签，请添加或恢复默认</div>}

添加新标签


添加

提示：标签名称不能为空，不能重复，不能包含特殊字符


`;
document.body.appendChild(modal);
setTimeout(() => {
document.getElementById('newTagInput').focus();
}, 100);
document.getElementById('closeTagModal').addEventListener('click', function() {
document.body.removeChild(modal);
});
modal.addEventListener('click', function(e) {
if (e.target === modal) {
document.body.removeChild(modal);
}
});
document.getElementById('resetTagsBtn').addEventListener('click', function() {
resetTagsToDefault();
showTagManageModal();
});
const deleteButtons = document.querySelectorAll('.delete-tag-btn');
deleteButtons.forEach(btn => {
btn.addEventListener('click', function() {
const tagToDelete = this.getAttribute('data-tag');
deleteTag(tagToDelete);
showTagManageModal();
});
});
document.getElementById('addTagForm').addEventListener('submit', function(e) {
e.preventDefault();
const input = document.getElementById('newTagInput');
const newTag = input.value.trim();
if (newTag) {
addTag(newTag);
input.value = '';
showTagManageModal();
}
});
}
// 添加标签
function addTag(tag) {
const safeTag = tag
.replace(/</g, '<')
.replace(/>/g, '>')
.replace(/"/g, '"');
const isMovie = doubanMovieTvCurrentSwitch === 'movie';
const currentTags = isMovie ? movieTags : tvTags;
const exists = currentTags.some(
existingTag => existingTag.toLowerCase() === safeTag.toLowerCase()
);
if (exists) {
showToast('标签已存在', 'warning');
return;
}
if (isMovie) {
movieTags.push(safeTag);
} else {
tvTags.push(safeTag);
}
saveUserTags();
renderDoubanTags();
showToast('标签添加成功', 'success');
}
// 删除标签
function deleteTag(tag) {
if (tag === '热门') {
showToast('热门标签不能删除', 'warning');
return;
}
const isMovie = doubanMovieTvCurrentSwitch === 'movie';
const currentTags = isMovie ? movieTags : tvTags;
const index = currentTags.indexOf(tag);
if (index !== -1) {
currentTags.splice(index, 1);
saveUserTags();
if (doubanCurrentTag === tag) {
doubanCurrentTag = '热门';
doubanPageStart = 0;
renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
}
renderDoubanTags();
showToast('标签删除成功', 'success');
}
}
// 重置为默认标签
function resetTagsToDefault() {
const isMovie = doubanMovieTvCurrentSwitch === 'movie';
if (isMovie) {
movieTags = [...defaultMovieTags];
} else {
tvTags = [...defaultTvTags];
}
doubanCurrentTag = '热门';
doubanPageStart = 0;
saveUserTags();
renderDoubanTags();
renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
showToast('已恢复默认标签', 'success');
}
