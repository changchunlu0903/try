// ================= 🎨 终极写卡器逻辑 (整合版) =================

// 0. 数据与标签
const WIZARD_TAGS = {
    identity: ["公主", "女仆", "骑士", "杀手", "青梅竹马", "继妹", "恶役千金", "总裁", "校花", "师尊"],
    personality: ["傲娇", "病娇", "温柔", "高冷", "腹黑", "元气", "三无", "毒舌", "弱气", "女王"],
    trope: ["兽耳(猫娘)", "白毛", "异瞳", "黑丝", "口癖", "倒贴", "双重人格", "虽然穷但志残坚"]
};

// 全局变量：存储正则脚本
window.currentCardRegexes = [];

// 1. 初始化 (打开时调用)

/* ================= 🔧 修复补丁：写卡器打开逻辑 (解除死锁) ================= */
window.openCardCreator = function() {
    // 1. 先把悬浮菜单收起来
    var menu = document.getElementById('floatMenu');
    if (menu) menu.classList.remove('active');
    
    var modal = document.getElementById('cardCreatorModal');
    if (modal) {
        // 🔥 核心修复：强制清除 "display: none" 内联样式
        // 这行代码会解开之前的“死锁”，让 active 类重新生效
        modal.style.display = ''; 
        
        // 2. 激活弹窗
        modal.classList.add('active');
        
        // 3. 刷新里面的内容 (防止空白)
        if(typeof renderWizardTags === 'function') renderWizardTags();
        if(typeof renderRegexList === 'function') renderRegexList();
    } else {
        alert("❌ 错误：找不到写卡器弹窗 (id='cardCreatorModal')");
    }
};


window.toggleGuideModal = function() {
    var m = document.getElementById('guideModal');
    if(m) m.classList.toggle('active');
};

// 2. 渲染左侧标签
function renderWizardTags() {
    renderTagGroup('tagGroupIdentity', WIZARD_TAGS.identity, true);
    renderTagGroup('tagGroupPersonality', WIZARD_TAGS.personality, false);
    renderTagGroup('tagGroupTrope', WIZARD_TAGS.trope, false);
}

function renderTagGroup(id, tags, isSingle) {
    const container = document.getElementById(id);
    if (container.children.length > 0) return; // 避免重复渲染
    
    tags.forEach(t => {
        const span = document.createElement('span');
        span.className = 'wizard-tag';
        span.textContent = t;
        span.onclick = function() {
            if (isSingle) {
                Array.from(container.children).forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            } else {
                this.classList.toggle('selected');
            }
        };
        container.appendChild(span);
    });
}

// 3. ✨ AI 一键生成
window.generateCardFromTags = async function() {
    // 收集标签
    const getSelected = (id) => Array.from(document.getElementById(id).children).filter(c => c.classList.contains('selected')).map(c => c.textContent);
    const identities = getSelected('tagGroupIdentity');
    const personalities = getSelected('tagGroupPersonality');
    const tropes = getSelected('tagGroupTrope');
    const name = document.getElementById('cardName').value.trim();

    if (identities.length === 0 && personalities.length === 0) { auth.toast('请至少选一个标签吧！'); return; }

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }

    var btn = document.getElementById('btnGenWizard');
    var oldText = btn.innerText;
    btn.innerText = '🧠 创作中...'; btn.disabled = true;

    var prompt = `请设计角色：名字${name||'自拟'}，身份${identities}，性格${personalities}，属性${tropes}。返回JSON:{ "name":"", "description":"详细设定(500字)", "first_mes":"开场白", "mes_example":"对话样本", "scenario":"场景" }`;

    try {
        var res = await fetchAI(prompt, config);
        var data = JSON.parse(res.replace(/```json/g, '').replace(/```/g, '').trim());

        document.getElementById('cardName').value = data.name || '';
        document.getElementById('cardDesc').value = data.description || '';
        document.getElementById('cardFirstMes').value = data.first_mes || '';
        document.getElementById('cardScenario').value = data.scenario || '';
        document.getElementById('cardMesExample').value = data.mes_example || '';
        
        updatePreviewUI();
        switchCardTab('preview');
        auth.toast('✨ 生成完毕！');
    } catch (e) { auth.toast('❌ 生成失败'); } 
    finally { btn.innerText = oldText; btn.disabled = false; }
};

// 4. Tab 切换
window.switchCardTab = function(name) {
    document.querySelectorAll('.card-tab-content').forEach(d => d.style.display='none');
    document.querySelectorAll('.card-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-'+name).style.display = 'block';
    if(event && event.target) event.target.classList.add('active');
    
    if(name === 'source') updateJsonSource();
};

// 5. 🛠️ 正则与前端开发逻辑
window.switchRegexUI = function(mode) {
    document.getElementById('uiSimpleMode').style.display = mode === 'simple' ? 'block' : 'none';
    document.getElementById('uiFrontendMode').style.display = mode === 'frontend' ? 'block' : 'none';
};

// 模板库
var SNIPPETS = {
    'status': { name: "RPG状态栏", regex: "/\\[STATS\\]/g", code: "<style>\n.rpg-status-bar { \n    background: rgba(0,0,0,0.8); color: #fff; padding: 10px; border-radius: 8px; border: 1px solid #ffd700; \n    font-family: monospace; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);\n}\n.hp-bar { height:5px; background:#ff4757; width:80%; margin-top:5px; }\n</style>\n<div class=\"rpg-status-bar\">\n    <div>🩸 HP: 800/1000</div>\n    <div class=\"hp-bar\"></div>\n    <div>⚔️ ATK: 250 | 🛡️ DEF: 180</div>\n</div>" },
    'bubble': { name: "气泡美化", regex: "/^(.+)$/gm", code: "<div style=\"background:linear-gradient(135deg, #fdfbfb, #ebedee); padding:10px; border-radius:10px; border-left:4px solid #6c5ce7; color:#333; margin-bottom:5px; box-shadow:2px 2px 5px rgba(0,0,0,0.1);\">\n    $1\n</div>" },
    'hidden': { name: "隐藏思维链", regex: "/\\(思考:.*?\\)/gs", code: "<div style=\"display:none;\">$&</div>" },
    'img': { name: "动态插图", regex: "/\\[IMG:(\\w+)\\]/g", code: "<img src=\"https://files.catbox.moe/$1.png\" style=\"width:100%; border-radius:10px; border:2px solid #fff; box-shadow:0 5px 15px rgba(0,0,0,0.2);\">" }
};

window.insertSnippet = function(key) {
    var s = SNIPPETS[key];
    document.getElementById('frontName').value = s.name;
    document.getElementById('frontPattern').value = s.regex;
    document.getElementById('frontReplace').value = s.code;
    auth.toast('📚 模板已加载');
};

window.addSimpleRegex = function() {
    var pat = document.getElementById('simplePattern').value;
    var rep = document.getElementById('simpleReplace').value;
    if(!pat) return;
    var safePat = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    addScriptItem('替换"' + pat + '"', '/' + safePat + '/g', rep);
    document.getElementById('simplePattern').value = '';
    document.getElementById('simpleReplace').value = '';
};

window.addFrontendRegex = function() {
    var name = document.getElementById('frontName').value || '前端脚本';
    var pat = document.getElementById('frontPattern').value;
    var rep = document.getElementById('frontReplace').value;
    if(!pat) { auth.toast('❌ 正则不能为空'); return; }
    addScriptItem(name, pat, rep);
    auth.toast('🚀 脚本已注入');
};

function addScriptItem(name, regex, replace) {
    window.currentCardRegexes.push({ scriptName: name, regex: regex, regexReplacementString: replace, regexPlacement: [1] });
    renderRegexList();
    runRegexTest();
}

window.renderRegexList = function() {
    var list = document.getElementById('regexListArea');
    if(!list) return;
    list.innerHTML = '';
    window.currentCardRegexes.forEach((item, idx) => {
        var div = document.createElement('div');
        div.className = 'regex-item';
        var shortCode = item.regexReplacementString.length > 50 ? item.regexReplacementString.substring(0, 50)+'...' : item.regexReplacementString;
        div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><span style="font-weight:bold; color:#6c5ce7;">${item.scriptName}</span><button onclick="removeRegex(${idx})" style="border:none; color:#ff6b6b; background:none; cursor:pointer;">🗑️</button></div><div style="font-size:11px; color:#555; margin-top:2px; font-family:monospace;"><span style="color:#e06c75;">${item.regex}</span> ➔ <span style="color:#98c379;">${shortCode.replace(/</g, '&lt;')}</span></div>`;
        list.appendChild(div);
    });
};

window.removeRegex = function(idx) {
    window.currentCardRegexes.splice(idx, 1);
    renderRegexList();
    runRegexTest();
};

window.runRegexTest = function() {
    var inputStr = document.getElementById('regexTestInput').value;
    var outputDiv = document.getElementById('regexTestOutput');
    if (!inputStr) { outputDiv.innerHTML = "<span style='color:#666'>等待输入...</span>"; return; }
    var resultStr = inputStr;
    window.currentCardRegexes.forEach(script => {
        try {
            var parts = script.regex.match(/\/(.*)\/(.*)/);
            var regexObj = parts ? new RegExp(parts[1], parts[2]) : new RegExp(script.regex, "g");
            resultStr = resultStr.replace(regexObj, script.regexReplacementString);
        } catch (e) { console.error("正则错误", e); }
    });
    outputDiv.innerHTML = resultStr; // HTML 渲染
};

// 6. 辅助：头像和预览
window.handleCardAvatar = function(i) {
    if(i.files[0]) { var r = new FileReader(); r.onload=e=>{
        document.getElementById('cardAvatarPreview').src=e.target.result;
        document.getElementById('cardAvatarPreview').style.display='block';
        document.getElementById('cardAvatarHint').style.display='none';
        updatePreviewUI();
    }; r.readAsDataURL(i.files[0]); }
};

window.updatePreviewUI = function() {
    document.getElementById('previewHeaderName').innerText = document.getElementById('cardName').value || '角色名';
    document.getElementById('previewText').innerText = document.getElementById('cardFirstMes').value || '...';
    var src = document.getElementById('cardAvatarPreview').src;
    if(src && src.startsWith('data:')) {
        document.getElementById('previewAvatarSmall').src = src;
        document.getElementById('previewAvatarSmall').style.display = 'block';
    }
};

// 7. 导出与源码
window.updateJsonSource = function() {
    var d = {
        name: document.getElementById('cardName').value,
        description: document.getElementById('cardDesc').value,
        first_mes: document.getElementById('cardFirstMes').value,
        mes_example: document.getElementById('cardMesExample').value,
        scenario: document.getElementById('cardScenario').value,
        creator_notes: document.getElementById('cardNote').value,
        extensions: { regex_scripts: window.currentCardRegexes }
    };
    document.getElementById('jsonSource').value = JSON.stringify(d, null, 2);
};

window.applySourceCode = function() {
    try {
        var json = JSON.parse(document.getElementById('jsonSource').value);
        document.getElementById('cardName').value = json.name || '';
        document.getElementById('cardDesc').value = json.description || '';
        // ...其他字段同步...
        if(json.extensions && json.extensions.regex_scripts) {
            window.currentCardRegexes = json.extensions.regex_scripts;
            renderRegexList();
        }
        auth.toast('✅ 源码已应用');
    } catch(e) { alert('JSON 格式错误'); }
};

// ================= 💾 终极导出：三合一打包 (人设+正则+世界书) =================
window.exportTavernCard = function() {
    // 1. 获取基础人设信息
    updateJsonSource(); // 确保源码框是最新的
    var jsonStr = document.getElementById('jsonSource').value;
    var cardData;
    
    try {
        cardData = JSON.parse(jsonStr);
    } catch(e) {
        auth.toast('❌ 导出失败：JSON 格式有误');
        return;
    }

    // 2. ⚡️ 强力打包：注入正则脚本 (Regex)
    // 无论你在源码页怎么改，这里都会把“前端开发台”里的最新脚本覆盖进去，防止丢失
    if (window.currentCardRegexes && window.currentCardRegexes.length > 0) {
        if (!cardData.data.extensions) cardData.data.extensions = {};
        cardData.data.extensions.regex_scripts = window.currentCardRegexes;
        console.log(`已打包 ${window.currentCardRegexes.length} 个正则脚本`);
    }

    // 3. 🌍 强力打包：注入世界书 (World Info)
    // 把你在“世界书”页面写的条目，打包成一本“内置书”
    if (window.currentWorldInfo && window.currentWorldInfo.entries.length > 0) {
        cardData.data.character_book = {
            "name": "Embedded World", // 内置世界书名称
            "description": "Auto-generated by Creator Workshop",
            "scan_depth": 100, // 扫描深度
            "token_budget": 500, // token 预算
            "recursive_scanning": false,
            "extensions": {},
            "entries": window.currentWorldInfo.entries // 核心条目数据
        };
        console.log(`已打包 ${window.currentWorldInfo.entries.length} 条世界书设定`);
    }

    // 4. 生成文件并下载
    var blob = new Blob([JSON.stringify(cardData, null, 2)], {type: "application/json"});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    // 文件名：角色名.json
    a.download = (cardData.data.name || "character") + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    auth.toast('💾 大功告成！三合一卡片已导出！');
    
    // 5. 弹出一个教学提示
    setTimeout(() => {
        alert("👉 导出成功！\n\n这张卡片已经包含了【人设】+【特效】+【世界书】。\n\n请看接下来的教程，教你如何导入酒馆！");
    }, 500);
};


// ================= 🤖 新增：AI 生成前端代码逻辑 =================

// 1. 修复教程弹窗打不开的问题
window.toggleGuideModal = function() {
    var m = document.getElementById('guideModal');
    if (m) {
        // 强制切换显示状态
        if(m.style.display === 'none' || m.style.display === '') {
            m.style.display = 'flex';
            m.classList.add('active');
        } else {
            m.style.display = 'none';
            m.classList.remove('active');
        }
    } else {
        alert("❌ 错误：找不到教程弹窗 HTML (id='guideModal')");
    }
};

// 2. AI 生成 HTML/CSS 代码

// ================= 🤖 AI 全自动前端生成器 =================

// 辅助：点击灵感按钮自动填入并生成
window.fillAiPrompt = function(text) {
    document.getElementById('aiCodePrompt').value = text;
    generateFrontendCode();
};

// 🔥 核心生成逻辑
window.generateFrontendCode = async function() {
    var req = document.getElementById('aiCodePrompt').value.trim();
    if (!req) { auth.toast('请先告诉我要做什么...'); return; }
    
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }

    var btn = document.getElementById('btnGenCode');
    var oldText = btn.innerText;
    btn.innerText = '🧠 正在构建界面...';
    btn.disabled = true;

    // 👨‍💻 给 AI 的超级指令
    var prompt = `
    你是一个世界顶级的 SillyTavern 前端开发专家。
    用户想要一个界面功能：【${req}】
    
    请完成以下 3 个任务，并以纯 JSON 格式返回：
    
    1. "name": 给脚本起个简短的名字 (如: 状态栏)。
    2. "regex": 设计一个触发这个界面的正则表达式。
       - 如果是常驻显示（如状态栏），通常正则为 "/\\[STATUS\\]/g" 或 "/\\[UI\\]/g"。
       - 如果是修改对话气泡，正则为 "/^(.+)$/gm"。
       - 如果是隐藏内容，正则为匹配该内容的规则。
    3. "code": 编写实现效果的 HTML 和 CSS 代码。
       - CSS 必须包含在 <style> 标签内。
       - 视觉效果要非常精致、现代、符合用户描述。
       - 尽量使用 flex/grid 布局，支持响应式。
       - 代码要紧凑，不要有 Markdown 标记。

    返回格式示例：
    {
        "name": "粉色状态栏",
        "regex": "/\\[STATUS\\]/g",
        "code": "<style>...</style><div>...</div>"
    }
    `;

    try {
        var res = await fetchAI(prompt, config);
        // 清理 AI 可能返回的 Markdown 符号
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var data = JSON.parse(cleanJson);
        
        // 自动填空
        document.getElementById('frontName').value = data.name || 'AI生成脚本';
        document.getElementById('frontPattern').value = data.regex || '/\\[UI\\]/g';
        document.getElementById('frontReplace').value = data.code || '<div>生成为空</div>';
        
        auth.toast('✨ 代码构建完成！请点击下方“注入”');
        
        // 🧪 自动帮用户在实验室里填入触发词，直接看效果
        // 提取正则里的关键词，去掉斜杠和转义符
        var rawKey = data.regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '');
        // 如果是通用匹配符(.+)，就填一段测试文字
        if(rawKey.includes('.+')) rawKey = "这是一段测试文字，看看效果如何。";
        
        document.getElementById('regexTestInput').value = rawKey;
        runRegexTest(); // 立即预览

    } catch (e) {
        console.error(e);
        auth.toast('❌ 生成失败，AI 脑子短路了 (JSON解析错)');
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
};

// ================= 🌍 世界书开发逻辑 (Frontend World Book) =================

// 数据存储
window.currentWorldInfo = {
    name: "New World",
    entries: [] // { keys: [], content: "", comment: "" }
};
let currentEntryIdx = -1;

// 1. AI 辅助填空
window.fillWorldPrompt = function(txt) {
    document.getElementById('aiWorldPrompt').value = txt;
    generateWorldEntry();
};

// 2. AI 生成世界书条目
window.generateWorldEntry = async function() {
    var req = document.getElementById('aiWorldPrompt').value.trim();
    if (!req) { auth.toast('请告诉我要生成什么条目...'); return; }
    
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }

    var btn = document.getElementById('btnGenWorld');
    var oldText = btn.innerText;
    btn.innerText = '🧠 构筑中...'; btn.disabled = true;

    var prompt = `
    你是一个 SillyTavern "前端世界书" 专家。
    用户需求：【${req}】
    
    请创建一个 World Info 条目。
    如果用户想要特效/界面，Content 请直接写 HTML/CSS 代码。
    如果用户想要设定，Content 请写文本。
    
    请返回纯 JSON：
    {
        "comment": "条目名",
        "keys": ["触发词1", "触发词2"],
        "content": "内容（HTML或文本）"
    }
    `;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var data = JSON.parse(cleanJson);
        
        // 添加到列表
        window.currentWorldInfo.entries.push({
            id: Date.now(),
            keys: data.keys || [],
            content: data.content || "",
            comment: data.comment || "AI生成条目",
            enabled: true,
            insertion_position: 1 // 默认插入位置
        });
        
        renderWorldList();
        selectEntry(window.currentWorldInfo.entries.length - 1); // 选中新条目
        auth.toast('✨ 条目已生成！');

    } catch (e) {
        console.error(e);
        auth.toast('❌ 生成失败 (JSON解析错)');
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
};

// 3. 基础 CRUD 操作
window.renderWorldList = function() {
    var list = document.getElementById('worldEntryList');
    list.innerHTML = '';
    
    window.currentWorldInfo.entries.forEach((entry, idx) => {
        var div = document.createElement('div');
        div.className = 'world-item ' + (idx === currentEntryIdx ? 'active' : '');
        div.innerHTML = `<span>${entry.comment || '未命名'}</span> <span>📝</span>`;
        div.onclick = function() { selectEntry(idx); };
        list.appendChild(div);
    });
};

window.selectEntry = function(idx) {
    currentEntryIdx = idx;
    var entry = window.currentWorldInfo.entries[idx];
    
    document.getElementById('worldEmptyState').style.display = 'none';
    document.getElementById('worldEditorArea').style.display = 'flex';
    
    document.getElementById('wiComment').value = entry.comment || '';
    document.getElementById('wiKeys').value = (entry.keys || []).join(', ');
    document.getElementById('wiContent').value = entry.content || '';
    
    renderWorldList(); // 刷新高亮
};

window.addWorldEntry = function() {
    window.currentWorldInfo.entries.push({
        id: Date.now(),
        keys: [],
        content: "",
        comment: "新条目",
        enabled: true
    });
    renderWorldList();
    selectEntry(window.currentWorldInfo.entries.length - 1);
};

window.deleteCurrentEntry = function() {
    if (currentEntryIdx === -1) return;
    if (!confirm('确定删除这个条目吗？')) return;
    
    window.currentWorldInfo.entries.splice(currentEntryIdx, 1);
    currentEntryIdx = -1;
    document.getElementById('worldEditorArea').style.display = 'none';
    document.getElementById('worldEmptyState').style.display = 'flex';
    renderWorldList();
};

window.updateCurrentEntry = function() {
    if (currentEntryIdx === -1) return;
    var entry = window.currentWorldInfo.entries[currentEntryIdx];
    
    entry.comment = document.getElementById('wiComment').value;
    entry.content = document.getElementById('wiContent').value;
    
    // 处理 keys (逗号分隔转数组)
    var keysStr = document.getElementById('wiKeys').value;
    entry.keys = keysStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
    
    // 实时刷新列表名字
    renderWorldList();
};

// 🔥 4. 修改导出逻辑 (把世界书打包进去)
// 覆盖之前的 exportTavernCard 函数
var originalExport = window.exportTavernCard;
window.exportTavernCard = function() {
    updateJsonSource();
    
    // 获取基础数据
    var jsonStr = document.getElementById('jsonSource').value;
    var cardData = JSON.parse(jsonStr);
    
    // 注入世界书
    if (window.currentWorldInfo.entries.length > 0) {
        cardData.data.character_book = {
            name: "Embedded World",
            entries: window.currentWorldInfo.entries
        };
    }
    
    // 导出
    var blob = new Blob([JSON.stringify(cardData, null, 2)], {type: "application/json"});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (cardData.data.name || "card") + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    auth.toast('💾 卡片+世界书 已打包导出！');
};

/* ================= 🗣️ AI 二次编辑 (Refine System) ================= */

// 1. 初始化缓存 (补充了 desc 和 firstMes)
window.lastGeneratedData = {
    wizard: null,   
    frontend: null, 
    world: null,
    stat: null,
    desc: null,     // 详细设定缓存
    firstMes: null  // 开场白缓存
};

// 2. 通用二次编辑函数 (支持 JSON 和 纯文本)

/* ================= 🗣️ AI 二次编辑 (Refine System - 无报错版) ================= */

// 1. 初始化缓存
window.lastGeneratedData = {
    wizard: null, frontend: null, world: null, stat: null, desc: null, firstMes: null
};

// 2. 通用二次编辑函数 (完全去除报错逻辑)
window.refineResult = async function(type) {
    const inputId = `refineInput_${type}`;
    const requirement = document.getElementById(inputId).value.trim();
    
    if (!requirement) { auth.toast('请告诉我怎么改...'); return; }
    
    // 如果缓存为空，尝试读取当前输入框
    if (!window.lastGeneratedData[type]) {
        if (type === 'desc') window.lastGeneratedData.desc = document.getElementById('cardDesc').value;
        else if (type === 'firstMes') window.lastGeneratedData.firstMes = document.getElementById('cardFirstMes').value;
        else { auth.toast('请先生成一次，才能修改哦'); return; }
    }

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) return; // 没key也静默处理，或者提示配置

    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = '🧠 修改中...'; btn.disabled = true;

    // 准备旧数据
    var prevData = window.lastGeneratedData[type];
    var prevDataStr = typeof prevData === 'string' ? prevData : JSON.stringify(prevData);

    // ==========================================
    // 🔥 分支 A：纯文本修改 (人设 desc / 开场白 firstMes)
    // ==========================================
    if (type === 'desc' || type === 'firstMes') {
        var prompt = `原文本：${prevDataStr}\n修改意见：【${requirement}】\n请根据意见重写。直接输出纯文本，不要代码块。`;
        
        try {
            var res = await fetchAI(prompt, config);
            var cleanText = res.replace(/```/g, '').trim();
            
            // 填回对应的框
            if (type === 'desc') document.getElementById('cardDesc').value = cleanText;
            if (type === 'firstMes') {
                document.getElementById('cardFirstMes').value = cleanText;
                if(typeof updatePreviewUI === 'function') updatePreviewUI();
            }

            window.lastGeneratedData[type] = cleanText;
            auth.toast('✨ 修改已应用！');
            document.getElementById(inputId).value = ''; 

        } catch(e) { 
            // 🔥 核心修改：报错也算成功，方便你手动改
            console.error(e);
            auth.toast('✅ 编辑模式已就绪 (可直接修改)');
        } finally {
            btn.innerText = oldText; btn.disabled = false;
        }
        return; // 结束文本逻辑
    }

    // ==========================================
    // 🔥 分支 B：JSON 数据修改 (世界书 / 前端 / 属性 / 向导)
    // ==========================================
    var prompt = `原数据：${prevDataStr}。修改意见：【${requirement}】。请修改并返回完整JSON。`;
    if (type === 'stat') prompt = `原规则代码：${prevDataStr}。修改意见：【${requirement}】。请修改代码逻辑，并返回完整JSON {script: "...", guide: "..."}`;

    try {
        const res = await fetchAI(prompt, config);
        const cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        const newData = JSON.parse(cleanJson);

        window.lastGeneratedData[type] = newData; // 更新缓存

        // 更新界面
        if (type === 'wizard') {
            document.getElementById('cardName').value = newData.name || '';
            document.getElementById('cardDesc').value = newData.description || '';
            document.getElementById('cardFirstMes').value = newData.first_mes || '';
            document.getElementById('cardScenario').value = newData.scenario || '';
            document.getElementById('cardMesExample').value = newData.mes_example || '';
            if(typeof updatePreviewUI === 'function') updatePreviewUI();
        } else if (type === 'frontend') {
            document.getElementById('frontName').value = newData.name;
            document.getElementById('frontPattern').value = newData.regex;
            var code = newData.code || '';
            if(typeof simpleFormatHTML === 'function') code = simpleFormatHTML(code);
            document.getElementById('frontReplace').value = code;
            var testKey = (newData.regex || '').replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '');
            document.getElementById('regexTestInput').value = testKey;
            if(typeof runRegexTest === 'function') runRegexTest();
        } else if (type === 'world') {
            document.getElementById('wiComment').value = newData.comment || '';
            document.getElementById('wiKeys').value = (newData.keys || []).join(', ');
            var content = newData.content || '';
            if(typeof simpleFormatHTML === 'function') content = simpleFormatHTML(content);
            document.getElementById('wiContent').value = content;
        } else if (type === 'stat') {
             var script = newData.script || newData.raw || newData.content;
             document.getElementById('statEditor').value = script;
             if(typeof syncStatToNote === 'function') syncStatToNote();
        }

        auth.toast('✨ 修改完成！');
        document.getElementById(inputId).value = ''; 

    } catch (e) {
        // 🔥 核心修改：JSON 解析失败也不报红，算作“就绪”
        console.error(e);
        auth.toast('✅ 编辑模式已就绪 (可手动修改)');
    } finally {
        btn.innerText = oldText; btn.disabled = false;
    }
};


// 🔥 劫持旧的生成函数，生成成功后显示“修改框”并存缓存
// 1. 劫持向导生成
const originalWizardGen = window.generateCardFromTags;
window.generateCardFromTags = async function() {
    await originalWizardGen(); // 执行原逻辑
    // 假设原逻辑成功执行，填充了数据
    // 我们手动抓取一下数据存入缓存 (因为原函数里是局部变量)
    window.lastGeneratedData.wizard = {
        name: document.getElementById('cardName').value,
        description: document.getElementById('cardDesc').value,
        first_mes: document.getElementById('cardFirstMes').value,
        scenario: document.getElementById('cardScenario').value,
        mes_example: document.getElementById('cardMesExample').value
    };
    document.getElementById('refineArea_wizard').style.display = 'block'; // 显示修改框
};

// 2. 劫持前端生成
const originalFrontGen = window.generateFrontendCode;
window.generateFrontendCode = async function() {
    await originalFrontGen();
    window.lastGeneratedData.frontend = {
        name: document.getElementById('frontName').value,
        regex: document.getElementById('frontPattern').value,
        code: document.getElementById('frontReplace').value
    };
    document.getElementById('refineArea_frontend').style.display = 'block';
};

// 3. 劫持世界书生成
const originalWorldGen = window.generateWorldEntry;
window.generateWorldEntry = async function() {
    await originalWorldGen();
    // 世界书比较特殊，我们要获取最新生成的那个条目
    const entries = window.currentWorldInfo.entries;
    if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1]; // 刚生成的那个
        window.lastGeneratedData.world = {
            comment: lastEntry.comment,
            keys: lastEntry.keys,
            content: lastEntry.content
        };
        document.getElementById('refineArea_world').style.display = 'block';
    }
};

// ================= 🚑 紧急修复补丁：读取 & 导出功能 =================

// 1. 📂 读取功能 (Import)
window.importCardFile = function() {
    var input = document.getElementById('importCardInput');
    if(input) input.click();
    else alert("❌ 错误：找不到文件输入框 (id='importCardInput')");
};

/* ================= 🔧 修复补丁：读取功能 (宽容模式) ================= */
window.handleCardImport = function(input) {
    if (!input.files || !input.files[0]) return;
    
    var file = input.files[0];
    // 移除严格的文件名/类型检查，只要能读就行
    
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var json = JSON.parse(e.target.result);
            // 兼容 V1(直接在根目录) 和 V2(在data字段下)
            var data = json.data || json; 
            
            // 1. 填入基础信息 (加了非空判断，防止报错)
            if(document.getElementById('cardName')) document.getElementById('cardName').value = data.name || '';
            if(document.getElementById('cardDesc')) document.getElementById('cardDesc').value = data.description || '';
            if(document.getElementById('cardFirstMes')) document.getElementById('cardFirstMes').value = data.first_mes || '';
            if(document.getElementById('cardMesExample')) document.getElementById('cardMesExample').value = data.mes_example || '';
            if(document.getElementById('cardScenario')) document.getElementById('cardScenario').value = data.scenario || '';
            if(document.getElementById('cardNote')) document.getElementById('cardNote').value = data.creator_notes || '';
            
            // 2. 导入正则脚本
            if (data.extensions && data.extensions.regex_scripts) {
                window.currentCardRegexes = data.extensions.regex_scripts;
                if (typeof renderRegexList === 'function') renderRegexList();
            }
            
            // 3. 导入世界书
            if (data.character_book && data.character_book.entries) {
                if(!window.currentWorldInfo) window.currentWorldInfo = { entries: [] };
                window.currentWorldInfo.entries = data.character_book.entries;
                if (typeof renderWorldList === 'function') renderWorldList();
            }

            // 4. 刷新预览
            if (typeof updatePreviewUI === 'function') updatePreviewUI();
            
            auth.toast('📂 读取成功！');
            
        } catch (err) {
            console.error(err);
            // 只有真的解析不了 JSON 时才报错
            alert('❌ 读取失败：文件内容不是有效的 JSON 格式。\n(错误信息: ' + err.message + ')');
        }
    };
    reader.readAsText(file);
    input.value = ''; // 清空，允许重复选同一个文件
};


// 2. 💾 导出功能 (Export V2)
window.exportTavernCard = function() {
    // 先尝试更新源码框 (如果函数存在)
    if (typeof updateJsonSource === 'function') updateJsonSource();
    
    // 获取当前数据
    var name = document.getElementById('cardName').value.trim() || 'New Character';
    var desc = document.getElementById('cardDesc').value;
    var firstMes = document.getElementById('cardFirstMes').value;
    var mesEx = document.getElementById('cardMesExample').value;
    var scenario = document.getElementById('cardScenario').value;
    var note = document.getElementById('cardNote').value;
    
    // 构建 V2 格式
    var cardData = {
        "spec": "chara_card_v2",
        "spec_version": "2.0",
        "data": {
            "name": name,
            "description": desc,
            "first_mes": firstMes,
            "mes_example": mesEx,
            "scenario": scenario,
            "creator_notes": note,
            "system_prompt": "",
            "post_history_instructions": "",
            "alternate_greetings": [],
            "character_book": null,
            "tags": [],
            "creator": "Lili's Creator Workshop",
            "character_version": "1.0",
            "extensions": {}
        }
    };

    // 注入正则
    if (window.currentCardRegexes && window.currentCardRegexes.length > 0) {
        cardData.data.extensions.regex_scripts = window.currentCardRegexes;
    }

    // 注入世界书
    if (window.currentWorldInfo && window.currentWorldInfo.entries && window.currentWorldInfo.entries.length > 0) {
        cardData.data.character_book = {
            "name": "Embedded World",
            "description": "Auto-generated",
            "scan_depth": 100,
            "token_budget": 500,
            "recursive_scanning": false,
            "extensions": {},
            "entries": window.currentWorldInfo.entries
        };
    }

    // 执行下载
    try {
        var blob = new Blob([JSON.stringify(cardData, null, 2)], {type: "application/json"});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        auth.toast('💾 导出成功！可直接拖入酒馆');
    } catch(e) {
        alert("导出出错：" + e.message);
    }
};

// 3. 📘 教程按钮修复
window.toggleGuideModal = function() {
    var m = document.getElementById('guideModal');
    if (m) {
        if(m.style.display === 'none' || !m.classList.contains('active')) {
            m.style.display = 'flex';
            setTimeout(()=>m.classList.add('active'), 10);
        } else {
            m.classList.remove('active');
            setTimeout(()=>m.style.display = 'none', 300);
        }
    } else {
        alert("❌ 教程弹窗 HTML 缺失，请检查代码！");
    }
};

/* --- 🔧 新增：简单的代码格式化工具 --- */
function simpleFormatHTML(html) {
    if (!html) return "";
    // 简单的缩进处理：在 > 后换行，在 } 后换行
    let formatted = html
        .replace(/>/g, '>\n')      // 标签闭合换行
        .replace(/;/g, ';\n')      // CSS属性换行
        .replace(/{/g, '{\n')      // CSS块开始
        .replace(/}/g, '\n}\n')    // CSS块结束
        .replace(/\n\s*\n/g, '\n'); // 去掉多余空行
    return formatted;
}

/* --- 🛠️ 覆盖旧函数：生成前端代码 (加入格式化) --- */
window.generateFrontendCode = async function() {
    // ... (保留之前的验证代码) ...
    var req = document.getElementById('aiCodePrompt').value.trim();
    if (!req) { auth.toast('请先告诉我要做什么...'); return; }
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }
    
    var btn = document.getElementById('btnGenCode');
    btn.innerText = '🧠 正在构建...'; btn.disabled = true;

    // Prompt 保持不变...
    var prompt = `你是一个SillyTavern前端专家。用户需求：【${req}】。请返回纯JSON：{"name":"脚本名","regex":"/正则/g","code":"HTML代码"}`;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var data = JSON.parse(cleanJson);
        
        document.getElementById('frontName').value = data.name || 'AI脚本';
        document.getElementById('frontPattern').value = data.regex || '';
        
        // 🔥 修改点：使用格式化函数
        document.getElementById('frontReplace').value = simpleFormatHTML(data.code) || '';
        
        auth.toast('✨ 代码已生成并格式化！');
        // ... (保留之前的测试逻辑) ...
    } catch (e) {
        console.error(e);
        auth.toast('❌ 生成失败');
    } finally {
        btn.innerText = '✨ 一键生成'; btn.disabled = false;
    }
};

/* --- 🛠️ 覆盖旧函数：生成世界书 (加入格式化) --- */
window.generateWorldEntry = async function() {
    // ... (保留验证代码) ...
    var req = document.getElementById('aiWorldPrompt').value.trim();
    if (!req) { auth.toast('需求为空...'); return; }
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) return;

    var btn = document.getElementById('btnGenWorld');
    btn.innerText = '🧠 构筑中...'; btn.disabled = true;

    var prompt = `你是一个世界书专家。需求：【${req}】。返回纯JSON：{"comment":"条目名","keys":["触发词"],"content":"内容"}`;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var data = JSON.parse(cleanJson);
        
        // 🔥 修改点：格式化内容
        var formattedContent = data.content;
        if(formattedContent.includes('<') && formattedContent.includes('>')) {
            formattedContent = simpleFormatHTML(formattedContent);
        }

        window.currentWorldInfo.entries.push({
            id: Date.now(),
            keys: data.keys || [],
            content: formattedContent || "",
            comment: data.comment || "AI条目",
            enabled: true, insertion_position: 1
        });
        
        renderWorldList();
        selectEntry(window.currentWorldInfo.entries.length - 1);
        auth.toast('✨ 条目已生成！');
    } catch (e) { auth.toast('❌ 错误'); } 
    finally { btn.innerText = '✨ 生成条目'; btn.disabled = false; }
};

/* --- 🛠️ 针对问题2：添加自定义标签 --- */
function addCustomWizardTag(containerId) {
    var text = prompt("请输入自定义标签名称：");
    if (!text) return;
    text = text.trim();
    
    var container = document.getElementById(containerId);
    
    // 创建选中状态的标签
    var span = document.createElement('span');
    span.className = 'wizard-tag selected'; // 默认选中
    span.textContent = text;
    
    // 绑定点击事件（支持反选）
    span.onclick = function() {
        // 如果是身份组（单选），清除其他选中
        if (containerId === 'tagGroupIdentity') {
            Array.from(container.children).forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
        } else {
            this.classList.toggle('selected');
        }
    };
    
    container.appendChild(span);
}

/* --- 🛠️ 针对问题6：修复源码不同步 --- */
window.updateJsonSource = function() {
    // 1. 确保当前编辑的世界书条目已保存到数组中
    if (typeof updateCurrentEntry === 'function') updateCurrentEntry();

    var d = {
        name: document.getElementById('cardName').value,
        description: document.getElementById('cardDesc').value,
        first_mes: document.getElementById('cardFirstMes').value,
        mes_example: document.getElementById('cardMesExample').value,
        scenario: document.getElementById('cardScenario').value,
        creator_notes: document.getElementById('cardNote').value,
        
        // 🔥 关键修复：显式包含 World Info 和 Regex
        character_book: (window.currentWorldInfo && window.currentWorldInfo.entries.length > 0) 
            ? window.currentWorldInfo 
            : null,
            
        extensions: { 
            // 确保 regex_scripts 存在
            regex_scripts: window.currentCardRegexes || []
        }
    };
    
    // 写入文本框
    document.getElementById('jsonSource').value = JSON.stringify(d, null, 2);
};

/* ================= 🧠 补丁：预览页单独生成设定 ================= */

/* 2. 修复：预览页生成逻辑 (纯文本模式，防止误报失败) */

/* ================= 🔧 补丁：人设生成与二次修改 ================= */

// 1. 生成详细设定 (生成后激活修改框)

/* ================= 🔧 补丁：详细设定生成 (无报错版) ================= */
window.autoGenDesc = async function() {
    var name = document.getElementById('cardName').value.trim();
    if (!name) { auth.toast('先给角色起个名字吧！'); return; }
    
    // 获取标签
    var allTags = [];
    if(window.currentSelectedTags) {
        allTags = [
            ...window.currentSelectedTags.identity, 
            ...window.currentSelectedTags.personality, 
            ...window.currentSelectedTags.trope
        ];
    }
    var tagStr = allTags.join('、');

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }

    var btn = event.target;
    var oldText = btn.innerText;
    btn.innerText = '✍️ 正在写...'; btn.style.pointerEvents = 'none';

    var prompt = `我是创造者。请为角色【${name}】写一段“详细设定”。
    【强制要求】：必须基于这些属性生成：${tagStr || "无特殊标签"}。
    包含外貌、性格、身世。300字左右。直接输出纯文本。`;

    try {
        var res = await fetchAI(prompt, config);
        var cleanText = res.replace(/```/g, '').trim();
        
        document.getElementById('cardDesc').value = cleanText;
        
        // 成功时的逻辑
        window.lastGeneratedData.desc = cleanText;
        document.getElementById('refineArea_desc').style.display = 'block';

        if(typeof updateJsonSource === 'function') updateJsonSource();
        auth.toast('✅ 设定写入成功！');
        
        if(typeof checkAndOpenAdvisor === 'function') checkAndOpenAdvisor(false); 

    } catch (e) {
        console.error("生成遇到问题 (已忽略):", e);
        
        // 🔥 核心修改：即使报错，也视为“完成”，强制显示修改框
        // 这样你就可以直接在下面的修改框里写“再试一次”或者其他要求
        
        // 1. 确保存缓存（哪怕是空的，也要占个位，防止修改函数报错）
        var currentVal = document.getElementById('cardDesc').value;
        window.lastGeneratedData.desc = currentVal || ""; 
        
        // 2. 强制显示修改框
        document.getElementById('refineArea_desc').style.display = 'block';
        
        // 3. 提示改为成功 (或就绪)
        auth.toast('✅ 编辑模式已就绪 (可直接修改)');
        
    } finally {
        btn.innerText = oldText; btn.style.pointerEvents = 'auto';
    }
};



/* ================= 🔧 核心修复：正则测试 & 二次编辑逻辑 ================= */

// 1. 缓存上一次生成的数据 (给二次编辑用)
window.lastGeneratedData = { wizard: null, frontend: null, world: null };

/* 2. 修复版：正则测试运行器 (解决渲染不出来的问题) */
window.runRegexTest = function() {
    var inputStr = document.getElementById('regexTestInput').value;
    var outputDiv = document.getElementById('regexTestOutput');
    
    if (!inputStr) { 
        outputDiv.innerHTML = "<span style='color:#666'>等待输入测试词...</span>"; 
        return; 
    }

    var resultStr = inputStr;
    
    // 遍历所有脚本进行替换
    (window.currentCardRegexes || []).forEach(script => {
        try {
            var pat = script.regex;
            var regexObj;

            // 🔥 核心修复：兼容 "/.../g" 和 普通字符串 两种格式
            if (pat.startsWith('/') && pat.lastIndexOf('/') > 0) {
                // 如果是标准正则格式 /pattern/flags
                var lastSlash = pat.lastIndexOf('/');
                var body = pat.substring(1, lastSlash);
                var flags = pat.substring(lastSlash + 1);
                regexObj = new RegExp(body, flags);
            } else {
                // 如果只是普通字符串 (如 [STATUS])，自动转为全局正则
                // 自动转义特殊符号，防止报错
                var safePat = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                regexObj = new RegExp(safePat, "g");
            }

            resultStr = resultStr.replace(regexObj, script.regexReplacementString);
        } catch (e) {
            console.error("正则解析错误:", e);
        }
    });

    outputDiv.innerHTML = resultStr; // 渲染 HTML
};

/* 3. 修复版：前端代码生成 (激活二次编辑 + 自动填测试词) */
window.generateFrontendCode = async function() {
    var req = document.getElementById('aiCodePrompt').value.trim();
    if (!req) { auth.toast('需求不能为空...'); return; }
    
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请配置 API Key'); return; }
    
    var btn = document.getElementById('btnGenCode');
    btn.innerText = '🧠 构建中...'; btn.disabled = true;

    // Prompt 保持不变
    var prompt = `你是一个SillyTavern前端专家。用户需求：【${req}】。请返回纯JSON：{"name":"脚本名","regex":"/\\[关键词\\]/g","code":"HTML代码"}`;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var data = JSON.parse(cleanJson);
        
        // 填入数据
        document.getElementById('frontName').value = data.name || 'AI脚本';
        document.getElementById('frontPattern').value = data.regex || '';
        document.getElementById('frontReplace').value = simpleFormatHTML(data.code) || '';

        // 🔥 修复：自动提取关键词放入测试框，让你直接看到效果
        var testKey = data.regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, ''); // 去掉正则符号
        if(testKey.includes('[') && testKey.includes(']')) {
             // 如果是 [UI] 这种，直接填入
             document.getElementById('regexTestInput').value = testKey;
        } else {
             // 如果太复杂，填个默认的
             document.getElementById('regexTestInput').value = "在此输入触发词测试"; 
        }
        
        // 🔥 关键：保存缓存，并显示二次编辑框
        window.lastGeneratedData.frontend = data;
        document.getElementById('refineArea_frontend').style.display = 'block';

        auth.toast('✨ 代码已生成！下方可直接测试或修改');
        runRegexTest(); // 尝试运行一次测试

    } catch (e) {
        auth.toast('❌ 生成失败');
    } finally {
        btn.innerText = '✨ 一键生成'; btn.disabled = false;
    }
};

/* 4. 通用二次编辑函数 (复活版) */
window.refineResult = async function(type) {
    var inputId = `refineInput_${type}`;
    var requirement = document.getElementById(inputId).value.trim();
    
    if (!requirement) { auth.toast('请告诉我怎么改...'); return; }
    if (!window.lastGeneratedData[type]) { auth.toast('请先生成一次再修改'); return; }

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    var prevData = JSON.stringify(window.lastGeneratedData[type]);
    
    auth.toast('🧠 正在根据意见修改...');
    
    var prompt = `你之前生成了：${prevData}。用户意见：【${requirement}】。请修改并返回完整的纯JSON。`;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var newData = JSON.parse(cleanJson);

        // 更新缓存
        window.lastGeneratedData[type] = newData;

        // 根据类型更新界面
        if (type === 'frontend') {
            document.getElementById('frontName').value = newData.name;
            document.getElementById('frontPattern').value = newData.regex;
            document.getElementById('frontReplace').value = simpleFormatHTML(newData.code);
            runRegexTest(); // 重新测试
        } else if (type === 'world') {
            document.getElementById('wiComment').value = newData.comment;
            document.getElementById('wiKeys').value = (newData.keys || []).join(', ');
            document.getElementById('wiContent').value = simpleFormatHTML(newData.content);
        } else if (type === 'wizard') {
            // 如果是人设向导
            document.getElementById('cardName').value = newData.name || '';
            document.getElementById('cardDesc').value = newData.description || '';
            // ...其他字段略...
            if(typeof updatePreviewUI === 'function') updatePreviewUI();
        }

        auth.toast('✨ 修改完成！');
        document.getElementById(inputId).value = ''; // 清空输入框

    } catch (e) {
        auth.toast('❌ 修改失败');
    }
};

/* ================= 🚑 紧急修复补丁：正则引擎 & 二次编辑 ================= */

// 1. 修复正则测试引擎 (解决“渲染不出来”的大Bug)
window.runRegexTest = function() {
    var inputStr = document.getElementById('regexTestInput').value;
    var outputDiv = document.getElementById('regexTestOutput');
    
    // 如果没有脚本，先提示
    if (!window.currentCardRegexes || window.currentCardRegexes.length === 0) {
        // 如果输入框有值但没脚本，说明可能是刚生成还没点“注入”
        // 这里做一个特殊处理：临时读取输入框里的脚本来预览
        var tempPattern = document.getElementById('frontPattern').value;
        var tempCode = document.getElementById('frontReplace').value;
        if(tempPattern && tempCode && inputStr) {
             // 临时预览模式
             var tempRegex = tempPattern.replace(/^\/|\/[gim]*$/g, ''); // 去掉正则斜杠
             try {
                 var re = new RegExp(tempRegex, 'g');
                 outputDiv.innerHTML = inputStr.replace(re, tempCode);
                 return;
             } catch(e) {}
        }
    }

    if (!inputStr) { outputDiv.innerHTML = "<span style='color:#666'>等待输入测试词...</span>"; return; }

    var resultStr = inputStr;
    
    // 遍历正则列表进行替换
    (window.currentCardRegexes || []).forEach(script => {
        try {
            var pat = script.regex;
            var regexObj;
            
            // 智能识别：是 /pattern/g 还是 纯字符串
            if (pat.startsWith('/') && pat.lastIndexOf('/') > 0) {
                var lastSlash = pat.lastIndexOf('/');
                var body = pat.substring(1, lastSlash);
                var flags = pat.substring(lastSlash + 1);
                regexObj = new RegExp(body, flags);
            } else {
                // 纯字符串模式 (如 [UI])，自动转义特殊字符
                var safePat = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                regexObj = new RegExp(safePat, "g");
            }
            resultStr = resultStr.replace(regexObj, script.regexReplacementString);
        } catch (e) {
            console.error("正则解析错:", e);
        }
    });
    outputDiv.innerHTML = resultStr;
};

// 2. 修复前端生成逻辑 (解决“测试词不显示”和“二次编辑没反应”)
window.generateFrontendCode = async function() {
    var req = document.getElementById('aiCodePrompt').value.trim();
    if (!req) { auth.toast('需求不能为空...'); return; }
    
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请配置 API Key'); return; }
    
    var btn = document.getElementById('btnGenCode');
    btn.innerText = '🧠 构建中...'; btn.disabled = true;

    // Prompt: 强制 AI 返回带转义的正则字符串
    var prompt = `你是一个SillyTavern前端专家。用户需求：【${req}】。请返回纯JSON：{"name":"脚本名","regex":"/\\\\[关键词\\\\]/g","code":"HTML代码"}`;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var data = JSON.parse(cleanJson);
        
        // 填入编辑框
        document.getElementById('frontName').value = data.name || 'AI脚本';
        document.getElementById('frontPattern').value = data.regex || '';
        document.getElementById('frontReplace').value = simpleFormatHTML(data.code) || '';

        // 🔥 核心修复：提取测试词并显示
        // 逻辑：去掉前后的 / 和 /g，再去掉转义符 \
        var rawKey = data.regex.replace(/^\//, '').replace(/\/g[im]*$/, ''); 
        rawKey = rawKey.replace(/\\/g, ''); // 去掉转义
        
        // 填入黑色测试框
        document.getElementById('regexTestInput').value = rawKey;
        
        // 🔥 核心修复：手动保存缓存并显示二次编辑框
        window.lastGeneratedData.frontend = data;
        document.getElementById('refineArea_frontend').style.display = 'block';

        auth.toast('✨ 代码已生成！下方已自动预览');
        
        // 立即触发一次预览
        runRegexTest();

    } catch (e) {
        console.error(e);
        auth.toast('❌ 生成失败');
    } finally {
        btn.innerText = '✨ 一键生成'; btn.disabled = false;
    }
};

// 3. 复活 RefineResult 函数 (确保点击“让它改”有反应)
window.refineResult = async function(type) {
    var inputId = `refineInput_${type}`;
    var requirement = document.getElementById(inputId).value.trim();
    if (!requirement) { auth.toast('请告诉我怎么改...'); return; }
    if (!window.lastGeneratedData[type]) { auth.toast('请先生成一次'); return; }

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    var prevData = JSON.stringify(window.lastGeneratedData[type]);
    
    auth.toast('🧠 修改中...');
    var prompt = `原数据：${prevData}。修改意见：【${requirement}】。请修改并返回完整JSON。`;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var newData = JSON.parse(cleanJson);
        window.lastGeneratedData[type] = newData;

        // 更新界面
        if (type === 'frontend') {
            document.getElementById('frontName').value = newData.name;
            document.getElementById('frontPattern').value = newData.regex;
            document.getElementById('frontReplace').value = simpleFormatHTML(newData.code);
            // 再次自动填入测试词
            var rawKey = newData.regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '');
            document.getElementById('regexTestInput').value = rawKey;
            runRegexTest();
        } else if (type === 'world') {
            document.getElementById('wiComment').value = newData.comment;
            document.getElementById('wiKeys').value = (newData.keys||[]).join(', ');
            document.getElementById('wiContent').value = simpleFormatHTML(newData.content);
        } else if (type === 'wizard') {
            document.getElementById('cardName').value = newData.name || '';
            document.getElementById('cardDesc').value = newData.description || '';
            if(typeof updatePreviewUI === 'function') updatePreviewUI();
        }
        auth.toast('✨ 修改完成！');
        document.getElementById(inputId).value = ''; 
    } catch (e) { auth.toast('❌ 修改失败'); }
};

/* ================= 🔧 终极修复补丁：关联生成 & 全屏 & 修复报错 ================= */

/* 1. 修复生成失败 + 增加“关联详细设定”逻辑 (前端代码) */
window.generateFrontendCode = async function() {
    var req = document.getElementById('aiCodePrompt').value.trim();
    // 🔥 获取详细设定
    var charDesc = document.getElementById('cardDesc').value.trim();
    
    if (!req) { auth.toast('需求不能为空...'); return; }
    // 🔥 强制要求：如果没写设定，提醒用户
    if (!charDesc) { alert('⚠️ 请先在【预览】页填写“详细设定”！\n\n前端特效需要根据角色设定来定制风格。'); return; }

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请配置 API Key'); return; }
    
    var btn = document.getElementById('btnGenCode');
    btn.innerText = '🧠 融合设定构建中...'; btn.disabled = true;

    // 🔥 Prompt 升级：把人设喂给 AI
    var prompt = `
    你是一个SillyTavern前端专家。
    【当前角色设定】：${charDesc.substring(0, 500)}... (内容过长已截断)
    【用户需求】：${req}
    
    请根据【角色设定】的风格（配色、氛围、性格），设计这段 HTML/CSS 代码。
    请返回纯JSON：{"name":"脚本名","regex":"/\\\\[关键词\\\\]/g","code":"HTML代码"}
    `;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var data = JSON.parse(cleanJson);
        
        document.getElementById('frontName').value = data.name || 'AI脚本';
        document.getElementById('frontPattern').value = data.regex || '';
        document.getElementById('frontReplace').value = simpleFormatHTML(data.code) || '';

        var rawKey = data.regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '');
        document.getElementById('regexTestInput').value = rawKey;
        
        window.lastGeneratedData.frontend = data;
        document.getElementById('refineArea_frontend').style.display = 'block';

        auth.toast('✨ 已根据人设生成专属特效！');
        runRegexTest();

    } catch (e) {
        console.error(e);
        auth.toast('❌ 生成失败 (JSON解析错)');
    } finally {
        btn.innerText = '✨ 一键生成'; btn.disabled = false;
    }
};

/* 2. 修复生成失败 + 增加“关联详细设定”逻辑 (世界书) */
window.generateWorldEntry = async function() {
    var req = document.getElementById('aiWorldPrompt').value.trim();
    var charDesc = document.getElementById('cardDesc').value.trim();

    if (!req) { auth.toast('需求为空...'); return; }
    // 🔥 强制要求
    if (!charDesc) { alert('⚠️ 请先在【预览】页填写“详细设定”！\n\n世界书需要基于角色背景来创作。'); return; }

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) return;

    var btn = document.getElementById('btnGenWorld');
    btn.innerText = '🧠 结合背景构筑中...'; btn.disabled = true;

    // 🔥 Prompt 升级
    var prompt = `
    你是一个世界书专家。
    【所属角色背景】：${charDesc.substring(0, 500)}
    【用户需求】：创建一个条目，内容是：${req}
    
    请确保这个条目与角色背景高度一致。
    返回纯JSON：{"comment":"条目名","keys":["触发词"],"content":"内容"}
    `;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var data = JSON.parse(cleanJson);
        
        var formattedContent = data.content;
        if(formattedContent.includes('<') && formattedContent.includes('>')) {
            formattedContent = simpleFormatHTML(formattedContent);
        }

        window.currentWorldInfo.entries.push({
            id: Date.now(),
            keys: data.keys || [],
            content: formattedContent || "",
            comment: data.comment || "AI条目",
            enabled: true, insertion_position: 1
        });
        
        // 存缓存供二次编辑
        window.lastGeneratedData.world = data;
        document.getElementById('refineArea_world').style.display = 'block';

        renderWorldList();
        selectEntry(window.currentWorldInfo.entries.length - 1);
        auth.toast('✨ 专属条目已生成！');
    } catch (e) { auth.toast('❌ 错误'); } 
    finally { btn.innerText = '✨ 生成条目'; btn.disabled = false; }
};

/* 3. 新增：AI 写开场白功能 (补全缺失的功能) */

/* ================= 🔧 补丁：开场白与人设生成 (无报错+可修改版) ================= */

// 1. 生成开场白 (无论成败，强制激活修改框)
window.autoGenFirstMes = async function() {
    var name = document.getElementById('cardName').value.trim();
    var desc = document.getElementById('cardDesc').value.trim();
    
    // 如果没设定，就用名字瞎编一个
    if(!desc) desc = `一个叫${name}的角色`;
    
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    var btn = event.target; 
    var oldText = btn.innerText;
    btn.innerText = '✍️...'; btn.style.pointerEvents = 'none';

    var prompt = `角色：${name}。\n设定：${desc}\n请写一句符合人设的开场白 (First Message)。直接输出内容，不要引号。`;

    try {
        var res = await fetchAI(prompt, config);
        var cleanText = res.replace(/```/g, '').trim();
        
        document.getElementById('cardFirstMes').value = cleanText;
        
        // 成功逻辑：存缓存，显弹窗
        window.lastGeneratedData.firstMes = cleanText;
        document.getElementById('refineArea_firstMes').style.display = 'block';

        if(typeof updatePreviewUI === 'function') updatePreviewUI();
        auth.toast('✅ 开场白已生成！');
        
    } catch(e) {
        console.error("生成遇到问题 (已忽略):", e);
        
        // 🔥 失败逻辑：假装成功，强制显弹窗，方便你重试
        var currentVal = document.getElementById('cardFirstMes').value;
        window.lastGeneratedData.firstMes = currentVal || ""; 
        
        document.getElementById('refineArea_firstMes').style.display = 'block';
        auth.toast('✅ 编辑模式已就绪 (可直接修改)');
        
    } finally { 
        btn.innerText = oldText; btn.style.pointerEvents = 'auto';
    }
};



/* 4. 新增：全屏放大功能 */
window.currentFullscreenId = null;

window.toggleFullscreen = function(elementId) {
    var el = document.getElementById(elementId);
    var btn = document.getElementById('fullscreenExitBtn');
    
    if (!el) return;
    
    // 激活全屏
    el.classList.add('fullscreen-active');
    btn.style.display = 'block';
    window.currentFullscreenId = elementId;
    
    // 手机端优化：自动获得焦点
    el.focus();
};

window.exitFullscreen = function() {
    if (window.currentFullscreenId) {
        var el = document.getElementById(window.currentFullscreenId);
        if (el) el.classList.remove('fullscreen-active');
    }
    document.getElementById('fullscreenExitBtn').style.display = 'none';
    window.currentFullscreenId = null;
};

/* ================= 🔧 终极修复：男性向数据 & 编辑功能 ================= */

// 1. 🔥 数据源升级：男性向默认值 + 可修改结构
// 优先读取本地缓存(保存你修改过的)，如果没有则使用默认男性数据
window.wizardData = JSON.parse(localStorage.getItem('my_wizard_data_v2')) || {
    identity: { 
        title: "1. 身份/种族", 
        tags: ["皇子", "摄政王", "魔尊", "师尊", "影卫", "义父", "大将军", "校霸", "总裁", "骑士"] 
    },
    personality: { 
        title: "2. 性格特点", 
        tags: ["疯批", "清冷", "腹黑", "傲娇", "温柔", "忠犬", "鬼畜", "禁欲", "爹系", "病娇"] 
    },
    trope: { 
        title: "3. 萌点/外貌", 
        tags: ["白毛", "眼镜", "西装", "伤痕", "人外", "长发", "泪痣", "军装", "黑皮", "低音炮"] 
    }
};

// 2. 🔥 覆盖旧的渲染函数 (支持删除键)
window.renderWizardTags = function() {
    // 渲染三个组
    renderSingleGroup('identity');
    renderSingleGroup('personality');
    renderSingleGroup('trope');
};

function renderSingleGroup(key) {
    var data = window.wizardData[key];
    var containerId = 'tagGroup' + key.charAt(0).toUpperCase() + key.slice(1);
    var titleId = 'title_' + key;
    
    // 更新标题文字
    var titleEl = document.getElementById(titleId);
    if(titleEl) titleEl.innerText = data.title;

    // 更新标签列表
    var container = document.getElementById(containerId);
    container.innerHTML = ''; // 清空旧的

    data.tags.forEach((t, idx) => {
        var span = document.createElement('span');
        span.className = 'wizard-tag';
        
        // 标签文本部分
        var textNode = document.createTextNode(t);
        span.appendChild(textNode);

        // ❌ 删除按钮
        var delBtn = document.createElement('span');
        delBtn.className = 'tag-delete-btn';
        delBtn.innerText = '×';
        delBtn.title = '删除此标签';
        delBtn.onclick = function(e) {
            e.stopPropagation(); // 防止触发选中
            deleteWizardTag(key, idx);
        };
        span.appendChild(delBtn);

        // 点击选中逻辑
        span.onclick = function(e) {
            if(e.target === delBtn) return; // 点删除不选中
            
            if (key === 'identity') {
                // 身份单选
                Array.from(container.children).forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            } else {
                // 其他多选
                this.classList.toggle('selected');
            }
        };
        
        container.appendChild(span);
    });
}

// 3. ✨ 新增：修改大标题功能
window.editWizardTitle = function(key) {
    var oldTitle = window.wizardData[key].title;
    var newTitle = prompt("✏️ 修改标题名称：", oldTitle);
    
    if (newTitle && newTitle.trim() !== "") {
        window.wizardData[key].title = newTitle;
        saveWizardData(); // 保存
        renderWizardTags(); // 刷新
        auth.toast('标题已修改 ✅');
    }
};

// 4. ✨ 新增：删除标签功能
window.deleteWizardTag = function(key, idx) {
    if(confirm('确定删除标签【' + window.wizardData[key].tags[idx] + '】吗？')) {
        window.wizardData[key].tags.splice(idx, 1);
        saveWizardData();
        renderWizardTags();
    }
};

// 5. 🔥 覆盖旧的：添加自定义标签功能
window.addCustomWizardTag = function(key) {
    var text = prompt("➕ 添加新标签：");
    if (!text) return;
    text = text.trim();
    
    // 加入数据源
    window.wizardData[key].tags.push(text);
    saveWizardData();
    renderWizardTags();
    auth.toast('标签已添加 ✨');
};

// 6. 💾 辅助：保存数据到本地 (防止刷新丢失)
function saveWizardData() {
    localStorage.setItem('my_wizard_data_v2', JSON.stringify(window.wizardData));
}

// 🚀 初始化：页面加载完立即执行一次渲染
// (为了防止旧的逻辑覆盖，稍微延迟一下)
setTimeout(function() {
    renderWizardTags();
}, 500);

/* ================= 🔧 补丁：开启全员多选模式 ================= */

/* ================= 🔧 补丁：标签系统核心修复 (解决生成无关、存档丢失) ================= */

// 1. 全局变量：实时存储选中的标签
window.currentSelectedTags = { identity: [], personality: [], trope: [] };

// 2. 覆盖：渲染单个标签组 (加入数据绑定)
window.renderSingleGroup = function(key) {
    var data = window.wizardData[key];
    var containerId = 'tagGroup' + key.charAt(0).toUpperCase() + key.slice(1);
    var titleId = 'title_' + key;
    
    var titleEl = document.getElementById(titleId);
    if(titleEl) titleEl.innerText = data.title;

    var container = document.getElementById(containerId);
    container.innerHTML = ''; 

    data.tags.forEach((t, idx) => {
        var span = document.createElement('span');
        span.className = 'wizard-tag';
        span.innerText = t;

        // 删除按钮
        var delBtn = document.createElement('span');
        delBtn.className = 'tag-delete-btn';
        delBtn.innerText = '×';
        delBtn.onclick = function(e) { e.stopPropagation(); deleteWizardTag(key, idx); };
        span.appendChild(delBtn);

        // 🔥 修复：点击逻辑
        // 检查当前是否应该被选中 (用于读档恢复)
        if (window.currentSelectedTags[key].includes(t)) {
            span.classList.add('selected');
        }

        span.onclick = function(e) {
            if(e.target === delBtn) return;
            
            this.classList.toggle('selected');
            
            // 🔥 核心：实时更新全局数据
            if (this.classList.contains('selected')) {
                // 如果是身份组且只想单选，可以清空数组再push，这里默认允许多选
                // if(key === 'identity') window.currentSelectedTags[key] = []; 
                if (!window.currentSelectedTags[key].includes(t)) {
                    window.currentSelectedTags[key].push(t);
                }
            } else {
                // 取消选中
                window.currentSelectedTags[key] = window.currentSelectedTags[key].filter(item => item !== t);
            }
        };
        
        container.appendChild(span);
    });
};

// 3. 新增：生成详细设定 (修复：强制读取标签)
window.autoGenDesc = async function() {
    var name = document.getElementById('cardName').value.trim();
    if (!name) { auth.toast('先给角色起个名字吧！'); return; }
    
    // 🔥 修复：从全局变量读取标签，不再依赖 DOM
    var allTags = [
        ...window.currentSelectedTags.identity, 
        ...window.currentSelectedTags.personality, 
        ...window.currentSelectedTags.trope
    ];
    var tagStr = allTags.join('、');

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }

    var btn = event.target;
    var oldText = btn.innerText;
    btn.innerText = '✍️ 正在写...'; btn.style.pointerEvents = 'none';

    // 🔥 Prompt 修复：明确强调标签
    var prompt = `我是创造者。请为角色【${name}】写一段“详细设定”。
    【强制要求】：必须基于这些属性生成：${tagStr || "无特殊标签"}。
    包含外貌、性格、身世。300字左右。直接输出纯文本。`;

    try {
        var res = await fetchAI(prompt, config);
        document.getElementById('cardDesc').value = res.replace(/```/g, '').trim();
        if(typeof updateJsonSource === 'function') updateJsonSource();
        auth.toast('✅ 设定写入成功！');
        checkAndOpenAdvisor(false); 
    } catch (e) {
        auth.toast('❌ 生成失败，请检查网络');
    } finally {
        btn.innerText = oldText; btn.style.pointerEvents = 'auto';
    }
};

// 4. 新增：恢复标签视觉状态 (用于读档)
window.restoreTagVisuals = function() {
    // 重新渲染一遍，渲染函数会自动读取 window.currentSelectedTags 并高亮
    renderWizardTags();
};


/* ================= 🔧 补丁：变量插入助手 ================= */

// 1. 记录最后焦点的输入框
window.lastFocusedInput = null;

// 监听所有文本框的聚焦事件
document.addEventListener('focus', function(e) {
    if (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && e.target.type === 'text')) {
        window.lastFocusedInput = e.target;
    }
}, true);

// 2. 插入变量函数
window.insertVar = function(text) {
    var el = window.lastFocusedInput;
    
    // 如果没有焦点记录，或者焦点不在预览页的框里，默认插到“详细设定”里
    if (!el) {
        el = document.getElementById('cardDesc');
    }

    if (el) {
        // 在光标处插入
        var start = el.selectionStart;
        var end = el.selectionEnd;
        var val = el.value;
        
        el.value = val.substring(0, start) + text + val.substring(end);
        
        // 恢复光标位置
        el.selectionStart = el.selectionEnd = start + text.length;
        el.focus();
        
        // 触发自动保存/更新预览
        if(typeof updatePreviewUI === 'function') updatePreviewUI();
        
        auth.toast(`已插入 ${text}`);
    } else {
        auth.toast('请先点击一个输入框 🖱️');
    }
};

/* ================= 🔧 补丁：动态属性 (Stats) 管理 (修正版) ================= */

window.addStatToDesc = function() {
    var key = document.getElementById('statKey').value.trim();
    var val = document.getElementById('statVal').value.trim();
    
    // 🔥 修改点1：目标改为“深度设定”(cardNote)，这是放游戏规则的最佳位置
    var noteEl = document.getElementById('cardNote'); 

    if (!key || !val) { auth.toast('请填写属性名和数值'); return; }
    
    // 自动构建指令块
    var statBlock = `
[Dynamic Stats System]
Target: ${key} = ${val}
Rule: Update ${key} based on story events.
Output Format: Display changes at end of reply like <${key}: +2>
`;

    // 插入逻辑
    if (noteEl.value.includes('[Dynamic Stats System]')) {
        var newStatLine = `Target: ${key} = ${val}`;
        noteEl.value = noteEl.value.replace('[Dynamic Stats System]', `[Dynamic Stats System]\n${newStatLine}`);
    } else {
        noteEl.value = statBlock.trim() + "\n\n" + noteEl.value;
    }

    // 清空输入框
    document.getElementById('statKey').value = '';
    document.getElementById('statVal').value = '';
    
    // 触发保存
    if(typeof updateJsonSource === 'function') updateJsonSource();
    
    auth.toast(`📊 属性已写入【深度设定】`);

    // 🔥 修改点2：因为深度设定在“高级”页，自动切过去让用户看到效果
    switchCardTab('advanced'); 

    // 询问是否生成前端
    if (confirm(`是否顺便生成一个“${key}”的状态栏脚本？`)) {
        document.getElementById('aiCodePrompt').value = `做一个显示"${key}"的状态栏，颜色要好看`;
        switchCardTab('regex');
    }
};

/* ================= 🔧 补丁：属性页逻辑 & AI 策划师 ================= */

// 1. 同步逻辑：属性页的编辑框 <-> 高级页的深度设定
// 这样你在哪边改都一样
window.syncStatToNote = function() {
    var val = document.getElementById('statEditor').value;
    var note = document.getElementById('cardNote'); // 高级页的那个框
    if(note) note.value = val;
};

// 切换Tab时，把深度设定的内容同步过来显示
var originalSwitch = window.switchCardTab;
window.switchCardTab = function(name) {
    originalSwitch(name);
    if (name === 'stats') {
        var note = document.getElementById('cardNote');
        var editor = document.getElementById('statEditor');
        if(note && editor) editor.value = note.value;
    }
};

// 2. AI 生成游戏规则
window.generateStatLogic = async function() {
    var req = document.getElementById('aiStatPrompt').value.trim();
    if (!req) { auth.toast('请描述你想设计的系统...'); return; }
    
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请配置 API Key'); return; }

    var btn = document.getElementById('btnGenStat');
    btn.innerText = '🧠 设计中...'; btn.disabled = true;

    // Prompt：教 AI 写 SillyTavern 能够执行的 Prompt
    var prompt = `
    你是一个 Prompt Engineer，专门为 SillyTavern 设计 RPG 系统。
    用户需求：【${req}】
    
    请编写一段 System Prompt (指令)，包含：
    1. 变量定义 (Target)。
    2. 变更规则 (Rule)：什么情况下加分/扣分，什么情况下触发特殊剧情。
    3. 输出格式 (Output Format)：强制 AI 在回复末尾用括号显示变化。
    
    请直接返回规则文本，不要解释。格式参考：
    [System Note: This is a RPG game.]
    Target: ...
    Rule: ...
    `;

    try {
        var res = await fetchAI(prompt, config);
        
        // 填入编辑框
        var editor = document.getElementById('statEditor');
        // 如果原本有内容，就追加；没有就覆盖
        editor.value = editor.value ? (editor.value + "\n\n" + res) : res;
        
        // 同步到真正的深度设定
        syncStatToNote();
        
        // 存缓存供二次编辑
        window.lastGeneratedData.stat = { raw: res }; 
        document.getElementById('refineArea_stat').style.display = 'block';

        auth.toast('✨ 规则已写入深度设定！');

    } catch (e) {
        auth.toast('❌ 生成失败');
    } finally {
        btn.innerText = '✨ 生成规则'; btn.disabled = false;
    }
};

// 3. 属性页的二次编辑 (针对规则文本)
// 需要把这个加到 refineResult 的判断里，或者单独写一个逻辑
// 为了“改少一点代码”，我们在 refineResult 里加一个分支：

var originalRefine = window.refineResult;
window.refineResult = async function(type) {
    if (type === 'stat') {
        var inputId = 'refineInput_stat';
        var requirement = document.getElementById(inputId).value.trim();
        if (!requirement) return;
        
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        var prevData = window.lastGeneratedData.stat.raw; // 上次生成的规则文本
        
        auth.toast('🧠 优化规则中...');
        
        var prompt = `
        原规则：
        ${prevData}
        
        修改意见：【${requirement}】
        
        请重写规则。直接返回内容。
        `;
        
        try {
            var res = await fetchAI(prompt, config);
            
            // 这里我们需要替换掉上次生成的那部分，比较复杂。
            // 为了简单，我们直接覆盖整个编辑框（假设用户主要就在调这个）
            document.getElementById('statEditor').value = res;
            syncStatToNote();
            
            window.lastGeneratedData.stat.raw = res;
            auth.toast('✨ 修改完成！');
            document.getElementById(inputId).value = '';
        } catch(e) { auth.toast('❌ 失败'); }
        return;
    }
    // 其他类型调用原函数
    originalRefine(type);
};

// 4. 修复 addStatToDesc (让它把内容写到 statEditor)
window.addStatToDesc = function() {
    var key = document.getElementById('statKey').value.trim();
    var val = document.getElementById('statVal').value.trim();
    var editor = document.getElementById('statEditor');

    if (!key || !val) { auth.toast('请填写完整'); return; }

    var newRule = `Target: ${key} = ${val}`;
    
    // 简单追加
    if (editor.value.includes('[Dynamic Stats System]')) {
        editor.value = editor.value.replace('[Dynamic Stats System]', `[Dynamic Stats System]\n${newRule}`);
    } else {
        editor.value = `[Dynamic Stats System]\n${newRule}\nRule: Update based on story.\nOutput: <${key}: change>\n\n` + editor.value;
    }
    
    // 同步
    syncStatToNote();
    
    // 清空
    document.getElementById('statKey').value = '';
    document.getElementById('statVal').value = '';
    auth.toast(`📊 已添加 ${key}`);
};

/* ================= 🔧 终极补丁：智能解释 & 全真试玩 ================= */

/* ================= 🔧 修复补丁：属性生成规则 (修复点击无反应) ================= */
window.generateStatLogic = async function() {
    // 1. 强制校验人设 (防止空卡生成)
    var charDesc = document.getElementById('cardDesc').value.trim();
    if (!charDesc || charDesc.length < 50) { 
        alert("⛔ 流程拦截：\n请先在【预览页】生成或填写【详细设定】！\n\n逻辑规则需要基于人设性格。"); 
        switchCardTab('preview'); 
        return; 
    }

    // 2. 🔥 核心修复：正确获取输入框内容
    // (之前这里写错了，导致点击报错)
    var inputEl = document.getElementById('aiStatPrompt');
    var req = inputEl ? inputEl.value.trim() : "";

    if (!req) { auth.toast('请先描述你想设计的规则...'); return; }
    
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    
    // 没Key也不报错，直接让用户手动写
    if (!config || !config.apiKey) { 
        auth.toast('⚠️ 未配置Key，切换至手动模式');
        document.getElementById('refineArea_stat').style.display = 'block';
        return;
    }

    var btn = document.getElementById('btnGenStat');
    var oldText = btn.innerText;
    btn.innerText = '🧠 设计中...'; btn.disabled = true;

    // 3. Prompt：要求返回代码+说明书
    var prompt = `
    你是一个SillyTavern专家。用户需求：【${req}】。
    角色设定：${charDesc.substring(0, 300)}...
    
    请编写 System Prompt 规则，并为新手提供修改指南。
    请返回纯 JSON 格式：
    {
        "script": "完整的规则代码（Target, Rule, Output...）",
        "guide": "简短的修改指南，告诉用户怎么调整数值。"
    }
    `;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var data = JSON.parse(cleanJson);
        
        // 4. 填入代码
        var editor = document.getElementById('statEditor');
        // 如果原本有内容，就追加；没有就覆盖
        editor.value = editor.value ? (editor.value + "\n\n" + data.script) : data.script;
        
        // 同步到深度设定
        if(typeof syncStatToNote === 'function') syncStatToNote();

        // 5. 填入说明书
        var guideBox = document.getElementById('statGuide');
        if(guideBox) {
            guideBox.style.display = 'block';
            guideBox.innerText = "📖 AI 助教笔记：\n" + data.guide;
        }
        
        // 6. 存缓存并显示二次编辑框
        if(!window.lastGeneratedData) window.lastGeneratedData = {};
        window.lastGeneratedData.stat = { raw: data.script };
        document.getElementById('refineArea_stat').style.display = 'block';

        auth.toast('✨ 规则与说明书已生成！');

    } catch (e) {
        console.error(e);
        // 🔥 失败也不报错，直接显示编辑框让用户手写
        auth.toast('✅ 编辑模式已就绪 (可手动修改)');
        document.getElementById('refineArea_stat').style.display = 'block';
        
    } finally {
        btn.innerText = oldText; btn.disabled = false;
    }
};


/* 2. 核心功能：全真试玩引擎 */
window.testChatHistory = []; // 临时聊天记录

window.startPlaytest = function() {
    var chatBox = document.getElementById('testChatBox');
    chatBox.innerHTML = '';
    window.testChatHistory = [];

    // 1. 获取卡片数据
    var name = document.getElementById('cardName').value || '角色';
    var firstMes = document.getElementById('cardFirstMes').value;
    
    // 如果没有开场白，提示用户
    if (!firstMes) {
        chatBox.innerHTML = '<div style="text-align:center; color:#e74c3c;">⚠️ 还没有写开场白，无法开始。</div>';
        return;
    }

    // 2. 模拟系统：应用正则渲染开场白
    // 这就是“前端”生效的关键！
    var renderedMes = applyRegexEffects(firstMes);
    
    // 3. 上屏
    appendTestBubble('char', renderedMes);
    auth.toast('🎮 测试环境已加载 (正则+世界书+逻辑已就绪)');
};

window.sendTestMsg = async function() {
    var input = document.getElementById('testInput');
    var text = input.value.trim();
    if (!text) return;

    // 用户消息上屏
    appendTestBubble('user', text);
    window.testChatHistory.push({ role: 'user', content: text });
    input.value = '';

    // 准备发送给 AI
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { appendTestBubble('char', '(无API Key)'); return; }

    var chatBox = document.getElementById('testChatBox');
    var loadingDiv = document.createElement('div');
    loadingDiv.innerText = '🤖 运算逻辑中...';
    loadingDiv.style.cssText = "font-size:10px; color:#999; margin-left:10px;";
    chatBox.appendChild(loadingDiv);

    // 🔥 构造超级 Prompt (模拟酒馆的核心)
    // 包含：深度设定(逻辑) + 世界书(如果有) + 详细设定 + 聊天记录
    var logic = document.getElementById('statEditor').value || ""; // 逻辑
    var desc = document.getElementById('cardDesc').value || ""; // 人设
    var world = ""; 
    
    // 简单的世界书注入 (如果输入包含关键词，就注入内容)
    if (window.currentWorldInfo && window.currentWorldInfo.entries) {
        window.currentWorldInfo.entries.forEach(entry => {
            // 简单的关键词匹配
            if (entry.keys.some(k => text.includes(k))) {
                world += `[World Info: ${entry.content}]\n`;
                console.log("触发世界书:", entry.comment);
            }
        });
    }

    var promptMessages = [
        { role: "system", content: logic + "\n" + world + "\n" + desc },
        ...window.testChatHistory // 附带历史记录
    ];

    try {
        var res = await fetch(`${config.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify({
                model: config.model || 'gpt-3.5-turbo',
                messages: promptMessages
            })
        });
        var data = await res.json();
        var reply = data.choices[0].message.content;

        loadingDiv.remove();
        
        // 🔥 关键：拿到 AI 回复后，立刻跑一遍正则引擎
        var finalHtml = applyRegexEffects(reply);
        
        appendTestBubble('char', finalHtml);
        window.testChatHistory.push({ role: 'assistant', content: reply });

    } catch (e) {
        loadingDiv.remove();
        appendTestBubble('char', '❌ 模拟失败: ' + e.message);
    }
};

/* 辅助：正则渲染引擎 (复用之前的逻辑，但返回字符串) */
function applyRegexEffects(text) {
    var result = text;
    (window.currentCardRegexes || []).forEach(script => {
        try {
            var pat = script.regex;
            var regexObj;
            if (pat.startsWith('/') && pat.lastIndexOf('/') > 0) {
                var body = pat.substring(1, pat.lastIndexOf('/'));
                var flags = pat.substring(pat.lastIndexOf('/') + 1);
                regexObj = new RegExp(body, flags);
            } else {
                var safePat = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                regexObj = new RegExp(safePat, "g");
            }
            result = result.replace(regexObj, script.regexReplacementString);
        } catch (e) {}
    });
    return result;
}

function appendTestBubble(role, html) {
    var box = document.getElementById('testChatBox');
    var div = document.createElement('div');
    div.className = `test-msg ${role}`;
    div.innerHTML = html; // 这里允许 HTML (正则生成的特效)
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

/* ================= 🔧 新增功能：破限(预设)管理器 ================= */

/* ================= 🔧 补丁：双库初始化 (空库) ================= */
// 1. 初始化空库 (只读取用户导入的)
window.JAILBREAK_DB = JSON.parse(localStorage.getItem('my_jailbreaks')) || [];
window.PRESET_DB = JSON.parse(localStorage.getItem('my_presets')) || [];

// 2. 渲染列表函数 (双栏渲染)
window.renderPresetList = function() {
    // 渲染破限
    var jbBox = document.getElementById('jailbreakListContainer');
    jbBox.innerHTML = window.JAILBREAK_DB.length ? '' : '<div style="text-align:center;color:#ccc;margin-top:20px;">暂无破限<br>请导入</div>';
    
    window.JAILBREAK_DB.forEach((item, idx) => {
        var div = document.createElement('div');
        div.style.cssText = "padding:8px; background:#fff; border:1px solid #ffccbc; margin-bottom:5px; border-radius:4px; cursor:pointer; font-size:12px;";
        div.innerHTML = `<b>${item.name}</b>`;
        div.onclick = () => applyPreset(item.content, "破限");
        
        // 删除按钮
        var del = document.createElement('span');
        del.innerHTML = ' ×'; del.style.color = 'red'; del.style.float = 'right';
        del.onclick = (e) => { e.stopPropagation(); deleteItem('jailbreak', idx); };
        div.appendChild(del);
        
        jbBox.appendChild(div);
    });

    // 渲染预设
    var pBox = document.getElementById('presetListContainer');
    pBox.innerHTML = window.PRESET_DB.length ? '' : '<div style="text-align:center;color:#ccc;margin-top:20px;">暂无预设<br>请导入</div>';
    
    window.PRESET_DB.forEach((item, idx) => {
        var div = document.createElement('div');
        div.style.cssText = "padding:8px; background:#fff; border:1px solid #d1c4e9; margin-bottom:5px; border-radius:4px; cursor:pointer; font-size:12px;";
        div.innerHTML = `<b>${item.name}</b>`;
        div.onclick = () => applyPreset(item.content, "预设");
        
        // 删除按钮
        var del = document.createElement('span');
        del.innerHTML = ' ×'; del.style.color = 'red'; del.style.float = 'right';
        del.onclick = (e) => { e.stopPropagation(); deleteItem('preset', idx); };
        div.appendChild(del);
        
        pBox.appendChild(div);
    });
};

// 删除功能
window.deleteItem = function(type, idx) {
    if(confirm('确定删除吗？')) {
        if(type==='jailbreak') {
            window.JAILBREAK_DB.splice(idx, 1);
            localStorage.setItem('my_jailbreaks', JSON.stringify(window.JAILBREAK_DB));
        } else {
            window.PRESET_DB.splice(idx, 1);
            localStorage.setItem('my_presets', JSON.stringify(window.PRESET_DB));
        }
        renderPresetList();
    }
};


/* ================= 🔧 终极补丁：世界书高级版 & 军师系统 ================= */

/* 1. 升级版：更新世界书条目 (保存高级设置) */
var originalUpdateEntry = window.updateCurrentEntry;
window.updateCurrentEntry = function() {
    if (currentEntryIdx === -1) return;
    var entry = window.currentWorldInfo.entries[currentEntryIdx];
    
    // 保存原有字段
    originalUpdateEntry(); 
    
    // 🔥 保存新加的高级字段
    entry.position = parseInt(document.getElementById('wiPosition').value) || 1;
    entry.scan_depth = parseInt(document.getElementById('wiDepth').value) || 4;
    entry.token_budget = parseInt(document.getElementById('wiBudget').value) || 500;
    
    // 强制同步
    entry.constant = false; // 默认非如影随形
    entry.selective = true; // 默认开启筛选
};

/* 2. 升级版：选中条目时回显高级设置 */
var originalSelectEntry = window.selectEntry;
window.selectEntry = function(idx) {
    originalSelectEntry(idx);
    var entry = window.currentWorldInfo.entries[idx];
    
    // 回显数据
    document.getElementById('wiPosition').value = entry.position !== undefined ? entry.position : 1;
    document.getElementById('wiDepth').value = entry.scan_depth || 4;
    document.getElementById('wiBudget').value = entry.token_budget || 500;
};

/* 3. 联动逻辑：生成正则后，询问是否生成配套世界书 */
var originalGenFront = window.generateFrontendCode;
window.generateFrontendCode = async function() {
    await originalGenFront(); // 先跑原来的生成
    
    // 🔥 核心联动：如果原来的生成成功了 (前端代码有了)
    // 我们可以检测一下是否包含 [STATUS] 这种触发词
    var data = window.lastGeneratedData.frontend;
    if (data && data.regex) {
        var rawKey = data.regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '');
        
        // 延时一点弹出，体验更好
        setTimeout(() => {
            if(confirm(`检测到前端脚本触发词【${rawKey}】。\n\n是否需要生成一个配套的“世界书条目”？\n(酒馆中通常需要世界书来存储状态数值)`)) {
                // 自动跳到世界书页
                switchCardTab('world');
                // 自动填入需求
                document.getElementById('aiWorldPrompt').value = `为前端脚本"${data.name}"生成配套数据结构，触发词是"${rawKey}"，内容是一段隐藏的JSON数据或设定介绍`;
                // 自动点击生成
                generateWorldEntry();
            }
        }, 1000);
    }
};

/* 4. 🧠 军师系统 (AI Advisor) */

/* ================= 🔧 补丁：军师系统 2.0 (白话文 + 交互式建议) ================= */

window.analyzeCardNeeds = async function() {
    var name = document.getElementById('cardName').value;
    var desc = document.getElementById('cardDesc').value.trim();
    
    // 强制门槛
    if (desc.length < 200) { console.log("字数不够，军师暂不打扰"); return; }

    // 显示窗口
    var box = document.getElementById('aiAdvisorBox');
    if(box) box.style.display = 'flex';
    
    var chat = document.getElementById('advisorChat');
    chat.innerHTML = `<div class="ai-loading" style="color:#999;font-size:12px;text-align:center;">🧠 正在分析人设，生成建议...</div>`;

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    
    // 🔥 Prompt 升级：要求 JSON 格式，大白话，无 Markdown
    var prompt = `
    我是卡片作者。角色：${name}。
    设定：${desc.substring(0, 800)}...
    
    请作为“制作顾问”，用【通俗易懂的大白话】（不要古风，不要翻译腔），提出 3 个具体的制作建议。
    
    必须返回纯 JSON 数组，格式如下：
    [
        {
            "type": "world",
            "title": "建议标题 (如: 添加门派设定)",
            "reason": "为什么建议这么做 (如: 因为他是剑客，需要背景支撑)",
            "prompt": "生成一个【青云门】的设定，包含门规和地理位置"
        },
        {
            "type": "frontend",
            "title": "建议标题 (如: 增加剑气特效)",
            "reason": "理由...",
            "prompt": "做一个全屏的剑气划过特效，半透明白色"
        },
        {
            "type": "stat",
            "title": "建议标题 (如: 黑化值系统)",
            "reason": "理由...",
            "prompt": "设计一套【黑化值】系统，数值越高对话越疯狂"
        }
    ]
    注意：
    1. type 只能是 "world"(世界书), "frontend"(前端), "stat"(属性)。
    2. prompt 是填入生成器的指令，要具体。
    3. 不要输出任何 Markdown 符号或额外文字，只输出 JSON。
    `;

    try {
        var res = await fetchAI(prompt, config);
        // 清理可能存在的 ```json 包裹
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var suggestions = JSON.parse(cleanJson);
        
        // 清空 loading
        chat.innerHTML = '';
        
        // 🔥 渲染建议气泡
        suggestions.forEach(item => {
            renderSuggestionBubble(item);
        });
        
    } catch(e) { 
        console.error(e);
        chat.innerHTML += `<div class="advisor-bubble">❌ 军师脑子卡住了... (解析失败)</div>`; 
    }
};

/* 辅助：渲染单个建议气泡 */
function renderSuggestionBubble(item) {
    var chat = document.getElementById('advisorChat');
    var div = document.createElement('div');
    div.className = 'advisor-bubble';
    
    // 根据类型显示不同图标
    var icon = "💡";
    if(item.type === 'world') icon = "🌍";
    if(item.type === 'frontend') icon = "🎨";
    if(item.type === 'stat') icon = "📊";

    div.innerHTML = `
        <div style="font-weight:bold; color:#6c5ce7; margin-bottom:4px;">${icon} ${item.title}</div>
        <div style="font-size:12px; color:#666; margin-bottom:8px;">${item.reason}</div>
        <button class="advisor-action-btn" onclick="jumpToCreator('${item.type}', '${item.prompt.replace(/'/g, "\\'")}')">
            👉 去添加 (自动填单)
        </button>
    `;
    
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}



/* ================= 🔧 补丁：对话逻辑 (大白话版) ================= */
window.sendAdvisorMsg = async function() {
    var input = document.getElementById('advisorInput');
    var text = input.value.trim();
    if(!text) return;
    
    var chat = document.getElementById('advisorChat');
    // 用户气泡
    chat.innerHTML += `<div style="text-align:right; margin:5px 0; color:#6c5ce7; font-size:12px; padding:5px; background:#f0f0f0; border-radius:8px; display:inline-block; margin-left:auto;">${text}</div><div style="clear:both;"></div>`;
    input.value = '';
    
    // 显示思考中
    var loadingId = 'adv-loading-' + Date.now();
    chat.innerHTML += `<div id="${loadingId}" class="ai-loading" style="font-size:10px; color:#999;">🧠 思考中...</div>`;
    chat.scrollTop = chat.scrollHeight;

    // 逻辑
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    var desc = document.getElementById('cardDesc').value;
    
    // 🔥 Prompt 修改：明确要求“通俗易懂的大白话”
    var prompt = `
    角色设定：${desc.substring(0, 300)}...
    用户问：${text}
    
    请作为“SillyTavern卡片制作顾问”，回答用户的问题。
    要求：
    1. 语言通俗易懂，大白话，不要古风。
    2. 针对酒馆卡片制作（正则、世界书、属性）给出专业建议。
    3. 不要使用 Markdown 格式，不要加星号*。
    `;
    
    try {
        var res = await fetchAI(prompt, config);
        document.getElementById(loadingId).remove();
        
        // 渲染 AI 回复气泡 (普通气泡)
        var div = document.createElement('div');
        div.className = 'advisor-bubble';
        div.innerHTML = res.replace(/\n/g, '<br>');
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
    } catch(e) {
        document.getElementById(loadingId).remove();
    }
};



/* ================= 🧩 核心联动逻辑：前端特效 + 世界书自动定位 ================= */

// 1. 定义全局“暗号”变量 (用于在两个函数间传递类型线索)
window.currentFrontendTypeHint = ""; 

// 2. 【接收端】世界书生成器 (升级版：会读暗号、会自动定位置)

// 1. 世界书生成 (带锁)
window.generateWorldEntry = async function() {
    // 🔒 强制校验锁
    var charDesc = document.getElementById('cardDesc').value.trim();
    if (!charDesc || charDesc.length < 50) { 
        alert("⛔ 流程拦截：\n请先在【预览页】生成或填写【详细设定】！\n\n世界书必须基于人设背景才能生成，否则没有灵魂。"); 
        switchCardTab('preview'); 
        return; 
    }

    var req = document.getElementById('aiWorldPrompt').value.trim();
    if (!req) { auth.toast('需求为空...'); return; }

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) return;

    var btn = document.getElementById('btnGenWorld');
    btn.innerText = '🧠 智能布局中...'; btn.disabled = true;

    // 🔥 关键步骤：读取前端生成器留下的“暗号”
    var typeHint = window.currentFrontendTypeHint || "普通条目";

    // 🔥 关键步骤：Prompt 升级，告诉 AI 根据暗号来决定 Position
    var prompt = `
    你是一个世界书专家。
    【所属角色背景】：${charDesc.substring(0, 500)}
    【用户需求】：${req}
    【类型线索】：${typeHint}
    
    请生成一个 JSON 条目。
    特别注意 "position" 字段 (0-4)：
    - 如果是【状态栏/Status Bar】，通常设为 1 (Before Char) 或 3 (After User)。
    - 如果是【开场白特效/Intro Effect】，设为 0 (Before User) 或 4 (Top)。
    - 如果是【普通设定】，设为 1。
    
    返回纯JSON：
    {
        "comment": "条目名",
        "keys": ["触发词"],
        "content": "内容",
        "position": 1
    }
    `;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var data = JSON.parse(cleanJson);
        
        // 格式化 HTML 内容
        var formattedContent = data.content;
        if(formattedContent.includes('<') && formattedContent.includes('>')) {
            formattedContent = simpleFormatHTML(formattedContent);
        }

        // 添加到列表
        window.currentWorldInfo.entries.push({
            id: Date.now(),
            keys: data.keys || [],
            content: formattedContent || "",
            comment: data.comment || "AI条目",
            // 🔥 关键步骤：应用 AI 算出来的自动位置
            position: data.position !== undefined ? data.position : 1,
            enabled: true, insertion_position: 1, 
            scan_depth: 4, token_budget: 500
        });
        
        // 存入缓存供二次编辑
        window.lastGeneratedData.world = data;
        document.getElementById('refineArea_world').style.display = 'block';

        renderWorldList();
        // 选中新条目，让你立刻看到位置是不是变了
        selectEntry(window.currentWorldInfo.entries.length - 1);
        
        auth.toast('✨ 条目已生成 (位置已自动适配)');
        
        // 🔥 关键步骤：用完清除暗号，防止影响下次生成
        window.currentFrontendTypeHint = "";

    } catch (e) { 
        auth.toast('❌ 错误'); 
        console.error(e); 
    } finally { 
        btn.innerText = '✨ 生成条目'; 
        btn.disabled = false; 
    }
};

// 3. 【发送端】前端代码生成器 (升级版：生成后自动侦测类型，并发起联动)
window.generateFrontendCode = async function() {
    var req = document.getElementById('aiCodePrompt').value.trim();
    var charDesc = document.getElementById('cardDesc').value.trim();
    
    if (!req) { auth.toast('需求不能为空...'); return; }
    if (!charDesc) { alert('⚠️ 请先在【预览】页填写“详细设定”！'); return; }

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请配置 API Key'); return; }
    
    var btn = document.getElementById('btnGenCode');
    btn.innerText = '🧠 融合设定构建中...'; btn.disabled = true;

    var prompt = `
    你是一个SillyTavern前端专家。
    【当前角色设定】：${charDesc.substring(0, 500)}...
    【用户需求】：${req}
    
    请根据【角色设定】的风格设计 HTML/CSS 代码。
    请返回纯JSON：{"name":"脚本名","regex":"/\\\\[关键词\\\\]/g","code":"HTML代码"}
    `;

    try {
        var res = await fetchAI(prompt, config);
        var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        var data = JSON.parse(cleanJson);
        
        // 填入编辑框
        document.getElementById('frontName').value = data.name || 'AI脚本';
        document.getElementById('frontPattern').value = data.regex || '';
        document.getElementById('frontReplace').value = simpleFormatHTML(data.code) || '';

        // 自动填入测试词
        var rawKey = data.regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '');
        document.getElementById('regexTestInput').value = rawKey;
        
        // 存缓存并显示二次编辑
        window.lastGeneratedData.frontend = data;
        document.getElementById('refineArea_frontend').style.display = 'block';

        auth.toast('✨ 已根据人设生成专属特效！');
        runRegexTest(); // 立即预览

        // 👇👇👇 【联动核心逻辑】 👇👇👇
        // 延时 1 秒，让用户先看到特效生成成功了，再弹窗询问
        setTimeout(() => {
            if(confirm(`检测到前端脚本触发词【${rawKey}】。\n\n是否需要生成一个配套的“世界书条目”？\n(酒馆中通常需要世界书来存储状态数值或背景设定)`)) {
                
                // 1. 智能推测这到底是个啥
                var hint = "普通设定";
                if(data.code.includes('position: fixed') || data.name.includes('状态') || data.name.includes('Status')) {
                    hint = "状态栏 (Status Bar)";
                } else if(data.regex.includes('Start') || data.name.includes('开场')) {
                    hint = "开场白特效";
                }
                
                // 2. 发送暗号：存入全局变量
                window.currentFrontendTypeHint = hint; 

                // 3. 自动跳转到世界书页
                switchCardTab('world');
                
                // 4. 自动填好需求
                document.getElementById('aiWorldPrompt').value = `为前端脚本"${data.name}"(${hint})生成配套数据结构，触发词"${rawKey}"，内容是一段隐藏的JSON数据或设定介绍`;
                
                // 5. 自动点击生成按钮
                generateWorldEntry();
            }
        }, 800);
        // 👆👆👆 【联动结束】 👆👆👆

    } catch (e) {
        console.error(e);
        auth.toast('❌ 生成失败 (JSON解析错)');
    } finally {
        btn.innerText = '✨ 一键生成'; btn.disabled = false;
    }
};

/* ================= 🔧 补丁：强制流程 & 强力导入 ================= */

/* 1. 修复：强力导入函数 (支持多种JSON格式) */
window.handleImport = function(input, type) {
    var file = input.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var raw = e.target.result;
            var json = JSON.parse(raw);
            var newItem = null;

            // 🕵️ 智能识别格式
            // 格式A: SillyTavern 格式 { "name": "xxx", "prompt": "..." }
            if (json.name && (json.prompt || json.content)) {
                newItem = { name: json.name, content: json.prompt || json.content };
            }
            // 格式B: 纯数组 (批量导入)
            else if (Array.isArray(json)) {
                alert("检测到批量文件，将全部导入！");
                json.forEach(j => {
                    if(j.name && (j.prompt || j.content)) {
                        if(type==='jailbreak') window.JAILBREAK_DB.push({name:j.name, content:j.prompt||j.content});
                        else window.PRESET_DB.push({name:j.name, content:j.prompt||j.content});
                    }
                });
            }
            // 格式C: 简单的 Key-Value { "我的破限": "内容..." }
            else {
                // 尝试取文件名当名字
                var fileName = file.name.replace(/\.[^/.]+$/, "");
                // 如果JSON里有 'content' 字段
                if (json.content) newItem = { name: fileName, content: json.content };
                // 实在不行，把整个 JSON 转字符串当内容 (保底)
                else newItem = { name: fileName, content: raw };
            }

            if (newItem) {
                if(type === 'jailbreak') window.JAILBREAK_DB.push(newItem);
                else window.PRESET_DB.push(newItem);
            }

            // 保存并刷新
            localStorage.setItem('my_jailbreaks', JSON.stringify(window.JAILBREAK_DB));
            localStorage.setItem('my_presets', JSON.stringify(window.PRESET_DB));
            renderPresetList();
            auth.toast('✅ 导入成功！');

        } catch (err) {
            console.error(err);
            alert('❌ 导入失败：JSON 格式难以识别。\n请确保文件是标准的 JSON 格式。');
        }
    };
    reader.readAsText(file);
    input.value = '';
};

/* 2. 覆盖：前端生成 (加入强制校验) */
var _oldGenFront = window.generateFrontendCode; // 备份旧函数(如果有)
window.generateFrontendCode = async function() {
    // 🔥 校验：必须先有人设！
    var desc = document.getElementById('cardDesc').value.trim();
    if (!desc || desc.length < 50) {
        alert("⛔ 流程错误：请先生成【详细设定】！\n\n前端特效必须基于角色人设（性格/配色）来生成，否则没有灵魂。");
        // 自动跳回预览页
        switchCardTab('preview');
        return; // 强制停止
    }
    
    // 如果通过校验，执行原逻辑 (如果你之前已经贴过最新的 generateFrontendCode，这里可以直接运行)
    // 为了保险，我把原逻辑的核心调用写在这里：
    var req = document.getElementById('aiCodePrompt').value.trim();
    if (!req) { auth.toast('需求为空...'); return; }
    
    // ... (后续生成逻辑保持不变，确保你用了之前的“联动版”代码) ...
    // 这里为了不重复粘贴几百行代码，请确保你已经应用了上一次对话提供的 generateFrontendCode
    // 如果上一次的代码没删，这里只需要加上面的校验即可。
    
    // 👇 如果你想要一个完整的覆盖版，请用下面这个：
    executeSafeFrontendGen(req, desc);
};

// 封装的安全生成函数 (复用之前的联动逻辑)
async function executeSafeFrontendGen(req, charDesc) {
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请配置 API Key'); return; }
    
    var btn = document.getElementById('btnGenCode');
    btn.innerText = '🧠 融合设定构建中...'; btn.disabled = true;

    var prompt = `你是一个SillyTavern前端专家。\n【角色设定】：${charDesc.substring(0, 300)}...\n【需求】：${req}\n请设计HTML/CSS。返回纯JSON：{"name":"..","regex":"/\\\\[关键词\\\\]/g","code":".."}`;

    try {
        var res = await fetchAI(prompt, config);
        var data = JSON.parse(res.replace(/```json/g, '').replace(/```/g, '').trim());
        
        document.getElementById('frontName').value = data.name;
        document.getElementById('frontPattern').value = data.regex;
        document.getElementById('frontReplace').value = simpleFormatHTML(data.code);
        
        // 联动逻辑
        var rawKey = data.regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '');
        document.getElementById('regexTestInput').value = rawKey;
        window.lastGeneratedData.frontend = data;
        document.getElementById('refineArea_frontend').style.display = 'block';
        runRegexTest();

        setTimeout(() => {
            if(confirm(`检测到前端特效【${rawKey}】。\n是否生成配套世界书？`)) {
                var hint = "普通设定";
                if(data.code.includes('fixed') || data.name.includes('状态')) hint = "状态栏";
                else if(data.regex.includes('Start')) hint = "开场特效";
                window.currentFrontendTypeHint = hint;
                switchCardTab('world');
                document.getElementById('aiWorldPrompt').value = `为"${data.name}"生成配套数据，触发词"${rawKey}"`;
                generateWorldEntry();
            }
        }, 800);

    } catch (e) { auth.toast('❌ 生成失败'); } 
    finally { btn.innerText = '✨ 一键生成'; btn.disabled = false; }
}

/* ================= 🔧 修复补丁：正确的弹窗开关 ================= */
window.togglePresetModal = function() {
    var m = document.getElementById('presetModal');
    // 如果找不到元素，直接退出，防止报错
    if (!m) return; 

    // 如果当前是关着的 (none) 或者空
    if (m.style.display === 'none' || m.style.display === '') {
        // 🔥 关键修复：打开时设为 flex (为了左右分栏布局)，而不是 block
        m.style.display = 'flex'; 
        // 如果有渲染函数，顺便刷新一下列表
        if (typeof renderPresetList === 'function') renderPresetList();
    } else {
        // 关闭时设为 none
        m.style.display = 'none';
    }
};

/* ================= 🔧 补丁：点击即“使用” (应用预设逻辑) ================= */
window.applyPreset = function(content, typeName) {
    // 1. 找到存放位置：深度设定 (Creator Notes / Depth Prompt)
    // 这是酒馆读取破限规则的核心区域
    var targetBox = document.getElementById('cardNote');
    
    // 如果你在属性页，可能用的是 statEditor，做个兼容查找
    if (!targetBox) targetBox = document.getElementById('statEditor');

    if (!targetBox) {
        alert('❌ 错误：找不到【深度设定】输入框，无法应用！\n请确认你是否还在创造者工坊页面内。');
        return;
    }

    // 2. 执行“使用”动作：追加写入
    // 如果框里原本有内容，就换两行再追加，防止粘在一起
    if (targetBox.value.trim() !== "") {
        targetBox.value += "\n\n" + content;
    } else {
        targetBox.value = content;
    }

    // 3. 强制数据同步 (防止你在属性页改了，高级页没变)
    // 如果存在同步函数就执行一下，确保万无一失
    if (typeof syncStatToNote === 'function') syncStatToNote();
    // 反向同步：如果刚才改的是 cardNote，也要同步给 statEditor
    var statEditor = document.getElementById('statEditor');
    if (statEditor && targetBox.id === 'cardNote') statEditor.value = targetBox.value;
    // 如果刚才改的是 statEditor，也要同步给 cardNote
    var cardNote = document.getElementById('cardNote');
    if (cardNote && targetBox.id === 'statEditor') cardNote.value = targetBox.value;

    // 4. ⚡️ 视觉反馈 (让你知道生效了)
    auth.toast(`✅ 已使用！${typeName} 已注入深度设定`);
    
    // 自动关闭弹窗
    window.togglePresetModal(); 
    
    // 🔥 关键体验：自动跳转到【高级】页，并高亮输入框，让你亲眼看到它加进去了
    switchCardTab('advanced'); 
    
    // 让框框闪一下绿色，表示成功
    targetBox.style.transition = "background 0.5s";
    targetBox.style.backgroundColor = "#d4edda"; // 浅绿
    setTimeout(() => { targetBox.style.backgroundColor = ""; }, 800);
};

/* ================= 🔧 修正补丁：临时破限 (只影响生成) ================= */

// 1. 定义一个临时变量 (相当于内存条)
window.tempActiveJailbreak = ""; 

// 2. 覆盖：点击“使用”的逻辑
// 改动点：不再写入输入框，而是存入内存变量
window.applyPreset = function(content, typeName) {
    // 存入临时变量
    window.tempActiveJailbreak = content;

    // 视觉反馈：只弹窗提示，不跳转页面，不改动输入框
    auth.toast(`💉 ${typeName} 已注入生成引擎！\n(仅本次编辑有效，不写入卡片)`);
    
    // 关闭弹窗
    window.togglePresetModal();
};

// 3. 覆盖：核心请求函数 (fetchAI)
// 改动点：在发送请求前，检查有没有“临时破限”，有的话加塞到 System Prompt 里
window.fetchAI = async function(userPrompt, config) {
    if(!config || !config.apiKey) throw new Error("No API Key");

    // --- 🔥 核心修改开始 ---
    var messages = [];

    // 如果内存里有破限/预设，把它作为最高指令 (System) 放在第一条
    if (window.tempActiveJailbreak) {
        messages.push({ 
            role: "system", 
            content: window.tempActiveJailbreak 
        });
        console.log("已应用临时破限:", window.tempActiveJailbreak.substring(0, 20) + "...");
    }

    // 然后才是具体的要求 (User)
    messages.push({ role: "user", content: userPrompt });
    // --- 🔥 核心修改结束 ---

    const response = await fetch(`${config.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({
            model: config.model || 'gpt-3.5-turbo',
            messages: messages, // 发送组合好的消息链
            temperature: 0.7,   // 稍微加点创造性
            stream: false
        })
    });

    const data = await response.json();
    
    if(data.error) {
        throw new Error(data.error.message || "API Error");
    }
    return data.choices[0].message.content;
};

/* ================= 🔧 补丁：无脑生成模式 & 军师强制召唤 ================= */

/* 1. 修复：详细设定生成 (绝对不再报错) */
window.autoGenDesc = async function() {
    var name = document.getElementById('cardName').value.trim();
    if (!name) { auth.toast('先给角色起个名字吧！'); return; }
    
    // 获取标签
    var tags = Array.from(document.querySelectorAll('.wizard-tag.selected'))
                    .map(el => el.textContent).join('、');

    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }

    var btn = event.target;
    var oldText = btn.innerText;
    btn.innerText = '✍️ 正在写...'; btn.style.pointerEvents = 'none';

    var prompt = `我是创造者。请为角色【${name}】(标签:${tags||"无"})写一段“详细设定”(Description)。
    要求：包含外貌、性格、身世。300字左右。直接输出纯文本，不要任何解释或代码块。`;

    try {
        var res = await fetchAI(prompt, config);
        
        // 🔥 核心修改：不管 AI 返回什么，直接填进去，不准报错！
        // 清理一下可能带的 Markdown 符号
        var cleanText = res.replace(/```/g, '').trim();
        document.getElementById('cardDesc').value = cleanText;
        
        if(typeof updateJsonSource === 'function') updateJsonSource();
        auth.toast('✅ 设定写入成功！');
        
        // 🔥 尝试触发军师 (传入 false 表示非强制，需检查字数)
        checkAndOpenAdvisor(false); 
        
    } catch (e) {
        console.error(e);
        // 只有网络真的断了才报个错，否则都算成功
        auth.toast('❌ 网络连接错误');
    } finally {
        btn.innerText = oldText; btn.style.pointerEvents = 'auto';
    }
};

/* 2. 修复：开场白生成 (绝对不再报错) */
window.autoGenFirstMes = async function() {
    var name = document.getElementById('cardName').value.trim();
    var desc = document.getElementById('cardDesc').value.trim();
    
    // 如果没设定，就用名字瞎编一个，不准报错阻拦
    if(!desc) desc = `一个叫${name}的角色`;
    
    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
    var btn = event.target; 
    var oldText = btn.innerText;
    btn.innerText = '✍️...'; 

    var prompt = `角色：${name}。\n设定：${desc}\n请写一句开场白。直接输出纯文本。`;

    try {
        var res = await fetchAI(prompt, config);
        document.getElementById('cardFirstMes').value = res.replace(/```/g, '').trim();
        if(typeof updatePreviewUI === 'function') updatePreviewUI();
        auth.toast('✅ 开场白写入成功！');
    } catch(e) { auth.toast('❌ 网络错误'); }
    finally { btn.innerText = oldText; }
};

/* 3. 新增：手动/自动 军师触发逻辑 */
window.checkAndOpenAdvisor = function(isForce) {
    var desc = document.getElementById('cardDesc').value.trim();
    
    // 自动模式：字数不够就不开
    if (!isForce && desc.length < 200) {
        console.log(`字数 ${desc.length} < 200，军师暂不打扰`);
        return;
    }

    // 强制模式 或 字数达标：必须打开！
    var box = document.getElementById('aiAdvisorBox');
    if (box) {
        box.style.display = 'flex'; // 强制显示
        
        // 如果里面还没内容，或者这次是强制点开的，就触发分析
        var chat = document.getElementById('advisorChat');
        if (chat.innerText.trim() === "" || chat.innerText.includes("主公") || isForce) {
            analyzeCardNeeds(); // 重新分析
        }
    } else {
        alert("❌ 错误：找不到军师窗口 (aiAdvisorBox)，请检查是否复制了之前的 HTML 代码！");
    }
};

/* 4. 按钮绑定的强制函数 */
window.forceOpenAdvisor = function() {
    var desc = document.getElementById('cardDesc').value.trim();
    if (desc.length === 0) {
        auth.toast('📜 主公，请先写点人设，哪怕几个字也好...');
        return;
    }
    auth.toast('🧠 军师正在赶来...');
    checkAndOpenAdvisor(true); // true 代表强制打开，无视字数限制
};

/* ================= 🔧 终极修复：拖拽回弹 + 防误触白名单 ================= */
(function() {
    var box = document.getElementById('aiAdvisorBox');
    var header = document.getElementById('advisorHeader');
    
    if (!box || !header) return;

    var isDragging = false;
    var startX = 0, startY = 0;
    var initialLeft = 0, initialTop = 0;

    function dragStart(e) {
        // 🔥 新增：防误触白名单
        // 如果点的是按钮、输入框、或者有点击事件的元素，直接退出，不许拖拽
        if (e.target.tagName === 'BUTTON' || 
            e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' || 
            e.target.closest('button') || 
            e.target.closest('.advisor-action-btn') || // 那个虚线按钮
            e.target.onclick) {
            return; 
        }

        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var clientY = e.touches ? e.touches[0].clientY : e.clientY;

        isDragging = true;
        startX = clientX; startY = clientY;
        
        var rect = box.getBoundingClientRect();
        initialLeft = rect.left; initialTop = rect.top;
        
        // 锁定位置模式
        box.style.bottom = 'auto'; box.style.right = 'auto';
        box.style.left = initialLeft + 'px'; box.style.top = initialTop + 'px';

        if(e.cancelable) e.preventDefault();
    }

    function dragMove(e) {
        if (!isDragging) return;
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var clientY = e.touches ? e.touches[0].clientY : e.clientY;
        box.style.left = (initialLeft + (clientX - startX)) + 'px';
        box.style.top = (initialTop + (clientY - startY)) + 'px';
        if(e.cancelable) e.preventDefault();
    }

    function dragEnd() {
        if (!isDragging) return;
        isDragging = false;

        // 🔥 保留你喜欢的：回弹逻辑
        var winW = window.innerWidth;
        var winH = window.innerHeight;
        var rect = box.getBoundingClientRect();
        
        var newLeft = rect.left;
        var newTop = rect.top;

        // 计算边界：屏幕宽 - 窗口宽 (保证贴边不飞出)
        var maxLeft = winW - rect.width; 
        var maxTop = winH - rect.height;

        // 左/上出界拉回 0
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        
        // 右/下出界拉回极限值
        if (newLeft > maxLeft) newLeft = maxLeft; 
        if (newTop > maxTop) newTop = maxTop; 

        // 执行回弹动画
        box.style.transition = "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)";
        box.style.left = newLeft + 'px';
        box.style.top = newTop + 'px';
        
        setTimeout(() => { box.style.transition = ""; }, 300);
    }

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
    header.addEventListener('touchstart', dragStart, {passive: false});
    document.addEventListener('touchmove', dragMove, {passive: false});
    document.addEventListener('touchend', dragEnd);
})();
    
   

/* ================= 🔧 补丁：无限存档系统 ================= */

// 1. 打开管理器
window.openSaveManager = function() {
    document.getElementById('saveManagerModal').style.display = 'flex';
    renderSaveList();
};

/* ================= 🔧 补丁：存档系统 (确保军师记录不丢失) ================= */
window.createNewSave = function() {
    // 1. 安全获取输入框内容
    function safeVal(id) { 
        var el = document.getElementById(id); 
        return el ? el.value : ""; 
    }

    var name = safeVal('cardName').trim() || "未命名角色";
    var time = new Date().toLocaleString();

    // 2. 🔥 核心：获取军师聊天记录 (HTML)
    // 只要这里取到了，存档里就一定会有
    var advisorHtml = "";
    var chatBox = document.getElementById('advisorChat');
    if (chatBox) advisorHtml = chatBox.innerHTML;

    // 3. 打包数据
    var saveData = {
        id: Date.now(),
        title: name,
        time: time,
        inputs: {
            name: safeVal('cardName'),
            desc: safeVal('cardDesc'),
            firstMes: safeVal('cardFirstMes'),
            mesEx: safeVal('cardMesExample'),
            scenario: safeVal('cardScenario'),
            note: safeVal('cardNote') || safeVal('statEditor')
        },
        // 深拷贝防止引用问题
        worldInfo: JSON.parse(JSON.stringify(window.currentWorldInfo || { entries: [] })),
        regexScripts: JSON.parse(JSON.stringify(window.currentCardRegexes || [])),
        wizardTags: JSON.parse(JSON.stringify(window.currentSelectedTags || { identity: [], personality: [], trope: [] })),
        
        // 保存聊天记录
        advisorChat: advisorHtml
    };

    // 4. 读取现有存档并处理同名覆盖
    try {
        var saves = JSON.parse(localStorage.getItem('my_creator_saves') || "[]");
        
        var idx = saves.findIndex(s => s.title === name);
        if (idx !== -1) {
            saves.splice(idx, 1); // 删旧
            auth.toast('💾 存档已更新 (覆盖同名)');
        } else {
            auth.toast('💾 新存档已创建');
        }
        
        saves.unshift(saveData); // 存新
        localStorage.setItem('my_creator_saves', JSON.stringify(saves));
        
        if(typeof renderSaveList === 'function') renderSaveList();

    } catch (e) {
        alert("存档失败: " + e.message);
    }
};




// 3. 渲染存档列表
window.renderSaveList = function() {
    var list = document.getElementById('saveSlotList');
    var saves = JSON.parse(localStorage.getItem('my_creator_saves') || "[]");
    list.innerHTML = "";

    if(saves.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">暂无存档</div>';
        return;
    }

    saves.forEach((save, idx) => {
        var div = document.createElement('div');
        div.style.cssText = "background:#fff; border:1px solid #ddd; margin-bottom:10px; padding:10px; border-radius:8px; cursor:pointer; position:relative;";
        div.innerHTML = `
            <div style="font-weight:bold; color:#333;">${save.title}</div>
            <div style="font-size:10px; color:#999;">${save.time}</div>
            <button onclick="deleteSave(${idx})" style="position:absolute; right:10px; top:10px; border:none; background:none; color:#e74c3c; cursor:pointer;">🗑️</button>
        `;
        // 点击读取
        div.onclick = (e) => { if(e.target.tagName!=='BUTTON') loadSave(idx); };
        list.appendChild(div);
    });
};


// 2. 读档 (恢复标签与聊天)
window.loadSave = function(idx) {
    if(!confirm('读取存档将覆盖当前进度，确定吗？')) return;
    
    var saves = JSON.parse(localStorage.getItem('my_creator_saves') || "[]");
    var data = saves[idx];
    if(!data) return;

    // 恢复输入框
    document.getElementById('cardName').value = data.inputs.name || '';
    document.getElementById('cardDesc').value = data.inputs.desc || '';
    document.getElementById('cardFirstMes').value = data.inputs.firstMes || '';
    document.getElementById('cardMesExample').value = data.inputs.mesEx || '';
    document.getElementById('cardScenario').value = data.inputs.scenario || '';
    if(document.getElementById('cardNote')) document.getElementById('cardNote').value = data.inputs.note || '';
    if(document.getElementById('statEditor')) document.getElementById('statEditor').value = data.inputs.note || '';

    // 恢复对象
    window.currentWorldInfo = data.worldInfo || { entries: [] };
    window.currentCardRegexes = data.regexScripts || [];
    
    // 🔥 修复：恢复标签数据并高亮
    window.currentSelectedTags = data.selectedTags || { identity: [], personality: [], trope: [] };
    restoreTagVisuals(); // 调用第一步写的函数

    // 恢复聊天
    var chatBox = document.getElementById('advisorChat');
    if(chatBox) {
        chatBox.innerHTML = data.advisorChat || "";
        // 读档后，如果里面有话，可以自动打开窗口
        if(data.advisorChat) document.getElementById('aiAdvisorBox').style.display = 'flex';
    }

    // 刷新界面
    if(typeof renderWorldList === 'function') renderWorldList();
    if(typeof renderRegexList === 'function') renderRegexList();
    if(typeof updatePreviewUI === 'function') updatePreviewUI();

    document.getElementById('saveManagerModal').style.display = 'none';
    auth.toast('📂 读档成功');
};

// 3. 🔥 彻底重置并关闭 (请把关闭按钮 onclick 改为调用这个)
window.closeAndResetCreator = function() {
    if(!confirm('确定退出创造者工坊吗？\n未保存的内容将丢失！')) return;

    // 清空所有输入框
    var inputs = document.querySelectorAll('#cardCreatorModal input, #cardCreatorModal textarea');
    inputs.forEach(i => i.value = '');

    // 清空全局变量
    window.currentWorldInfo = { entries: [] };
    window.currentCardRegexes = [];
    window.currentSelectedTags = { identity: [], personality: [], trope: [] };
    
    // 清空军师聊天
    var chatBox = document.getElementById('advisorChat');
    if(chatBox) chatBox.innerHTML = '';
  document.getElementById('cardCreatorModal').classList.remove('active');
    document.getElementById('cardCreatorModal').style.display = ''; // 清除残留
    
    document.getElementById('aiAdvisorBox').style.display = 'none'; // 军师窗口还是可以直接藏的
    document.getElementById('saveManagerModal').style.display = 'none'; // 存档窗口也可以直接藏
    
  
    // 刷新一下标签显示(清空选中状态)
    restoreTagVisuals();
};


// 5. 删除存档
window.deleteSave = function(idx) {
    if(!confirm('确定删除这个存档吗？')) return;
    var saves = JSON.parse(localStorage.getItem('my_creator_saves') || "[]");
    saves.splice(idx, 1);
    localStorage.setItem('my_creator_saves', JSON.stringify(saves));
    renderSaveList();
};

// 6. 完结清空
window.finishAndClear = function() {
    if(!confirm('确定完结吗？\n这将清空当前页面的所有输入框和记录。\n建议先存档！')) return;
    
    // 清空所有输入框
    var inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(i => i.value = '');
    
    // 重置全局变量
    window.currentWorldInfo = { entries: [] };
    window.currentCardRegexes = [];
    document.getElementById('advisorChat').innerHTML = '';
    
    // 刷新 UI
    renderWorldList();
    renderRegexList();
    document.getElementById('aiAdvisorBox').style.display = 'none';
    
    auth.toast('🏁 页面已重置，准备开始新的创作');
};

/* ================= 🔧 修复补丁：安全存档系统 (防崩溃版) ================= */

// 1. 修复：新建存档 (加入安全检查，防止因找不到输入框而卡死)
window.createNewSave = function() {
    // 内部小工具：安全获取输入框内容
    function safeGet(id) {
        var el = document.getElementById(id);
        return el ? el.value : "";
    }

    // 获取名字
    var name = safeGet('cardName').trim();
    if (!name) name = "未命名角色";
    
    var time = new Date().toLocaleString();

    try {
        // 🔥 核心修复：打包数据时，如果某个变量不存在，使用空值代替，防止报错
        var saveData = {
            id: Date.now(),
            title: name,
            time: time,
            inputs: {
                name: name,
                desc: safeGet('cardDesc'),
                firstMes: safeGet('cardFirstMes'),
                mesEx: safeGet('cardMesExample'),
                scenario: safeGet('cardScenario'),
                // 重点修复：同时尝试读取旧ID(cardNote)和新ID(statEditor)
                note: safeGet('cardNote') || safeGet('statEditor')
            },
            // 全局变量安全获取
            worldInfo: window.currentWorldInfo || { entries: [] },
            regexScripts: window.currentCardRegexes || [],
            wizardTags: window.currentTags || [],
            // 军师记录安全获取
            advisorChat: document.getElementById('advisorChat') ? document.getElementById('advisorChat').innerHTML : ""
        };

        // 读取旧档 -> 插入新档 -> 保存
        var saves = JSON.parse(localStorage.getItem('my_creator_saves') || "[]");
        saves.unshift(saveData);
        localStorage.setItem('my_creator_saves', JSON.stringify(saves));
        
        // 刷新列表
        if (typeof renderSaveList === 'function') {
            renderSaveList();
        } else {
            // 如果列表函数意外丢失，重新定义一个简易版防止卡死
            document.getElementById('saveSlotList').innerHTML = "存档已保存，请刷新页面查看。";
        }
        
        auth.toast('💾 存档成功！');

    } catch (e) {
        console.error("存档出错:", e);
        alert("❌ 存档失败，请检查控制台。\n原因: " + e.message);
    }
};

// 2. 确保列表渲染函数存在且正确
window.renderSaveList = function() {
    var list = document.getElementById('saveSlotList');
    if (!list) return; // 找不到列表容器就退出

    var saves = JSON.parse(localStorage.getItem('my_creator_saves') || "[]");
    list.innerHTML = "";

    if (saves.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">暂无存档</div>';
        return;
    }

    saves.forEach((save, idx) => {
        var div = document.createElement('div');
        div.style.cssText = "background:#fff; border:1px solid #ddd; margin-bottom:10px; padding:10px; border-radius:8px; cursor:pointer; position:relative;";
        div.innerHTML = `
            <div style="font-weight:bold; color:#333;">${save.title}</div>
            <div style="font-size:10px; color:#999;">${save.time}</div>
            <button onclick="event.stopPropagation(); deleteSave(${idx})" style="position:absolute; right:10px; top:10px; border:none; background:none; color:#e74c3c; cursor:pointer; font-size:14px;">🗑️</button>
        `;
        // 点击整个块读取
        div.onclick = () => loadSave(idx);
        list.appendChild(div);
    });
};



/* ================= 🔧 终极补丁：军师全自动实时保存 (Observer) ================= */
(function() {
    // 1. 找到聊天框
    var chatBox = document.getElementById('advisorChat');
    if (!chatBox) return;

    // 2. 创建监听器：只要聊天框内容有任何变化，立刻保存
    var autoSaver = new MutationObserver(function() {
        var html = chatBox.innerHTML;
        // 只有当里面有内容时才保存，防止误清空
        if (html.trim() !== "") {
            localStorage.setItem('my_advisor_save', html);
            // 控制台悄悄记一下，证明在工作 (可选)
            // console.log("军师进度已自动保存"); 
        }
    });

    // 3. 开始监听 (监听子元素变化、文字变化、属性变化)
    autoSaver.observe(chatBox, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        characterData: true 
    });
    
    // 4. 页面加载时，尝试读取一次自动存档 (防止刷新丢失)
    var saved = localStorage.getItem('my_advisor_save');
    if (saved && saved.trim() !== "" && chatBox.innerHTML.trim() === "") {
        chatBox.innerHTML = saved;
        // 如果有记录，自动显示窗口 (可选)
        // document.getElementById('aiAdvisorBox').style.display = 'flex';
    }
})();

/* ================= 🔧 补丁：启动自动加载存档 (修复空列表) ================= */
(function() {
    // 稍微延迟 0.3 秒，确保页面元素都准备好了
    setTimeout(function() {
        // 1. 检查是否有存档记录
        var saves = JSON.parse(localStorage.getItem('my_creator_saves') || "[]");
        
        // 2. 如果有存档，就自动打开并加载列表
        if (saves.length > 0) {
            // 调用这个函数，它既会显示弹窗，也会执行 renderSaveList() 刷新数据
            if (typeof openSaveManager === 'function') {
                openSaveManager();
                // 再次强制刷新一下列表，确保万无一失
                if(typeof renderSaveList === 'function') renderSaveList();
                
                // 贴心提示
                // auth.toast('📂 检测到历史存档，已自动打开');
            }
        } else {
            // 3. 如果没有存档，就强制关掉（防止出现一个空的弹窗挡路）
            var modal = document.getElementById('saveManagerModal');
            if (modal) modal.style.display = 'none';
        }
    }, 300);
})();

/* ================= 🔧 补丁：跳转逻辑 (彻底移除自动关闭) ================= */
window.jumpToCreator = function(btn, type, encodedPrompt) {
    // 1. 按钮变色反馈 (保持不变)
    if (btn && btn.style) {
        btn.innerHTML = "✅ 已添加";
        btn.style.background = "#f0f0f0";
        btn.style.color = "#aaa";
        btn.style.borderColor = "#ddd";
        btn.style.cursor = "default";
        btn.onclick = null; 
    }

    // 2. 解密内容 (保持不变)
    var promptText = decodeURIComponent(encodedPrompt);

    // 3. 执行跳转
    try {
        if (type === 'world') {
            switchCardTab('world');
            setTimeout(function() {
                var el = document.getElementById('aiWorldPrompt');
                if(el) { el.value = promptText; el.focus(); }
            }, 100);
        } 
        else if (type === 'frontend') {
            switchCardTab('regex');
            if(typeof switchRegexUI === 'function') switchRegexUI('frontend'); 
            setTimeout(function() {
                var el = document.getElementById('aiCodePrompt');
                if(el) { el.value = promptText; el.focus(); }
            }, 100);
        } 
        else if (type === 'stat') {
            switchCardTab('stats');
            setTimeout(function() {
                var el = document.getElementById('aiStatPrompt');
                if(el) { el.value = promptText; el.focus(); }
            }, 100);
        }
        
        // 🔥 核心修改：我删除了检测手机端并 display='none' 的代码
        // 现在无论你在电脑还是手机，点击去添加，窗口都纹丝不动，绝对不会自己关掉了！

        auth.toast('✅ 已填入建议，请点击“生成”');
    } catch(e) {
        console.error(e);
        alert("跳转出错：" + e.message);
    }
};

/* ================= 🔧 修复补丁：按钮交互 & 跳转逻辑 (坚决不关窗版) ================= */

// 1. 渲染气泡 (保持加密逻辑，防止报错)
window.renderSuggestionBubble = function(item) {
    var chat = document.getElementById('advisorChat');
    var div = document.createElement('div');
    div.className = 'advisor-bubble';
    
    var icon = "💡";
    if(item.type === 'world') icon = "🌍";
    if(item.type === 'frontend') icon = "🎨";
    if(item.type === 'stat') icon = "📊";

    // 安全加密，防止单引号/双引号/换行符弄坏 HTML
    var safePrompt = encodeURIComponent(item.prompt || ""); 
    var safeType = item.type;

    div.innerHTML = `
        <div style="font-weight:bold; color:#6c5ce7; margin-bottom:4px;">${icon} ${item.title}</div>
        <div style="font-size:12px; color:#666; margin-bottom:8px;">${item.reason}</div>
        <button class="advisor-action-btn" onclick="jumpToCreator(this, '${safeType}', '${safePrompt}')">
            👉 去添加 (自动填单)
        </button>
    `;
    
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
};

// 2. 跳转执行 (去除自动关闭逻辑)
window.jumpToCreator = function(btn, type, encodedPrompt) {
    // --- A. 按钮状态反馈 ---
    if (btn && btn.style) {
        btn.innerHTML = "✅ 已添加";
        btn.style.background = "#f0f0f0";
        btn.style.color = "#aaa";
        btn.style.borderColor = "#ddd";
        btn.style.cursor = "default";
        btn.onclick = null; // 锁死
    }

    // --- B. 解密内容 ---
    var promptText = decodeURIComponent(encodedPrompt);

    // --- C. 执行跳转与填值 ---
    try {
        if (type === 'world') {
            switchCardTab('world');
            setTimeout(function() {
                var el = document.getElementById('aiWorldPrompt');
                if(el) { el.value = promptText; el.focus(); }
            }, 100);
        } 
        else if (type === 'frontend') {
            switchCardTab('regex');
            // 确保切换到 AI 模式
            if(typeof switchRegexUI === 'function') switchRegexUI('frontend'); 
            setTimeout(function() {
                var el = document.getElementById('aiCodePrompt');
                if(el) { el.value = promptText; el.focus(); }
            }, 100);
        } 
        else if (type === 'stat') {
            switchCardTab('stats');
            setTimeout(function() {
                var el = document.getElementById('aiStatPrompt');
                if(el) { el.value = promptText; el.focus(); }
            }, 100);
        }
        
        // 🔥 重点：这里没有任何关闭窗口的代码了！
        // 无论手机还是电脑，点完之后窗口都保持不动。

        auth.toast('✅ 已填入建议，请点击“生成”');

    } catch(e) {
        console.error("跳转错误:", e);
        auth.toast("❌ 跳转失败，请刷新重试");
    }
};

/* ================= 🔧 补丁：折叠开关 & 按钮强力修复 ================= */

// 1. 折叠/展开切换函数
window.toggleAdvisorCollapse = function() {
    var box = document.getElementById('aiAdvisorBox');
    box.classList.toggle('collapsed');
    
    // 视觉反馈：改变小箭头方向
    var span = box.querySelector('#advisorHeader span span');
    if (span) {
        span.innerText = box.classList.contains('collapsed') ? '(▲)' : '(▼)';
    }
};

// 2. 🔥 再次确认：修复“去添加”按钮 (防报错版)
// 只要覆盖了这个，刚才说的“没反应”和“弹窗消失”都会好
window.jumpToCreator = function(btn, type, encodedPrompt) {
    // 按钮变灰
    if (btn && btn.style) {
        btn.innerHTML = "✅ 已添加";
        btn.style.background = "#f0f0f0";
        btn.style.color = "#aaa";
        btn.style.borderColor = "#ddd";
        btn.style.cursor = "default";
        btn.onclick = null;
    }

    // 解密内容
    var promptText = decodeURIComponent(encodedPrompt);

    try {
        if (type === 'world') {
            switchCardTab('world');
            setTimeout(function() {
                var el = document.getElementById('aiWorldPrompt');
                if(el) { el.value = promptText; el.focus(); }
            }, 100);
        } 
        else if (type === 'frontend') {
            switchCardTab('regex');
            if(typeof switchRegexUI === 'function') switchRegexUI('frontend'); 
            setTimeout(function() {
                var el = document.getElementById('aiCodePrompt');
                if(el) { el.value = promptText; el.focus(); }
            }, 100);
        } 
        else if (type === 'stat') {
            switchCardTab('stats');
            setTimeout(function() {
                var el = document.getElementById('aiStatPrompt');
                if(el) { el.value = promptText; el.focus(); }
            }, 100);
        }
        
        auth.toast('✅ 已填入建议，请点击“生成”');
    } catch(e) {
        console.error(e);
    }
};

/* ================= 🔧 补丁：API 配置存档系统 ================= */

// 1. 保存当前配置
window.saveCurrentApiPreset = function() {
    var url = document.getElementById('aiApiUrl').value.trim();
    var key = document.getElementById('aiApiKey').value.trim();
    var model = document.getElementById('aiModelName') ? document.getElementById('aiModelName').value : document.getElementById('aiModelSelect').value;

    if (!url || !key) { auth.toast('请先填好地址和 Key 再保存'); return; }

    var name = prompt("给这个配置起个名字 (如: DeepSeek, 公司API):");
    if (!name) return;

    var presets = JSON.parse(localStorage.getItem('my_api_presets') || "[]");
    
    // 检查重名覆盖
    var existingIdx = presets.findIndex(p => p.name === name);
    if (existingIdx !== -1) {
        if (!confirm("名字重复，要覆盖吗？")) return;
        presets[existingIdx] = { name: name, url: url, key: key, model: model };
    } else {
        presets.push({ name: name, url: url, key: key, model: model });
    }

    localStorage.setItem('my_api_presets', JSON.stringify(presets));
    renderApiPresets(); // 刷新列表
    
    // 自动选中
    document.getElementById('apiPresetSelect').value = name;
    auth.toast('💾 配置已保存！');
};

// 2. 渲染列表
window.renderApiPresets = function() {
    var select = document.getElementById('apiPresetSelect');
    if (!select) return;
    
    var presets = JSON.parse(localStorage.getItem('my_api_presets') || "[]");
    var currentVal = select.value;

    select.innerHTML = '<option value="">-- 选择已存配置 --</option>';
    
    presets.forEach(p => {
        var opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        select.appendChild(opt);
    });

    select.value = currentVal; // 保持选中状态
};

// 3. 应用配置 (选中下拉框时触发)
window.applyApiPreset = function() {
    var name = document.getElementById('apiPresetSelect').value;
    if (!name) return;

    var presets = JSON.parse(localStorage.getItem('my_api_presets') || "[]");
    var target = presets.find(p => p.name === name);

    if (target) {
        document.getElementById('aiApiUrl').value = target.url;
        document.getElementById('aiApiKey').value = target.key;
        
        // 尝试自动填入模型
        var modelSelect = document.getElementById('aiModelSelect');
        var modelManual = document.getElementById('aiModelManual'); // 兼容部分旧代码
        
        // 如果有手动框且可见
        if(modelManual && modelManual.style.display !== 'none') {
             modelManual.value = target.model;
        } else if (modelSelect) {
             // 检查下拉框里有没有，没有就加一个临时选项
             var exists = Array.from(modelSelect.options).some(o => o.value === target.model);
             if(!exists && target.model) {
                 var opt = new Option(target.model, target.model);
                 modelSelect.add(opt);
             }
             modelSelect.value = target.model;
        }
        
        auth.toast('⚡ 已切换至：' + name);
    }
};

// 4. 删除配置
window.deleteApiPreset = function() {
    var name = document.getElementById('apiPresetSelect').value;
    if (!name) return;

    if (confirm(`确定删除配置【${name}】吗？`)) {
        var presets = JSON.parse(localStorage.getItem('my_api_presets') || "[]");
        presets = presets.filter(p => p.name !== name);
        localStorage.setItem('my_api_presets', JSON.stringify(presets));
        
        renderApiPresets();
        auth.toast('🗑️ 已删除');
    }
};

// 5. 🔥 覆盖旧的打开函数 (为了自动加载列表)
// (请确保这段代码在旧的 openAISettings 下面，或者替换它)
var _oldOpenSettings = window.openAISettings;
window.openAISettings = function() {
    // 执行原来的逻辑 (回显当前正在用的配置)
    if (_oldOpenSettings) _oldOpenSettings();
    else {
        // 如果找不到旧函数，这里是一个最小化的打开逻辑保底
        document.getElementById('aiSettingsModal').classList.add('active');
    }
    
    // 🔥 新增：渲染存档列表
    renderApiPresets();
};

/* ================= 🧹 终极覆盖：人设生成逻辑 (V3.0 无报错版) ================= */
// 放在 Script 最末尾，确保覆盖之前所有版本

(function() {
    console.log("✅ 已加载：强力覆盖生成逻辑 (屏蔽网络错误)");

    // 1. 覆盖：详细设定生成 (autoGenDesc)
    window.autoGenDesc = async function() {
        var name = document.getElementById('cardName').value.trim();
        if (!name) { auth.toast('先给角色起个名字吧！'); return; }
        
        // 尝试获取标签
        var tagStr = "无";
        if(window.currentSelectedTags) {
            var allTags = [
                ...window.currentSelectedTags.identity, 
                ...window.currentSelectedTags.personality, 
                ...window.currentSelectedTags.trope
            ];
            tagStr = allTags.join('、');
        }

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        // 没Key也不报错，直接进手动模式
        if (!config || !config.apiKey) { 
            auth.toast('⚠️ 未填API Key，已切换手动模式');
            showRefineBox('desc', document.getElementById('cardDesc').value);
            return; 
        }

        var btn = event.target;
        var oldText = btn.innerText;
        btn.innerText = '✍️ 正在写...'; btn.style.pointerEvents = 'none';

        var prompt = `我是创造者。请为角色【${name}】写一段“详细设定”。
        【强制要求】：必须基于这些属性生成：${tagStr}。
        包含外貌、性格、身世。300字左右。直接输出纯文本。`;

        try {
            var res = await fetchAI(prompt, config);
            var cleanText = res.replace(/```/g, '').trim();
            
            // 填入内容
            document.getElementById('cardDesc').value = cleanText;
            auth.toast('✅ 设定已生成！');
            
            // 成功 -> 显示编辑框
            showRefineBox('desc', cleanText);
            
            if(typeof updateJsonSource === 'function') updateJsonSource();
            if(typeof checkAndOpenAdvisor === 'function') checkAndOpenAdvisor(false); 

        } catch (e) {
            console.error("生成出错(已忽略):", e);
            // 🔥 失败 -> 不弹窗报错，而是直接显示编辑框
            auth.toast('✅ 编辑模式已就绪 (可手动修改)');
            showRefineBox('desc', document.getElementById('cardDesc').value);
        } finally {
            btn.innerText = oldText; btn.style.pointerEvents = 'auto';
        }
    };

    // 2. 覆盖：开场白生成 (autoGenFirstMes)
    window.autoGenFirstMes = async function() {
        var name = document.getElementById('cardName').value.trim();
        var desc = document.getElementById('cardDesc').value.trim();
        if(!desc) desc = `一个叫${name}的角色`;
        
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        // 没Key也不报错
        if (!config || !config.apiKey) { 
            auth.toast('⚠️ 未填Key，已切换手动模式');
            showRefineBox('firstMes', document.getElementById('cardFirstMes').value);
            return; 
        }

        var btn = event.target; 
        var oldText = btn.innerText;
        btn.innerText = '✍️...'; btn.style.pointerEvents = 'none';

        var prompt = `角色：${name}。\n设定：${desc}\n请写一句符合人设的开场白。直接输出内容，不要代码块。`;

        try {
            var res = await fetchAI(prompt, config);
            var cleanText = res.replace(/```/g, '').trim();
            
            document.getElementById('cardFirstMes').value = cleanText;
            auth.toast('✅ 开场白已生成！');
            
            // 成功 -> 显示编辑框
            showRefineBox('firstMes', cleanText);
            
            if(typeof updatePreviewUI === 'function') updatePreviewUI();

        } catch(e) {
            console.error("生成出错(已忽略):", e);
            // 🔥 失败 -> 也不弹错，显示编辑框
            auth.toast('✅ 编辑模式已就绪');
            showRefineBox('firstMes', document.getElementById('cardFirstMes').value);
        } finally { 
            btn.innerText = oldText; btn.style.pointerEvents = 'auto';
        }
    };

    // 3. 覆盖：二次编辑通用函数 (refineResult)
    window.refineResult = async function(type) {
        const inputId = `refineInput_${type}`;
        const requirement = document.getElementById(inputId).value.trim();
        
        // 哪怕没填需求，点按钮也可以当刷新用，不报错
        if (!requirement) { auth.toast('请告诉我怎么改...'); return; }
        
        // 确保缓存有值
        if (!window.lastGeneratedData[type]) {
            // 从界面现抓
            if(type==='desc') window.lastGeneratedData.desc = document.getElementById('cardDesc').value;
            else if(type==='firstMes') window.lastGeneratedData.firstMes = document.getElementById('cardFirstMes').value;
            else window.lastGeneratedData[type] = {}; 
        }

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) {
            auth.toast('⚠️ 未连接AI，无法修改');
            return;
        }

        const btn = event.target;
        const oldText = btn.innerText;
        btn.innerText = '🧠 修改中...'; btn.disabled = true;

        var prevData = window.lastGeneratedData[type];
        var prevDataStr = typeof prevData === 'string' ? prevData : JSON.stringify(prevData);

        // A. 纯文本修改 (人设/开场白)
        if (type === 'desc' || type === 'firstMes') {
            var prompt = `原文本：${prevDataStr}\n修改意见：【${requirement}】\n请重写。直接输出纯文本。`;
            try {
                var res = await fetchAI(prompt, config);
                var cleanText = res.replace(/```/g, '').trim();
                
                if (type === 'desc') document.getElementById('cardDesc').value = cleanText;
                if (type === 'firstMes') {
                    document.getElementById('cardFirstMes').value = cleanText;
                    if(typeof updatePreviewUI === 'function') updatePreviewUI();
                }
                
                // 更新缓存
                window.lastGeneratedData[type] = cleanText;
                document.getElementById(inputId).value = ''; 
                auth.toast('✨ 修改已应用！');
            } catch(e) {
                // 🔥 失败不报错
                console.error(e);
                auth.toast('✅ 网络波动，请重试或手动修改');
            } finally {
                btn.innerText = oldText; btn.disabled = false;
            }
            return;
        }

        // B. JSON 修改 (保留旧逻辑的无报错版)
        var prompt = `原数据：${prevDataStr}。修改意见：【${requirement}】。请修改并返回完整JSON。`;
        if (type === 'stat') prompt = `原代码：${prevDataStr}。意见：【${requirement}】。返回JSON {script:"...", guide:"..."}`;

        try {
            var res = await fetchAI(prompt, config);
            var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
            var newData = JSON.parse(cleanJson);
            window.lastGeneratedData[type] = newData;

            // 更新UI (简写版，仅示意，实际会调用之前的逻辑)
            if (type === 'frontend') document.getElementById('frontReplace').value = newData.code;
            if (type === 'world') document.getElementById('wiContent').value = newData.content;
            
            auth.toast('✨ 修改完成！');
            document.getElementById(inputId).value = ''; 
        } catch (e) {
            console.error(e);
            auth.toast('✅ 暂无法连接AI，请手动修改');
        } finally {
            btn.innerText = oldText; btn.disabled = false;
        }
    };

    // 🔧 辅助函数：显示编辑框并存缓存
    function showRefineBox(type, content) {
        var boxId = `refineArea_${type}`;
        var box = document.getElementById(boxId);
        if (box) box.style.display = 'block';
        
        // 存入缓存，方便下次修改
        if(!window.lastGeneratedData) window.lastGeneratedData = {};
        window.lastGeneratedData[type] = content || "";
    }

})();

/* ================= 🔧 终极重构补丁：属性/标签/生成/解释 ================= */
(function() {
    console.log("🚀 正在执行：界面重组、标签增强、属性逻辑重写...");

    // -----------------------------------------------------------
    // 需求 4：重排预览页顺序 (详细设定 -> 开场白 -> 展示)
    // -----------------------------------------------------------
   


    // -----------------------------------------------------------
    // 需求 5 & 3：自定义标签 + 一键生成按钮 (重写标签系统)
    // -----------------------------------------------------------
    
    // 初始化全局标签状态 (防止读档报错)
    if (!window.currentSelectedTags) {
        window.currentSelectedTags = { identity: [], personality: [], trope: [] };
    }

    // 覆盖：渲染单个标签组 (加入自定义按钮)
    window.renderSingleGroup = function(key) {
        // 数据源 (如果没有就用默认)
        var data = window.wizardData ? window.wizardData[key] : { title: "标签组", tags: [] };
        
        var containerId = 'tagGroup' + key.charAt(0).toUpperCase() + key.slice(1);
        var titleId = 'title_' + key;
        
        // 渲染标题 + 自定义按钮
        var titleEl = document.getElementById(titleId);
        if(titleEl) {
            titleEl.innerHTML = `${data.title} <span onclick="addCustomWizardTag('${key}')" style="font-size:12px; color:#6c5ce7; cursor:pointer; margin-left:10px; border:1px solid #6c5ce7; border-radius:4px; padding:0 4px; background:white;">+自定义</span>`;
        }

        var container = document.getElementById(containerId);
        if(container) {
            container.innerHTML = ''; 
            data.tags.forEach((t, idx) => {
                var span = document.createElement('span');
                span.className = 'wizard-tag';
                span.innerText = t;
                
                // 恢复选中状态
                if (window.currentSelectedTags[key] && window.currentSelectedTags[key].includes(t)) {
                    span.classList.add('selected');
                }

                // 绑定点击
                span.onclick = function() {
                    this.classList.toggle('selected');
                    if (this.classList.contains('selected')) {
                        if (!window.currentSelectedTags[key].includes(t)) window.currentSelectedTags[key].push(t);
                    } else {
                        window.currentSelectedTags[key] = window.currentSelectedTags[key].filter(item => item !== t);
                    }
                };
                container.appendChild(span);
            });
        }
    };

    // 新增：添加自定义标签函数
    window.addCustomWizardTag = function(key) {
        var text = prompt("➕ 请输入新标签名称：");
        if (!text) return;
        text = text.trim();
        // 加到数据源并刷新
        if(window.wizardData && window.wizardData[key]) {
            window.wizardData[key].tags.push(text);
            localStorage.setItem('my_wizard_data_v2', JSON.stringify(window.wizardData)); // 保存到本地
            renderWizardTags();
            auth.toast(`已添加标签：${text}`);
        }
    };

    // 新增：插入“一键生成全套”大按钮
    setTimeout(() => {
        var wizardBox = document.querySelector('.wizard-box');
        if (wizardBox && !document.getElementById('btnOneClickGen')) {
            var btn = document.createElement('button');
            btn.id = 'btnOneClickGen';
            btn.className = 'primary-btn';
            btn.style.cssText = "width:100%; margin-top:15px; background:linear-gradient(135deg, #6c5ce7, #a29bfe); border:none; padding:12px; font-size:14px; font-weight:bold; color:white; border-radius:8px; cursor:pointer; box-shadow:0 4px 10px rgba(108, 92, 231, 0.3);";
            btn.innerHTML = "✨ 读取标签 -> 生成详细设定 & 开场白";
            
            // 绑定生成逻辑 (需求 3 & 5)
            btn.onclick = async function() {
                var name = document.getElementById('cardName').value.trim();
                if (!name) { auth.toast('先给角色起个名字吧！'); return; }

                // 读取所有选中的标签 (包括自定义的)
                var allTags = [
                    ...window.currentSelectedTags.identity, 
                    ...window.currentSelectedTags.personality, 
                    ...window.currentSelectedTags.trope
                ];
                
                if (allTags.length === 0) { auth.toast('请至少选一个标签 (或点自定义添加)'); return; }
                var tagStr = allTags.join('、');

                var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
                if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }

                var selfBtn = document.getElementById('btnOneClickGen');
                selfBtn.innerText = '🧠 正在构思全套设定...'; selfBtn.disabled = true;

                // 构造 Prompt
                var prompt = `
                我是创造者。请为角色【${name}】设计全套人设。
                【强制标签】：${tagStr}。
                
                请返回纯 JSON 格式，包含：
                1. "desc": 详细设定 (500字，包含外貌、性格、身世，必须体现上述标签)。
                2. "first_mes": 开场白 (符合人设的第一句话，不要引号)。
                3. "example": 对话样本 (User与Char的对话示例)。
                `;

                try {
                    var res = await fetchAI(prompt, config);
                    var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
                    var data = JSON.parse(cleanJson);

                    document.getElementById('cardDesc').value = data.desc || "";
                    document.getElementById('cardFirstMes').value = data.first_mes || "";
                    document.getElementById('cardMesExample').value = data.example || "";

                    // 自动跳到预览页
                    switchCardTab('preview');
                    if(typeof updatePreviewUI === 'function') updatePreviewUI();
                    
                    auth.toast('✨ 全套人设生成完毕！');
                } catch (e) {
                    console.error(e);
                    auth.toast('❌ 生成失败，请检查网络');
                } finally {
                    selfBtn.innerText = "✨ 读取标签 -> 生成详细设定 & 开场白"; selfBtn.disabled = false;
                }
            };
            
            // 插入按钮
            wizardBox.parentNode.insertBefore(btn, wizardBox.nextSibling);
        }
        // 重新渲染一次标签以显示新UI
        if(typeof renderWizardTags === 'function') renderWizardTags();
    }, 1000);


    // -----------------------------------------------------------
    // 需求 1, 2, 6：属性页生成无反应、同步、解释 (完全重写)
    // -----------------------------------------------------------

    // 1. 强力同步函数 (属性代码 <-> 深度设定)
    window.syncStatToNote = function() {
        var statEl = document.getElementById('statEditor');
        var noteEl = document.getElementById('cardNote');
        
        // 只有两个元素都存在时才同步
        if(statEl && noteEl) {
            // 这里我们假设用户正在操作属性页，所以把属性页的值 同步给 深度设定
            // 实际上这两个框应该共享同一个值
            noteEl.value = statEl.value;
        }
    };

    // 绑定监听：只要在属性页打字，立刻同步到高级页
    setTimeout(() => {
        var statEl = document.getElementById('statEditor');
        if(statEl) statEl.addEventListener('input', window.syncStatToNote);
    }, 1000);

    // 2. 覆盖：属性生成逻辑 (加入解释功能)
    window.generateStatLogic = async function() {
        // 获取输入 (修复之前可能取不到值的问题)
        var inputEl = document.getElementById('aiStatPrompt');
        var req = inputEl ? inputEl.value.trim() : "";
        var charDesc = document.getElementById('cardDesc').value.trim();

        if (!req) { auth.toast('请先描述规则 (如: 好感度系统)...'); return; }
        
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }

        var btn = document.getElementById('btnGenStat');
        btn.innerText = '🧠 编写代码 & 撰写说明书...'; btn.disabled = true;

        // Prompt：要求生成代码 + 解释
        var prompt = `
        你是一个SillyTavern规则专家。
        角色设定：${charDesc.substring(0, 300)}...
        用户需求：【${req}】
        
        请完成两件事：
        1. 编写 System Prompt (深度设定代码)。
        2. 编写【中文运行原理说明书】 (解释)。
        
        必须返回纯 JSON 格式：
        {
            "script": "这里放规则代码 (Target, Rule, Output...)",
            "explanation": "这里用中文解释：\n1. 这个系统包含哪些变量？\n2. 什么情况下会加分/减分？\n3. 触发后会发生什么？\n(请分点说明，通俗易懂)"
        }
        `;

        try {
            var res = await fetchAI(prompt, config);
            var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
            var data = JSON.parse(cleanJson);
            
            // 4. 填入代码框
            var editor = document.getElementById('statEditor');
            if(editor) {
                editor.value = data.script;
                // 🔥 立即同步到高级页
                window.syncStatToNote();
            }

            // 5. 显示解释说明书 (创建或更新绿色框)
            var guideBox = document.getElementById('statGuideBox');
            if (!guideBox && editor) {
                guideBox = document.createElement('div');
                guideBox.id = 'statGuideBox';
                guideBox.style.cssText = "margin-top:10px; background:#e8f5e9; border:1px solid #a5d6a7; padding:15px; border-radius:8px; color:#2e7d32; font-size:13px; line-height:1.6; white-space: pre-wrap;";
                editor.parentNode.insertBefore(guideBox, editor.nextSibling);
            }
            if(guideBox) {
                guideBox.innerHTML = `<b>📖 AI 讲解 (运行原理)：</b>\n${data.explanation}`;
                guideBox.style.display = 'block';
            }

            auth.toast('✨ 规则已生成，并同步至深度设定！');

        } catch (e) {
            console.error(e);
            auth.toast('❌ 生成失败 (JSON解析错)');
        } finally {
            btn.innerText = '✨ 生成规则'; btn.disabled = false;
        }
    };

})();

/* ================= 🔧 终极修复补丁 V4.0：精准控制版 ================= */
(function() {
    console.log("🚀 执行补丁 V4.0：界面重组 | 标签优化 | 双向同步 | 军师修复");

    // ================= 1. 预览页顺序重排 (强制执行) =================
    // 目标顺序：详细设定(cardDesc) -> 开场白(cardFirstMes) -> 展示(cardMesExample)
   

    // ================= 2. 标签系统重构 (自定义在下方) =================
    
    // 初始化数据
    if (!window.currentSelectedTags) window.currentSelectedTags = { identity: [], personality: [], trope: [] };

    // 覆盖渲染函数
    window.renderWizardTags = function() {
        renderGroup('identity');
        renderGroup('personality');
        renderGroup('trope');
        
        // 渲染底部的自定义输入框 (只渲染一次)
        renderCustomInputArea();
    };

    function renderGroup(key) {
        var data = window.wizardData[key];
        var containerId = 'tagGroup' + key.charAt(0).toUpperCase() + key.slice(1);
        var titleId = 'title_' + key;
        
        // 还原标题 (去掉之前的按钮)
        var titleEl = document.getElementById(titleId);
        if(titleEl) titleEl.innerHTML = data.title; // 纯文本

        var container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = ''; 

        data.tags.forEach((t, idx) => {
            var span = document.createElement('span');
            span.className = 'wizard-tag';
            span.innerText = t;
            
            // 选中状态
            if (window.currentSelectedTags[key].includes(t)) span.classList.add('selected');

            // 删除按钮 (仅对非默认标签显示，或者全部显示)
            var delBtn = document.createElement('span');
            delBtn.className = 'tag-delete-btn';
            delBtn.innerText = '×';
            delBtn.onclick = function(e) { e.stopPropagation(); deleteWizardTag(key, idx); };
            span.appendChild(delBtn);

            span.onclick = function(e) {
                if(e.target === delBtn) return;
                this.classList.toggle('selected');
                if (this.classList.contains('selected')) {
                    if (!window.currentSelectedTags[key].includes(t)) window.currentSelectedTags[key].push(t);
                } else {
                    window.currentSelectedTags[key] = window.currentSelectedTags[key].filter(item => item !== t);
                }
            };
            container.appendChild(span);
        });
    }

    // 新增：在标签区域最下方渲染一个“自定义添加”栏
    function renderCustomInputArea() {
        var box = document.querySelector('.wizard-box');
        if (!box) return;
        
        // 检查是否已存在，避免重复添加
        if (document.getElementById('customTagArea')) return;

        var div = document.createElement('div');
        div.id = 'customTagArea';
        div.style.marginTop = '15px';
        div.style.paddingTop = '10px';
        div.style.borderTop = '1px dashed #eee';
        
        div.innerHTML = `
            <div style="font-size:12px; font-weight:bold; color:#555; margin-bottom:5px;">➕ 添加自定义标签</div>
            <div style="display:flex; gap:5px;">
                <select id="customTagType" style="padding:5px; border:1px solid #ddd; border-radius:5px; font-size:12px;">
                    <option value="identity">身份</option>
                    <option value="personality">性格</option>
                    <option value="trope">萌点</option>
                </select>
                <input type="text" id="customTagInput" placeholder="输入标签名..." style="flex:1; padding:5px; border:1px solid #ddd; border-radius:5px; font-size:12px;">
                <button onclick="addCustomTagBtn()" style="background:#6c5ce7; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">添加</button>
            </div>
        `;
        box.appendChild(div);
    }

    // 绑定添加函数
    window.addCustomTagBtn = function() {
        var type = document.getElementById('customTagType').value;
        var val = document.getElementById('customTagInput').value.trim();
        if(!val) return;
        
        // 加到数据源
        window.wizardData[type].tags.push(val);
        // 自动选中它
        window.currentSelectedTags[type].push(val);
        
        localStorage.setItem('my_wizard_data_v2', JSON.stringify(window.wizardData));
        renderWizardTags(); // 刷新
        document.getElementById('customTagInput').value = ''; // 清空
        auth.toast(`已添加并选中：${val}`);
    };

    // 重新渲染标签以生效
    setTimeout(renderWizardTags, 600);


    // ================= 3 & 4. 属性生成与同步 (完全重写) =================

    // 1. 同步函数 (Stats <-> Note)
    // 逻辑：谁变了，就同步给对方
    window.syncStats = function(sourceId) {
        var statEl = document.getElementById('statEditor');
        var noteEl = document.getElementById('cardNote');
        
        if (statEl && noteEl) {
            if (sourceId === 'statEditor') noteEl.value = statEl.value;
            else if (sourceId === 'cardNote') statEl.value = noteEl.value;
        }
    };

    // 2. 绑定监听 (双向同步)
    setTimeout(() => {
        var statEl = document.getElementById('statEditor');
        var noteEl = document.getElementById('cardNote');
        if(statEl) statEl.addEventListener('input', () => window.syncStats('statEditor'));
        if(noteEl) noteEl.addEventListener('input', () => window.syncStats('cardNote'));
    }, 1000);

    // 3. 属性生成逻辑 (同时写入两边 + 显示解释)
    window.generateStatLogic = async function() {
        var req = document.getElementById('aiStatPrompt').value.trim();
        var charDesc = document.getElementById('cardDesc').value.trim();

        if (!req) { auth.toast('请先描述规则...'); return; }
        
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }

        var btn = document.getElementById('btnGenStat');
        btn.innerText = '🧠 编写代码 & 说明书...'; btn.disabled = true;

        var prompt = `
        你是一个SillyTavern规则专家。
        角色设定：${charDesc.substring(0, 300)}...
        用户需求：【${req}】
        
        请完成两件事：
        1. 编写 System Prompt (代码)。
        2. 编写【中文运行原理说明书】 (解释)。
        
        必须返回纯 JSON 格式：
        {
            "script": "这里放代码 (Target, Rule, Output...)",
            "explanation": "这里用中文解释：\n1. 这个系统包含哪些变量？\n2. 什么情况下会加分/减分？\n3. 触发后会发生什么？\n(请分点说明，通俗易懂)"
        }
        `;

        try {
            var res = await fetchAI(prompt, config);
            var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
            var data = JSON.parse(cleanJson);
            
            // A. 填入属性页代码框
            var editor = document.getElementById('statEditor');
            editor.value = data.script;
            
            // B. 🔥 立即同步到高级页
            var noteEl = document.getElementById('cardNote');
            if(noteEl) noteEl.value = data.script;

            // C. 🔥 显示解释说明书 (属性页)
            showExplanation('statGuideBox', editor, data.explanation);

            // D. 🔥 显示解释说明书 (高级页，也要显示！)
            if(noteEl) showExplanation('noteGuideBox', noteEl, data.explanation);

            auth.toast('✨ 规则已生成，两处已同步！');

        } catch (e) {
            console.error(e);
            auth.toast('❌ 生成失败 (JSON解析错)');
        } finally {
            btn.innerText = '✨ 生成规则'; btn.disabled = false;
        }
    };

    // 辅助：显示说明书盒子
    function showExplanation(boxId, targetEl, text) {
        var box = document.getElementById(boxId);
        if (!box) {
            box = document.createElement('div');
            box.id = boxId;
            box.style.cssText = "margin-top:10px; background:#e8f5e9; border:1px solid #a5d6a7; padding:15px; border-radius:8px; color:#2e7d32; font-size:13px; line-height:1.6; white-space: pre-wrap;";
            targetEl.parentNode.insertBefore(box, targetEl.nextSibling);
        }
        box.innerHTML = `<b>📖 运行原理说明书：</b>\n${text}`;
        box.style.display = 'block';
    }


    // ================= 5. 军师 API 修复 (增加超时检测) =================
    
    window.analyzeCardNeeds = async function() {
        var name = document.getElementById('cardName').value;
        var desc = document.getElementById('cardDesc').value.trim();
        
        // 降低字数门槛，防止不触发
        if (desc.length < 50) { 
            auth.toast('📜 请先写点人设（至少50字），军师才能分析哦'); 
            return; 
        }

        // 显示窗口
        var box = document.getElementById('aiAdvisorBox');
        if(box) box.style.display = 'flex';
        
        var chat = document.getElementById('advisorChat');
        chat.innerHTML = `<div class="ai-loading" style="color:#999;font-size:12px;text-align:center;padding:20px;">🧠 正在连线军师...<br>(请稍候 5-10秒)</div>`;

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) {
            chat.innerHTML = `<div class="advisor-bubble">❌ 主公，请先去设置里填写 API Key。</div>`;
            return;
        }

        var prompt = `
        我是卡片作者。角色：${name}。
        设定：${desc.substring(0, 800)}...
        
        请作为“制作顾问”，用【通俗易懂的大白话】，提出 3 个具体的制作建议。
        必须返回纯 JSON 数组：[{"type":"world/frontend/stat", "title":"", "reason":"", "prompt":""}]
        `;

        try {
            // 设置超时，防止一直转圈
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒超时

            const response = await fetch(`${config.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                body: JSON.stringify({
                    model: config.model || 'gpt-3.5-turbo',
                    messages: [{ role: "user", content: prompt }]
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`API 错误 ${response.status}`);

            const data = await response.json();
            var resText = data.choices[0].message.content;
            var cleanJson = resText.replace(/```json/g, '').replace(/```/g, '').trim();
            var suggestions = JSON.parse(cleanJson);
            
            chat.innerHTML = ''; // 清空 loading
            suggestions.forEach(item => renderSuggestionBubble(item));
            
        } catch(e) { 
            console.error(e);
            if (e.name === 'AbortError') {
                chat.innerHTML = `<div class="advisor-bubble">⏳ 军师响应超时... 请检查网络或换个模型试试。</div>`;
            } else {
                chat.innerHTML = `<div class="advisor-bubble">❌ 军师断线了：${e.message}</div>`;
            }
        }
    };

})();

/* ================= 🔧 补丁 V5.0：界面清理 & 军师上帝模式重铸 ================= */
(function() {
    console.log("🚀 执行补丁 V5.0：清理多余框 | 军师全权限修复");

    // ================= 1. 预览页强力清理 & 重排 =================
    // 解决“开场白下面多一个框”的问题，并强制排序
   


    // ================= 2. 军师上帝权限 (God Mode) 重写 =================
    // 修复“没反应”的问题，增加错误处理，支持所有页面修改

    // 🗺️ 视野映射表：告诉军师哪个页面对应哪个框
    const GOD_VIEW_MAP = {
        'tab-preview':  { id: 'cardDesc',     name: '详细设定 (Description)' }, // 默认看设定
        'tab-regex':    { id: 'frontReplace', name: '前端代码 (HTML/CSS)' },
        'tab-world':    { id: 'wiContent',    name: '世界书内容 (Content)' },
        'tab-stats':    { id: 'statEditor',   name: '属性/逻辑规则 (Script)' },
        'tab-advanced': { id: 'cardNote',     name: '深度设定 (Depth Prompt)' },
        'tab-source':   { id: 'jsonSource',   name: '完整源码 (JSON)' }
    };

    // 🕵️ 获取当前上下文
    function getGodContext() {
        // 找到当前显示的 Tab ID
        var activeTab = null;
        var contents = document.querySelectorAll('.card-tab-content');
        contents.forEach(el => {
            if (el.style.display === 'block' || getComputedStyle(el).display === 'block') {
                activeTab = el.id;
            }
        });

        if (!activeTab) return null;

        var info = GOD_VIEW_MAP[activeTab];
        // 特殊处理：如果在预览页，可能想改开场白
        if (activeTab === 'tab-preview') {
            // 简单逻辑：把设定、开场白、样本都读进去
            var desc = document.getElementById('cardDesc').value;
            var first = document.getElementById('cardFirstMes').value;
            return {
                targetId: 'cardDesc', // 默认修改目标是设定，但军师可以指定修改其他的
                targetName: '预览页全览',
                content: `【详细设定】:\n${desc}\n\n【开场白】:\n${first}`
            };
        }

        if (info) {
            var el = document.getElementById(info.id);
            return {
                targetId: info.id,
                targetName: info.name,
                content: el ? el.value : ""
            };
        }
        return null;
    }

    // 🔥 覆盖发送函数 (修复版)
    window.sendAdvisorMsg = async function() {
        var input = document.getElementById('advisorInput');
        var text = input.value.trim();
        if(!text) return;
        
        var chat = document.getElementById('advisorChat');
        // 用户气泡
        chat.innerHTML += `<div style="text-align:right; margin:5px 0; color:#6c5ce7; font-size:12px; padding:5px; background:#f0f0f0; border-radius:8px; display:inline-block; margin-left:auto;">${text}</div><div style="clear:both;"></div>`;
        input.value = '';
        
        // 显示思考中
        var loadingId = 'god-loading-' + Date.now();
        chat.innerHTML += `<div id="${loadingId}" class="ai-loading" style="font-size:10px; color:#999; text-align:center;">🧠 正在读取当前页面代码...</div>`;
        chat.scrollTop = chat.scrollHeight;

        // 获取上下文
        var context = getGodContext();
        var contextStr = context ? context.content.substring(0, 4000) : "(无法读取当前页面内容)";
        var contextName = context ? context.targetName : "未知区域";
        var defaultTargetId = context ? context.targetId : "cardDesc";

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) {
            document.getElementById(loadingId).remove();
            chat.innerHTML += `<div class="advisor-bubble">❌ 还没填 API Key 呢！去设置里填一下。</div>`;
            return;
        }

        // 构造上帝 Prompt
        var prompt = `
        你现在是【代码/设定修改助手】。
        用户当前停留在：【${contextName}】。
        
        【当前页面内容】：
        \`\`\`
        ${contextStr}
        \`\`\`
        
        用户需求：“${text}”
        
        请分析内容并回答。
        🔥 **核心指令**：
        如果需要修改代码或文本，请务必在回复的最后，输出修改后的完整内容，并包裹在XML标签中：
        
        <FIX_TARGET id="目标输入框ID">
        这里放修改后的内容...
        </FIX_TARGET>
        
        常用ID参考：
        - 详细设定: cardDesc
        - 开场白: cardFirstMes
        - 对话样本: cardMesExample
        - 前端代码: frontReplace
        - 世界书内容: wiContent
        - 属性脚本: statEditor
        
        请自动判断应该修改哪个 ID。如果用户只是问问题，不需要输出标签。
        `;

        try {
            // 发起请求 (增加超时处理)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

            const response = await fetch(`${config.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                body: JSON.stringify({
                    model: config.model || 'gpt-3.5-turbo',
                    messages: [{ role: "user", content: prompt }]
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`API错误 ${response.status}`);

            const data = await response.json();
            var res = data.choices[0].message.content;
            document.getElementById(loadingId).remove();

            // 解析回复
            var replyDisplay = res;
            var actionHtml = "";

            // 正则提取修改指令
            var fixMatch = /<FIX_TARGET id="([^"]+)">([\s\S]*?)<\/FIX_TARGET>/i.exec(res);
            
            if (fixMatch) {
                var targetId = fixMatch[1];
                var newContent = fixMatch[2].trim();
                
                // 隐藏标签，只显示 AI 的解释
                replyDisplay = res.replace(fixMatch[0], '\n\n✅ (已生成修改方案，点击下方按钮应用)');
                
                // 转义内容防止破坏 HTML
                var safeContent = encodeURIComponent(newContent);

                // 生成应用按钮
                actionHtml = `
                    <div style="margin-top:8px; border-top:1px dashed #ddd; padding-top:5px;">
                        <button class="advisor-action-btn" onclick="applyGodFix('${targetId}', '${safeContent}', this)">
                            👉 点击替换【${targetId}】的内容
                        </button>
                    </div>
                `;
            }

            // 渲染气泡
            var div = document.createElement('div');
            div.className = 'advisor-bubble';
            div.innerHTML = replyDisplay.replace(/\n/g, '<br>') + actionHtml;
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;

        } catch(e) {
            if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
            var errMsg = e.name === 'AbortError' ? "响应超时，请换个模型试试" : e.message;
            chat.innerHTML += `<div class="advisor-bubble">❌ 军师掉线了：${errMsg}</div>`;
        }
    };

    // ⚡️ 执行修改
    window.applyGodFix = function(targetId, encodedContent, btn) {
        try {
            var el = document.getElementById(targetId);
            if (!el) {
                alert("❌ 军师眼花了，找不到 ID 为 " + targetId + " 的输入框");
                return;
            }

            // 写入内容
            el.value = decodeURIComponent(encodedContent);

            // 触发同步 (如果是属性页)
            if(typeof syncStatToNote === 'function') syncStatToNote();
            // 触发预览 (如果是前端页)
            if(targetId === 'frontReplace' && typeof runRegexTest === 'function') runRegexTest();
            // 触发预览 (如果是预览页)
            if((targetId === 'cardDesc' || targetId === 'cardFirstMes') && typeof updatePreviewUI === 'function') updatePreviewUI();

            // 按钮变态
            btn.innerText = "✅ 修改已应用";
            btn.disabled = true;
            btn.style.background = "#d4edda";
            btn.style.color = "#155724";

            auth.toast('✨ 内容已更新！');

        } catch (e) {
            alert("应用失败：" + e.message);
        }
    };

})();

/* ================= 🚑 补丁 V5.1：修复“去添加”按钮失效 ================= */
(function() {
    console.log("🚑 正在修复跳转功能...");

    // 1. 重写跳转函数 (核心修复)
    window.jumpToCreator = function(btn, type, encodedPrompt) {
        console.log("👉 尝试跳转:", type);

        // 按钮变态反馈
        if (btn) {
            btn.innerHTML = "⏳ 正在跳转...";
            btn.style.opacity = "0.7";
        }

        setTimeout(function() {
            try {
                // 解码内容
                var promptText = decodeURIComponent(encodedPrompt);
                var targetEl = null;

                // --- 分流逻辑 ---
                if (type === 'world') {
                    // 1. 世界书
                    if(typeof switchCardTab === 'function') switchCardTab('world');
                    targetEl = document.getElementById('aiWorldPrompt');
                } 
                else if (type === 'frontend') {
                    // 2. 前端代码
                    if(typeof switchCardTab === 'function') switchCardTab('regex');
                    // 确保切换到“前端美化”模式
                    var radio = document.querySelector('input[value="frontend"]');
                    if(radio) radio.click(); 
                    if(typeof switchRegexUI === 'function') switchRegexUI('frontend');
                    targetEl = document.getElementById('aiCodePrompt');
                } 
                else if (type === 'stat') {
                    // 3. 属性/逻辑
                    if(typeof switchCardTab === 'function') switchCardTab('stats');
                    targetEl = document.getElementById('aiStatPrompt');
                }

                // --- 执行填入 ---
                if (targetEl) {
                    targetEl.value = promptText;
                    targetEl.focus();
                    // 滚动到可见区域，防止被挡住
                    targetEl.scrollIntoView({behavior: "smooth", block: "center"});
                    
                    auth.toast('✅ 建议已填入，请点击“生成”');
                    
                    // 按钮设为完成状态
                    if (btn) {
                        btn.innerHTML = "✅ 已填入";
                        btn.disabled = true;
                        btn.style.background = "#d4edda";
                        btn.style.color = "#155724";
                        btn.style.opacity = "1";
                        btn.style.borderColor = "#c3e6cb";
                    }
                } else {
                    throw new Error("找不到目标输入框 ID，请刷新页面重试");
                }

            } catch (e) {
                console.error("跳转错误:", e);
                alert("❌ 跳转失败：" + e.message);
                // 恢复按钮让用户重试
                if (btn) {
                    btn.innerHTML = "❌ 重试";
                    btn.disabled = false;
                    btn.style.opacity = "1";
                }
            }
        }, 300); // 延迟300毫秒，等待 Tab 切换动画完成
    };

    // 2. 重新绑定气泡生成逻辑 (防止旧代码生成的按钮没有 onclick)
    window.renderSuggestionBubble = function(item) {
        var chat = document.getElementById('advisorChat');
        if (!chat) return;

        var div = document.createElement('div');
        div.className = 'advisor-bubble';
        
        var icon = "💡";
        if(item.type === 'world') icon = "🌍";
        if(item.type === 'frontend') icon = "🎨";
        if(item.type === 'stat') icon = "📊";

        // 安全转义，防止单引号报错
        var safePrompt = encodeURIComponent(item.prompt || ""); 
        var safeType = item.type;

        div.innerHTML = `
            <div style="font-weight:bold; color:#6c5ce7; margin-bottom:4px;">${icon} ${item.title}</div>
            <div style="font-size:12px; color:#666; margin-bottom:8px;">${item.reason}</div>
            <button class="advisor-action-btn" onclick="window.jumpToCreator(this, '${safeType}', '${safePrompt}')">
                👉 去添加 (自动填单)
            </button>
        `;
        
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
    };

    console.log("✅ 跳转功能已修复");
})();

/* ================= 🚑 补丁 V5.2：暴力跳转修复 (推土机版) ================= */
(function() {
    console.log("🚑 正在执行：暴力跳转修复...");

    // 1. 辅助：强制切换 Tab 的通用函数
    function forceSwitchTab(tabName) {
        // 1. 隐藏所有内容
        var contents = document.querySelectorAll('.card-tab-content');
        contents.forEach(function(el) { el.style.display = 'none'; });
        
        // 2. 取消所有按钮激活
        var tabs = document.querySelectorAll('.card-tab');
        tabs.forEach(function(el) { el.classList.remove('active'); });

        // 3. 激活目标
        var targetContent = document.getElementById('tab-' + tabName);
        if (targetContent) targetContent.style.display = 'block';
        
        // 4. 尝试激活对应的按钮样式 (模糊匹配)
        var targetBtn = Array.from(tabs).find(btn => 
            btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabName)
        );
        if (targetBtn) targetBtn.classList.add('active');
    }

    // 2. 重写跳转函数
    window.jumpToCreator = function(btn, type, encodedPrompt) {
        console.log("👉 暴力跳转启动:", type);

        if (btn) {
            btn.innerHTML = "⏳ 处理中...";
            btn.style.opacity = "0.7";
        }

        // 确保模态框是开着的
        var modal = document.getElementById('cardCreatorModal');
        if (modal && !modal.classList.contains('active')) {
            modal.classList.add('active');
            modal.style.display = 'flex'; // 强制显示
        }

        setTimeout(function() {
            try {
                var promptText = decodeURIComponent(encodedPrompt);
                var targetId = "";

                // --- 分流处理 ---
                if (type === 'world') {
                    forceSwitchTab('world');
                    targetId = 'aiWorldPrompt';
                } 
                else if (type === 'frontend') {
                    forceSwitchTab('regex');
                    
                    // 🔥 核心修复：强制显示“前端美化”区域
                    // 无论之前是在哪个模式，强制把 simple 关掉，把 frontend 打开
                    var simpleDiv = document.getElementById('uiSimpleMode');
                    var frontDiv = document.getElementById('uiFrontendMode');
                    if (simpleDiv) simpleDiv.style.display = 'none';
                    if (frontDiv) frontDiv.style.display = 'block';
                    
                    // 顺便把单选框也选上，保持UI一致
                    var radio = document.querySelector('input[value="frontend"]');
                    if (radio) radio.checked = true;

                    targetId = 'aiCodePrompt';
                } 
                else if (type === 'stat') {
                    forceSwitchTab('stats');
                    targetId = 'aiStatPrompt';
                }

                // --- 寻找并填入 ---
                var targetEl = document.getElementById(targetId);
                
                if (targetEl) {
                    targetEl.value = promptText;
                    targetEl.focus();
                    // 滚动定位
                    targetEl.scrollIntoView({behavior: "smooth", block: "center"});
                    
                    // 视觉反馈：闪烁一下
                    var oldBg = targetEl.style.backgroundColor;
                    targetEl.style.transition = "background 0.3s";
                    targetEl.style.backgroundColor = "#d4edda"; // 浅绿
                    setTimeout(() => targetEl.style.backgroundColor = oldBg, 1000);

                    auth.toast('✅ 建议已填入，请点击“生成”');
                    
                    if (btn) {
                        btn.innerHTML = "✅ 已填入";
                        btn.disabled = true;
                        btn.style.background = "#d4edda";
                        btn.style.color = "#155724";
                        btn.style.borderColor = "#c3e6cb";
                    }
                } else {
                    // 如果还是找不到，尝试在控制台打印页面结构，方便调试
                    console.error("目标丢失:", targetId);
                    console.log("当前Tab状态:", document.getElementById('tab-' + (type==='frontend'?'regex':type)).style.display);
                    throw new Error(`找不到输入框 [${targetId}]，请确认该页面是否加载`);
                }

            } catch (e) {
                console.error("跳转崩溃:", e);
                alert("跳转失败：" + e.message);
                if (btn) {
                    btn.innerHTML = "❌ 重试";
                    btn.disabled = false;
                }
            }
        }, 200); // 稍微等待渲染
    };

    console.log("✅ 暴力跳转补丁已加载");
})();

/* ================= 🧠 补丁 V6.0：军师双模式切换 (创意/专业) ================= */
(function() {
    console.log("🚀 执行补丁 V6.0：军师模式分流系统已上线");

    // 1. 初始化状态
    window.advisorMode = 'normal'; // 默认普通模式 (normal) / 专业模式 (pro)
    
    // 更新输入框提示的辅助函数
    function updatePlaceholder() {
        var input = document.getElementById('advisorInput');
        if (!input) return;
        if (window.advisorMode === 'pro') {
            input.placeholder = "🔴 专业模式：可指令修改任意代码/世界书...";
            input.style.border = "2px solid #e17055"; // 红色边框提示
        } else {
            input.placeholder = "🟢 普通模式：输入'开启专业模式'切换权限...";
            input.style.border = "2px solid #6c5ce7"; // 紫色边框
        }
    }
    // 立即执行一次
    setTimeout(updatePlaceholder, 500);

    // 2. 覆盖发送逻辑 (总控制器)
    window.sendAdvisorMsg = async function() {
        var input = document.getElementById('advisorInput');
        var text = input.value.trim();
        if(!text) return;

        // --- 🕵️ 口令检测系统 ---
        if (text.includes("开启专业模式") || text.includes("转到专业模式") || text === "专业模式") {
            window.advisorMode = 'pro';
            updatePlaceholder();
            addBubble('system', "🔴 <b>系统切换：</b>已进入【专业模式】。<br>我现在拥有最高权限，可以读取并修改当前页面的任何代码、规则或设定。<br>请输入修改指令。");
            input.value = '';
            return;
        }
        if (text.includes("关闭") || text.includes("普通模式") || text.includes("退出")) {
            window.advisorMode = 'normal';
            updatePlaceholder();
            addBubble('system', "🟢 <b>系统切换：</b>已回到【普通模式】。<br>我会根据人设为您提供灵感和建议。");
            input.value = '';
            return;
        }

        // 正常发送消息
        addBubble('user', text);
        input.value = '';
        
        var loadingId = 'loading-' + Date.now();
        var chat = document.getElementById('advisorChat');
        chat.insertAdjacentHTML('beforeend', `<div id="${loadingId}" class="ai-loading" style="font-size:10px;color:#999;text-align:center;">🧠 思考中...</div>`);
        chat.scrollTop = chat.scrollHeight;

        // --- 🔀 模式分流 ---
        try {
            if (window.advisorMode === 'pro') {
                await runGodModeLogic(text, loadingId); // 执行 V5.0 的上帝模式
            } else {
                await runCreativeModeLogic(text, loadingId); // 执行 V4.0 的创意模式
            }
        } catch (e) {
            document.getElementById(loadingId).remove();
            addBubble('system', `❌ 错误：${e.message}`);
        }
    };

    // -------------------------------------------------------------
    // 🟢 模式 A：普通模式 (读人设 -> 提建议 -> 一键填入)
    // -------------------------------------------------------------
    async function runCreativeModeLogic(userText, loadingId) {
        var name = document.getElementById('cardName').value;
        var desc = document.getElementById('cardDesc').value.trim();
        
        if (desc.length < 20) {
            document.getElementById(loadingId).remove();
            addBubble('system', "📜 主公，请先在预览页写点【详细设定】，我才能为您出谋划策。");
            return;
        }

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) throw new Error("请先配置 API Key");

        // 创意 Prompt
        var prompt = `
        你现在的身份是：SillyTavern 卡片制作顾问（普通模式）。
        【当前角色人设】：${desc.substring(0, 1000)}...
        
        用户需求：“${userText}”
        
        请根据【角色人设】和用户需求，提供 1-3 个具体的制作建议（世界书/正则/属性规则）。
        
        🔥 **必须返回纯 JSON 数组**，格式如下（不要任何 Markdown）：
        [
            {
                "type": "world",  // 或 "frontend", "stat"
                "title": "建议标题 (如: 添加XX设定)",
                "reason": "为什么建议这么做 (简短理由)",
                "prompt": "生成指令 (填入生成器的具体Prompt)"
            }
        ]
        如果用户只是闲聊，返回空数组 [] 并直接用文字回答。
        `;

        const response = await fetch(`${config.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify({
                model: config.model || 'gpt-3.5-turbo',
                messages: [{ role: "user", content: prompt }]
            })
        });
        
        document.getElementById(loadingId).remove();
        const data = await response.json();
        var resText = data.choices[0].message.content;

        // 尝试解析 JSON
        try {
            var cleanJson = resText.replace(/```json/g, '').replace(/```/g, '').trim();
            // 如果 AI 回复了纯文本（闲聊），这里会报错，跳到 catch 处理文本
            if (!cleanJson.startsWith('[')) throw new Error("Not JSON");
            
            var suggestions = JSON.parse(cleanJson);
            if (suggestions.length === 0) {
                addBubble('system', "🤔 军师觉得无需改动，或请具体描述您的需求。");
            } else {
                suggestions.forEach(item => {
                    renderCreativeBubble(item);
                });
            }
        } catch (e) {
            // 解析失败，说明 AI 回复的是普通对话
            addBubble('system', resText);
        }
    }

    // 渲染创意气泡 (带“去添加”按钮)
    function renderCreativeBubble(item) {
        var chat = document.getElementById('advisorChat');
        var div = document.createElement('div');
        div.className = 'advisor-bubble';
        var icon = item.type === 'world' ? "🌍" : (item.type === 'frontend' ? "🎨" : "📊");
        
        // 安全转义
        var safePrompt = encodeURIComponent(item.prompt || "");
        
        div.innerHTML = `
            <div style="font-weight:bold; color:#6c5ce7; margin-bottom:4px;">${icon} ${item.title}</div>
            <div style="font-size:12px; color:#666; margin-bottom:8px;">${item.reason}</div>
            <button class="advisor-action-btn" onclick="window.jumpToCreator(this, '${item.type}', '${safePrompt}')">
                👉 去添加 (自动填单)
            </button>
        `;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
    }


    // -------------------------------------------------------------
    // 🔴 模式 B：专业模式 (读当前页 -> 改代码 -> 一键替换)
    // -------------------------------------------------------------
    async function runGodModeLogic(userText, loadingId) {
        // 1. 获取当前页面上下文 (复用之前的逻辑)
        var context = getGodContext(); 
        var contextStr = context ? context.content.substring(0, 3000) : "(无法读取内容)";
        var contextName = context ? context.targetName : "未知区域";

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) throw new Error("请先配置 API Key");

        var prompt = `
        你现在是：代码/文本修改专家（专业模式）。
        用户当前停留在：【${contextName}】。
        
        【当前内容】：
        \`\`\`
        ${contextStr}
        \`\`\`
        
        用户指令：“${userText}”
        
        🔥 **核心指令**：
        1. 如果需要修改，请输出修改后的**完整内容**。
        2. 必须将新内容包裹在 XML 标签中：
           <FIX_TARGET id="${context ? context.targetId : 'cardDesc'}">
           这里放修改后的内容...
           </FIX_TARGET>
        `;

        const response = await fetch(`${config.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify({
                model: config.model || 'gpt-3.5-turbo',
                messages: [{ role: "user", content: prompt }]
            })
        });

        document.getElementById(loadingId).remove();
        const data = await response.json();
        var resText = data.choices[0].message.content;

        // 解析 XML 标签
        var fixMatch = /<FIX_TARGET id="([^"]+)">([\s\S]*?)<\/FIX_TARGET>/i.exec(resText);
        
        if (fixMatch) {
            var targetId = fixMatch[1];
            var newContent = fixMatch[2].trim();
            var replyDisplay = resText.replace(fixMatch[0], '\n\n✅ (修改方案已生成)');
            var safeContent = encodeURIComponent(newContent);

            var actionHtml = `
                <div style="margin-top:8px; border-top:1px dashed #ddd; padding-top:5px;">
                    <button class="advisor-action-btn" onclick="window.applyGodFix('${targetId}', '${safeContent}', this)">
                        ✅ 点击应用修改
                    </button>
                </div>
            `;
            addBubble('system', replyDisplay.replace(/\n/g, '<br>') + actionHtml);
        } else {
            addBubble('system', resText.replace(/\n/g, '<br>'));
        }
    }

    // --- 辅助工具 ---
    
    // 渲染普通气泡
    function addBubble(role, html) {
        var chat = document.getElementById('advisorChat');
        var div = document.createElement('div');
        if (role === 'user') {
            div.innerHTML = `<div style="text-align:right; margin:5px 0; color:#6c5ce7; font-size:12px; padding:5px; background:#f0f0f0; border-radius:8px; display:inline-block; margin-left:auto;">${html}</div><div style="clear:both;"></div>`;
        } else {
            div.className = 'advisor-bubble';
            div.innerHTML = html;
        }
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
    }

    // 获取当前上下文 (复用之前的映射表)
    function getGodContext() {
        const GOD_VIEW_MAP = {
            'tab-preview':  { id: 'cardDesc',     name: '详细设定' },
            'tab-regex':    { id: 'frontReplace', name: '前端代码' },
            'tab-world':    { id: 'wiContent',    name: '世界书内容' },
            'tab-stats':    { id: 'statEditor',   name: '属性逻辑' },
            'tab-advanced': { id: 'cardNote',     name: '深度设定' },
            'tab-source':   { id: 'jsonSource',   name: '完整源码' }
        };
        var activeTab = null;
        document.querySelectorAll('.card-tab-content').forEach(el => {
            if (el.style.display === 'block') activeTab = el.id;
        });
        if (activeTab === 'tab-preview') {
            // 预览页特殊处理：把开场白也读进去
            var desc = document.getElementById('cardDesc').value;
            var first = document.getElementById('cardFirstMes').value;
            return { targetId: 'cardDesc', targetName: '人设与开场白', content: `【设定】\n${desc}\n\n【开场】\n${first}` };
        }
        var info = GOD_VIEW_MAP[activeTab];
        if (info) {
            var el = document.getElementById(info.id);
            return { targetId: info.id, targetName: info.name, content: el ? el.value : "" };
        }
        return null;
    }

})();

/* ================= 🔧 补丁 V8.0：属性/高级双向同步 & 跳转修复 ================= */
(function() {
    console.log("🚑 执行 V8.0：修复属性同步与跳转功能...");

    // 1. 🛠️ 简单的双向同步 (打字时两边一起变)
    function initSync() {
        var statEl = document.getElementById('statEditor'); // 属性页框
        var noteEl = document.getElementById('cardNote');   // 高级页框

        if (statEl && noteEl) {
            // 属性页变 -> 高级页变
            statEl.oninput = function() { noteEl.value = statEl.value; };
            // 高级页变 -> 属性页变
            noteEl.oninput = function() { statEl.value = noteEl.value; };
        }
    }
    setTimeout(initSync, 1000); // 延迟一秒执行，确保安全

    // 2. 🛠️ 辅助：在指定输入框下面生成/更新说明书 (绿框)
    function showExplanationBox(targetInputId, text) {
        var inputEl = document.getElementById(targetInputId);
        if (!inputEl) return;

        // 检查是否已经有说明框了 (防止重复创建)
        var boxId = targetInputId + '_guide_box';
        var box = document.getElementById(boxId);

        if (!box) {
            box = document.createElement('div');
            box.id = boxId;
            // 样式：绿色背景，圆角
            box.style.cssText = "margin-top:8px; padding:10px; background:#e8f5e9; border:1px solid #a5d6a7; border-radius:5px; color:#2e7d32; font-size:12px; line-height:1.5; white-space:pre-wrap;";
            // 插在输入框后面
            inputEl.parentNode.insertBefore(box, inputEl.nextSibling);
        }

        box.innerHTML = `<b>📖 运行原理说明：</b>\n${text}`;
        box.style.display = 'block';
    }

    // 3. ⚡️ 重写生成逻辑 (强制双写)
    window.generateStatLogic = async function() {
        var req = document.getElementById('aiStatPrompt').value.trim();
        var charDesc = document.getElementById('cardDesc').value.trim();

        if (!req) { auth.toast('请先描述规则...'); return; }
        
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }

        var btn = document.getElementById('btnGenStat');
        var oldText = btn.innerText;
        btn.innerText = '🧠 正在编写...'; btn.disabled = true;

        var prompt = `
        你是一个SillyTavern规则专家。
        角色设定：${charDesc.substring(0, 300)}...
        用户需求：【${req}】
        
        请完成两件事：
        1. 编写 System Prompt (代码)。
        2. 编写【中文运行原理说明书】 (解释)。
        
        必须返回纯 JSON 格式：
        {
            "script": "这里放代码...",
            "explanation": "这里用中文解释：1.变量有哪些？ 2.怎么触发？ 3.效果是什么？"
        }
        `;

        try {
            var res = await fetchAI(prompt, config);
            var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
            var data = JSON.parse(cleanJson);
            
            // --- 🔥 核心：两边同时填 ---
            
            // 1. 填入【属性页】
            var statEl = document.getElementById('statEditor');
            if(statEl) statEl.value = data.script;
            showExplanationBox('statEditor', data.explanation);

            // 2. 填入【高级页】
            var noteEl = document.getElementById('cardNote');
            if(noteEl) noteEl.value = data.script;
            showExplanationBox('cardNote', data.explanation);

            auth.toast('✨ 规则与说明书已生成 (两处均已显示)');

        } catch (e) {
            console.error(e);
            auth.toast('❌ 生成失败');
        } finally {
            btn.innerText = oldText; btn.disabled = false;
        }
    };

    // 4. 🚑 修复“去添加”跳转按钮 (最稳妥版)
    window.jumpToCreator = function(btn, type, encodedPrompt) {
        // 按钮反馈
        if(btn) { btn.innerHTML = "✅ 已填入"; btn.disabled = true; btn.style.background="#d4edda"; }

        var promptText = decodeURIComponent(encodedPrompt);
        
        // 简单的切换逻辑
        if (type === 'world') {
            if(typeof switchCardTab === 'function') switchCardTab('world');
            var el = document.getElementById('aiWorldPrompt');
            if(el) { el.value = promptText; el.focus(); }
        } 
        else if (type === 'frontend') {
            if(typeof switchCardTab === 'function') switchCardTab('regex');
            // 确保切到高级模式
            var ui = document.getElementById('uiFrontendMode');
            if(ui) ui.style.display = 'block';
            var el = document.getElementById('aiCodePrompt');
            if(el) { el.value = promptText; el.focus(); }
        } 
        else if (type === 'stat') {
            if(typeof switchCardTab === 'function') switchCardTab('stats');
            var el = document.getElementById('aiStatPrompt');
            if(el) { el.value = promptText; el.focus(); }
        }
        
        // 滚动定位 (防止找不到框)
        setTimeout(function(){
            var activeInput = document.activeElement;
            if(activeInput && activeInput.tagName === 'INPUT') {
                activeInput.scrollIntoView({behavior: "smooth", block: "center"});
            }
        }, 300);
    };

})();

/* ================= 🔧 补丁 V8.0：属性/高级双向同步 & 跳转修复 ================= */
(function() {
    console.log("🚑 执行 V8.0：修复属性同步与跳转功能...");

    // 1. 🛠️ 简单的双向同步 (打字时两边一起变)
    function initSync() {
        var statEl = document.getElementById('statEditor'); // 属性页框
        var noteEl = document.getElementById('cardNote');   // 高级页框

        if (statEl && noteEl) {
            // 属性页变 -> 高级页变
            statEl.oninput = function() { noteEl.value = statEl.value; };
            // 高级页变 -> 属性页变
            noteEl.oninput = function() { statEl.value = noteEl.value; };
        }
    }
    setTimeout(initSync, 1000); // 延迟一秒执行，确保安全

    // 2. 🛠️ 辅助：在指定输入框下面生成/更新说明书 (绿框)
    function showExplanationBox(targetInputId, text) {
        var inputEl = document.getElementById(targetInputId);
        if (!inputEl) return;

        // 检查是否已经有说明框了 (防止重复创建)
        var boxId = targetInputId + '_guide_box';
        var box = document.getElementById(boxId);

        if (!box) {
            box = document.createElement('div');
            box.id = boxId;
            // 样式：绿色背景，圆角
            box.style.cssText = "margin-top:8px; padding:10px; background:#e8f5e9; border:1px solid #a5d6a7; border-radius:5px; color:#2e7d32; font-size:12px; line-height:1.5; white-space:pre-wrap;";
            // 插在输入框后面
            inputEl.parentNode.insertBefore(box, inputEl.nextSibling);
        }

        box.innerHTML = `<b>📖 运行原理说明：</b>\n${text}`;
        box.style.display = 'block';
    }

    // 3. ⚡️ 重写生成逻辑 (强制双写)
    window.generateStatLogic = async function() {
        var req = document.getElementById('aiStatPrompt').value.trim();
        var charDesc = document.getElementById('cardDesc').value.trim();

        if (!req) { auth.toast('请先描述规则...'); return; }
        
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) { auth.toast('🔑 请先配置 API Key'); return; }

        var btn = document.getElementById('btnGenStat');
        var oldText = btn.innerText;
        btn.innerText = '🧠 正在编写...'; btn.disabled = true;

        var prompt = `
        你是一个SillyTavern规则专家。
        角色设定：${charDesc.substring(0, 300)}...
        用户需求：【${req}】
        
        请完成两件事：
        1. 编写 System Prompt (代码)。
        2. 编写【中文运行原理说明书】 (解释)。
        
        必须返回纯 JSON 格式：
        {
            "script": "这里放代码...",
            "explanation": "这里用中文解释：1.变量有哪些？ 2.怎么触发？ 3.效果是什么？"
        }
        `;

        try {
            var res = await fetchAI(prompt, config);
            var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
            var data = JSON.parse(cleanJson);
            
            // --- 🔥 核心：两边同时填 ---
            
            // 1. 填入【属性页】
            var statEl = document.getElementById('statEditor');
            if(statEl) statEl.value = data.script;
            showExplanationBox('statEditor', data.explanation);

            // 2. 填入【高级页】
            var noteEl = document.getElementById('cardNote');
            if(noteEl) noteEl.value = data.script;
            showExplanationBox('cardNote', data.explanation);

            auth.toast('✨ 规则与说明书已生成 (两处均已显示)');

        } catch (e) {
            console.error(e);
            auth.toast('❌ 生成失败');
        } finally {
            btn.innerText = oldText; btn.disabled = false;
        }
    };

    // 4. 🚑 修复“去添加”跳转按钮 (最稳妥版)
    window.jumpToCreator = function(btn, type, encodedPrompt) {
        // 按钮反馈
        if(btn) { btn.innerHTML = "✅ 已填入"; btn.disabled = true; btn.style.background="#d4edda"; }

        var promptText = decodeURIComponent(encodedPrompt);
        
        // 简单的切换逻辑
        if (type === 'world') {
            if(typeof switchCardTab === 'function') switchCardTab('world');
            var el = document.getElementById('aiWorldPrompt');
            if(el) { el.value = promptText; el.focus(); }
        } 
        else if (type === 'frontend') {
            if(typeof switchCardTab === 'function') switchCardTab('regex');
            // 确保切到高级模式
            var ui = document.getElementById('uiFrontendMode');
            if(ui) ui.style.display = 'block';
            var el = document.getElementById('aiCodePrompt');
            if(el) { el.value = promptText; el.focus(); }
        } 
        else if (type === 'stat') {
            if(typeof switchCardTab === 'function') switchCardTab('stats');
            var el = document.getElementById('aiStatPrompt');
            if(el) { el.value = promptText; el.focus(); }
        }
        
        // 滚动定位 (防止找不到框)
        setTimeout(function(){
            var activeInput = document.activeElement;
            if(activeInput && activeInput.tagName === 'INPUT') {
                activeInput.scrollIntoView({behavior: "smooth", block: "center"});
            }
        }, 300);
    };

})();

/* ================= 🔧 补丁 V9.0：界面完美重排 & 军师逻辑修正 ================= */
(function() {
    console.log("🚀 执行 V9.0：修复界面丢失、编辑框跑路、军师乱指路问题...");

    // ================= 1. 界面重排 (打包移动法) =================
    // 解决：开场白消失、顺序错乱、二次编辑框丢失
    function fixLayoutPerfectly() {
        var tab = document.getElementById('tab-preview');
        if (!tab) return;

        // 定义三个核心组件的 ID 配置
        var config = [
            { id: 'cardDesc',       refineId: 'refineArea_desc' },     // 1. 详细设定
            { id: 'cardFirstMes',   refineId: 'refineArea_firstMes' }, // 2. 开场白
            { id: 'cardMesExample', refineId: 'refineArea_example' }   // 3. 对话样本
        ];

        // 找到插入点 (蓝色一键生成按钮)
        var anchorBtn = document.getElementById('btnOneClickGen');
        // 如果没找到按钮，就找个大概位置 (snippet-group)
        if (!anchorBtn) anchorBtn = tab.querySelector('.snippet-group');
        
        // 创建一个容器来放这三个家伙 (避免它们乱跑)
        var mainContainer = document.getElementById('mainPreviewContainer');
        if (!mainContainer) {
            mainContainer = document.createElement('div');
            mainContainer.id = 'mainPreviewContainer';
            // 插在按钮后面
            if (anchorBtn && anchorBtn.parentNode) {
                anchorBtn.parentNode.insertBefore(mainContainer, anchorBtn.nextSibling);
            } else {
                tab.appendChild(mainContainer);
            }
        }

        // --- 🔥 核心逻辑：打包搬运 ---
        config.forEach(function(item) {
            var inputEl = document.getElementById(item.id);
            if (!inputEl) return;

            // 1. 找 Label (通常是前一个兄弟)
            var labelEl = inputEl.previousElementSibling;
            // 如果前一个不是 label (可能是被包了一层)，尝试往上找
            if (!labelEl || labelEl.tagName !== 'LABEL') {
                // 有时候 input 被包在 div 里，label 在 div 外面
                if (inputEl.parentNode.tagName === 'DIV' && inputEl.parentNode.previousElementSibling?.tagName === 'LABEL') {
                    labelEl = inputEl.parentNode.previousElementSibling;
                    // 如果被包了，inputEl 指向父级 div，方便一起搬
                    inputEl = inputEl.parentNode; 
                }
            }

            // 2. 找二次编辑框 (RefineBox)
            var refineEl = document.getElementById(item.refineId);
            // 如果没找到 ID，尝试找 input 下面的 div (兼容旧代码生成的匿名框)
            if (!refineEl) {
                var next = inputEl.nextElementSibling;
                if (next && next.tagName === 'DIV' && next.innerHTML.includes('让它改')) {
                    refineEl = next;
                }
            }

            // 3. 创建一个干净的 Wrapper，把这一家子都装进去
            var wrapper = document.createElement('div');
            wrapper.style.marginBottom = "20px"; // 增加间距，好看点
            wrapper.className = "field-group-fixed"; // 标记

            // 按顺序塞进去：Label -> Input -> RefineBox
            if (labelEl) wrapper.appendChild(labelEl);
            wrapper.appendChild(inputEl); // 此时 inputEl 已经被移动了
            
            // 显式显示 Input (防止之前被隐藏)
            inputEl.style.display = 'block'; 
            
            if (refineEl) {
                wrapper.appendChild(refineEl);
                refineEl.style.display = 'none'; // 默认隐藏，生成后会由 js 打开
            }

            // 4. 塞入主容器 (顺序就是 config 数组的顺序)
            mainContainer.appendChild(wrapper);
        });
        
        console.log("✅ 界面已重排：设定->开场->展示 (编辑框已归位)");
    }
    // 延迟执行，确保元素存在
    setTimeout(fixLayoutPerfectly, 800);


    // ================= 2. 军师逻辑修正 (增加 'desc' 类型) =================
    // 解决：改人设建议被归类到正则/属性
    
    // 覆盖分析函数
    window.analyzeCardNeeds = async function() {
        var name = document.getElementById('cardName').value;
        var desc = document.getElementById('cardDesc').value.trim();
        
        // 门槛降低
        if (desc.length < 10) { auth.toast('📜 请先写点人设，军师才能分析哦'); return; }

        var box = document.getElementById('aiAdvisorBox');
        if(box) box.style.display = 'flex';
        
        var chat = document.getElementById('advisorChat');
        chat.innerHTML = `<div class="ai-loading" style="color:#999;font-size:12px;text-align:center;padding:20px;">🧠 军师正在审阅人设...</div>`;

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) {
            chat.innerHTML = `<div class="advisor-bubble">❌ 请先配置 API Key。</div>`;
            return;
        }

        // 🔥 Prompt 修正：明确告诉 AI 有 "desc" 这个类型
        var prompt = `
        我是卡片作者。角色：${name}。
        设定：${desc.substring(0, 800)}...
        
        请作为“制作顾问”，提出 3 个修改建议。
        
        🔥 **分类规则 (非常重要)**：
        - 如果是修改性格/外貌/背景/说话方式 -> 类型填 "desc" (详细设定)。
        - 如果是增加特殊系统/状态栏/特效 -> 类型填 "frontend" (前端) 或 "stat" (属性)。
        - 如果是增加物品/地点/百科 -> 类型填 "world" (世界书)。
        
        必须返回纯 JSON 数组：
        [
            {
                "type": "desc", 
                "title": "建议标题", 
                "reason": "理由", 
                "prompt": "修改指令 (如: 把性格改得更病娇一点)" 
            }
        ]
        `;

        try {
            var res = await fetchAI(prompt, config);
            var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
            var suggestions = JSON.parse(cleanJson);
            
            chat.innerHTML = ''; 
            suggestions.forEach(item => renderSuggestionBubble(item));
            
        } catch(e) { 
            console.error(e);
            chat.innerHTML = `<div class="advisor-bubble">❌ 军师思路乱了... (重试一下?)</div>`;
        }
    };

    // ================= 3. 跳转逻辑修正 (支持 'desc' 类型) =================
    // 覆盖跳转函数
    window.jumpToCreator = function(btn, type, encodedPrompt) {
        if (btn) { btn.innerHTML = "⏳ 跳转中..."; btn.style.opacity = "0.7"; }

        setTimeout(function() {
            try {
                var promptText = decodeURIComponent(encodedPrompt);
                var targetEl = null;

                // --- 分流处理 ---
                if (type === 'desc') {
                    // 🔥 新增：人设修改 -> 跳转预览页 -> 填入修改框
                    if(typeof switchCardTab === 'function') switchCardTab('preview');
                    
                    // 还要确保“详细设定”的修改框是显示出来的
                    // 我们直接调用 refineResult 的预处理逻辑
                    if(!window.lastGeneratedData) window.lastGeneratedData = {};
                    // 假装已经生成过了，把当前内容存进去，触发修改框显示
                    window.lastGeneratedData.desc = document.getElementById('cardDesc').value;
                    
                    var refineBox = document.getElementById('refineArea_desc');
                    if(refineBox) refineBox.style.display = 'block';
                    
                    targetEl = document.getElementById('refineInput_desc');
                }
                else if (type === 'world') {
                    if(typeof switchCardTab === 'function') switchCardTab('world');
                    targetEl = document.getElementById('aiWorldPrompt');
                } 
                else if (type === 'frontend') {
                    if(typeof switchCardTab === 'function') switchCardTab('regex');
                    // 强开高级模式
                    var ui = document.getElementById('uiFrontendMode');
                    if(ui) ui.style.display = 'block';
                    targetEl = document.getElementById('aiCodePrompt');
                } 
                else if (type === 'stat') {
                    if(typeof switchCardTab === 'function') switchCardTab('stats');
                    targetEl = document.getElementById('aiStatPrompt');
                }

                // --- 填入 ---
                if (targetEl) {
                    targetEl.value = promptText;
                    targetEl.focus();
                    targetEl.scrollIntoView({behavior: "smooth", block: "center"});
                    
                    auth.toast('✅ 建议已填入，请点击生成/修改');
                    if (btn) {
                        btn.innerHTML = "✅ 已填入";
                        btn.disabled = true;
                        btn.style.background = "#d4edda";
                        btn.style.color = "#155724";
                    }
                } else {
                    console.error("目标丢失:", type);
                    // 尝试暴力修正：如果是 desc 找不到框，可能是还没有生成过
                    // 此时直接填入 prompt 给用户看也行
                    if(type === 'desc') alert("请先点击【生成人设】按钮，然后再使用此建议修改。");
                }

            } catch (e) {
                console.error(e);
                alert("跳转失败：" + e.message);
                if (btn) { btn.innerHTML = "❌ 重试"; btn.disabled = false; }
            }
        }, 300);
    };

})();

/* ================= 🔧 补丁 V12.0：界面顺序最终修正版 ================= */
(function() {
    console.log("🚀 执行 V12.0：强制修复开场白位置");

    function fixPosition() {
        var tab = document.getElementById('tab-preview');
        var tabAdvanced = document.getElementById('tab-advanced');
        
        // 1. 找到核心元素
        var elDesc = document.getElementById('cardDesc');       // 详细设定
        var elFirst = document.getElementById('cardFirstMes');  // 开场白
        var elExample = document.getElementById('cardMesExample'); // 对话样本
        
        // 2. 找到锚点 (蓝色生成按钮)
        var anchor = document.getElementById('btnOneClickGen') || document.querySelector('.wizard-box');

        if (!elDesc || !elFirst || !tab) return;

        // --- 辅助：找到元素的全家桶 (Label + Input + 修改框) ---
        function getBlock(inputEl) {
            inputEl.style.display = 'block'; // 强制显示
            
            // 往上找父级 (如果已经被之前的补丁包过)
            var parent = inputEl.parentNode;
            if (parent.className.includes('wrapper') || parent.className.includes('field-group')) {
                return parent;
            }
            
            // 如果是散装的，创建一个新盒子把它们包起来
            var label = inputEl.previousElementSibling;
            if (label && label.tagName === 'LABEL') {
                var div = document.createElement('div');
                div.style.marginBottom = '20px';
                inputEl.parentNode.insertBefore(div, inputEl);
                div.appendChild(label);
                div.appendChild(inputEl);
                // 带上修改框
                var next = div.nextElementSibling;
                if (next && next.id && next.id.startsWith('refine')) div.appendChild(next);
                return div;
            }
            return inputEl;
        }

        var blockDesc = getBlock(elDesc);
        var blockFirst = getBlock(elFirst);
        var blockExample = getBlock(elExample);

        // --- 开始搬运 ---

        // 1. 把【对话样本】扔到高级页
        if (tabAdvanced && blockExample) {
            tabAdvanced.insertBefore(blockExample, tabAdvanced.firstChild);
            var lbl = blockExample.querySelector('label');
            if(lbl) lbl.innerHTML = "🗣️ 对话样本 (Example) <span style='color:#999;font-size:10px;'>*已移至此处*</span>";
        }

        // 2. 这里的顺序是关键：
        // 先把【详细设定】插到按钮后面
        if (anchor && anchor.parentNode === tab) {
            anchor.parentNode.insertBefore(blockDesc, anchor.nextSibling);
        } else {
            tab.insertBefore(blockDesc, tab.firstChild);
        }

        // 3. 再把【开场白】插到【详细设定】后面
        if (blockDesc.nextSibling) {
            blockDesc.parentNode.insertBefore(blockFirst, blockDesc.nextSibling);
        } else {
            blockDesc.parentNode.appendChild(blockFirst);
        }

        // 4. 修正标签名 (强制改回来)
        var l1 = blockDesc.querySelector('label');
        if(l1) l1.innerText = "📝 详细设定 (Description)";
        
        var l2 = blockFirst.querySelector('label');
        if(l2) l2.innerText = "💬 开场白 (First Message)";
        
        console.log("✅ 顺序已锁定：设定 -> 开场白");
    }

    // 延迟 1秒 执行
    setTimeout(fixPosition, 1000);
})();

/* ================= 🚑 补丁 V13.0：军师专业模式终极修复 ================= */
(function() {
    console.log("🚀 执行 V13.0：修复军师按钮失效 & 同步二次编辑缓存");

    // 1. 重写应用修改函数 (修复按钮无反应 + 同步缓存)
    window.applyGodFix = function(targetId, encodedContent, btn) {
        try {
            var el = document.getElementById(targetId);
            if (!el) {
                alert("❌ 军师眼花了，找不到 ID 为 " + targetId + " 的输入框");
                return;
            }

            // A. 解码内容
            var newContent = decodeURIComponent(encodedContent);
            el.value = newContent;

            // B. 触发界面同步
            // 如果是属性页，同步到深度设定
            if(typeof syncStatToNote === 'function') syncStatToNote();
            // 如果是前端页，立即预览
            if(targetId === 'frontReplace' && typeof runRegexTest === 'function') runRegexTest();
            // 如果是预览页，更新手机预览
            if((targetId === 'cardDesc' || targetId === 'cardFirstMes') && typeof updatePreviewUI === 'function') updatePreviewUI();

            // C. 🔥 核心修复：更新“二次编辑”的缓存
            // 这样你点完应用后，再点“让它改”，AI 就会基于新内容修改，而不是旧内容
            if (!window.lastGeneratedData) window.lastGeneratedData = {};
            
            if (targetId === 'cardDesc') window.lastGeneratedData.desc = newContent;
            else if (targetId === 'cardFirstMes') window.lastGeneratedData.firstMes = newContent;
            else if (targetId === 'frontReplace') {
                // 前端代码比较特殊，需要保留之前的结构
                if (!window.lastGeneratedData.frontend) window.lastGeneratedData.frontend = { name: "AI修改版", regex: "/\\[.*\\]/g" };
                window.lastGeneratedData.frontend.code = newContent;
            }
            else if (targetId === 'wiContent') {
                if (!window.lastGeneratedData.world) window.lastGeneratedData.world = { comment: "AI修改版", keys: [] };
                window.lastGeneratedData.world.content = newContent;
            }
            else if (targetId === 'statEditor') {
                if (!window.lastGeneratedData.stat) window.lastGeneratedData.stat = {};
                window.lastGeneratedData.stat.raw = newContent; 
                // 同时也视为 script 更新
                window.lastGeneratedData.stat.script = newContent;
            }

            // D. 按钮状态反馈
            if (btn) {
                btn.innerHTML = "✅ 修改已应用 (缓存已同步)";
                btn.disabled = true;
                btn.style.background = "#d4edda";
                btn.style.color = "#155724";
                btn.style.border = "1px solid #c3e6cb";
            }

            // 如果有 toast 系统
            if (typeof auth !== 'undefined' && auth.toast) auth.toast('✨ 内容已更新，二次编辑已就绪！');

        } catch (e) {
            console.error(e);
            alert("应用失败：" + e.message);
        }
    };

    // 2. 覆盖军师逻辑 (修复单引号卡死问题)
    // 我们必须重写 runGodModeLogic，但因为它在闭包里，我们只能通过覆盖 sendAdvisorMsg 来间接替换
    
    // 这里我们定义一个全局的专业模式逻辑
    window.runGodModeLogicGlobal = async function(userText, loadingId) {
        var context = getGodContextGlobal(); 
        var contextStr = context ? context.content.substring(0, 3000) : "(无法读取内容)";
        var contextName = context ? context.targetName : "未知区域";

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) throw new Error("请先配置 API Key");

        var prompt = `
        你现在是：代码/文本修改专家（专业模式）。
        用户当前停留在：【${contextName}】。
        
        【当前内容】：
        \`\`\`
        ${contextStr}
        \`\`\`
        
        用户指令：“${userText}”
        
        🔥 **核心指令**：
        1. 如果需要修改，请输出修改后的**完整内容**。
        2. 必须将新内容包裹在 XML 标签中：
           <FIX_TARGET id="${context ? context.targetId : 'cardDesc'}">
           这里放修改后的内容...
           </FIX_TARGET>
        `;

        const response = await fetch(`${config.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify({
                model: config.model || 'gpt-3.5-turbo',
                messages: [{ role: "user", content: prompt }]
            })
        });

        document.getElementById(loadingId).remove();
        const data = await response.json();
        var resText = data.choices[0].message.content;
        var chat = document.getElementById('advisorChat');

        // 解析 XML 标签
        var fixMatch = /<FIX_TARGET id="([^"]+)">([\s\S]*?)<\/FIX_TARGET>/i.exec(resText);
        
        if (fixMatch) {
            var targetId = fixMatch[1];
            var newContent = fixMatch[2].trim();
            var replyDisplay = resText.replace(fixMatch[0], '\n\n✅ (修改方案已生成)');
            
            // 🔥🔥🔥 核心修复点：强制转义单引号，防止 HTML 属性截断 🔥🔥🔥
            var safeContent = encodeURIComponent(newContent).replace(/'/g, "%27");

            var actionHtml = `
                <div style="margin-top:8px; border-top:1px dashed #ddd; padding-top:5px;">
                    <button class="advisor-action-btn" onclick="window.applyGodFix('${targetId}', '${safeContent}', this)">
                        👉 点击替换【${targetId}】的内容
                    </button>
                </div>
            `;
            // 手动添加气泡
            var div = document.createElement('div');
            div.className = 'advisor-bubble';
            div.innerHTML = replyDisplay.replace(/\n/g, '<br>') + actionHtml;
            chat.appendChild(div);
        } else {
            // 普通回复
            var div = document.createElement('div');
            div.className = 'advisor-bubble';
            div.innerHTML = resText.replace(/\n/g, '<br>');
            chat.appendChild(div);
        }
        chat.scrollTop = chat.scrollHeight;
    };

    // 辅助：获取上下文 (全局版)
    function getGodContextGlobal() {
        const GOD_VIEW_MAP = {
            'tab-preview':  { id: 'cardDesc',     name: '详细设定' },
            'tab-regex':    { id: 'frontReplace', name: '前端代码' },
            'tab-world':    { id: 'wiContent',    name: '世界书内容' },
            'tab-stats':    { id: 'statEditor',   name: '属性逻辑' },
            'tab-advanced': { id: 'cardNote',     name: '深度设定' },
            'tab-source':   { id: 'jsonSource',   name: '完整源码' }
        };
        var activeTab = null;
        document.querySelectorAll('.card-tab-content').forEach(el => {
            if (el.style.display === 'block' || getComputedStyle(el).display === 'block') activeTab = el.id;
        });
        
        // 预览页特殊逻辑
        if (activeTab === 'tab-preview') {
            return { targetId: 'cardDesc', targetName: '详细设定', content: document.getElementById('cardDesc').value };
        }

        var info = GOD_VIEW_MAP[activeTab];
        if (info) {
            var el = document.getElementById(info.id);
            return { targetId: info.id, targetName: info.name, content: el ? el.value : "" };
        }
        return null;
    }

    // 3. 拦截 sendAdvisorMsg，将专业模式导向新逻辑
    var _oldSend = window.sendAdvisorMsg;
    window.sendAdvisorMsg = async function() {
        if (window.advisorMode === 'pro') {
            var input = document.getElementById('advisorInput');
            var text = input.value.trim();
            if(!text) return;
            
            // 用户消息上屏
            var chat = document.getElementById('advisorChat');
            chat.innerHTML += `<div style="text-align:right; margin:5px 0; color:#6c5ce7; font-size:12px; padding:5px; background:#f0f0f0; border-radius:8px; display:inline-block; margin-left:auto;">${text}</div><div style="clear:both;"></div>`;
            input.value = '';
            
            var loadingId = 'loading-' + Date.now();
            chat.insertAdjacentHTML('beforeend', `<div id="${loadingId}" class="ai-loading" style="font-size:10px;color:#999;text-align:center;">🧠 专业模式思考中...</div>`);
            chat.scrollTop = chat.scrollHeight;

            try {
                // 调用修复后的逻辑
                await window.runGodModeLogicGlobal(text, loadingId);
            } catch (e) {
                document.getElementById(loadingId).remove();
                chat.innerHTML += `<div class="advisor-bubble">❌ 错误：${e.message}</div>`;
            }
        } else {
            // 普通模式走旧逻辑
            if(_oldSend) _oldSend();
        }
    };

    console.log("✅ 专业模式修复完成：按钮点击已恢复，缓存已同步");
})();

/* ================= 🚑 补丁 V13.1：修复无法退出 & 按钮失效 ================= */
(function() {
    console.log("🚀 执行 V13.1：修复死循环与点击失效问题");

    // 1. 建立全局修改缓存 (解决按钮点不动的问题)
    // 我们不再把代码塞进 HTML onclick 里，而是存在这里
    window.godModeCache = {}; 

    // 2. 重写应用函数 (从缓存读取)
    window.applyGodFixFromCache = function(cacheId, targetId, btn) {
        try {
            // A. 从缓存获取内容
            var newContent = window.godModeCache[cacheId];
            if (newContent === undefined) {
                alert("❌ 缓存已过期，请重新让军师生成建议");
                return;
            }

            // B. 找到输入框
            var el = document.getElementById(targetId);
            if (!el) {
                alert("❌ 找不到目标输入框 ID: " + targetId);
                return;
            }

            // C. 写入内容
            el.value = newContent;

            // D. 同步与预览
            if(typeof syncStatToNote === 'function') syncStatToNote();
            if(targetId === 'frontReplace' && typeof runRegexTest === 'function') runRegexTest();
            if((targetId === 'cardDesc' || targetId === 'cardFirstMes') && typeof updatePreviewUI === 'function') updatePreviewUI();

            // E. 同步二次编辑缓存 (确保"让它改"能基于新内容)
            if (!window.lastGeneratedData) window.lastGeneratedData = {};
            
            if (targetId === 'cardDesc') window.lastGeneratedData.desc = newContent;
            else if (targetId === 'cardFirstMes') window.lastGeneratedData.firstMes = newContent;
            else if (targetId === 'frontReplace') {
                if (!window.lastGeneratedData.frontend) window.lastGeneratedData.frontend = { name: "AI修改", regex: "/\\[.*\\]/g" };
                window.lastGeneratedData.frontend.code = newContent;
            }
            else if (targetId === 'statEditor') {
                if (!window.lastGeneratedData.stat) window.lastGeneratedData.stat = {};
                window.lastGeneratedData.stat.script = newContent;
                window.lastGeneratedData.stat.raw = newContent;
            }
            else if (targetId === 'wiContent') {
                if (!window.lastGeneratedData.world) window.lastGeneratedData.world = { comment: "AI修改", keys: [] };
                window.lastGeneratedData.world.content = newContent;
            }

            // F. 按钮变色反馈
            if (btn) {
                btn.innerHTML = "✅ 修改已应用";
                btn.disabled = true;
                btn.style.background = "#d4edda";
                btn.style.color = "#155724";
                btn.style.border = "1px solid #c3e6cb";
            }
            
            // 提示成功
            if(window.auth && window.auth.toast) auth.toast('✨ 修改成功！正则/预览已同步');

        } catch (e) {
            console.error(e);
            alert("应用出错：" + e.message);
        }
    };

    // 3. 覆盖军师逻辑 (解决无法退出问题)
    
    // 备份旧的发送逻辑 (V6.0/V13.0)
    var _previousSend = window.sendAdvisorMsg;

    // 辅助：更新输入框样式
    function updateAdvisorUI(mode) {
        var input = document.getElementById('advisorInput');
        var chat = document.getElementById('advisorChat');
        if (!input || !chat) return;

        if (mode === 'pro') {
            input.placeholder = "🔴 专业模式：输入指令修改代码 (输入'退出'返回)";
            input.style.border = "2px solid #e17055"; 
            chat.innerHTML += `<div class="advisor-bubble" style="background:#fff0f0; color:#c0392b; font-size:12px;">🔴 <b>系统：</b>已进入专业模式。<br>输入 "退出" 或 "关闭" 返回普通模式。</div>`;
        } else {
            input.placeholder = "🟢 普通模式：和军师聊聊人设...";
            input.style.border = "2px solid #6c5ce7"; 
            chat.innerHTML += `<div class="advisor-bubble" style="background:#f3f0ff; color:#6c5ce7; font-size:12px;">🟢 <b>系统：</b>已回到普通模式。</div>`;
        }
        chat.scrollTop = chat.scrollHeight;
    }

    // 🔥 新的发送函数
    window.sendAdvisorMsg = async function() {
        var input = document.getElementById('advisorInput');
        var text = input.value.trim();
        if (!text) return;

        // --- A. 优先拦截：模式切换命令 ---
        if (text === "退出" || text === "关闭" || text === "普通模式") {
            window.advisorMode = 'normal';
            updateAdvisorUI('normal');
            input.value = '';
            return; // 拦截成功，不再发给AI
        }

        if (text === "专业模式" || text === "开启专业模式") {
            window.advisorMode = 'pro';
            updateAdvisorUI('pro');
            input.value = '';
            return;
        }

        // --- B. 分流处理 ---
        if (window.advisorMode === 'pro') {
            // === 专业模式逻辑 (修复版) ===
            
            // 1. 用户气泡上屏
            var chat = document.getElementById('advisorChat');
            chat.innerHTML += `<div style="text-align:right; margin:5px 0; color:#6c5ce7; font-size:12px; padding:5px; background:#f0f0f0; border-radius:8px; display:inline-block; margin-left:auto;">${text}</div><div style="clear:both;"></div>`;
            input.value = '';

            // 2. 显示 Loading
            var loadingId = 'loading-' + Date.now();
            chat.insertAdjacentHTML('beforeend', `<div id="${loadingId}" class="ai-loading" style="font-size:10px;color:#999;text-align:center;">🧠 专业模式思考中...</div>`);
            chat.scrollTop = chat.scrollHeight;

            // 3. 执行请求 (这里我们直接内联修复后的逻辑，不依赖外部函数，防止版本冲突)
            try {
                // 获取上下文
                var contextData = null;
                if(typeof getGodContextGlobal === 'function') contextData = getGodContextGlobal(); 
                // 如果 V13.0 的函数没加载，尝试简易获取
                else {
                    var desc = document.getElementById('cardDesc').value;
                    contextData = { targetId: 'cardDesc', targetName: '详细设定', content: desc };
                }

                var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
                if (!config || !config.apiKey) throw new Error("请配置 API Key");

                var prompt = `
                你现在是：代码修改专家（专业模式）。
                当前正在编辑：【${contextData.targetName}】
                
                当前内容：
                \`\`\`
                ${contextData.content.substring(0, 3000)}
                \`\`\`
                
                用户指令：“${text}”
                
                🔥 **指令**：
                1. 如果需要修改，请输出修改后的**完整内容**。
                2. 必须包裹在 XML 标签中：
                   <FIX_TARGET id="${contextData.targetId}">
                   这里放修改后的内容...
                   </FIX_TARGET>
                `;

                const response = await fetch(`${config.apiUrl}/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                    body: JSON.stringify({
                        model: config.model || 'gpt-3.5-turbo',
                        messages: [{ role: "user", content: prompt }]
                    })
                });

                document.getElementById(loadingId).remove();
                const data = await response.json();
                var resText = data.choices[0].message.content;

                // 解析回复
                var fixMatch = /<FIX_TARGET id="([^"]+)">([\s\S]*?)<\/FIX_TARGET>/i.exec(resText);
                
                if (fixMatch) {
                    var targetId = fixMatch[1];
                    var newContent = fixMatch[2].trim();
                    var replyDisplay = resText.replace(fixMatch[0], '\n\n✅ (修改方案已生成)');
                    
                    // 🔥 核心修复：存入缓存，而不是拼接到 HTML 里
                    var cacheId = "fix_" + Date.now();
                    window.godModeCache[cacheId] = newContent;

                    var actionHtml = `
                        <div style="margin-top:8px; border-top:1px dashed #ddd; padding-top:5px;">
                            <button class="advisor-action-btn" onclick="window.applyGodFixFromCache('${cacheId}', '${targetId}', this)">
                                👉 点击应用修改
                            </button>
                        </div>
                    `;
                    chat.innerHTML += `<div class="advisor-bubble">${replyDisplay.replace(/\n/g, '<br>')}${actionHtml}</div>`;
                } else {
                    chat.innerHTML += `<div class="advisor-bubble">${resText.replace(/\n/g, '<br>')}</div>`;
                }
                chat.scrollTop = chat.scrollHeight;

            } catch(e) {
                document.getElementById(loadingId)?.remove();
                chat.innerHTML += `<div class="advisor-bubble">❌ 错误：${e.message}</div>`;
            }

        } else {
            // === 普通模式 ===
            // 调用旧版本的逻辑 (V6.0/V13.0 的 else 分支)
            if (_previousSend) {
                _previousSend();
            }
        }
    };

    console.log("✅ V13.1：修复完毕，现在可以自由进出专业模式了！");

})();

/* ================= 💾 V16.0 全局快照存档系统 (修复版) ================= */
(function() {
    console.log("🚀 V16.0 存档系统已加载：正在覆盖旧逻辑...");

    // 1. 📂 打开/关闭 档案室
    window.openSaveManager = function() {
        var modal = document.getElementById('saveManagerModal');
        if (modal) {
            modal.style.display = 'flex';
            renderSaveList(); // 打开时刷新列表
        } else {
            alert("❌ 错误：找不到存档弹窗 (id='saveManagerModal')");
        }
    };

    // 2. 💾 新建存档 (暴力抓取所有数据)
    window.createNewSave = function() {
        // 辅助：安全获取输入框的值
        function getVal(id) { 
            var el = document.getElementById(id); 
            return el ? el.value : ""; 
        }

        var name = getVal('cardName').trim() || "未命名工程";
        var timeStr = new Date().toLocaleString();

        // 🔥 核心：打包所有东西
        var snapshot = {
            id: Date.now(),
            title: name,
            timestamp: timeStr,
            
            // A. 所有的输入框内容
            inputs: {
                cardName: getVal('cardName'),
                cardDesc: getVal('cardDesc'),
                cardFirstMes: getVal('cardFirstMes'),
                cardMesExample: getVal('cardMesExample'),
                cardScenario: getVal('cardScenario'),
                cardNote: getVal('cardNote'),
                statEditor: getVal('statEditor'), // 属性页代码
                
                // 也要保存那些正在编辑但还没生成的“草稿”
                aiCodePrompt: getVal('aiCodePrompt'),
                aiWorldPrompt: getVal('aiWorldPrompt'),
                frontPattern: getVal('frontPattern'),
                frontReplace: getVal('frontReplace'),
                wiComment: getVal('wiComment'),
                wiKeys: getVal('wiKeys'),
                wiContent: getVal('wiContent')
            },

            // B. 所有的全局变量 (深拷贝，防止引用关联)
            globals: {
                worldInfo: JSON.parse(JSON.stringify(window.currentWorldInfo || { entries: [] })),
                regexScripts: JSON.parse(JSON.stringify(window.currentCardRegexes || [])),
                selectedTags: JSON.parse(JSON.stringify(window.currentSelectedTags || { identity:[], personality:[], trope:[] })),
                advisorMode: window.advisorMode || 'normal'
            },

            // C. 军师的聊天记录 (直接存 HTML)
            advisorChatHTML: document.getElementById('advisorChat') ? document.getElementById('advisorChat').innerHTML : ""
        };

        // 保存到 localStorage
        try {
            var saves = JSON.parse(localStorage.getItem('my_creator_saves') || "[]");
            
            // 检查同名覆盖
            var existIdx = saves.findIndex(s => s.title === name);
            if (existIdx !== -1) {
                if (!confirm(`存档【${name}】已存在，要覆盖吗？`)) return;
                saves[existIdx] = snapshot; // 覆盖
            } else {
                saves.unshift(snapshot); // 加到最前
            }

            localStorage.setItem('my_creator_saves', JSON.stringify(saves));
            
            // 刷新列表 & 提示
            renderSaveList();
            if (window.auth && window.auth.toast) auth.toast('💾 全局快照已保存！');
            else alert('💾 保存成功！');

        } catch (e) {
            console.error(e);
            alert("❌ 保存失败 (可能是存储空间不足)：" + e.message);
        }
    };

    // 3. 📖 读取存档 (完美还原现场)
    window.loadSave = function(index) {
        if (!confirm('⚠️ 读取存档将覆盖当前所有进度，确定吗？')) return;

        try {
            var saves = JSON.parse(localStorage.getItem('my_creator_saves') || "[]");
            var data = saves[index];
            if (!data) throw new Error("存档损坏或丢失");

            // A. 恢复输入框
            function setVal(id, val) {
                var el = document.getElementById(id);
                if (el) el.value = val || "";
            }
            
            // 循环恢复 inputs 对象里的所有值
            for (var key in data.inputs) {
                setVal(key, data.inputs[key]);
            }

            // B. 恢复全局变量
            window.currentWorldInfo = data.globals.worldInfo || { entries: [] };
            window.currentCardRegexes = data.globals.regexScripts || [];
            window.currentSelectedTags = data.globals.selectedTags || { identity:[], personality:[], trope:[] };
            window.advisorMode = data.globals.advisorMode || 'normal';

            // C. 恢复军师聊天
            var chatBox = document.getElementById('advisorChat');
            if (chatBox) chatBox.innerHTML = data.advisorChatHTML || "";

            // D. 🔥 关键：刷新 UI 显示 (不然变量变了界面没变)
            if (typeof renderWizardTags === 'function') renderWizardTags(); // 刷新标签高亮
            if (typeof renderWorldList === 'function') renderWorldList();   // 刷新世界书列表
            if (typeof renderRegexList === 'function') renderRegexList();   // 刷新正则列表
            if (typeof updatePreviewUI === 'function') updatePreviewUI();   // 刷新手机预览
            
            // 恢复军师输入框样式
            var advInput = document.getElementById('advisorInput');
            if (advInput) {
                if (window.advisorMode === 'pro') {
                    advInput.style.border = "2px solid #e17055";
                    advInput.placeholder = "🔴 专业模式...";
                } else {
                    advInput.style.border = "2px solid #6c5ce7";
                    advInput.placeholder = "🟢 普通模式...";
                }
            }

            // 关闭窗口并提示
            document.getElementById('saveManagerModal').style.display = 'none';
            if (window.auth && window.auth.toast) auth.toast('📂 现场还原成功！');

        } catch (e) {
            console.error(e);
            alert("❌ 读取失败：" + e.message);
        }
    };

    // 4. 📜 渲染存档列表
    window.renderSaveList = function() {
        var list = document.getElementById('saveSlotList');
        if (!list) return;
        
        var saves = JSON.parse(localStorage.getItem('my_creator_saves') || "[]");
        list.innerHTML = "";

        if (saves.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">暂无存档</div>';
            return;
        }

        saves.forEach((save, idx) => {
            var div = document.createElement('div');
            div.style.cssText = "background:#fff; border:1px solid #ddd; margin-bottom:10px; padding:10px; border-radius:8px; cursor:pointer; position:relative; transition:0.2s;";
            div.onmouseover = function() { this.style.borderColor = '#0288d1'; };
            div.onmouseout = function() { this.style.borderColor = '#ddd'; };
            
            div.innerHTML = `
                <div style="font-weight:bold; color:#333;">${save.title}</div>
                <div style="font-size:10px; color:#999;">📅 ${save.timestamp}</div>
                <div style="font-size:10px; color:#aaa; margin-top:5px;">
                    包含：世界书(${save.globals?.worldInfo?.entries?.length || 0}) 
                    正则(${save.globals?.regexScripts?.length || 0}) 
                    标签(${Object.values(save.globals?.selectedTags || {}).flat().length})
                </div>
                <button onclick="event.stopPropagation(); deleteSave(${idx})" style="position:absolute; right:10px; top:10px; border:none; background:none; color:#e74c3c; cursor:pointer; font-size:14px; padding:5px;">🗑️</button>
            `;
            
            div.onclick = function() { loadSave(idx); };
            list.appendChild(div);
        });
    };

    // 5. 🗑️ 删除存档
    window.deleteSave = function(index) {
        if (!confirm("确定删除这个存档吗？")) return;
        var saves = JSON.parse(localStorage.getItem('my_creator_saves') || "[]");
        saves.splice(index, 1);
        localStorage.setItem('my_creator_saves', JSON.stringify(saves));
        renderSaveList();
    };

    console.log("✅ V16.0 存档系统就绪：已接管保存/读取逻辑");

})();

/* ================= 🔧 V17.0 补丁：生成器强力纠错 (解决假失败) ================= */
(function() {
    console.log("🚀 V17.0：JSON 解析增强已上线");

    // 1. 🛠️ 强力 JSON 提取器 (能过滤掉 AI 的所有废话)
    function safeExtractJSON(str) {
        try {
            // 第一步：尝试直接解析
            return JSON.parse(str);
        } catch (e) {
            // 第二步：正则提取最外层的 {...}
            var match = str.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    return JSON.parse(match[0]);
                } catch (e2) {
                    // 第三步：如果还不行，尝试清理常见的 Markdown 符号
                    var clean = match[0].replace(/\\n/g, "\\n")  
                                        .replace(/\\'/g, "\\'")
                                        .replace(/\\"/g, '\\"')
                                        .replace(/\\&/g, "\\&")
                                        .replace(/\\r/g, "\\r")
                                        .replace(/\\t/g, "\\t")
                                        .replace(/\\b/g, "\\b")
                                        .replace(/\\f/g, "\\f");
                    // 移除不可见字符
                    clean = clean.replace(/[\u0000-\u0019]+/g,""); 
                    return JSON.parse(clean);
                }
            }
            throw new Error("无法从回复中提取有效 JSON");
        }
    }

    // 2. ⚡️ 覆盖：一键生成全套 (btnOneClickGen)
    // 我们重新绑定这个按钮的点击事件
    setTimeout(function() {
        var btn = document.getElementById('btnOneClickGen');
        if (!btn) return;

        // 移除旧事件，绑定新事件
        btn.onclick = async function() {
            var name = document.getElementById('cardName').value.trim();
            if (!name) { 
                if(window.auth && window.auth.toast) window.auth.toast('先给角色起个名字吧！'); 
                else alert('先给角色起个名字吧！');
                return; 
            }

            // 获取标签
            var allTags = [];
            if (window.currentSelectedTags) {
                allTags = [
                    ...window.currentSelectedTags.identity, 
                    ...window.currentSelectedTags.personality, 
                    ...window.currentSelectedTags.trope
                ];
            }
            var tagStr = allTags.join('、');

            var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
            if (!config || !config.apiKey) { alert('🔑 请先配置 API Key'); return; }

            var selfBtn = document.getElementById('btnOneClickGen');
            var oldText = selfBtn.innerText;
            selfBtn.innerText = '🧠 强力生成中...'; selfBtn.disabled = true;

            var prompt = `
            我是创造者。请为角色【${name}】设计全套人设。
            【强制标签】：${tagStr}。
            
            请返回纯 JSON 格式，包含：
            1. "desc": 详细设定 (500字，包含外貌、性格、身世)。
            2. "first_mes": 开场白 (符合人设的第一句话，不要引号)。
            3. "example": 对话样本 (User与Char的对话示例)。
            `;

            try {
                // 发送请求
                var res = await fetchAI(prompt, config); // 假设 fetchAI 是全局可用的
                
                // 🔥 使用强力提取器
                var data = safeExtractJSON(res);

                // 填入数据
                if(document.getElementById('cardDesc')) document.getElementById('cardDesc').value = data.desc || "";
                if(document.getElementById('cardFirstMes')) document.getElementById('cardFirstMes').value = data.first_mes || "";
                if(document.getElementById('cardMesExample')) document.getElementById('cardMesExample').value = data.example || "";

                // 自动跳到预览页
                if(typeof switchCardTab === 'function') switchCardTab('preview');
                if(typeof updatePreviewUI === 'function') updatePreviewUI();
                
                // 存入二次编辑缓存
                if (!window.lastGeneratedData) window.lastGeneratedData = {};
                window.lastGeneratedData.desc = data.desc;
                window.lastGeneratedData.firstMes = data.first_mes;
                
                // 显示成功提示
                if(window.auth && window.auth.toast) window.auth.toast('✨ 全套人设生成成功！(已过滤废话)');

            } catch (e) {
                console.error("生成报错详情:", e);
                // 就算报错了，如果文本框里有字，也算半成功，不弹报错
                if (document.getElementById('cardDesc').value.length > 10) {
                    if(window.auth && window.auth.toast) window.auth.toast('⚠️ 格式有小瑕疵，但内容已填入');
                } else {
                    alert('❌ 生成失败，AI 返回格式错误。\n\n错误原因：' + e.message);
                }
            } finally {
                selfBtn.innerText = oldText; selfBtn.disabled = false;
            }
        };
        
        console.log("✅ 一键生成按钮已升级为强力版");
    }, 1000); // 延迟执行，确保按钮已生成

    // 3. ⚡️ 覆盖：单独生成详细设定 (autoGenDesc)
    window.autoGenDesc = async function() {
        var name = document.getElementById('cardName').value.trim();
        var tagStr = "无";
        if(window.currentSelectedTags) {
            tagStr = [...window.currentSelectedTags.identity, ...window.currentSelectedTags.personality, ...window.currentSelectedTags.trope].join('、');
        }

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) return;

        var btn = event.target;
        var oldText = btn.innerText;
        btn.innerText = '✍️...'; 

        var prompt = `角色：${name}。标签：${tagStr}。写一段详细设定(desc)。纯文本。`;

        try {
            var res = await fetchAI(prompt, config);
            // 纯文本生成不需要 JSON 解析，直接清理一下Markdown符号即可
            var cleanText = res.replace(/```/g, '').trim();
            
            document.getElementById('cardDesc').value = cleanText;
            if(window.auth && window.auth.toast) window.auth.toast('✅ 设定已生成！');
            
            // 缓存
            if (!window.lastGeneratedData) window.lastGeneratedData = {};
            window.lastGeneratedData.desc = cleanText;
            var refineBox = document.getElementById('refineArea_desc');
            if(refineBox) refineBox.style.display = 'block';

        } catch(e) {
            console.error(e);
            if(window.auth && window.auth.toast) window.auth.toast('❌ 网络错误');
        } finally {
            btn.innerText = oldText;
        }
    };

})();

/* ================= 🔗 V18.0 补丁：军师与二次编辑的视觉联动 ================= */
(function() {
    console.log("🚀 V18.0：激活二次编辑 UI 联动");

    // 1. 备份旧的 apply 函数
    var _oldApply = window.applyGodFixFromCache;

    // 2. 覆盖：应用修改时，强制唤醒对应的“让它改”面板
    window.applyGodFixFromCache = function(cacheId, targetId, btn) {
        // 先执行原有的数据同步逻辑
        if (_oldApply) _oldApply(cacheId, targetId, btn);

        // --- 🔥 V18.0 新增：界面唤醒逻辑 ---
        try {
            // 如果修改的是【详细设定】，唤醒 desc 的编辑框
            if (targetId === 'cardDesc') {
                var box = document.getElementById('refineArea_desc');
                if (box) {
                    box.style.display = 'block'; // 强制显示
                    // 顺便高亮一下输入框，提示用户这里可以改
                    var input = document.getElementById('refineInput_desc');
                    if (input) {
                        input.placeholder = "对刚才军师写的设定不满意？在这里微调...";
                        input.style.backgroundColor = "#fff0f5"; // 闪一下粉色
                        setTimeout(() => input.style.backgroundColor = "", 1000);
                    }
                }
            }
            
            // 如果修改的是【开场白】，唤醒 firstMes 的编辑框
            if (targetId === 'cardFirstMes') {
                var box = document.getElementById('refineArea_firstMes');
                if (box) {
                    box.style.display = 'block';
                    var input = document.getElementById('refineInput_firstMes');
                    if (input) input.placeholder = "开场白还要怎么改？";
                }
            }

            // 如果修改的是【对话样本】，唤醒 example 的编辑框 (如果有的话)
            if (targetId === 'cardMesExample') {
                // 有些版本可能没有这个框，检查一下
                var box = document.getElementById('refineArea_example'); 
                if (box) box.style.display = 'block';
            }

        } catch (e) {
            console.error("V18.0 UI 唤醒失败:", e);
        }
    };

    // 3. 🛡️ 兜底修复：确保 refineResult 函数对纯文本依然有效
    // (防止之前的补丁意外覆盖了纯文本的处理逻辑)
    var _oldRefine = window.refineResult;
    window.refineResult = async function(type) {
        // 如果是人设或开场白，走专门的纯文本通道
        if (type === 'desc' || type === 'firstMes') {
            var inputId = `refineInput_${type}`;
            var requirement = document.getElementById(inputId).value.trim();
            if (!requirement) { 
                if(window.auth && window.auth.toast) window.auth.toast('请告诉我怎么改...'); 
                return; 
            }

            // 1. 获取旧内容 (从缓存或直接从输入框抓)
            var prevContent = "";
            if (window.lastGeneratedData && window.lastGeneratedData[type]) {
                prevContent = window.lastGeneratedData[type];
            } else {
                // 如果缓存空了，现抓
                if (type === 'desc') prevContent = document.getElementById('cardDesc').value;
                if (type === 'firstMes') prevContent = document.getElementById('cardFirstMes').value;
            }

            var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
            if (!config || !config.apiKey) return;

            var btn = event.target;
            var oldText = btn.innerText;
            btn.innerText = '🧠...'; btn.disabled = true;

            var prompt = `
            原文本：
            ${prevContent}
            
            修改要求：【${requirement}】
            
            请重写。直接输出修改后的纯文本，不要 Markdown，不要废话。
            `;

            try {
                var res = await fetchAI(prompt, config);
                var cleanText = res.replace(/```/g, '').trim();

                // 2. 填回输入框
                if (type === 'desc') document.getElementById('cardDesc').value = cleanText;
                if (type === 'firstMes') document.getElementById('cardFirstMes').value = cleanText;

                // 3. 更新缓存 (关键！)
                if (!window.lastGeneratedData) window.lastGeneratedData = {};
                window.lastGeneratedData[type] = cleanText;

                // 4. 清空修改意见框
                document.getElementById(inputId).value = '';
                
                if(window.auth && window.auth.toast) window.auth.toast('✨ 修改已应用！');
                if(typeof updatePreviewUI === 'function') updatePreviewUI();

            } catch (e) {
                console.error(e);
                if(window.auth && window.auth.toast) window.auth.toast('❌ 网络卡顿，请重试');
            } finally {
                btn.innerText = oldText; btn.disabled = false;
            }
            return; // 结束，不走原来的逻辑
        }

        // 其他类型 (前端、世界书) 继续走旧逻辑
        if (_oldRefine) _oldRefine(type);
    };

})();

/* ================= 🧱 V19.0 强力胶水补丁：二次编辑框强制归位 ================= */
(function() {
    console.log("🚀 执行 V19.0：正在把二次编辑框焊死在输入框下面...");

    // 🛠️ 核心工兵：负责把编辑框抓回来
    function forceAttachRefineBox(inputId, boxId, type, placeholder) {
        var inputEl = document.getElementById(inputId);
        if (!inputEl) return; // 连输入框都没了，没法搞

        var boxEl = document.getElementById(boxId);

        // 1. 如果框不存在，当场造一个
        if (!boxEl) {
            console.log("🛠️ 补全丢失的编辑框:", boxId);
            boxEl = document.createElement('div');
            boxEl.id = boxId;
            // 样式设置：浅灰色背景，虚线边框
            boxEl.style.cssText = "display:block; margin-top:5px; margin-bottom:15px; background:#f0f0f0; padding:8px; border-radius:8px; border:1px dashed #ccc;";
            
            // 内部结构：输入框 + 按钮
            boxEl.innerHTML = `
    <div style="display:flex; gap:5px; align-items:center;">
        <span style="font-size:12px; color:#d46b08; flex-shrink: 0;">🔧 逻辑微调:</span>
        
        <input type="text" id="refineInput_stat" class="visual-input" placeholder="输入修改意见..." style="flex:1; min-width: 0; padding:5px;">
        
        <button onclick="window.refineResult('stat')" style="background:#f39c12; color:white; border:none; border-radius:5px; cursor:pointer; padding:4px 8px; font-size:12px; white-space: nowrap; flex-shrink: 0;">🔄 让它改</button>
    </div>
`;

        }

        // 2. 检查位置：如果它不在 input 的正下方，就挪过去
        // nextElementSibling 是下一个兄弟节点
        if (inputEl.nextElementSibling !== boxEl) {
            // insertBefore(要插入的, 参考节点) -> 参考节点是 input 的下一个兄弟，等于插在 input 后面
            if (inputEl.parentNode) {
                inputEl.parentNode.insertBefore(boxEl, inputEl.nextSibling);
            }
        }
        
        // 3. 强制显示：只要输入框里有字，这个框就必须显示出来
        if (inputEl.value && inputEl.value.trim() !== "") {
            boxEl.style.display = 'block';
        }
    }

    // 🛡️ 巡逻队：每隔 1 秒巡视一次 DOM，谁跑了就抓回来
    setInterval(function() {
        // 1. 锁定“详细设定”
        forceAttachRefineBox(
            'cardDesc',           // 目标输入框 ID
            'refineArea_desc',    // 编辑框 ID
            'desc',               // 修改类型
            '哪里不满意？(如: 再病娇一点)...' // 提示词
        );

        // 2. 锁定“开场白”
        forceAttachRefineBox(
            'cardFirstMes',       // 目标输入框 ID
            'refineArea_firstMes',// 编辑框 ID
            'firstMes',           // 修改类型
            '开场白怎么改？(如: 加上动作描写)...' // 提示词
        );

    }, 1000); // 1秒一次，永不停止

    // 立即执行一次，并弹窗提示
    setTimeout(function() {
        if(window.auth && window.auth.toast) window.auth.toast('🧱 编辑框已强制固定！');
    }, 500);

})();

/* ================= 🧠 V20.0 补丁：军师认知与导航强力矫正 ================= */
(function() {
    console.log("🚀 执行 V20.0：正在重写军师的分类逻辑...");

    // 1. 覆盖分析函数 (重写 Prompt，强制分类)
    window.analyzeCardNeeds = async function() {
        var name = document.getElementById('cardName').value;
        var desc = document.getElementById('cardDesc').value.trim();
        
        if (desc.length < 10) { 
            if(window.auth && window.auth.toast) window.auth.toast('📜 请先写点人设，军师才能分析哦'); 
            return; 
        }

        // 显示窗口
        var box = document.getElementById('aiAdvisorBox');
        if(box) box.style.display = 'flex';
        
        var chat = document.getElementById('advisorChat');
        chat.innerHTML = `<div class="ai-loading" style="color:#999;font-size:12px;text-align:center;padding:20px;">🧠 正在重新梳理思路...</div>`;

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) {
            chat.innerHTML = `<div class="advisor-bubble">❌ 请先配置 API Key。</div>`;
            return;
        }

        // 🔥 核心修正：死板的分类指令
        var prompt = `
        我是卡片作者。角色：${name}。
        设定：${desc.substring(0, 800)}...
        
        请作为“制作顾问”，提出 3 个修改建议。
        
        🔥 **必须严格遵守以下分类（Type）**：
        1. 【type: "desc"】
           - 凡是涉及：修改性格、外貌、身世、说话语气、开场白、对话样本。
           - 只要是纯文本设定，统统填 "desc"。
           
        2. 【type: "frontend"】
           - 凡是涉及：界面美化、CSS样式、HTML代码、状态栏显示、气泡颜色、特效。
           - 只要是好基友看的，统统填 "frontend"。

        3. 【type: "world"】
           - 凡是涉及：增加新物品、新地点、名词解释、世界背景设定。
           - 只要是补充设定的，统统填 "world"。

        4. 【type: "stat"】
           - 凡是涉及：好感度系统、数值计算、游戏规则、逻辑脚本。
           - 只要带数字变化的，统统填 "stat"。
        
        必须返回纯 JSON 数组：
        [
            {
                "type": "desc",  // 严格按上面选
                "title": "建议标题", 
                "reason": "理由", 
                "prompt": "具体的修改指令" 
            }
        ]
        `;

        try {
            var res = await fetchAI(prompt, config);
            var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
            var suggestions = JSON.parse(cleanJson);
            
            chat.innerHTML = ''; 
            suggestions.forEach(item => renderSuggestionBubble(item));
            
        } catch(e) { 
            console.error(e);
            chat.innerHTML = `<div class="advisor-bubble">❌ 军师脑子还在乱... (请重试)</div>`;
        }
    };

    // 2. 覆盖跳转函数 (死板的路由映射)
    window.jumpToCreator = function(btn, type, encodedPrompt) {
        console.log("👉 正在跳转，目标类型:", type);

        if (btn) { btn.innerHTML = "⏳ 跳转中..."; btn.style.opacity = "0.7"; }

        setTimeout(function() {
            try {
                var promptText = decodeURIComponent(encodedPrompt);
                var targetId = "";

                // --- 🚦 强制路由 ---
                
                // 情况 1: 人设/描述 -> 去预览页 (Preview)
                if (type === 'desc' || type === 'description') {
                    if(typeof switchCardTab === 'function') switchCardTab('preview');
                    
                    // 还要把修改框弹出来
                    var refineBox = document.getElementById('refineArea_desc');
                    if(refineBox) refineBox.style.display = 'block';
                    
                    targetId = 'refineInput_desc'; 
                }
                
                // 情况 2: 前端/特效 -> 去正则页 (Regex)
                else if (type === 'frontend' || type === 'regex' || type === 'ui') {
                    if(typeof switchCardTab === 'function') switchCardTab('regex');
                    
                    // 确保切到高级模式
                    var ui = document.getElementById('uiFrontendMode');
                    if(ui) ui.style.display = 'block';
                    
                    targetId = 'aiCodePrompt';
                }
                
                // 情况 3: 世界书/设定 -> 去世界书页 (World)
                else if (type === 'world' || type === 'lore') {
                    if(typeof switchCardTab === 'function') switchCardTab('world');
                    targetId = 'aiWorldPrompt';
                }
                
                // 情况 4: 属性/数值 -> 去属性页 (Stats)
                else if (type === 'stat' || type === 'stats' || type === 'logic') {
                    if(typeof switchCardTab === 'function') switchCardTab('stats');
                    targetId = 'aiStatPrompt';
                }
                
                // 兜底：如果 AI 瞎填了一个类型，默认去人设页
                else {
                    console.warn("未知类型:", type, "默认跳转预览页");
                    if(typeof switchCardTab === 'function') switchCardTab('preview');
                    targetId = 'refineInput_desc';
                }

                // --- 填入并定位 ---
                var targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.value = promptText;
                    targetEl.focus();
                    targetEl.scrollIntoView({behavior: "smooth", block: "center"});
                    
                    // 视觉提示
                    var oldBg = targetEl.style.backgroundColor;
                    targetEl.style.transition = "background 0.3s";
                    targetEl.style.backgroundColor = "#d4edda";
                    setTimeout(() => targetEl.style.backgroundColor = oldBg, 1000);

                    if(window.auth && window.auth.toast) window.auth.toast('✅ 已导航到位！请点击按钮执行');
                    
                    if (btn) {
                        btn.innerHTML = "✅ 已填入";
                        btn.disabled = true;
                        btn.style.background = "#d4edda";
                        btn.style.color = "#155724";
                    }
                } else {
                    alert("❌ 导航失败：找不到目标输入框 (" + targetId + ")");
                }

            } catch (e) {
                console.error(e);
                if (btn) { btn.innerHTML = "❌ 重试"; btn.disabled = false; }
            }
        }, 300);
    };

    console.log("✅ 军师逻辑已矫正：分类更准，跳转更稳");

})();

/* ================= 💾 V21.0 补丁：核弹级强制导出 (修复点击无反应) ================= */
(function() {
    console.log("🚀 执行 V21.0：接管导出功能，强制执行下载...");

    // 1. 定义一个“绝不报错”的导出函数
    window.forceExportTavernCard = function() {
        try {
            // 💡 视觉反馈：让按钮变色，证明你点到了
            var allButtons = document.querySelectorAll('button');
            var targetBtn = null;
            // 找那个写着“导出”的按钮
            allButtons.forEach(btn => {
                if (btn.innerText.includes("导出")) {
                    targetBtn = btn;
                    btn.innerHTML = "📦 打包中...";
                    btn.style.background = "#e67e22"; // 变橙色
                }
            });

            // --- A. 暴力抓取数据 (加了 || "" 防止 null 报错) ---
            var getVal = function(id) { 
                var el = document.getElementById(id); 
                return el ? el.value : ""; 
            };

            var name = getVal('cardName').trim() || "未命名角色";
            
            // --- B. 构建 V2 卡片结构 ---
            var cardData = {
                "spec": "chara_card_v2",
                "spec_version": "2.0",
                "data": {
                    "name": name,
                    "description": getVal('cardDesc'),
                    "first_mes": getVal('cardFirstMes'),
                    "mes_example": getVal('cardMesExample'),
                    "scenario": getVal('cardScenario'),
                    "creator_notes": getVal('cardNote') || getVal('statEditor'), // 兼顾两个ID
                    
                    "system_prompt": "",
                    "post_history_instructions": "",
                    "alternate_greetings": [],
                    "character_book": null,
                    "tags": [],
                    "creator": "Lili's Creator Workshop",
                    "character_version": "1.0",
                    "extensions": {}
                }
            };

            // --- C. 注入高级数据 (正则 & 世界书) ---
            
            // 1. 注入正则脚本
            if (window.currentCardRegexes && window.currentCardRegexes.length > 0) {
                cardData.data.extensions.regex_scripts = window.currentCardRegexes;
                console.log("✅ 已打包正则脚本:", window.currentCardRegexes.length);
            }

            // 2. 注入世界书
            if (window.currentWorldInfo && window.currentWorldInfo.entries && window.currentWorldInfo.entries.length > 0) {
                cardData.data.character_book = {
                    "name": "Embedded World",
                    "description": "Generated by Creator Workshop",
                    "scan_depth": 100,
                    "token_budget": 500,
                    "recursive_scanning": false,
                    "extensions": {},
                    "entries": window.currentWorldInfo.entries
                };
                console.log("✅ 已打包世界书条目:", window.currentWorldInfo.entries.length);
            }

            // --- D. 生成文件并下载 ---
            var jsonStr = JSON.stringify(cardData, null, 2);
            var blob = new Blob([jsonStr], {type: "application/json"});
            var url = URL.createObjectURL(blob);
            
            var a = document.createElement('a');
            a.href = url;
            a.download = name + ".json";
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                // 恢复按钮状态
                if (targetBtn) {
                    targetBtn.innerHTML = "💾 导出成功";
                    targetBtn.style.background = "#00b894"; // 变回绿色
                    setTimeout(() => targetBtn.innerHTML = "💾 导出卡片", 2000);
                }
                
                if(window.auth && window.auth.toast) window.auth.toast('💾 强力导出成功！');
            }, 100);

        } catch (e) {
            console.error("导出崩溃:", e);
            alert("❌ 导出时发生严重错误:\n" + e.message + "\n\n(虽然报错了，但请检查浏览器下载记录，可能已经强制下载了)");
        }
    };

    // 2. 🔥 暴力劫持按钮 (每秒检查一次，防止按钮被其他代码重置)
    // 只要看到按钮上有“导出”两个字，就把它的 onclick 换成我们的强力函数
    setInterval(function() {
        var buttons = document.querySelectorAll('button');
        buttons.forEach(function(btn) {
            // 只要文字包含"导出"，且点击事件不是我们的强力函数
            if (btn.innerText.includes("导出") && btn.onclick !== window.forceExportTavernCard) {
                // 移除旧的监听器 (防止冲突)
                var newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // 绑定新的强力函数
                newBtn.onclick = window.forceExportTavernCard;
                // console.log("✅ 已劫持导出按钮:", newBtn);
            }
        });
    }, 1000); // 每秒巡视一次

})();

/* ================= 🚑 V23.0 补丁：修复军师“去添加”按钮失效 ================= */
(function() {
    console.log("🚀 执行 V23.0：重写跳转导航逻辑...");

    // 覆盖旧的跳转函数
    window.jumpToCreator = function(btn, type, encodedPrompt) {
        // 1. 按钮点击反馈 (变色，证明点到了)
        if (btn) {
            btn.innerHTML = "⏳ 正在跳转...";
            btn.style.opacity = "0.7";
            btn.disabled = true; // 防止连点
        }

        setTimeout(function() {
            try {
                // 2. 解码建议内容
                var promptText = decodeURIComponent(encodedPrompt);
                var targetTabId = "";
                var targetInputId = "";
                var extraShowId = ""; // 需要额外强制显示的容器

                // --- 🗺️ 重新绘制地图 (适配最新修改的ID) ---
                
                if (type === 'world') {
                    // 世界书
                    targetTabId = 'tab-world';
                    targetInputId = 'aiWorldPrompt';
                } 
                else if (type === 'frontend') {
                    // 前端特效
                    targetTabId = 'tab-regex';
                    targetInputId = 'aiCodePrompt';
                    extraShowId = 'uiFrontendMode'; // 强制显示AI面板
                } 
                else if (type === 'stat') {
                    // 属性/逻辑
                    targetTabId = 'tab-stats';
                    targetInputId = 'aiStatPrompt';
                }
                else if (type === 'desc') {
                    // 详细设定 (修改建议)
                    targetTabId = 'tab-preview';
                    targetInputId = 'refineInput_desc';
                    extraShowId = 'refineArea_desc'; // 强制显示修改框
                }

                // --- 🚜 推土机式导航 ---

                // A. 确保写卡器弹窗是开着的
                var modal = document.getElementById('cardCreatorModal');
                if (modal) {
                    modal.classList.add('active');
                    modal.style.display = 'flex'; 
                }

                // B. 强制切换 Tab (不依赖 switchCardTab，直接操作 DOM)
                var allTabs = document.querySelectorAll('.card-tab-content');
                allTabs.forEach(function(el) { el.style.display = 'none'; }); // 关掉所有
                
                var targetTab = document.getElementById(targetTabId);
                if (targetTab) {
                    targetTab.style.display = 'block'; // 打开目标
                } else {
                    throw new Error("找不到目标页面: " + targetTabId);
                }

                // C. 激活顶部按钮高亮 (视觉同步)
                var tabBtns = document.querySelectorAll('.card-tab');
                tabBtns.forEach(function(b) { b.classList.remove('active'); });
                // 模糊匹配按钮文字
                var activeBtn = Array.from(tabBtns).find(b => b.onclick && b.onclick.toString().includes(targetTabId.replace('tab-', '')));
                if (activeBtn) activeBtn.classList.add('active');

                // D. 处理额外显示的容器 (比如前端面板、修改框)
                if (extraShowId) {
                    var extraEl = document.getElementById(extraShowId);
                    if (extraEl) {
                        extraEl.style.display = 'block';
                        // 如果是前端页，还要把 simple 模式关掉
                        if(type === 'frontend') {
                            var simpleEl = document.getElementById('uiSimpleMode');
                            if(simpleEl) simpleEl.style.display = 'none';
                        }
                    }
                }

                // --- 🎯 填入内容并聚焦 ---
                var inputEl = document.getElementById(targetInputId);
                if (inputEl) {
                    inputEl.value = promptText;
                    inputEl.focus();
                    
                    // 滚动到屏幕中间
                    inputEl.scrollIntoView({behavior: "smooth", block: "center"});
                    
                    // 闪烁一下提示用户
                    var oldBg = inputEl.style.backgroundColor;
                    inputEl.style.transition = "background 0.3s";
                    inputEl.style.backgroundColor = "#d4edda"; // 浅绿色高亮
                    setTimeout(function() { inputEl.style.backgroundColor = oldBg; }, 1000);

                    // 成功提示
                    if(window.auth && window.auth.toast) window.auth.toast('✅ 建议已填入，请点击生成/修改');
                    
                    // 恢复按钮状态
                    if (btn) {
                        btn.innerHTML = "✅ 已填入";
                        btn.style.background = "#d4edda";
                        btn.style.color = "#155724";
                    }
                } else {
                    throw new Error("找不到输入框: " + targetInputId);
                }

            } catch (e) {
                console.error("跳转失败:", e);
                alert("❌ 跳转出错：" + e.message);
                // 恢复按钮
                if (btn) {
                    btn.innerHTML = "❌ 重试";
                    btn.disabled = false;
                    btn.style.opacity = "1";
                }
            }
        }, 100);
    };

    console.log("✅ V23.0：跳转导航系统已重置");
})();

/* ================= 🧱 V24.0 补丁：属性页二次编辑框强制归位 ================= */
(function() {
    console.log("🚀 执行 V24.0：把属性页的修改框拽到底下来...");

    // 🛠️ 核心工兵：负责搬运或重建
    function relocateStatRefineBox() {
        // 1. 找到大输入框 (Stat Editor)
        var inputEl = document.getElementById('statEditor');
        
        // 2. 找到（或新建）修改框
        var boxEl = document.getElementById('refineArea_stat');

        if (!inputEl) return;

        // 如果框不存在，当场造一个
        if (!boxEl) {
            console.log("🛠️ 新建属性页修改框...");
            boxEl = document.createElement('div');
            boxEl.id = 'refineArea_stat';
            boxEl.style.cssText = "display:block; margin-top:5px; margin-bottom:15px; background:#fff7e6; padding:8px; border-radius:8px; border:1px dashed #f39c12;";
            
            boxEl.innerHTML = `
    <div style="display:flex; gap:5px; align-items:center;">
        <span style="font-size:12px; color:#d46b08; flex-shrink: 0;">🔧 逻辑微调:</span>
        
        <input type="text" id="refineInput_stat" class="visual-input" placeholder="输入修改意见..." style="flex:1; min-width: 0; padding:5px;">
        
        <button onclick="window.refineResult('stat')" style="background:#f39c12; color:white; border:none; border-radius:5px; cursor:pointer; padding:4px 8px; font-size:12px; white-space: nowrap; flex-shrink: 0;">🔄 让它改</button>
    </div>
`;


        } else {
            // 如果存在，把样式也统一一下，显得整齐
            boxEl.style.cssText = "display:block; margin-top:5px; margin-bottom:15px; background:#fff7e6; padding:8px; border-radius:8px; border:1px dashed #f39c12;";
        }

        // 3. 🔥 强制搬运：插到 inputEl 的屁股后面
        if (inputEl.nextElementSibling !== boxEl) {
            if (inputEl.parentNode) {
                // 如果后面已经有个“说明书(绿色框)”，插在说明书后面，或者插在输入框后面
                var guideBox = document.getElementById('statGuideBox');
                if (guideBox && guideBox.parentNode === inputEl.parentNode) {
                    inputEl.parentNode.insertBefore(boxEl, guideBox.nextSibling);
                } else {
                    inputEl.parentNode.insertBefore(boxEl, inputEl.nextSibling);
                }
            }
        }
        
        // 4. 强制显示 (只要有框就显示，方便随时改)
        boxEl.style.display = 'block';
    }

    // 立即执行一次
    setTimeout(relocateStatRefineBox, 800);
    
    // 为了保险，每隔 2秒 检查一次位置 (防止被其他刷新逻辑覆盖)
    setInterval(relocateStatRefineBox, 2000);

    console.log("✅ 属性页编辑框已归位");

})();

/* ================= 🚀 V25.0 补丁：军师多模式 & 多人世界观构建系统 ================= */
(function() {
    console.log("🚀 执行 V25.0：军师进化 | 多人模式 | 规范导入 | 自动世界书");

    // ================= 1. 详细设定 -> 自动关联世界书 (Requirement 1) =================
    
    // 备份之前的生成函数
    var _oldAutoGenDesc = window.autoGenDesc;

    window.autoGenDesc = async function() {
        // 先执行原有的生成逻辑 (V17.0/V18.0 的逻辑)
        await _oldAutoGenDesc();

        // 设定一个定时器检测是否生成完成 (通过检测编辑框是否显示)
        // 因为 _oldAutoGenDesc 内部也是异步的，且失败不报错，所以我们监听结果
        var checkInterval = setInterval(function() {
            var refineBox = document.getElementById('refineArea_desc');
            var descVal = document.getElementById('cardDesc').value;
            
            // 如果修改框出来了，且内容不为空，说明生成成功了
            if (refineBox && refineBox.style.display === 'block' && descVal.length > 10) {
                clearInterval(checkInterval);
                
                // 🔥 核心逻辑：询问是否生成人设世界书
                setTimeout(function() {
                    if(confirm("✅ 详细设定已生成！\n\n是否立即基于此设定，生成专属的【人设世界书】(World Info)？\n(这将把角色的特征存入世界书，防止AI遗忘)")) {
                        // 1. 跳转
                        if(typeof switchCardTab === 'function') switchCardTab('world');
                        
                        // 2. 填入指令
                        var prompt = `基于详细设定生成【人物专属词条】。
                        包含：外貌关键词、性格关键词、重要身世。
                        触发词(keys)设为角色的名字。`;
                        document.getElementById('aiWorldPrompt').value = prompt;
                        
                        // 3. 执行生成
                        if(typeof generateWorldEntry === 'function') generateWorldEntry();
                    }
                }, 500);
            }
        }, 1000);
        
        // 10秒后停止检测，防止死循环
        setTimeout(() => clearInterval(checkInterval), 10000);
    };


 


    // ================= 3. 添加大类标签 (Requirement 3) =================

    // A. 插入“添加分类”按钮
    function injectCategoryBtn() {
        var box = document.querySelector('.wizard-box');
        if (box && !document.getElementById('btnAddCategory')) {
            var btn = document.createElement('div');
            btn.id = 'btnAddCategory';
            btn.innerHTML = "➕ 添加新分类 (如: 缺点/雷点)";
            btn.style.cssText = "text-align:center; padding:10px; border:2px dashed #ddd; border-radius:10px; color:#aaa; cursor:pointer; margin-top:10px; font-size:12px; font-weight:bold;";
            
            btn.onclick = function() {
                var catName = prompt("请输入新分类的名称 (如: 缺点):");
                if (catName) {
                    // 英文 Key (随机生成防止冲突)
                    var key = 'custom_' + Date.now();
                    // 写入数据源
                    if(!window.wizardData) window.wizardData = {};
                    window.wizardData[key] = { title: `${Object.keys(window.wizardData).length + 1}. ${catName}`, tags: [] };
                    // 保存并刷新
                    localStorage.setItem('my_wizard_data_v2', JSON.stringify(window.wizardData));
                    if(typeof renderWizardTags === 'function') renderWizardTags();
                    
                    // 初始化选中状态
                    if(!window.currentSelectedTags) window.currentSelectedTags = {};
                    window.currentSelectedTags[key] = [];
                }
            };
            
            // 插在那个“一键生成”按钮之前
            var genBtn = document.getElementById('btnOneClickGen');
            if (genBtn) box.insertBefore(btn, genBtn);
            else box.appendChild(btn);
        }
    }
    // 重新渲染时会覆盖，所以要在 renderWizardTags 里调用
    var _oldRenderTags = window.renderWizardTags;
    window.renderWizardTags = function() {
        // 渲染原有的组
        Object.keys(window.wizardData).forEach(key => {
            // 如果这个组还没有容器，创建一个
            var containerId = 'tagGroup' + key.charAt(0).toUpperCase() + key.slice(1);
            if (!document.getElementById(containerId)) {
                var box = document.querySelector('.wizard-box');
                var genBtn = document.getElementById('btnOneClickGen') || document.getElementById('btnAddCategory'); // 插在按钮前
                
                var title = document.createElement('div');
                title.id = 'title_' + key;
                title.className = 'tag-group-title';
                title.onclick = function() { editWizardTitle(key); };
                
                var wrapper = document.createElement('div'); // 按钮容器
                wrapper.style.textAlign = 'right'; wrapper.style.marginBottom = '5px';
                wrapper.innerHTML = `<span class="add-tag-btn" onclick="addCustomWizardTag('${key}')">+加标签</span>`;

                var content = document.createElement('div');
                content.id = containerId;
                content.className = 'tag-select-container';

                if(genBtn) {
                    box.insertBefore(title, genBtn);
                    box.insertBefore(wrapper, genBtn);
                    box.insertBefore(content, genBtn);
                } else {
                    box.appendChild(title); box.appendChild(wrapper); box.appendChild(content);
                }
            }
            // 渲染
            renderSingleGroup(key);
        });
        
        injectCategoryBtn(); // 确保按钮在最后
    };


    // ================= 4 & 5. 军师模式菜单 & 多人/世界观模式 (Requirement 4 & 5) =================

    // 状态管理
    window.advisorState = { mode: 'menu', multiChars: [] }; // menu, normal, expert, multi, world

    // 覆盖分析入口 (点击军师时)
    window.analyzeCardNeeds = function() {
        showAdvisorMenu();
    };

    // 显示菜单
    function showAdvisorMenu() {
        var box = document.getElementById('aiAdvisorBox');
        if(box) box.style.display = 'flex';
        var chat = document.getElementById('advisorChat');
        
        // 菜单 HTML
        var menuHtml = `
            <div class="advisor-bubble" style="background:#f3f0ff;">
                <b>🧠 军师已就位，请选择模式：</b>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-top:10px;">
                    <button class="advisor-tool-btn" onclick="setAdvisorMode('normal')">🟢 1. 普通模式</button>
                    <button class="advisor-tool-btn" onclick="setAdvisorMode('pro')">🔴 2. 专家模式</button>
                    <button class="advisor-tool-btn" onclick="initMultiCharUI()">👥 3. 多人模式</button>
                    <button class="advisor-tool-btn" onclick="initWorldViewMode()">🌏 4. 世界观模式</button>
                </div>
            </div>
        `;
        chat.innerHTML = menuHtml;
        window.advisorState.mode = 'menu';
    }

    // 设置模式
    window.setAdvisorMode = function(mode) {
        window.advisorState.mode = mode;
        window.advisorMode = mode; // 兼容旧逻辑
        
        var chat = document.getElementById('advisorChat');
        var input = document.getElementById('advisorInput');
        
        if (mode === 'normal') {
            chat.innerHTML += `<div class="advisor-bubble">🟢 已进入普通模式。请告诉我您的需求。</div>`;
            input.placeholder = "🟢 和军师聊聊人设...";
        } else if (mode === 'pro') {
            chat.innerHTML += `<div class="advisor-bubble">🔴 已进入专家模式。全权限指令就绪。</div>`;
            input.placeholder = "🔴 输入修改指令...";
        }
    };

    // --- 多人模式逻辑 ---
    window.initMultiCharUI = function() {
        // 可以在这里弹窗让用户填，或者直接在聊天框显示
        var count = prompt("请输入人数 (例如: 3):");
        if (!count) return;
        
        var namesStr = prompt("请输入所有人的名字 (用逗号分隔，如: 张三, 李四):");
        if (!namesStr) return;
        
        var names = namesStr.split(/[,，]/).map(n => n.trim()).filter(n => n);
        
        window.advisorState.mode = 'multi';
        window.advisorState.multiChars = names;
        
        renderMultiCharMenu();
    };

    function renderMultiCharMenu() {
        var chat = document.getElementById('advisorChat');
        var btns = window.advisorState.multiChars.map(name => {
            return `<button class="advisor-action-btn" onclick="generateCharSettings('${name}')">👤 生成【${name}】的设定</button>`;
        }).join('');
        
        chat.innerHTML = `
            <div class="advisor-bubble" style="background:#e3f2fd;">
                <b>👥 多人模式已开启</b><br>
                当前队列：${window.advisorState.multiChars.join(', ')}<br>
                请点击下方按钮，逐个生成：
                ${btns}
                <br>
                <small style="color:#666">提示：生成完记得点确定(保存)，然后再点下一个。</small>
            </div>
        `;
    }

    window.generateCharSettings = async function(name) {
        // 1. 填入名字
        document.getElementById('cardName').value = name;
        
        // 2. 清空旧设定
        document.getElementById('cardDesc').value = '';
        
        // 3. 询问标签
        // 这里简化处理：让军师根据名字自动猜标签，或者弹窗问
        // 为了流畅体验，我们直接调用生成，Prompt里让AI自由发挥
        
        var chat = document.getElementById('advisorChat');
        chat.innerHTML += `<div class="ai-loading">🧠 正在构思【${name}】的人设...</div>`;
        
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        var prompt = `我是创造者。请为多人剧本中的角色【${name}】写一段详细设定(500字)。纯文本。`;
        
        try {
            var res = await fetchAI(prompt, config);
            var cleanText = res.replace(/```/g, '').trim();
            
            document.getElementById('cardDesc').value = cleanText;
            
            // 4. 显示确认按钮
            chat.innerHTML += `
                <div class="advisor-bubble">
                    ✅ 【${name}】设定已生成！请检查左侧。<br>
                    <button class="advisor-action-btn" onclick="confirmCharAndGenLore('${name}')">
                        💾 确定 (并生成专属世界书)
                    </button>
                </div>
            `;
            
            // 切换到预览页看效果
            if(typeof switchCardTab === 'function') switchCardTab('preview');
            
        } catch(e) {
            alert("生成失败");
        }
    };

    window.confirmCharAndGenLore = async function(name) {
        // 1. 自动生成世界书
        if(typeof switchCardTab === 'function') switchCardTab('world');
        document.getElementById('aiWorldPrompt').value = `为角色【${name}】生成专属World Info设定，内容基于当前的详细设定。`;
        await generateWorldEntry();
        
        // 2. 提示下一步
        var chat = document.getElementById('advisorChat');
        chat.innerHTML += `<div class="advisor-bubble">🎉 【${name}】处理完毕！请继续点击上面菜单选择下一个人。</div>`;
    };


    // --- 世界观模式逻辑 ---
    window.initWorldViewMode = function() {
        window.advisorState.mode = 'world_view';
        var chat = document.getElementById('advisorChat');
        chat.innerHTML = `
            <div class="advisor-bubble" style="background:#e8f5e9;">
                <b>🌏 世界观构建模式</b><br>
                请在下方输入框告诉我，你想要什么样的世界观？<br>
                (例如：赛博朋克+修仙，或者是克苏鲁风格的校园)
            </div>
        `;
    };

    // 拦截发送消息，处理世界观请求
    var _oldSend = window.sendAdvisorMsg;
    window.sendAdvisorMsg = async function() {
        // 如果是世界观模式
        if (window.advisorState.mode === 'world_view') {
            var input = document.getElementById('advisorInput');
            var text = input.value.trim();
            if(!text) return;
            
            // 用户上屏
            var chat = document.getElementById('advisorChat');
            chat.innerHTML += `<div style="text-align:right; margin:5px; padding:5px; background:#eee; border-radius:5px; display:inline-block; margin-left:auto;">${text}</div><div style="clear:both"></div>`;
            input.value = '';
            
            chat.insertAdjacentHTML('beforeend', `<div class="ai-loading">🧠 正在构筑宏大世界... (生成3个方案)</div>`);
            
            var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
            
            // Prompt: 生成3个方案，返回JSON
            var prompt = `
            用户想要的世界观：${text}。
            请提供 3 个不少于 100 字的具体世界观建议（方案）。
            
            返回纯 JSON 数组：
            [
                { "title": "方案一标题", "content": "100字以上的详细描述..." },
                { "title": "方案二标题", "content": "..." },
                { "title": "方案三标题", "content": "..." }
            ]
            `;
            
            try {
                var res = await fetchAI(prompt, config);
                var data = JSON.parse(res.replace(/```json/g, '').replace(/```/g, '').trim());
                
                chat.innerHTML = ''; // 清屏
                
                data.forEach(item => {
                    // 安全转义内容
                    var safeContent = encodeURIComponent(item.content);
                    
                    chat.innerHTML += `
                        <div class="advisor-bubble">
                            <b style="color:#d35400">🌏 ${item.title}</b>
                            <div style="font-size:12px; margin:5px 0; max-height:100px; overflow-y:auto;">${item.content}</div>
                            <button class="advisor-action-btn" onclick="applyWorldView('${safeContent}')">
                                👉 采用此方案 (生成世界书)
                            </button>
                        </div>
                    `;
                });
                
            } catch(e) {
                chat.innerHTML += `<div class="advisor-bubble">❌ 生成失败: ${e.message}</div>`;
            }
            return; // 拦截结束
        }
        
        // 否则走普通/专家/多人模式逻辑
        // 注意：多人模式也在 Menu 里，不需要拦截 sendMsg，因为它是点按钮触发的
        _oldSend();
    };

    window.applyWorldView = function(encodedContent) {
        var content = decodeURIComponent(encodedContent);
        
        // 跳转到世界书页
        if(typeof switchCardTab === 'function') switchCardTab('world');
        
        // 填入
        document.getElementById('aiWorldPrompt').value = `创建一个核心世界观条目，内容如下：${content}`;
        
        // 自动生成
        if(typeof generateWorldEntry === 'function') generateWorldEntry();
        
        auth.toast('🌏 世界观已开始构筑...');
    };

})();

/* ================= ✅ V25.2 补丁：设定确认按钮 & 流程优化 ================= */
(function() {
    console.log("🚀 执行 V25.2：添加【确定设定】按钮，移除自动弹窗...");

    // ================= 1. 定义核心逻辑：点击确定后做什么 =================
    window.confirmDescAndGenLore = function() {
        var desc = document.getElementById('cardDesc').value.trim();
        var name = document.getElementById('cardName').value.trim();

        // 1. 校验
        if (desc.length < 10) {
            alert("⚠️ 详细设定太短了，请先生成或手写一点内容吧！");
            return;
        }

        // 2. 视觉反馈 (闪烁一下表示确认)
        var descBox = document.getElementById('cardDesc');
        var oldBg = descBox.style.backgroundColor;
        descBox.style.transition = "background 0.3s";
        descBox.style.backgroundColor = "#d4edda"; // 变绿
        setTimeout(() => descBox.style.backgroundColor = oldBg, 500);

        // 3. 询问流程
        if (confirm(`✅ 设定已确认！\n\n是否立即基于【${name}】的这段设定，生成专属的【人设世界书】(World Info)？\n\n(这将把外貌、性格存入世界书，防止AI遗忘)`)) {
            
            // A. 跳转到世界书页
            if(typeof switchCardTab === 'function') switchCardTab('world');
            
            // B. 自动填入精准指令
            // 既然已经确认了设定，我们就把这段设定作为“绝对真理”喂给 AI
            var prompt = `
请基于以下【经过确认的详细设定】，生成一个【人物专属 World Info 条目】。

【角色名】：${name}
【详细设定】：${desc.substring(0, 800)}...

要求：
1. Comment (备注) 填 "${name} - 核心设定"。
2. Keys (触发词) 填 "${name}, 你, 我, ${name}的名字"。
3. Content (内容) 请提炼设定中的【外貌特征】、【性格关键词】、【重要身世】，合并成一段精简的描述。
`;
            document.getElementById('aiWorldPrompt').value = prompt;
            
            // C. 滚动到生成区
            document.getElementById('aiWorldPrompt').scrollIntoView({behavior: "smooth", block: "center"});

            // D. 自动执行生成
            if(typeof generateWorldEntry === 'function') {
                // 稍微延迟一下，让用户看到跳转过程
                if(window.auth && window.auth.toast) window.auth.toast('🚀 正在跳转并生成...');
                setTimeout(generateWorldEntry, 800);
            }
        }
    };

    // ================= 2. UI 注入：添加按钮 =================
    function injectConfirmBtn() {
        var descBox = document.getElementById('cardDesc');
        if (!descBox) return;

        // 防止重复添加
        if (document.getElementById('btnConfirmDesc')) return;

        // 创建按钮容器 (放在 textarea 下面)
        var btnContainer = document.createElement('div');
        btnContainer.style.marginTop = "5px";
        btnContainer.style.marginBottom = "15px";
        btnContainer.style.textAlign = "right"; // 靠右放

        // 创建按钮
        var btn = document.createElement('button');
        btn.id = 'btnConfirmDesc';
        btn.className = 'small-btn'; 
        btn.innerHTML = "✅ 确定设定 (并生成世界书)";
        // 样式：绿色醒目
        btn.style.cssText = "background:linear-gradient(135deg, #00b894, #00cec9); color:white; border:none; padding:8px 20px; border-radius:20px; font-weight:bold; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.1);";
        
        btn.onclick = window.confirmDescAndGenLore;

        btnContainer.appendChild(btn);

        // 插入到 textarea 后面
        // 如果 textarea 后面有二次编辑框 (refineArea)，插在编辑框后面更合理
        var refineBox = document.getElementById('refineArea_desc');
        if (refineBox) {
            refineBox.parentNode.insertBefore(btnContainer, refineBox.nextSibling);
        } else {
            descBox.parentNode.insertBefore(btnContainer, descBox.nextSibling);
        }
    }

    // 立即执行注入，并启动定时器防止被页面重绘覆盖
    injectConfirmBtn();
    setInterval(injectConfirmBtn, 2000);


    // ================= 3. 逻辑覆盖：移除 V25.0 的自动弹窗 =================
    // 我们重写 autoGenDesc，去掉最后的 confirm 逻辑，只保留生成逻辑
    
    window.autoGenDesc = async function() {
        var name = document.getElementById('cardName').value.trim();
        if (!name) { 
            if(window.auth && window.auth.toast) window.auth.toast('先给角色起个名字吧！'); 
            return; 
        }
        
        // 获取标签
        var tagStr = "无";
        if(window.currentSelectedTags) {
            var allTags = [
                ...window.currentSelectedTags.identity, 
                ...window.currentSelectedTags.personality, 
                ...window.currentSelectedTags.trope
            ];
            tagStr = allTags.join('、');
        }

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) { 
            if(window.auth && window.auth.toast) window.auth.toast('⚠️ 未填API Key');
            // 没key也显示编辑框，方便手动写
            var refineBox = document.getElementById('refineArea_desc');
            if(refineBox) refineBox.style.display = 'block';
            return; 
        }

        var btn = event.target;
        var oldText = btn.innerText;
        btn.innerText = '✍️ 正在写...'; btn.style.pointerEvents = 'none';

        var prompt = `我是创造者。请为角色【${name}】写一段“详细设定”。
        【强制要求】：必须基于这些属性生成：${tagStr}。
        包含外貌、性格、身世。300字左右。直接输出纯文本。`;

        try {
            var res = await fetchAI(prompt, config);
            var cleanText = res.replace(/```/g, '').trim();
            
            // 填入
            document.getElementById('cardDesc').value = cleanText;
            
            // 存入缓存
            if (!window.lastGeneratedData) window.lastGeneratedData = {};
            window.lastGeneratedData.desc = cleanText;
            
            // 显示二次编辑框
            var refineBox = document.getElementById('refineArea_desc');
            if(refineBox) refineBox.style.display = 'block';

            if(typeof updateJsonSource === 'function') updateJsonSource();
            
            // 🔥 核心修改：这里不再弹窗，而是提示用户去点确定
            if(window.auth && window.auth.toast) window.auth.toast('✅ 设定生成完毕！请检查内容，满意后点击【确定设定】');
            
            // 高亮确定按钮，引导用户
            var confirmBtn = document.getElementById('btnConfirmDesc');
            if(confirmBtn) {
                confirmBtn.innerHTML = "✨ 请点击此处确认";
                confirmBtn.style.transform = "scale(1.1)";
                setTimeout(() => {
                    confirmBtn.innerHTML = "✅ 确定设定 (并生成世界书)";
                    confirmBtn.style.transform = "scale(1)";
                }, 2000);
            }

        } catch (e) {
            console.error(e);
            if(window.auth && window.auth.toast) window.auth.toast('❌ 生成出错，请重试');
        } finally {
            btn.innerText = oldText; btn.style.pointerEvents = 'auto';
        }
    };

})();

/* ================= 🔓 V26.0 补丁：无门槛召唤军师 ================= */
(function() {
    console.log("🚀 执行 V26.0：已移除军师打开限制，允许空卡操作...");

    // 1. 覆盖：强制打开军师窗口 (无视字数，无视内容)
    window.forceOpenAdvisor = function() {
        var box = document.getElementById('aiAdvisorBox');
        if (!box) {
            alert("❌ 错误：找不到军师窗口 (id='aiAdvisorBox')");
            return;
        }

        // 强制显示
        box.style.display = 'flex';
        
        // 如果加载了 V25.0 的菜单功能，直接显示菜单
        if (typeof showAdvisorMenu === 'function') {
            showAdvisorMenu();
        } else {
            // 保底逻辑
            var chat = document.getElementById('advisorChat');
            chat.innerHTML = `<div class="advisor-bubble">🧠 军师已就位。请问主公有何吩咐？</div>`;
        }
        
        // 视觉反馈
        if(window.auth && window.auth.toast) window.auth.toast('🧠 军师已就位 (无门槛模式)');
    };

    // 2. 覆盖：旧的分析入口 (防止旧代码阻拦)
    window.analyzeCardNeeds = function() {
        // 直接转接到强制打开函数
        window.forceOpenAdvisor();
    };

    // 3. 覆盖：自动检测入口
    window.checkAndOpenAdvisor = function(isForce) {
        // 如果是强制 (isForce)，或者窗口已经是开着的，就刷新一下
        // 如果是自动检测 (比如刚生成完设定)，我们不再强制弹窗，以免打扰你手动操作
        // 这里主要服务于“一键生成”后的逻辑
        var box = document.getElementById('aiAdvisorBox');
        if (isForce && box) {
            box.style.display = 'flex';
        }
    };

    // 4. 确保按钮绑定了新的无门槛函数
    // 每秒检查一次，防止被其他补丁覆盖回去
    setInterval(function() {
        var btn = document.querySelector('button[onclick*="forceOpenAdvisor"]'); 
        // 也就是那个“🧠 召唤军师”按钮
        if (btn && btn.onclick !== window.forceOpenAdvisor) {
            btn.onclick = window.forceOpenAdvisor;
        }
    }, 1000);

    console.log("✅ 限制已解除：现在可以先开军师，再写人设了");

})();

/* ================= 📐 V28.0 补丁：按钮归位修正 (修复标签错位) ================= */
(function() {
    console.log("🚀 执行 V28.0：正在将按钮融合进标题栏...");

    // 1. 核心逻辑 (保持不变)
    window.confirmDescAndGenLore = function(e) {
        // 防止点击穿透触发其他标签点击事件
        if(e) e.stopPropagation(); 

        var desc = document.getElementById('cardDesc').value.trim();
        var name = document.getElementById('cardName').value.trim();

        if (desc.length < 10) {
            alert("⚠️ 详细设定太短了，请先生成或手写一点内容吧！");
            return;
        }

        // 视觉反馈
        var descBox = document.getElementById('cardDesc');
        var oldBg = descBox.style.backgroundColor;
        descBox.style.transition = "background 0.3s";
        descBox.style.backgroundColor = "#d4edda"; 
        setTimeout(() => descBox.style.backgroundColor = oldBg, 500);

        if (confirm(`✅ 设定已确认！\n\n是否立即基于【${name}】的这段设定，生成专属的【人设世界书】(World Info)？`)) {
            if(typeof switchCardTab === 'function') switchCardTab('world');
            var prompt = `请基于以下【经过确认的详细设定】，生成一个【人物专属 World Info 条目】。\n【角色名】：${name}\n【详细设定】：${desc.substring(0, 800)}...\n要求：\n1. Comment 填 "${name} - 核心设定"。\n2. Keys 填 "${name}, 你, 我"。\n3. Content 提炼外貌、性格、身世。`;
            var promptEl = document.getElementById('aiWorldPrompt');
            if(promptEl) { promptEl.value = prompt; promptEl.scrollIntoView({behavior: "smooth", block: "center"}); }
            if(typeof generateWorldEntry === 'function') {
                if(window.auth && window.auth.toast) window.auth.toast('🚀 正在跳转并生成...');
                setTimeout(generateWorldEntry, 800);
            }
        }
    };

    // 2. UI 注入：融合进 Label
    function fixButtonPosition() {
        var descBox = document.getElementById('cardDesc');
        if (!descBox) return;

        // A. 找到 Label (通常是输入框的前一个元素)
        var label = descBox.previousElementSibling;
        
        // 如果前一个不是 label (可能被之前的补丁插了别的东西)，尝试往上找找
        if (!label || label.tagName !== 'LABEL') {
            // 如果父级是 field-group，那 label 应该是父级的第一个子元素
            if (descBox.parentNode.className.includes('field-group') || descBox.parentNode.className.includes('wrapper')) {
                label = descBox.parentNode.querySelector('label');
            }
        }

        if (!label) return; // 找不到标签就算了，防止报错

        // B. 清理旧按钮 (不论在哪里)
        var oldBtn = document.getElementById('btnConfirmDesc');
        if (oldBtn) oldBtn.remove();
        // 清理旧的容器 (V27产生的 flex 容器)
        var prev = descBox.previousElementSibling;
        if (prev && prev.tagName === 'DIV' && prev.style.display === 'flex' && !prev.classList.contains('field-group-fixed')) {
            prev.remove();
        }

        // C. 创建新按钮
        var btn = document.createElement('span'); // 用 span 防止换行
        btn.id = 'btnConfirmDesc';
        btn.innerHTML = "✅ 确定设定 (并生成世界书)";
        btn.style.cssText = "float: right; font-size: 11px; background: #00b894; color: white; padding: 2px 10px; border-radius: 10px; cursor: pointer; font-weight: bold; margin-left: 10px; transform: translateY(-2px);";
        btn.onclick = window.confirmDescAndGenLore;

        // D. 插入到 Label 内部
        // 确保 Label 是块级或 flex，能容纳浮动或右对齐
        label.style.display = "block"; 
        label.style.width = "100%";
        
        // 重置一下 Label 文字，防止重复添加
        // 这里假设原来的文字是 "📝 详细设定 (Description)"
        // 我们只保留文本节点，去掉旧的子元素
        var textOnly = label.innerText.replace("✅ 确定设定 (并生成世界书)", "").trim();
        label.innerHTML = textOnly; 
        
        // 插入按钮
        label.appendChild(btn);
    }

    // 立即执行 & 循环检查 (防止被重绘覆盖)
    fixButtonPosition();
    setInterval(fixButtonPosition, 2000);

})();

/* ================= 🔧 V29.0 补丁：修复“添加分类无效”问题 ================= */
(function() {
    console.log("🚀 执行 V29.0：正在重构分类渲染引擎...");

    // 1. 确保数据源存在
    if (!window.wizardData) {
        window.wizardData = JSON.parse(localStorage.getItem('my_wizard_data_v2')) || {
            identity: { title: "1. 身份/种族", tags: ["皇子", "摄政王", "魔尊", "师尊"] },
            personality: { title: "2. 性格特点", tags: ["疯批", "清冷", "腹黑", "傲娇"] },
            trope: { title: "3. 萌点/外貌", tags: ["白毛", "眼镜", "西装", "伤痕"] }
        };
    }

    // 2. 覆盖：渲染单个标签组 (增强健壮性)
    window.renderSingleGroup = function(key) {
        var data = window.wizardData[key];
        // 容错：如果数据坏了，给个默认值
        if (!data) return;

        // 计算 ID：例如 custom_123 -> tagGroupCustom_123
        var containerId = 'tagGroup' + key.charAt(0).toUpperCase() + key.slice(1);
        var titleId = 'title_' + key;

        // A. 检查容器是否存在，不存在就创建
        var container = document.getElementById(containerId);
        if (!container) {
            // 找到父容器
            var wizardBox = document.querySelector('.wizard-box');
            if (!wizardBox) return;

            // 找到插入锚点：插在“添加分类”按钮前面
            var anchor = document.getElementById('btnAddCategory') || document.getElementById('btnOneClickGen');

            // 创建标题栏
            var titleDiv = document.createElement('div');
            titleDiv.id = titleId;
            titleDiv.className = 'tag-group-title';
            titleDiv.onclick = function() { editWizardTitle(key); };
            titleDiv.innerHTML = `${data.title} <span onclick="event.stopPropagation(); addCustomWizardTag('${key}')" style="font-size:12px; color:#6c5ce7; cursor:pointer; margin-left:10px; border:1px solid #6c5ce7; border-radius:4px; padding:0 4px; background:white;">+加标签</span>`;

            // 创建标签容器
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'tag-select-container';

            // 插入 DOM
            if (anchor) {
                wizardBox.insertBefore(titleDiv, anchor);
                wizardBox.insertBefore(container, anchor);
            } else {
                wizardBox.appendChild(titleDiv);
                wizardBox.appendChild(container);
            }
        } else {
            // 如果容器已存在，更新一下标题（防止改名后不刷新）
            var titleEl = document.getElementById(titleId);
            if (titleEl) {
                titleEl.innerHTML = `${data.title} <span onclick="event.stopPropagation(); addCustomWizardTag('${key}')" style="font-size:12px; color:#6c5ce7; cursor:pointer; margin-left:10px; border:1px solid #6c5ce7; border-radius:4px; padding:0 4px; background:white;">+加标签</span>`;
            }
        }

        // B. 渲染标签内容
        container.innerHTML = ''; // 清空旧的
        
        // 确保 tags 是数组
        if (!Array.isArray(data.tags)) data.tags = [];

        data.tags.forEach((t, idx) => {
            var span = document.createElement('span');
            span.className = 'wizard-tag';
            span.innerText = t;

            // 恢复选中状态 (使用全局选中数据)
            if (!window.currentSelectedTags) window.currentSelectedTags = {};
            if (!window.currentSelectedTags[key]) window.currentSelectedTags[key] = [];
            
            if (window.currentSelectedTags[key].includes(t)) {
                span.classList.add('selected');
            }

            // 删除按钮
            var delBtn = document.createElement('span');
            delBtn.className = 'tag-delete-btn';
            delBtn.innerText = '×';
            delBtn.onclick = function(e) { e.stopPropagation(); deleteWizardTag(key, idx); };
            span.appendChild(delBtn);

            // 点击逻辑
            span.onclick = function(e) {
                if(e.target === delBtn) return;
                this.classList.toggle('selected');
                if (this.classList.contains('selected')) {
                    if (!window.currentSelectedTags[key].includes(t)) window.currentSelectedTags[key].push(t);
                } else {
                    window.currentSelectedTags[key] = window.currentSelectedTags[key].filter(item => item !== t);
                }
            };
            container.appendChild(span);
        });
    };

    // 3. 覆盖：主渲染函数 (遍历所有 Key)
    window.renderWizardTags = function() {
        // 遍历所有数据中的 Key
        Object.keys(window.wizardData).forEach(key => {
            renderSingleGroup(key);
        });
        
        // 确保“添加分类”按钮存在且在最下方
        injectCategoryBtn();
    };

    // 4. 修复：注入添加按钮 (确保它永远在最下面)
    function injectCategoryBtn() {
        var box = document.querySelector('.wizard-box');
        if (!box) return;

        var btn = document.getElementById('btnAddCategory');
        // 如果没有，创建它
        if (!btn) {
            btn = document.createElement('div');
            btn.id = 'btnAddCategory';
            btn.innerHTML = "➕ 添加新分类 (如: 缺点/雷点)";
            btn.style.cssText = "text-align:center; padding:10px; border:2px dashed #ddd; border-radius:10px; color:#aaa; cursor:pointer; margin-top:15px; margin-bottom:10px; font-size:12px; font-weight:bold; transition:0.2s;";
            btn.onmouseover = function(){ this.style.borderColor = '#6c5ce7'; this.style.color = '#6c5ce7'; };
            btn.onmouseout = function(){ this.style.borderColor = '#ddd'; this.style.color = '#aaa'; };
            
            // 🔥 绑定点击事件
            btn.onclick = function() {
                var catName = prompt("请输入新分类名称 (例如：缺点、雷点、特殊癖好):");
                if (catName && catName.trim() !== "") {
                    // 生成唯一 Key
                    var newKey = 'custom_' + Date.now();
                    // 写入数据
                    window.wizardData[newKey] = { 
                        title: `${Object.keys(window.wizardData).length + 1}. ${catName.trim()}`, 
                        tags: [] 
                    };
                    // 初始化选中数组
                    if(!window.currentSelectedTags) window.currentSelectedTags = {};
                    window.currentSelectedTags[newKey] = [];

                    // 保存
                    localStorage.setItem('my_wizard_data_v2', JSON.stringify(window.wizardData));
                    
                    // 刷新界面
                    renderWizardTags();
                    
                    auth.toast(`✅ 分类【${catName}】已添加`);
                    
                    // 自动滚动到底部，让你看到新加的
                    setTimeout(() => {
                        var newTitle = document.getElementById('title_' + newKey);
                        if(newTitle) newTitle.scrollIntoView({behavior: "smooth", block: "center"});
                    }, 300);
                }
            };
            
            // 插在“一键生成”按钮之前，或者最后
            var genBtn = document.getElementById('btnOneClickGen');
            if (genBtn) box.insertBefore(btn, genBtn);
            else box.appendChild(btn);
        } else {
            // 如果已经存在，确保它在正确的位置 (所有标签组之后)
            // 简单粗暴：重新插一次到 genBtn 之前
            var genBtn = document.getElementById('btnOneClickGen');
            if (genBtn) box.insertBefore(btn, genBtn);
            else box.appendChild(btn);
        }
    }

    // 5. 立即执行一次渲染
    setTimeout(renderWizardTags, 500);

})();

/* ================= 🧠 V30.0 补丁：军师菜单强制修复 ================= */
(function() {
    console.log("🚀 执行 V30.0：正在强制恢复军师的 4 种模式选项...");

    // 1. 确保状态对象存在
    if (!window.advisorState) {
        window.advisorState = { mode: 'menu', multiChars: [] };
    }

    // 2. 🔥 核心：强制重写“显示菜单”函数 (防止 V25 丢失)
    window.showAdvisorMenu = function() {
        var box = document.getElementById('aiAdvisorBox');
        if(box) box.style.display = 'flex';
        
        var chat = document.getElementById('advisorChat');
        
        // 菜单 HTML (四个选项)
        var menuHtml = `
            <div class="advisor-bubble" style="background:#f3f0ff;">
                <b>🧠 军师已就位，请选择模式：</b>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-top:10px;">
                    <button class="advisor-tool-btn" onclick="setAdvisorMode('normal')" style="background:#e8f5e9; color:#2e7d32;">🟢 1. 普通模式</button>
                    <button class="advisor-tool-btn" onclick="setAdvisorMode('pro')" style="background:#ffebee; color:#c62828;">🔴 2. 专家模式</button>
                    <button class="advisor-tool-btn" onclick="initMultiCharUI()" style="background:#e3f2fd; color:#1565c0;">👥 3. 多人模式</button>
                    <button class="advisor-tool-btn" onclick="initWorldViewMode()" style="background:#fff3e0; color:#ef6c00;">🌏 4. 世界观模式</button>
                </div>
                <div style="margin-top:8px; font-size:10px; color:#999; text-align:center;">
                    (点击上方按钮切换功能)
                </div>
            </div>
        `;
        chat.innerHTML = menuHtml;
        window.advisorState.mode = 'menu';
        
        // 顺便更新输入框提示，让它看起来是“待命”状态
        var input = document.getElementById('advisorInput');
        if(input) {
            input.placeholder = "请先点击上方按钮选择模式...";
            input.value = "";
        }
    };

    // 3. 🔥 覆盖：强制打开军师 (直接调用上面的菜单函数)
    window.forceOpenAdvisor = function() {
        var box = document.getElementById('aiAdvisorBox');
        if (!box) {
            alert("❌ 错误：找不到军师窗口 (id='aiAdvisorBox')");
            return;
        }
        // 1. 显示窗口
        box.style.display = 'flex';
        // 2. 强制渲染菜单 (不再做任何检查，直接渲染)
        window.showAdvisorMenu();
    };

    // 4. 补全：模式切换逻辑 (防止 V25 没加载导致按钮点不动)
    window.setAdvisorMode = function(mode) {
        window.advisorState.mode = mode;
        window.advisorMode = mode; // 兼容全局变量
        
        var chat = document.getElementById('advisorChat');
        var input = document.getElementById('advisorInput');
        
        if (mode === 'normal') {
            chat.innerHTML += `<div class="advisor-bubble" style="background:#e8f5e9; color:#2e7d32;">🟢 <b>已切换：普通模式</b><br>我可以帮您构思人设、润色文案、提供建议。<br>请直接在下方输入您的想法。</div>`;
            input.placeholder = "🟢 普通模式：聊聊你的人设想法...";
            input.style.border = "2px solid #6c5ce7";
        } else if (mode === 'pro') {
            chat.innerHTML += `<div class="advisor-bubble" style="background:#ffebee; color:#c62828;">🔴 <b>已切换：专家模式</b><br>拥有最高权限，可以直接修改当前页面的任何代码或设定。<br>请输入修改指令。</div>`;
            input.placeholder = "🔴 专家模式：输入指令修改代码...";
            input.style.border = "2px solid #e17055";
        }
        chat.scrollTop = chat.scrollHeight;
    };

    // 5. 补全：世界观模式入口
    window.initWorldViewMode = function() {
        window.advisorState.mode = 'world_view';
        var chat = document.getElementById('advisorChat');
        chat.innerHTML = `
            <div class="advisor-bubble" style="background:#fff3e0; color:#ef6c00;">
                <b>🌏 世界观构建模式</b><br>
                请在下方输入框告诉我，你想要什么样的世界观？<br>
                (例如：赛博朋克+修仙，或者是克苏鲁风格的校园)<br>
                我会为您生成 3 个详细方案。
            </div>
        `;
        var input = document.getElementById('advisorInput');
        input.placeholder = "🌏 输入世界观关键词...";
        input.style.border = "2px solid #ef6c00";
    };

    // 6. 补全：多人模式入口
    window.initMultiCharUI = function() {
        // 弹窗询问
        var count = prompt("👥 多人模式：请输入角色人数 (例如: 3):");
        if (!count) return;
        var namesStr = prompt("请输入所有人的名字 (用逗号分隔，如: 张三, 李四):");
        if (!namesStr) return;
        
        var names = namesStr.split(/[,，]/).map(n => n.trim()).filter(n => n);
        window.advisorState.mode = 'multi';
        window.advisorState.multiChars = names;
        
        var chat = document.getElementById('advisorChat');
        // 生成按钮列表
        var btns = names.map(name => {
            return `<button class="advisor-action-btn" onclick="generateCharSettings('${name}')">👤 生成【${name}】的设定</button>`;
        }).join('');
        
        chat.innerHTML = `
            <div class="advisor-bubble" style="background:#e3f2fd;">
                <b>👥 多人模式已开启</b><br>
                当前队列：${names.join(', ')}<br>
                请点击下方按钮，逐个生成：
                ${btns}
            </div>
        `;
    };

    // 7. 绑定：确保按钮 onclick 指向新的 forceOpenAdvisor
    // 自动修复页面上所有写着“召唤军师”的按钮
    setTimeout(function() {
        var allBtns = document.querySelectorAll('button');
        allBtns.forEach(btn => {
            if (btn.innerText.includes('召唤军师')) {
                btn.onclick = window.forceOpenAdvisor;
            }
        });
        
        // 如果是从分析函数进来的，也强制显示菜单
        window.analyzeCardNeeds = window.forceOpenAdvisor;
        
    }, 1000);

    console.log("✅ 军师菜单已修复：点击按钮将直接显示 4 选项");

})();

/* ================= 👥 V31.1 补丁：多人模式交互修复版 ================= */
(function() {
    console.log("🚀 执行 V31.1：多人模式改为【聊天框交互】...");

    // 1. 定义一个全局变量，记录当前正在等待谁的要求
    window.pendingMultiCharName = null;

    // 2. 覆盖：点击生成按钮后的逻辑
    window.generateCharSettings = function(name) {
        // A. 记录当前要生成的角色名
        window.pendingMultiCharName = name;

        // B. 预填名字框 (为了预览方便)
        var nameInput = document.getElementById('cardName');
        if (nameInput) nameInput.value = name;

        // C. 在聊天框提示用户
        var chat = document.getElementById('advisorChat');
        var input = document.getElementById('advisorInput');
        
        chat.innerHTML += `
            <div class="advisor-bubble" style="background:#e3f2fd; border-left:4px solid #2196f3;">
                <b>👤 正在构思角色：${name}</b><br>
                请在下方输入框告诉我，您对【${name}】有什么具体要求？<br>
                <small style="color:#666;">(例如：高冷剑客、病娇妹妹... 如果没要求请直接回复“无”)</small>
            </div>
        `;
        chat.scrollTop = chat.scrollHeight;

        // D. 聚焦输入框并修改提示词
        if (input) {
            input.placeholder = `👉 请输入对【${name}】的设定要求...`;
            input.focus();
            // 视觉高亮
            input.style.border = "2px solid #2196f3";
        }
    };

    // 3. 拦截发送消息逻辑 (核心)
    // 我们需要拦截 sendAdvisorMsg，优先处理“正在输入要求”的情况
    var _originalSend = window.sendAdvisorMsg;

    window.sendAdvisorMsg = async function() {
        // 检查是否有正在等待的角色
        if (window.pendingMultiCharName) {
            var input = document.getElementById('advisorInput');
            var text = input.value.trim();
            if (!text) return;

            // --- 这里的逻辑是处理“多人模式生成请求” ---
            
            // 1. 用户消息上屏
            var chat = document.getElementById('advisorChat');
            chat.innerHTML += `<div style="text-align:right; margin:5px 0; color:#1565c0; font-size:12px; padding:5px; background:#e3f2fd; border-radius:8px; display:inline-block; margin-left:auto;">${text}</div><div style="clear:both;"></div>`;
            input.value = '';
            
            // 恢复输入框样式
            input.placeholder = "等待指令...";
            input.style.border = "";

            // 2. 锁定名字并清除标记 (防止后续消息误触)
            var targetName = window.pendingMultiCharName;
            window.pendingMultiCharName = null;

            // 3. 开始生成
            chat.insertAdjacentHTML('beforeend', `<div id="multi-loading" class="ai-loading">🧠 收到要求："${text}"<br>正在生成设定...</div>`);
            chat.scrollTop = chat.scrollHeight;

            var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
            if (!config || !config.apiKey) {
                alert("请先配置 API Key");
                document.getElementById('multi-loading').remove();
                return;
            }

            var prompt = `
            我是创造者。
            请为多人剧本中的角色【${targetName}】写一段详细设定(500字)。
            
            【用户强制要求】：
            ${text}
            
            请直接输出纯文本设定，包含外貌、性格、身世。不要代码块，不要解释。
            `;

            try {
                var res = await fetchAI(prompt, config);
                var cleanText = res.replace(/```/g, '').trim();
                
                document.getElementById('multi-loading').remove();

                // 4. 填入设定框
                document.getElementById('cardDesc').value = cleanText;
                
                // 5. 显示完成气泡 & 确定按钮
                chat.innerHTML += `
                    <div class="advisor-bubble">
                        ✅ 【${targetName}】设定已填入左侧！<br>
                        <button class="advisor-action-btn" onclick="confirmCharAndGenLore('${targetName}')">
                            💾 确定 (并生成专属世界书)
                        </button>
                    </div>
                `;
                chat.scrollTop = chat.scrollHeight;

                // 自动跳转预览页
                if(typeof switchCardTab === 'function') switchCardTab('preview');

            } catch (e) {
                console.error(e);
                if(document.getElementById('multi-loading')) document.getElementById('multi-loading').remove();
                chat.innerHTML += `<div class="advisor-bubble">❌ 生成失败：${e.message}</div>`;
            }

            return; // 🔥 拦截结束，不执行原来的逻辑
        }

        // 如果没有等待输入的角色，执行原来的逻辑 (普通模式/专家模式/世界观模式)
        if (_originalSend) _originalSend();
    };

    console.log("✅ 多人模式聊天交互已就绪");

})();

/* ================= 🧠 V36.0 补丁：军师全能进化 (美化/文风/预览) ================= */
(function() {
    console.log("🚀 执行 V36.0：军师系统扩容，新增美化预览与文风模式...");

    // 1. 状态扩容
    if (!window.advisorState) window.advisorState = { mode: 'menu' };
    window.tempStyleGuide = ""; // 临时存储美化文件内容

    // 2. 🔥 覆盖：重写军师主菜单 (6宫格布局)
    window.showAdvisorMenu = function() {
        var box = document.getElementById('aiAdvisorBox');
        if(box) box.style.display = 'flex';
        var chat = document.getElementById('advisorChat');
        
        var menuHtml = `
            <div class="advisor-bubble" style="background:#f3f0ff;">
                <b>🧠 军师已就位，请选择锦囊：</b>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-top:10px;">
                    <button class="advisor-tool-btn" onclick="setAdvisorMode('normal')" style="background:#e8f5e9; color:#2e7d32;">🟢 1. 普通模式</button>
                    <button class="advisor-tool-btn" onclick="setAdvisorMode('pro')" style="background:#ffebee; color:#c62828;">🔴 2. 专家模式</button>
                    <button class="advisor-tool-btn" onclick="initMultiCharUI()" style="background:#e3f2fd; color:#1565c0;">👥 3. 多人模式</button>
                    <button class="advisor-tool-btn" onclick="initWorldViewMode()" style="background:#fff3e0; color:#ef6c00;">🌏 4. 世界观</button>
                    <button class="advisor-tool-btn" onclick="initBeautifyMode()" style="background:#f3e5f5; color:#6a1b9a; border:1px solid #e1bee7;">🎨 5. 美化模式</button>
                    <button class="advisor-tool-btn" onclick="initStyleMode()" style="background:#e0f2f1; color:#00695c; border:1px solid #b2dfdb;">✒️ 6. 文风模式</button>
                </div>
            </div>
        `;
        chat.innerHTML = menuHtml;
        window.advisorState.mode = 'menu';
        
        // 更新输入框提示
        var input = document.getElementById('advisorInput');
        if(input) {
            input.placeholder = "请点击上方按钮选择功能...";
            input.value = "";
            input.style.border = "1px solid #ccc";
        }
    };

    // ================= 🎨 5. 美化模式 (核心新功能) =================

    window.initBeautifyMode = function() {
        window.advisorState.mode = 'beautify';
        var chat = document.getElementById('advisorChat');
        
        chat.innerHTML = `
            <div class="advisor-bubble" style="background:#f3e5f5; color:#4a148c;">
                <b>🎨 UI 美化定制</b><br>
                我可以根据人设为您设计前端特效。<br>
                如果有《美化规范文件》(CSS/TXT)，请先上传，我会严格遵守。
                <div style="margin-top:10px; text-align:center;">
                    <input type="file" id="beautifyFileInput" style="display:none" onchange="handleBeautifyUpload(this)">
                    <button class="advisor-action-btn" onclick="document.getElementById('beautifyFileInput').click()">
                        📂 上传美化模板 (可选)
                    </button>
                </div>
            </div>
            <div class="advisor-bubble">
                请在下方输入您的要求：<br>
                (例如：做一个赛博朋克风格的状态栏、或者粉色的气泡样式)
            </div>
        `;
        
        var input = document.getElementById('advisorInput');
        input.placeholder = "🎨 想要什么样的界面？(上传文件后在此输入需求)";
        input.style.border = "2px solid #ce93d8";
    };

    // 处理文件上传
    window.handleBeautifyUpload = function(input) {
        var file = input.files[0];
        if(!file) return;
        
        var reader = new FileReader();
        reader.onload = function(e) {
            window.tempStyleGuide = e.target.result;
            
            var chat = document.getElementById('advisorChat');
            chat.innerHTML += `
                <div class="advisor-bubble">
                    ✅ 已加载模板：<b>${file.name}</b><br>
                    (包含 ${window.tempStyleGuide.length} 字符)<br>
                    接下来请在输入框告诉我，您想基于这个模板做什么？
                </div>
            `;
            chat.scrollTop = chat.scrollHeight;
        };
        reader.readAsText(file);
    };

    // 美化生成逻辑 (三选一 + 预览)
    async function runBeautifyGeneration(text, loadingId) {
        var chat = document.getElementById('advisorChat');
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        var desc = document.getElementById('cardDesc').value || "通用角色";

        // Prompt
        var prompt = `
        你是一个前端UI设计师。
        用户需求：${text}
        角色设定：${desc.substring(0, 500)}
        
        ${window.tempStyleGuide ? "【强制参考样式规范】:\n" + window.tempStyleGuide.substring(0, 3000) : ""}
        
        请设计 3 个不同的 HTML/CSS 方案。
        必须返回纯 JSON 数组：
        [
            {
                "name": "方案名称 (如: 极简风)",
                "desc": "设计理念描述",
                "regex": "/正则/g",
                "code": "<style>...</style><div>...</div> (完整的HTML代码)"
            },
            ...
        ]
        `;

        try {
            var res = await fetchAI(prompt, config);
            var data = JSON.parse(res.replace(/```json/g, '').replace(/```/g, '').trim());
            document.getElementById(loadingId).remove();

            if (data.length === 0) throw new Error("生成为空");

            chat.innerHTML += `<div class="advisor-bubble">✨ 设计完成！请查看下方 3 个方案预览：</div>`;

            // 渲染 3 个方案卡片
            data.forEach((item, idx) => {
                // 安全转义
                var safeCode = encodeURIComponent(item.code);
                var safeRegex = encodeURIComponent(item.regex);
                
                // 预览容器 ID
                var previewId = `preview_box_${Date.now()}_${idx}`;

                chat.innerHTML += `
                    <div class="advisor-bubble" style="border-left:4px solid #9c27b0; padding:10px;">
                        <b>🎨 方案 ${idx+1}: ${item.name}</b>
                        <div style="font-size:11px; color:#666; margin-bottom:5px;">${item.desc}</div>
                        
                        <div style="background:#eee; padding:10px; border-radius:5px; margin:5px 0; min-height:60px; overflow:hidden;">
                            <div id="${previewId}"></div>
                        </div>

                        <div style="display:flex; gap:5px;">
                            <button class="advisor-action-btn" style="flex:1; background:#e1bee7; color:#4a148c;" onclick="applyBeautify('${safeCode}', '${safeRegex}')">
                                ✅ 直接使用
                            </button>
                            <button class="advisor-action-btn" style="flex:1; background:#fff; border:1px solid #999; color:#555;" onclick="refineBeautify('${safeCode}', '${item.name}')">
                                🔧 提意见
                            </button>
                        </div>
                    </div>
                `;
                
                // 延迟渲染预览内容 (因为 DOM 还没刷新完)
                setTimeout(() => {
                    var container = document.getElementById(previewId);
                    if(container) {
                        // 使用 ShadowRoot 隔离 CSS
                        if (!container.shadowRoot) container.attachShadow({mode: 'open'});
                        container.shadowRoot.innerHTML = item.code;
                    }
                }, 100);
            });
            
            chat.scrollTop = chat.scrollHeight;

        } catch(e) {
            document.getElementById(loadingId).remove();
            chat.innerHTML += `<div class="advisor-bubble">❌ 生成失败: ${e.message}</div>`;
        }
    }

    // 应用美化
    window.applyBeautify = function(encCode, encRegex) {
        var code = decodeURIComponent(encCode);
        var regex = decodeURIComponent(encRegex);
        
        // 自动跳转到前端页
        if(typeof switchCardTab === 'function') switchCardTab('regex');
        if(typeof switchRegexUI === 'function') switchRegexUI('frontend');
        
        document.getElementById('frontReplace').value = code;
        document.getElementById('frontPattern').value = regex;
        
        // 自动填测试词
        var rawKey = regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '');
        document.getElementById('regexTestInput').value = rawKey;
        
        if(typeof runRegexTest === 'function') runRegexTest();
        if(typeof syncStatToNote === 'function') syncStatToNote();

        if(window.auth && window.auth.toast) window.auth.toast('✅ 方案已应用！');
    };

    // 提意见 (进入修改流程)
    window.refineBeautify = function(encCode, name) {
        var code = decodeURIComponent(encCode);
        // 存入缓存
        if (!window.lastGeneratedData) window.lastGeneratedData = {};
        window.lastGeneratedData.frontend = { code: code, name: name, regex: "/.*/" }; // regex 暂时不重要
        
        // 切换回聊天框提示
        var input = document.getElementById('advisorInput');
        input.placeholder = `🔧 对【${name}】有什么修改意见？`;
        input.focus();
        input.style.border = "2px solid #e91e63";
        
        // 标记状态：下一条消息是修改意见
        window.advisorState.pendingRefine = 'frontend';
        
        var chat = document.getElementById('advisorChat');
        chat.innerHTML += `<div class="advisor-bubble" style="background:#ffebee; color:#c62828;">👂 请输入您的修改意见 (针对 ${name})...</div>`;
        chat.scrollTop = chat.scrollHeight;
    };

           // ================= ✒️ 6. 文风模式 (究极深度解构版) =================

    // 1. 初始化界面
    window.initStyleMode = function() {
        window.advisorState.mode = 'style';
        var chat = document.getElementById('advisorChat');
        chat.innerHTML = `
            <div class="advisor-bubble" style="background:#fff3e0; color:#e65100;">
                <b>✒️ 文学级·文风构建台 (Max)</b><br>
                <small>（已升级：不再使用死板模板，而是生成“分子级”的写作指导圣经，精确控制潜台词与感官层级）</small><br><br>
                请告诉我您想要的风格关键词：<br>
                (例如：王家卫式独白、古龙极简主义、克苏鲁不可名状、红楼梦半文白...)
            </div>
        `;
        var input = document.getElementById('advisorInput');
        input.placeholder = "✒️ 输入文风关键词...";
        input.style.border = "2px solid #ff9800";
    };

    // 2. 核心生成逻辑：深度解构 Prompt
    window.runStyleGeneration = async function(styleReq, loadingId) {
        var chat = document.getElementById('advisorChat');
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        var name = document.getElementById('cardName').value || "Char";
        
        // 🔥 Prompt 终极形态：要求 AI 成为“文学架构师”并动态延伸维度
        var prompt = `
        角色：Computational Linguist & Senior Literary Architect (计算语言学家 & 资深文学架构师)。
        任务：为角色【${name}】构建一套**“分子级”的文风指导圣经 (Style Bible)**。
        目标风格：【${styleReq}】。
        
        🛑 **核心指令：不要被基础模板局限！**
        你需要深入解构这种文风的底层逻辑。除了基础的句式和用词，你必须**根据该风格的独特性，动态延伸出更深层的规则**。
        
        请设计 3 个方案，每个方案的 content 必须是一篇极其详尽的英文技术文档 (System Prompt)，包含但不限于以下维度：

        1.  **Sentence Architecture (句法架构)**: 
            - 句子是像迷宫一样复杂，还是像刀锋一样简短？
            - 是否使用特殊的标点符号节奏？(e.g. Fragments, Run-ons, Ellipses)
        
        2.  **Lexical Spectrum (词汇光谱)**:
            - 核心关键词库是什么？(Keywords)
            - **Taboo List (禁忌词表)**: 绝对不能出现的词或语气是什么？(例如：古风绝对不能出现现代心理学术语)
        
        3.  **Sensory Hierarchy (感官层级)**:
            - 这种文风最侧重哪个感官？(视觉？嗅觉？痛觉？还是纯粹的逻辑？)
            - 比如：克苏鲁风侧重“粘稠的触感”和“无法描述的视觉”；古龙风侧重“听觉(风声)”和“瞬间的动作”。
        
        4.  **Narrative Distance (叙事距离)**:
            - 是冷漠的上帝视角，还是极度深陷的主观视角？
        
        5.  **Dynamic Extension (动态延伸)**: 
            - 挖掘该风格特有的机制！(例如：如果是“王家卫风”，请增加“时间与日期的精确执念”；如果是“莎士比亚风”，请增加“隐喻与独白机制”)。
        
        6.  **[System Note]**: 最后必须有一段高权重的、总结性的指令，强制 AI 执行上述所有规则。
        
        必须返回纯 JSON 数组 (type="world")：
        [
            {
                "title": "方案1标题 (如: 极简主义·听觉叙事)",
                "reason": "中文简介：本方案解构了该风格的留白艺术，强制强调听觉描写，禁用形容词堆砌...",
                "content": "## Style: Minimalist Tension\\n\\n### 1. Sentence Architecture\\n- Rule: Use Staccato rhythm. No sentences over 15 words.\\n- ...\\n\\n### 2. Sensory Focus (Auditory)\\n- Focus on the sound of wind, breathing, and heartbeats...\\n\\n### 3. Dynamic Mechanic: The Silence\\n- Instruction: Use line breaks to indicate silence.\\n\\n### [System Note]\\n[Instruction: Strict adherence to Minimalist Tension style. Avoid flowery language...]"
            }
        ]
        注意：content 内容请主要使用 **英文** 编写（这对 AI 的控制力最强，能写出更细腻的规则）。
        `;

        try {
            var res = await fetchAI(prompt, config);
            var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
            var data = JSON.parse(cleanJson);
            
            if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();

            chat.innerHTML += `<div class="advisor-bubble">✒️ 已深度解构风格，生成 3 本【风格圣经】：</div>`;

            data.forEach((item, idx) => {
                var safeObj = encodeURIComponent(JSON.stringify(item));
                
                // 预览处理：高亮标题，增加可读性
                var previewHtml = item.content
                    .replace(/\n/g, '<br>')
                    .replace(/###/g, '🔸') 
                    .replace(/##/g, '🔹')
                    .substring(0, 250) + "..."; // 预览更长一点

                chat.innerHTML += `
                    <div class="advisor-bubble" style="border-left:4px solid #e65100; padding:10px;">
                        <b style="font-size:14px; color:#e65100;">${item.title}</b>
                        <div style="font-size:12px; color:#666; margin:5px 0 8px 0;">${item.reason}</div>
                        
                        <div style="background:#fff8e1; color:#3e2723; padding:8px; border-radius:5px; font-size:11px; font-family:'Consolas', monospace; margin-bottom:8px; max-height:150px; overflow-y:auto; border:1px dashed #ffcc80; line-height: 1.5;">
                            ${previewHtml}
                        </div>
                        
                        <button class="advisor-action-btn" style="background:#ffe0b2; color:#e65100; border:1px solid #ffcc80;" 
                                onclick="window.addStyleToWorld('${safeObj}')">
                            ✅ 注入此风格 (存入世界书)
                        </button>
                    </div>
                `;
            });
            
            chat.scrollTop = chat.scrollHeight;

        } catch(e) {
            if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
            chat.innerHTML += `<div class="advisor-bubble">❌ 深度解构失败: ${e.message}</div>`;
        }
    };

    // 3. 辅助函数：一键注入世界书 (包含去重与常驻逻辑)
    // 如果页面其他地方已经定义了 addStyleToWorld，这里会覆盖它，确保逻辑统一
    window.addStyleToWorld = function(encObj) {
        try {
            var item = JSON.parse(decodeURIComponent(encObj));
            
            // A. 自动切换到世界书页
            if(typeof switchCardTab === 'function') switchCardTab('world');
            
            // B. 构造高权重条目
            var newEntry = {
                id: Date.now(),
                comment: "✒️ 文风圣经 - " + item.title,
                keys: ["style", "文风", "system", "writing_style"], // 强力触发词
                content: item.content, 
                position: 1, // 放在角色设定之前生效 (底层规则)
                enabled: true,
                constant: true, // 🔥 核心：设为常驻，让风格像空气一样无处不在
                insertion_position: 1 
            };
            
            // C. 注入数据
            if (!window.currentWorldInfo) window.currentWorldInfo = { entries: [] };
            window.currentWorldInfo.entries.push(newEntry);
            
            // D. 刷新列表并选中
            if (typeof renderWorldList === 'function') renderWorldList();
            if (typeof selectEntry === 'function') selectEntry(window.currentWorldInfo.entries.length - 1);
            
            if(window.auth && window.auth.toast) window.auth.toast('✅ 深度文风设定已挂载 (常驻生效)');
            
        } catch(e) { 
            console.error(e);
            alert("添加失败：" + e.message); 
        }
    };


    // ================= 🔄 拦截发送逻辑 (总控台) =================
    var _oldSendAdvisor = window.sendAdvisorMsg;

    window.sendAdvisorMsg = async function() {
        var input = document.getElementById('advisorInput');
        var text = input.value.trim();
        if(!text) return;

        // A. 拦截“提意见” (Refine) 状态
        if (window.advisorState.pendingRefine === 'frontend') {
            window.advisorState.pendingRefine = null; // 清除状态
            // 调用 V25 的 refineResult (它已经包含了 AI 请求)
            // 为了复用，我们模拟把 text 填入 refineInput，然后触发 click
            var refineInput = document.getElementById('refineInput_frontend');
            if(refineInput) {
                refineInput.value = text;
                if(window.refineResult) window.refineResult('frontend');
            }
            // 恢复界面
            input.value = '';
            input.placeholder = "请点击上方按钮选择功能...";
            input.style.border = "1px solid #ccc";
            return;
        }

        // B. 拦截“美化模式”
        if (window.advisorState.mode === 'beautify') {
            var chat = document.getElementById('advisorChat');
            // 上屏
            chat.innerHTML += `<div style="text-align:right; margin:5px 0; color:#6a1b9a; font-size:12px; padding:5px; background:#f3e5f5; border-radius:8px; display:inline-block; margin-left:auto;">${text}</div><div style="clear:both;"></div>`;
            input.value = '';
            
            var loadingId = 'loading-' + Date.now();
            chat.insertAdjacentHTML('beforeend', `<div id="${loadingId}" class="ai-loading">🎨 正在设计 UI 方案...</div>`);
            chat.scrollTop = chat.scrollHeight;
            
            await runBeautifyGeneration(text, loadingId);
            return;
        }

        // C. 拦截“文风模式”
        if (window.advisorState.mode === 'style') {
            var chat = document.getElementById('advisorChat');
            chat.innerHTML += `<div style="text-align:right; margin:5px 0; color:#00695c; font-size:12px; padding:5px; background:#e0f2f1; border-radius:8px; display:inline-block; margin-left:auto;">${text}</div><div style="clear:both;"></div>`;
            input.value = '';
            
            var loadingId = 'loading-' + Date.now();
            chat.insertAdjacentHTML('beforeend', `<div id="${loadingId}" class="ai-loading">✒️ 正在润色文案...</div>`);
            chat.scrollTop = chat.scrollHeight;
            
            await runStyleGeneration(text, loadingId);
            return;
        }

        // D. 其他模式 (普通/专家/世界观/多人) 走旧逻辑
        if (_oldSendAdvisor) _oldSendAdvisor();
    };

})();



/* ================= 📊 V40.0 补丁：属性逻辑多模块系统 ================= */
(function() {
    console.log("🚀 执行 V40.0：正在将属性页升级为多模块架构...");

    // 1. 初始化数据结构
    // 如果之前没有模块数据，创建一个初始的
    if (!window.statModules) {
        window.statModules = [];
        window.currentStatIdx = 0;
    }

    // 2. 🏗️ 界面重构工兵
    function upgradeStatsUI() {
        var tabStats = document.getElementById('tab-stats');
        if (!tabStats) return;

        // 找到旧的编辑器和说明书
        var oldEditor = document.getElementById('statEditor');
        var guideBox = document.getElementById('statGuideBox'); // V8.0 的说明书
        var refineBox = document.getElementById('refineArea_stat'); // V24.0 的修改框
        var aiPanel = document.querySelector('#tab-stats > div[style*="background"]'); // 顶部的AI输入框容器

        // 如果已经升级过，就不动了
        if (document.getElementById('stat-modules-container')) return;

        // --- A. 数据迁移 (防丢) ---
        var existingContent = oldEditor ? oldEditor.value : "";
        // 如果有旧内容且模块为空，迁移进去
        if (window.statModules.length === 0) {
            window.statModules.push({
                name: "📝 基础规则 (Main)",
                content: existingContent
            });
        }

        // --- B. 构建新界面容器 ---
        var container = document.createElement('div');
        container.id = 'stat-modules-container';
        // 样式复用世界书的 flex 布局
        container.style.cssText = "display:flex; height:500px; border:1px solid #ddd; border-radius:8px; overflow:hidden; margin-top:10px; background:#fff;";

        // 1. 左侧列表栏
        var sidebar = document.createElement('div');
        sidebar.id = 'statSidebar';
        sidebar.style.cssText = "width:160px; background:#f9f9f9; border-right:1px solid #eee; overflow-y:auto; display:flex; flex-direction:column;";
        
        // 新建按钮
        var addBtn = document.createElement('div');
        addBtn.innerHTML = "➕ 新建模块";
        addBtn.style.cssText = "padding:10px; text-align:center; cursor:pointer; font-weight:bold; color:#6c5ce7; border-bottom:1px solid #eee; background:#fff;";
        addBtn.onclick = addNewStatModule;
        sidebar.appendChild(addBtn);

        // 列表容器
        var listContainer = document.createElement('div');
        listContainer.id = 'statModuleList';
        listContainer.style.flex = "1";
        sidebar.appendChild(listContainer);

        // 2. 右侧编辑区
        var mainArea = document.createElement('div');
        mainArea.style.cssText = "flex:1; display:flex; flex-direction:column; padding:15px; background:#fff; overflow-y:auto;";

        // 模块标题输入
        var titleRow = document.createElement('div');
        titleRow.style.cssText = "display:flex; gap:10px; margin-bottom:10px; align-items:center;";
        titleRow.innerHTML = `<span style="font-size:12px;color:#999;">模块名:</span><input type="text" id="currentStatName" class="visual-input" style="flex:1;" placeholder="例如: 张三的属性" oninput="updateCurrentStatMeta()"> <button class="small-btn" onclick="deleteCurrentStatModule()" style="background:#ff7675;color:white;border:none;">🗑️</button>`;
        
        // 重新安置旧编辑器 (为了保留 ID 兼容其他补丁)
        // 我们把旧的 textarea 搬过来，样式改一下
        if (oldEditor) {
            oldEditor.style.width = "100%";
            oldEditor.style.flex = "1";
            oldEditor.style.height = "auto"; // 让 flex 控制高度
            oldEditor.style.minHeight = "300px";
            oldEditor.style.resize = "none"; // 禁止拖拽，用 flex 自适应
            oldEditor.placeholder = "在这里编写逻辑代码...\n例如:\nTarget: HP = 100\nRule: ...";
            // 绑定输入事件：同步保存
            oldEditor.oninput = function() {
                saveCurrentContent();
                syncAllStatsToNote(); // 实时合并
            };
        }

        // 组装右侧
        mainArea.appendChild(titleRow);
        
        // 把旧元素挪进来 (AI说明书、编辑器、修改框)
        // 顺序：说明书 -> 编辑器 -> 修改框
        if (guideBox) mainArea.appendChild(guideBox);
        if (oldEditor) mainArea.appendChild(oldEditor);
        else {
            // 如果旧编辑器找不到了，造一个新的
            var newEditor = document.createElement('textarea');
            newEditor.id = 'statEditor';
            newEditor.className = 'card-textarea';
            newEditor.oninput = function() { saveCurrentContent(); syncAllStatsToNote(); };
            mainArea.appendChild(newEditor);
        }
        if (refineBox) mainArea.appendChild(refineBox);

        // 组装整体
        container.appendChild(sidebar);
        container.appendChild(mainArea);

        // --- C. 插入到页面 ---
        // 插在 AI 面板 (aiPanel) 的后面
        if (aiPanel && aiPanel.parentNode === tabStats) {
            tabStats.insertBefore(container, aiPanel.nextSibling);
        } else {
            tabStats.appendChild(container);
        }

        // 刷新列表
        renderStatModuleList();
        loadStatModule(0);
    }

    // 3. 📝 逻辑控制函数

    window.addNewStatModule = function() {
        var name = prompt("请输入新模块名称 (例如: 角色B的属性):", "新模块");
        if (!name) return;
        
        window.statModules.push({
            name: name,
            content: ""
        });
        renderStatModuleList();
        // 选中最新的
        loadStatModule(window.statModules.length - 1);
    };

    window.deleteCurrentStatModule = function() {
        if (window.statModules.length <= 1) {
            alert("⚠️ 至少保留一个模块！");
            return;
        }
        if (!confirm("确定删除这个模块吗？")) return;

        window.statModules.splice(window.currentStatIdx, 1);
        // 重置索引
        window.currentStatIdx = 0;
        renderStatModuleList();
        loadStatModule(0);
        syncAllStatsToNote();
    };

    window.renderStatModuleList = function() {
        var list = document.getElementById('statModuleList');
        if (!list) return;
        list.innerHTML = '';

        window.statModules.forEach((mod, idx) => {
            var item = document.createElement('div');
            // 样式：模仿世界书列表
            var isActive = idx === window.currentStatIdx;
            item.style.cssText = `padding:10px; border-bottom:1px solid #eee; cursor:pointer; font-size:12px; ${isActive ? 'background:#e0f7fa; color:#006064; border-left:3px solid #00bcd4; font-weight:bold;' : 'color:#555;'}`;
            item.innerText = mod.name;
            item.onclick = function() { loadStatModule(idx); };
            list.appendChild(item);
        });
    };

    window.loadStatModule = function(idx) {
        window.currentStatIdx = idx;
        var mod = window.statModules[idx];
        
        // 填入数据
        document.getElementById('currentStatName').value = mod.name;
        document.getElementById('statEditor').value = mod.content || "";
        
        // 刷新高亮
        renderStatModuleList();
    };

    window.updateCurrentStatMeta = function() {
        var name = document.getElementById('currentStatName').value;
        window.statModules[window.currentStatIdx].name = name;
        renderStatModuleList(); // 刷新列表名字
    };

    window.saveCurrentContent = function() {
        var content = document.getElementById('statEditor').value;
        window.statModules[window.currentStatIdx].content = content;
    };

    // 🔥 核心：合并所有模块 -> 深度设定 (Card Note)
    window.syncAllStatsToNote = function() {
        var noteEl = document.getElementById('cardNote');
        if (!noteEl) return;

        // 将所有模块内容拼接，中间加分隔符
        var combinedText = window.statModules
            .map(m => m.content.trim()) // 去掉首尾空格
            .filter(t => t.length > 0)  // 过滤空模块
            .join('\n\n'); // 用换行隔开

        noteEl.value = combinedText;
    };

    // 4. 初始化
    // 延时执行，确保页面元素已就绪
    setTimeout(upgradeStatsUI, 600);

    // 5. 覆盖军师跳转逻辑 (适配新结构)
    // 当军师要跳转 'stat' 时，我们确保它填入的是当前选中的模块
    var _oldJump = window.jumpToCreator;
    window.jumpToCreator = function(btn, type, encodedPrompt) {
        if (type === 'stat') {
            // 先确保界面是打开的
            if(typeof switchCardTab === 'function') switchCardTab('stats');
            
            // 如果是多人模式生成，建议新建模块
            // 这里我们做一个智能判断：如果当前模块已经有字了，就新建一个
            var currentContent = document.getElementById('statEditor').value.trim();
            if (currentContent.length > 50) {
                // 自动新建一个“新规则”模块，防止覆盖旧的
                window.statModules.push({ name: "➕ 新增规则 (AI建议)", content: "" });
                renderStatModuleList();
                loadStatModule(window.statModules.length - 1);
                
                if(window.auth && window.auth.toast) window.auth.toast('✨ 已自动新建模块，避免覆盖旧规则');
            }
        }
        // 执行原有跳转
        if(_oldJump) _oldJump(btn, type, encodedPrompt);
    };

    console.log("✅ 属性多模块系统已就绪");

})();

/* ================= 👥 V41.0 补丁：多人角色面板切换系统 ================= */
(function() {
    console.log("🚀 执行 V41.0：启动多人角色档案管理系统...");

    // 1. 初始化数据中心 (花名册)
    // 结构: { "张三": { desc: "...", firstMes: "..." }, "李四": { ... } }
    if (!window.projectCharData) {
        window.projectCharData = {};
    }

    // 2. 💾 核心：保存当前界面到花名册
    window.saveCurrentCharToCache = function() {
        var name = document.getElementById('cardName').value.trim();
        if (!name) return; // 没名字的不存

        // 收集当前界面数据
        var data = {
            desc: document.getElementById('cardDesc').value,
            firstMes: document.getElementById('cardFirstMes').value,
            mesEx: document.getElementById('cardMesExample').value,
            // 如果有 V40 的属性模块，也可以考虑存，但属性通常是共用的，暂不强制绑定
        };

        window.projectCharData[name] = data;
        // console.log(`✅ 已自动缓存角色【${name}】的数据`);
    };

    // 3. 📤 核心：切换角色面板
    window.switchCharPanel = function(targetName) {
        // A. 先保存现在的 (防止没点保存就切走了)
        saveCurrentCharToCache();

        // B. 读取目标数据
        var data = window.projectCharData[targetName];
        if (!data) {
            alert(`⚠️ 角色【${targetName}】暂无数据，请先生成！`);
            return;
        }

        // C. 填入界面
        document.getElementById('cardName').value = targetName;
        document.getElementById('cardDesc').value = data.desc || "";
        document.getElementById('cardFirstMes').value = data.firstMes || "";
        document.getElementById('cardMesExample').value = data.mesEx || "";

        // D. 自动跳转到预览页 (方便查看和修改)
        if(typeof switchCardTab === 'function') switchCardTab('preview');
        
        // E. 视觉反馈
        if(window.auth && window.auth.toast) window.auth.toast(`👤 已切换至【${targetName}】面板`);
        
        // F. 更新军师菜单状态
        renderMultiCharMenu(); 
    };

    // 4. 🔥 覆盖：多人模式菜单渲染 (增加切换功能)
    window.renderMultiCharMenu = function() {
        var chat = document.getElementById('advisorChat');
        var names = window.advisorState.multiChars || [];
        var currentName = document.getElementById('cardName').value.trim();

        // 生成按钮列表
        var btnsHtml = names.map(name => {
            // 判断该角色是否已有数据
            var hasData = window.projectCharData[name];
            var isCurrent = (name === currentName);
            
            var btnStyle = "background:#e3f2fd; color:#1565c0;"; // 默认蓝色 (生成)
            var btnText = `⚡ 生成【${name}】设定`;
            var action = `generateCharSettings('${name}')`;

            if (hasData) {
                if (isCurrent) {
                    // 当前正在编辑
                    btnStyle = "background:#4caf50; color:white; border:1px solid #388e3c;";
                    btnText = `🟢 编辑中：${name}`;
                    action = ""; // 点了没反应
                } else {
                    // 已有数据，点击切换
                    btnStyle = "background:#fff; border:1px solid #1565c0; color:#1565c0;";
                    btnText = `👤 切换至：${name}`;
                    action = `switchCharPanel('${name}')`;
                }
            }

            return `<button class="advisor-action-btn" style="${btnStyle}" onclick="${action}">${btnText}</button>`;
        }).join('');
        
        // 渲染气泡
        chat.innerHTML += `
            <div class="advisor-bubble" style="background:#f5f5f5; border-left:4px solid #673ab7;">
                <b>👥 多人角色管理台</b><br>
                <div style="font-size:11px; color:#666; margin-bottom:5px;">
                    点击“切换”可加载该角色的详细设定。<br>
                    加载后，生成的属性/世界书将自动基于该角色。
                </div>
                ${btnsHtml}
            </div>
        `;
        chat.scrollTop = chat.scrollHeight;
    };

    // 5. 🔗 串联生成逻辑 (生成成功后自动存入花名册)
    // 我们需要拦截生成成功的时刻。最简单的办法是：在用户点击“确定”时保存。
    
    // 覆盖 confirmCharAndGenLore (点击确定按钮的逻辑)
    var _oldConfirm = window.confirmCharAndGenLore;
    window.confirmCharAndGenLore = async function(name) {
        // 1. 先保存数据到花名册
        saveCurrentCharToCache();
        
        // 2. 标记该角色已完成 (用于刷新菜单显示)
        // (已经在 saveCurrentCharToCache 里存入 window.projectCharData 了)

        // 3. 刷新菜单，让按钮变成“切换”状态
        renderMultiCharMenu();

        // 4. 执行原有的生成世界书逻辑
        // 注意：原函数里可能用了 document.getElementById获取值，现在已经是当前角色的值了，没问题
        if(_oldConfirm) await _oldConfirm(name);
    };

    // 6. 🛡️ 自动保存守护 (页面刷新防丢)
    // 监听输入框变化，实时更新到花名册
    function bindAutoSave() {
        var inputs = ['cardDesc', 'cardFirstMes', 'cardMesExample'];
        inputs.forEach(id => {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', function() {
                    // 只有当名字在花名册里时才自动更新
                    var name = document.getElementById('cardName').value.trim();
                    if (name && window.projectCharData[name]) {
                        saveCurrentCharToCache();
                    }
                });
            }
        });
    }
    setTimeout(bindAutoSave, 1000);

    console.log("✅ 多人面板切换系统已就绪");

})();

/* ================= 👥 V42.0 补丁：多人模式智能读档 & 动态加人 ================= */
(function() {
    console.log("🚀 执行 V42.0：正在升级多人模式存储与交互逻辑...");

    // 1. 💾 持久化存储键名
    const MULTI_PROJECT_KEY = 'my_multi_project_v1';

    // 2. 🔄 初始化与读取 (开局自动执行)
    function loadProjectData() {
        var json = localStorage.getItem(MULTI_PROJECT_KEY);
        if (json) {
            try {
                var data = JSON.parse(json);
                // 恢复花名册
                window.projectCharData = data.charData || {};
                // 恢复名单列表
                if (!window.advisorState) window.advisorState = {};
                window.advisorState.multiChars = data.charList || [];
                console.log("✅ 多人项目数据已恢复:", window.advisorState.multiChars);
            } catch (e) {
                console.error("读取失败:", e);
            }
        }
    }
    // 立即读取一次
    loadProjectData();

    // 3. 💾 保存函数 (每次变动都存)
    window.saveMultiProject = function() {
        var data = {
            charData: window.projectCharData || {},
            charList: window.advisorState.multiChars || []
        };
        localStorage.setItem(MULTI_PROJECT_KEY, JSON.stringify(data));
    };

    // 4. 🔥 覆盖：多人模式入口 (智能判断)
    window.initMultiCharUI = function() {
        // A. 检查是否有存档
        if (window.advisorState.multiChars && window.advisorState.multiChars.length >= 1) {
            // 有人！直接进面板，不废话
            window.advisorState.mode = 'multi';
            
            var chat = document.getElementById('advisorChat');
            chat.innerHTML = `
                <div class="advisor-bubble" style="background:#e3f2fd;">
                    <b>📂 读取到现有项目</b><br>
                    检测到名单中有 ${window.advisorState.multiChars.length} 人。<br>
                    <small style="color:#666;">(若想增加角色，请在输入框说“我要加人”)</small>
                </div>
            `;
            // 渲染面板
            renderMultiCharMenu();
            
            // 提示用户
            if(window.auth && window.auth.toast) window.auth.toast('✅ 已加载现有角色列表');
            return;
        }

        // B. 没人 -> 走老流程 (询问)
        window.appendMultiChars(true); // true 表示是初始化模式
    };

    // 5. ➕ 新增/初始化角色逻辑
    window.appendMultiChars = function(isInit) {
        var msg = isInit ? "👥 请输入角色人数 (例如: 3):" : "➕ 要加几个人？";
        var count = prompt(msg);
        if (!count) return;

        var msg2 = isInit ? "请输入所有人的名字 (用逗号分隔，如: 张三, 李四):" : "请输入新角色的名字 (逗号分隔):";
        var namesStr = prompt(msg2);
        if (!namesStr) return;
        
        var newNames = namesStr.split(/[,，]/).map(n => n.trim()).filter(n => n);
        
        if (!window.advisorState.multiChars) window.advisorState.multiChars = [];
        
        // 合并名单
        window.advisorState.multiChars = window.advisorState.multiChars.concat(newNames);
        window.advisorState.mode = 'multi';

        // 保存！
        saveMultiProject();

        // 渲染
        renderMultiCharMenu();
        
        var chat = document.getElementById('advisorChat');
        chat.innerHTML += `<div class="advisor-bubble">✅ 已添加 ${newNames.length} 位新角色！名单已更新。</div>`;
        chat.scrollTop = chat.scrollHeight;
    };

    // 6. 🔥 拦截聊天：检测“加人”指令
    // 我们需要再次拦截 sendAdvisorMsg，这次是为了加人功能
    var _oldSendV31 = window.sendAdvisorMsg; // 备份 V31/V36 的逻辑

    window.sendAdvisorMsg = async function() {
        var input = document.getElementById('advisorInput');
        var text = input.value.trim();
        
        // 仅在多人模式下生效
        if (window.advisorState.mode === 'multi' && text) {
            // 关键词检测
            if (text.includes("加人") || text.includes("增加") || text.includes("添加") || text.includes("新角色")) {
                
                // 清空输入框
                input.value = '';
                
                // 弹出确认框
                if (confirm(`🤖 军师：您是想在现有名单外，再增加新角色吗？`)) {
                    window.appendMultiChars(false); // false 表示追加模式
                } else {
                    // 如果取消，就在聊天框提示一下
                    var chat = document.getElementById('advisorChat');
                    chat.innerHTML += `<div class="advisor-bubble">🆗 操作已取消。</div>`;
                }
                return; // 拦截结束
            }
        }

        // 如果不是加人指令，或者是其他模式，走原来的逻辑 (V31/V36)
        if (_oldSendV31) _oldSendV31();
    };

    // 7. 补充：每次生成/切换后也触发保存
    // 劫持 saveCurrentCharToCache (V41 的函数)
    var _oldSaveCache = window.saveCurrentCharToCache;
    window.saveCurrentCharToCache = function() {
        if (_oldSaveCache) _oldSaveCache();
        saveMultiProject(); // 顺便存到硬盘
    };

    console.log("✅ V42.0：多人模式已具备记忆功能");

})();

/* ================= 📝 V56.0 补丁：强制模板化生成引擎 ================= */
(function() {
    console.log("🚀 执行 V56.0：已加载【莫惊棠同款】高阶人设模板...");

    // 1. 定义标准模板结构 (作为 Prompt 的一部分)
    const STANDARD_TEMPLATE = `
<character_information character="角色名">
基本信息：
名称: [Name]
性别: [Gender]
年龄: [Age]
身份:
- 公开身份: [Public Identity]
- 真实身份: [Hidden Identity]

外貌与形象 (Appearance)
整体气质：[Describe Aura]
五官与神态：
- 面容: [Face details]
- 眼睛: [Eye details]
- 眉骨与眉形: [Eyebrow details]
- 唇形: [Lip details]
体态与身形：
- 身高: [Height]
- 体型: [Body Type]
- 皮肤: [Skin]
- 手: [Hand details]
发型与发色：
- 长度与质感: [Hair details]
- 日常造型: [Daily Style]
- 私下风格: [Private Style]
标志性特征：
- [Feature 1]
- [Feature 2]

服饰偏好 (Aesthetic)
公开场合: [Public Outfit Style]
- 风格定位: [Style keywords]
- 色彩偏好: [Colors]
- 款式特点: [Outfit details]
- 配饰选择: [Accessories]
私密场合: [Private Outfit Style]
- 风格定位: [Style keywords]
- 色彩偏好: [Colors]
- 款式特点: [Outfit details]
- 配饰选择: [Accessories]

性格特征 (Personality)
- 表层人格 (Persona): [Public Persona keywords]
  - [Trait 1]: [Description]
  - [Trait 2]: [Description]
- 深层内核 (Inner Self): [True Self keywords]
  - [Trait 1]: [Description]
  - [Trait 2]: [Description]
- 特殊心理机制 (选填): [Special Psychology, e.g. Masochism/Obsession]

语言风格 (Speaking Style)
- 公众面前: [Public Tone]
- 与{{user}}独处: [Private Tone]
- 常用句式:
  - [Type 1]: "Example dialogue..."
  - [Type 2]: "Example dialogue..."

背景经历 (Background)
- 第一幕: [Early Life]
- 第二幕: [Key Trauma/Event]
- 转折点: [Turning Point involving {{user}}]
- 第三幕: [Current Situation]

对User的态度与关系 (Relationship with User)
- 核心情感: [Core Emotion keywords]
1. [Emotion 1]: [Description]
2. [Emotion 2]: [Description]
- 日常相处模式:
  - 公众场合: [Behavior]
  - 私下独处: [Behavior]
</character_information>
    `;

    // 2. 覆盖：单人一键生成 (autoGenDesc)
    window.autoGenDesc = async function() {
        var name = document.getElementById('cardName').value.trim();
        if (!name) { 
            if(window.auth && window.auth.toast) window.auth.toast('先给角色起个名字吧！'); 
            return; 
        }
        
        // 获取标签
        var tagStr = "无";
        if(window.currentSelectedTags) {
            var allTags = [
                ...window.currentSelectedTags.identity, 
                ...window.currentSelectedTags.personality, 
                ...window.currentSelectedTags.trope
            ];
            tagStr = allTags.join('、');
        }

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) { 
            if(window.auth && window.auth.toast) window.auth.toast('⚠️ 未填API Key，已切换手动模式');
            // 显示编辑框让用户自己写
            var refineBox = document.getElementById('refineArea_desc');
            if(refineBox) refineBox.style.display = 'block';
            return; 
        }

        var btn = event.target;
        var oldText = btn.innerText;
        btn.innerText = '📝 正在套用模板生成...'; btn.style.pointerEvents = 'none';

        // 🔥 Prompt：强制使用模板
        var prompt = `
        我是创造者。请为角色【${name}】写一段详细设定。
        【强制要求】：
        1. 必须严格遵守以下 XML 模板格式，保留所有标签和结构。
        2. 基于标签：${tagStr}。
        3. 内容要极其详尽，描写细腻，模仿文学小说风格。
        
        【模板】：
        ${STANDARD_TEMPLATE}
        `;

        try {
            var res = await fetchAI(prompt, config);
            var cleanText = res.replace(/```xml/g, '').replace(/```/g, '').trim();
            
            // 填入
            document.getElementById('cardDesc').value = cleanText;
            
            // 存入缓存
            if (!window.lastGeneratedData) window.lastGeneratedData = {};
            window.lastGeneratedData.desc = cleanText;
            
            // 显示编辑框
            var refineBox = document.getElementById('refineArea_desc');
            if(refineBox) refineBox.style.display = 'block';

            if(typeof updateJsonSource === 'function') updateJsonSource();
            
            // 提示去确认
            if(window.auth && window.auth.toast) window.auth.toast('✅ 设定已生成 (标准模板格式)');
            
            // 高亮确定按钮
            var confirmBtn = document.getElementById('btnConfirmDesc');
            if(confirmBtn) {
                confirmBtn.innerHTML = "✨ 请点击此处确认";
                confirmBtn.style.transform = "scale(1.1)";
                setTimeout(() => {
                    confirmBtn.innerHTML = "✅ 确定设定 (并生成世界书)";
                    confirmBtn.style.transform = "scale(1)";
                }, 2000);
            }

        } catch (e) {
            console.error(e);
            if(window.auth && window.auth.toast) window.auth.toast('❌ 生成出错，请重试');
        } finally {
            btn.innerText = oldText; btn.style.pointerEvents = 'auto';
        }
    };

    // 3. 覆盖：多人模式生成 (generateCharSettings)
    // 逻辑：在 V31.1 的基础上，把 Prompt 换成模板版
    
    // 我们不需要完全重写 V31.1，只需要劫持它的 fetchAI 调用前的 prompt 即可
    // 但为了稳妥，我们直接覆盖 generateCharSettings 的核心发送部分
    
    // 由于 V31.1 把逻辑写在了 sendAdvisorMsg 里，我们需要覆盖 sendAdvisorMsg
    // 这是一个比较大的手术，为了保证兼容性，我们只修改 prompt 变量
    
    var _oldSendV31 = window.sendAdvisorMsg;
    
    window.sendAdvisorMsg = async function() {
        // 如果是多人模式且有等待角色
        if (window.pendingMultiCharName) {
            var input = document.getElementById('advisorInput');
            var text = input.value.trim();
            if (!text) return;

            // 显示用户消息
            var chat = document.getElementById('advisorChat');
            chat.innerHTML += `<div style="text-align:right; margin:5px 0; color:#1565c0; font-size:12px; padding:5px; background:#e3f2fd; border-radius:8px; display:inline-block; margin-left:auto;">${text}</div><div style="clear:both;"></div>`;
            input.value = '';
            input.placeholder = "等待指令...";
            input.style.border = "";

            var targetName = window.pendingMultiCharName;
            window.pendingMultiCharName = null;

            chat.insertAdjacentHTML('beforeend', `<div id="multi-loading" class="ai-loading">📝 正在按标准模板撰写【${targetName}】...</div>`);
            chat.scrollTop = chat.scrollHeight;

            var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
            if (!config || !config.apiKey) { alert("请先配置 API Key"); return; }

            // 🔥 核心修改：多人模式也用模板 Prompt
            var prompt = `
            我是创造者。
            请为多人剧本中的角色【${targetName}】写一段详细设定。
            
            【用户要求】：${text}
            
            【强制要求】：
            1. 必须严格遵守以下 XML 模板格式。
            2. 内容要详尽。
            
            【模板】：
            ${STANDARD_TEMPLATE}
            `;

            try {
                var res = await fetchAI(prompt, config);
                var cleanText = res.replace(/```xml/g, '').replace(/```/g, '').trim();
                
                document.getElementById('multi-loading').remove();
                document.getElementById('cardDesc').value = cleanText;
                
                chat.innerHTML += `
                    <div class="advisor-bubble">
                        ✅ 【${targetName}】设定已填入！<br>
                        <button class="advisor-action-btn" onclick="confirmCharAndGenLore('${targetName}')">
                            💾 确定 (并生成专属世界书)
                        </button>
                    </div>
                `;
                chat.scrollTop = chat.scrollHeight;
                if(typeof switchCardTab === 'function') switchCardTab('preview');

            } catch (e) {
                console.error(e);
                if(document.getElementById('multi-loading')) document.getElementById('multi-loading').remove();
                chat.innerHTML += `<div class="advisor-bubble">❌ 生成失败：${e.message}</div>`;
            }
            return; // 拦截结束
        }

        // 其他情况走旧逻辑
        if (_oldSendV31) _oldSendV31();
    };

    // 4. 覆盖：点击确认后的生成逻辑 (confirmDescAndGenLore)
    // 逻辑：直接把设定框里的内容（已经是 XML 格式了）做成世界书
    window.confirmDescAndGenLore = function(arg) {
        // 兼容多人模式传参 (arg 是名字) 或 按钮点击 (arg 是 event)
        var name = (typeof arg === 'string') ? arg : document.getElementById('cardName').value.trim();
        var desc = document.getElementById('cardDesc').value.trim();

        // 简单校验是否是 XML
        if (!desc.includes('<character_information')) {
            if (!confirm("⚠️ 检测到当前设定不是标准模板格式。\n是否继续生成世界书？(生成效果可能受影响)")) return;
        }

        // 视觉反馈
        var descBox = document.getElementById('cardDesc');
        var oldBg = descBox.style.backgroundColor;
        descBox.style.transition = "background 0.3s";
        descBox.style.backgroundColor = "#d4edda"; 
        setTimeout(() => descBox.style.backgroundColor = oldBg, 500);

        if (confirm(`✅ 设定已确认！\n\n是否立即基于【${name}】的这段设定，生成专属的【人设世界书】？`)) {
            // 跳转
            if(typeof switchCardTab === 'function') switchCardTab('world');
            
            // 🔥 核心逻辑：直接把 XML 设定塞进世界书
            // 不需要再让 AI 总结了，因为 XML 本身就是最好的格式！
            
            // 构造新的世界书条目
            var newEntry = {
                id: Date.now(),
                comment: `${name} - 核心设定 (XML)`,
                keys: [name, "你", "我", "user"], // 强力触发
                content: desc, // 直接用设定全文！
                position: 1,
                enabled: true,
                constant: false, // 非常驻，按需触发
                insertion_position: 1
            };
            
            // 注入
            if (!window.currentWorldInfo) window.currentWorldInfo = { entries: [] };
            window.currentWorldInfo.entries.push(newEntry);
            
            // 刷新列表
            if (typeof renderWorldList === 'function') renderWorldList();
            if (typeof selectEntry === 'function') selectEntry(window.currentWorldInfo.entries.length - 1);
            
            // 提示
            if(window.auth && window.auth.toast) window.auth.toast('✅ 设定已直接存入世界书！');
            
            // 自动保存到多人花名册 (如果是多人模式)
            if (typeof saveCurrentCharToCache === 'function') saveCurrentCharToCache();
            if (typeof renderMultiCharMenu === 'function') renderMultiCharMenu();
        }
    };

    console.log("✅ V56.0：模板化生成引擎已启动");

})();

/* ================= 🎨 V59.0 补丁：UI/世界书分离与定向生成系统 ================= */
(function() {
    console.log("🚀 执行 V59.0：已切断美化自动关联，新增定向生成按钮...");

    // 1. 覆盖：应用美化 (applyBeautify)
    // 🔥 彻底移除任何“生成世界书”的副作用，只做纯粹的 UI 替换
    window.applyBeautify = function(encCode, encRegex) {
        var code = decodeURIComponent(encCode);
        var regex = decodeURIComponent(encRegex);
        
        // A. 切换到前端页
        if(typeof switchCardTab === 'function') switchCardTab('regex');
        if(typeof switchRegexUI === 'function') switchRegexUI('frontend');
        
        // B. 填入代码
        document.getElementById('frontReplace').value = code;
        document.getElementById('frontPattern').value = regex;
        
        // C. 自动填测试词 (提取正则里的关键词)
        var rawKey = regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '').replace(/\[|\]/g, '');
        document.getElementById('regexTestInput').value = rawKey;
        
        // D. 运行测试
        if(typeof runRegexTest === 'function') runRegexTest();
        if(typeof syncStatToNote === 'function') syncStatToNote();

        // E. 仅提示应用成功，不生成世界书
        if(window.auth && window.auth.toast) window.auth.toast('✅ UI代码已应用 (如需配套指令，请点聊天框里的生成按钮)');
    };

    // 2. 新增：生成配套世界书 (generateUIWorldInfo)
    window.generateUIWorldInfo = async function(encCode, encRegex, btn) {
        if(btn) {
            btn.innerHTML = "⏳ 解析逻辑中...";
            btn.disabled = true;
        }

        var code = decodeURIComponent(encCode);
        var regex = decodeURIComponent(encRegex);
        var styleGuide = window.frontendStyleGuide || ""; // 用户上传的模板
        var charName = document.getElementById('cardName').value || "Char";
        var charDesc = document.getElementById('cardDesc').value || "";

        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        if (!config || !config.apiKey) { alert("请先配置 API Key"); return; }

        // 🔥 Prompt：核心逻辑
        // 只有这里才会使用美化模板 + 代码 + 人设
        var prompt = `
        我是酒馆卡作者。
        我刚刚为角色【${charName}】设计了一套前端 UI 特效。
        现在需要你写一条 **World Info (世界书)** 条目，作为 System Note 告诉 AI 如何使用这套 UI。

        【输入素材】：
        1. **美化模板/规范** (Style Template): 
           ${styleGuide ? styleGuide.substring(0, 2000) : "无 (请根据代码自行分析)"}
        
        2. **生成的代码** (Generated Code): 
           ${code.substring(0, 1000)}...
           
        3. **触发正则** (Regex): ${regex}
        
        4. **角色设定** (Persona): ${charDesc.substring(0, 300)}...

        【任务要求】：
        请分析上面的代码和模板逻辑，生成一条**系统指令**。
        这条指令需要教会 AI：在什么情境下，应该输出什么关键词来触发这个特效。
        
        必须返回纯 JSON 对象：
        {
            "title": "UI系统 - [功能名]",
            "keys": ["system", "ui", "display"],
            "content": "[System Note: When the character is angry, output [STATUS=ANGRY] to trigger the red border effect...]"
        }
        注意：Content 必须是具体的指令，指导 AI 何时输出正则关键词。
        `;

        try {
            var res = await fetchAI(prompt, config);
            var cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
            // 容错处理：有时 AI 会返回数组，有时是对象
            var data;
            if (cleanJson.startsWith('[')) {
                data = JSON.parse(cleanJson)[0];
            } else {
                data = JSON.parse(cleanJson);
            }

            // --- 直接注入世界书 ---
            if(typeof switchCardTab === 'function') switchCardTab('world');

            var newEntry = {
                id: Date.now(),
                comment: "🖥️ UI指令 - " + (data.title || "特效控制"),
                keys: data.keys || ["ui", "system"],
                content: data.content,
                position: 1, // 高优先级
                enabled: true,
                constant: true, // 常驻，确保 UI 随时能触发
                insertion_position: 1
            };

            if (!window.currentWorldInfo) window.currentWorldInfo = { entries: [] };
            window.currentWorldInfo.entries.push(newEntry);

            if (typeof renderWorldList === 'function') renderWorldList();
            if (typeof selectEntry === 'function') selectEntry(window.currentWorldInfo.entries.length - 1);

            if(window.auth && window.auth.toast) window.auth.toast('✅ 配套 UI 世界书已生成！');
            
            if(btn) {
                btn.innerHTML = "✅ 已生成指令";
                btn.style.background = "#d4edda";
                btn.style.color = "#155724";
            }

        } catch (e) {
            console.error(e);
            alert("生成失败: " + e.message);
            if(btn) {
                btn.innerHTML = "❌ 失败";
                btn.disabled = false;
            }
        }
    };

    // 3. 覆盖：美化生成逻辑 (runBeautifyGeneration)
    // 目的：在气泡里增加那个“生成配套世界书”的按钮
    window.runBeautifyGeneration = async function(text, loadingId) {
        var chat = document.getElementById('advisorChat');
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        var desc = document.getElementById('cardDesc').value || "通用角色";

        // Prompt (保持 V46 的强力版)
        var styleGuideContent = window.frontendStyleGuide || "";
        var stylePrompt = "";
        if (styleGuideContent) {
            stylePrompt = `【强制参考样式规范】:\n\`\`\`css\n${styleGuideContent.substring(0, 3000)}\n\`\`\``;
        }

        var prompt = `
        你是一个前端UI设计师。
        用户需求：${text}
        角色设定：${desc.substring(0, 200)}...
        ${stylePrompt}
        请设计 3 个 HTML/CSS 方案... (返回 JSON 数组)
        格式要求：JSON 数组，包含 code, regex, name, desc。
        `;

        try {
            var res = await fetchAI(prompt, config);
            // 使用 V46 的强力清洗引擎 (如果没有定义则用简单的)
            var data = (window.safeExtractJSON) ? window.safeExtractJSON(res) : JSON.parse(res.replace(/```json/g, '').replace(/```/g, '').trim());
            
            if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();

            chat.innerHTML += `<div class="advisor-bubble">✨ 设计完成！先预览，满意后再生成配套指令：</div>`;

            data.forEach((item, idx) => {
                var safeCode = encodeURIComponent(item.code);
                var safeRegex = encodeURIComponent(item.regex);
                var previewId = `preview_box_${Date.now()}_${idx}`;

                chat.innerHTML += `
                    <div class="advisor-bubble" style="border-left:4px solid #9c27b0; padding:10px;">
                        <b>🎨 方案 ${idx+1}: ${item.name}</b>
                        <div style="font-size:11px; color:#666; margin-bottom:5px;">${item.desc}</div>
                        
                        <div style="background:#eee; padding:10px; border-radius:5px; margin:5px 0; min-height:60px; overflow:hidden; cursor: zoom-in; border: 1px solid #ccc;"
                             onclick="window.enlargePreview('${safeCode}')">
                            <div id="${previewId}" style="pointer-events: none; transform: scale(0.8); transform-origin: top left; width: 125%;"></div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:5px;">
                            <div style="display:flex; gap:5px;">
                                <button class="advisor-action-btn" style="flex:1; background:#e1bee7; color:#4a148c;" onclick="applyBeautify('${safeCode}', '${safeRegex}')">
                                    ✅ 应用 UI 代码
                                </button>
                                <button class="advisor-action-btn" style="flex:1; background:#fff; border:1px solid #999; color:#555;" onclick="refineBeautify('${safeCode}', '${item.name}')">
                                    🔧 提意见
                                </button>
                            </div>
                            <button class="advisor-action-btn" style="background:#fff3e0; color:#e65100; border:1px solid #ffe0b2; font-size:11px;" 
                                    onclick="generateUIWorldInfo('${safeCode}', '${safeRegex}', this)">
                                🌍 生成配套世界书 (AI指令)
                            </button>
                        </div>
                    </div>
                `;
                
                setTimeout(() => {
                    var container = document.getElementById(previewId);
                    if(container) {
                        if (!container.shadowRoot) container.attachShadow({mode: 'open'});
                        container.shadowRoot.innerHTML = item.code;
                    }
                }, 100);
            });
            chat.scrollTop = chat.scrollHeight;

        } catch(e) {
            console.error(e);
            if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
            chat.innerHTML += `<div class="advisor-bubble">❌ 生成失败: ${e.message}</div>`;
        }
    };

    console.log("✅ V59.0：美化模式已升级为【手动配套生成】");

})();

/* ================= 🔪 V71.0：美化模式重写版 (独立运行·无依赖) ================= */
(function() {
    console.log("🚀 执行 V71.0：正在暴力重写美化模式...");

    // 1. 🛠️ 通用工具：把按钮变废 (防止重复点)
    window.markBtnAsUsed = function(btn) {
        if (btn) {
            btn.innerHTML = "✅ 已执行";
            btn.style.background = "#d4edda";
            btn.style.color = "#155724";
            btn.style.border = "1px solid #c3e6cb";
            btn.style.cursor = "not-allowed";
            btn.disabled = true;
        }
    };

    // 2. 🛠️ 预览放大工具 (防止缺失报错)
    if (typeof window.enlargePreview !== 'function') {
        window.enlargePreview = function(encCode) {
            var code = decodeURIComponent(encCode);
            var win = window.open("", "_blank");
            win.document.write(code);
        };
    }

    // ================= 🎨 核心功能函数 (全部挂载到 window) =================

    // A. 应用 UI 代码
    window.applyBeautify = function(encCode, encRegex, btn) {
        try {
            var code = decodeURIComponent(encCode);
            var regex = decodeURIComponent(encRegex);

            // 1. 强切 Tab
            if(typeof switchCardTab === 'function') switchCardTab('regex');
            
            // 2. 强开面板
            var uiPanel = document.getElementById('uiFrontendMode');
            if(uiPanel) uiPanel.style.display = 'block';
            var simplePanel = document.getElementById('uiSimpleMode');
            if(simplePanel) simplePanel.style.display = 'none';

            // 3. 填值
            var elCode = document.getElementById('frontReplace');
            var elRegex = document.getElementById('frontPattern');
            if(elCode) elCode.value = code;
            if(elRegex) elRegex.value = regex;

            // 4. 填测试词
            var rawKey = regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '').replace(/\[|\]/g, '');
            var elTest = document.getElementById('regexTestInput');
            if(elTest) elTest.value = rawKey;

            // 5. 运行测试
            if(typeof runRegexTest === 'function') runRegexTest();

            // 6. 锁定按钮
            markBtnAsUsed(btn);
            
            if(window.auth && window.auth.toast) window.auth.toast('✅ UI已应用');

        } catch(e) {
            alert("应用出错: " + e.message);
        }
    };

    // B. 提意见 (Refine)
    window.refineBeautify = function(encCode, name) {
        // 1. 存缓存
        if (!window.lastGeneratedData) window.lastGeneratedData = {};
        window.lastGeneratedData.frontend = { code: decodeURIComponent(encCode), name: name, regex: "" };
        
        // 2. 标记状态
        if (!window.advisorState) window.advisorState = {};
        window.advisorState.pendingRefine = 'frontend';

        // 3. 界面提示
        var input = document.getElementById('advisorInput');
        var chat = document.getElementById('advisorChat');
        
        input.value = "";
        input.placeholder = `🔧 对【${name}】哪里不满意？请告诉我...`;
        input.focus();
        input.style.border = "2px solid #e91e63"; // 粉色框提醒
        
        chat.innerHTML += `<div class="advisor-bubble" style="background:#ffebee; color:#c62828;">👂 请输入修改意见 (针对 ${name})...</div>`;
        chat.scrollTop = chat.scrollHeight;
    };

    // C. 生成配套世界书 (橙色按钮)
    window.generateUIWorldInfo = async function(encCode, encRegex, btn) {
        if(btn) { btn.innerText = "⏳ 解析中..."; btn.disabled = true; }

        try {
            var code = decodeURIComponent(encCode);
            var regex = decodeURIComponent(encRegex);
            var charName = document.getElementById('cardName').value || "Char";
            
            var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
            if (!config || !config.apiKey) throw new Error("API Key未配置");

            // 发送请求
            var prompt = `分析UI代码，生成System Note。\n角色：${charName}\n代码：${code.substring(0,300)}...\n正则：${regex}\n返回JSON:{title, keys, content}`;
            
            var res = await fetch(`${config.apiUrl}/chat/completions`, {
                method: 'POST', headers: {'Content-Type':'application/json','Authorization':`Bearer ${config.apiKey}`},
                body: JSON.stringify({model: config.model, messages:[{role:"user", content:prompt}]})
            });
            var json = await res.json();
            var content = json.choices[0].message.content;
            var data = JSON.parse(content.replace(/```json/g,'').replace(/```/g,'').trim());
            if(Array.isArray(data)) data = data[0];

            // 注入
            if(typeof switchCardTab === 'function') switchCardTab('world');
            if(!window.currentWorldInfo) window.currentWorldInfo = { entries: [] };
            
            window.currentWorldInfo.entries.push({
                id: Date.now(), comment: "UI-"+(data.title||"特效"), keys:data.keys||["ui"], content:data.content,
                position:1, enabled:true, constant:true, insertion_position:1
            });
            
            if (typeof renderWorldList === 'function') renderWorldList();
            
            markBtnAsUsed(btn);
            if(window.auth && window.auth.toast) window.auth.toast('✅ 配套指令已生成');

        } catch(e) {
            console.error(e);
            if(btn) { btn.innerText = "❌ 失败"; btn.disabled = false; }
        }
    };

    // ================= 🧠 生成逻辑 (包含按钮渲染) =================

    window.runBeautifyGeneration = async function(text, loadingId) {
        var chat = document.getElementById('advisorChat');
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        var desc = document.getElementById('cardDesc').value || "通用角色";

        // 简单的 Prompt，不再依赖外部变量
        var prompt = `
        你是一个前端UI设计师。
        用户需求：${text}
        角色设定：${desc.substring(0, 200)}...
        请设计 3 个 HTML/CSS 方案。
        必须返回纯 JSON 数组，包含 code, regex, name, desc。
        JSON 内部双引号必须转义。
        `;

        try {
            var res = await fetch(`${config.apiUrl}/chat/completions`, {
                method: 'POST', headers: {'Content-Type':'application/json','Authorization':`Bearer ${config.apiKey}`},
                body: JSON.stringify({model: config.model, messages:[{role:"user", content:prompt}]})
            });
            var json = await res.json();
            var content = json.choices[0].message.content;
            var data = JSON.parse(content.replace(/```json/g,'').replace(/```/g,'').trim());
            
            var loadEl = document.getElementById(loadingId);
            if(loadEl) loadEl.remove();

            chat.innerHTML += `<div class="advisor-bubble">✨ 设计完成！请选择：</div>`;

            data.forEach((item, idx) => {
                // 🔥 核心：编码数据，防止 HTML 属性截断
                var safeCode = encodeURIComponent(item.code);
                var safeRegex = encodeURIComponent(item.regex);
                var previewId = `preview_box_${Date.now()}_${idx}`;

                chat.innerHTML += `
                    <div class="advisor-bubble" style="border-left:4px solid #9c27b0; padding:10px;">
                        <b>🎨 方案 ${idx+1}: ${item.name}</b>
                        <div style="font-size:11px; color:#666; margin-bottom:5px;">${item.desc}</div>
                        
                        <div style="background:#eee; padding:10px; border-radius:5px; margin:5px 0; min-height:60px; overflow:hidden; cursor: zoom-in; border: 1px solid #ccc;"
                             onclick="window.enlargePreview('${safeCode}')" title="点击放大">
                            <div id="${previewId}" style="pointer-events: none; transform: scale(0.8); transform-origin: top left; width: 125%;"></div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:5px;">
                            <div style="display:flex; gap:5px;">
                                <button class="advisor-action-btn" style="flex:1; background:#e1bee7; color:#4a148c;" 
                                    onclick="window.applyBeautify('${safeCode}', '${safeRegex}', this)">
                                    ✅ 直接使用
                                </button>
                                <button class="advisor-action-btn" style="flex:1; background:#fff; border:1px solid #999; color:#555;" 
                                    onclick="window.refineBeautify('${safeCode}', '${item.name}')">
                                    🔧 提意见
                                </button>
                            </div>
                            <button class="advisor-action-btn" style="background:#fff3e0; color:#e65100; border:1px solid #ffe0b2; font-size:11px;" 
                                    onclick="window.generateUIWorldInfo('${safeCode}', '${safeRegex}', this)">
                                🌍 生成配套世界书 (AI指令)
                            </button>
                        </div>
                    </div>
                `;
                
                // 渲染预览
                setTimeout(() => {
                    var container = document.getElementById(previewId);
                    if(container) {
                        if (!container.shadowRoot) container.attachShadow({mode: 'open'});
                        container.shadowRoot.innerHTML = item.code;
                    }
                }, 100);
            });
            chat.scrollTop = chat.scrollHeight;

        } catch(e) {
            console.error(e);
            var loadEl = document.getElementById(loadingId);
            if(loadEl) loadEl.remove();
            chat.innerHTML += `<div class="advisor-bubble">❌ 生成失败: ${e.message}</div>`;
        }
    };

    // ================= ⚡️ 拦截逻辑 (确保请求能进来) =================
    // 强制劫持 sendAdvisorMsg，确保美化模式的请求能被处理
    
    var _originalSend = window.sendAdvisorMsg; // 备份一下，万一有其他模式

    window.sendAdvisorMsg = async function() {
        var input = document.getElementById('advisorInput');
        var text = input.value.trim();
        if(!text) return;

        // A. 拦截“提意见” (Refine)
        if (window.advisorState.pendingRefine === 'frontend') {
            window.advisorState.pendingRefine = null;
            
            input.value = '';
            input.placeholder = "请点击上方按钮选择功能...";
            input.style.border = "1px solid #ccc";

            var chat = document.getElementById('advisorChat');
            chat.innerHTML += `<div style="text-align:right; margin:5px 0; color:#6a1b9a; font-size:12px; padding:5px; background:#f3e5f5; border-radius:8px; display:inline-block; margin-left:auto;">${text}</div><div style="clear:both;"></div>`;
            
            var loadingId = 'loading-' + Date.now();
            chat.insertAdjacentHTML('beforeend', `<div id="${loadingId}" class="ai-loading">🎨 正在修改...</div>`);
            
            await window.runBeautifyGeneration(text, loadingId);
            return;
        }

        // B. 拦截“美化模式”
        if (window.advisorState.mode === 'beautify') {
            input.value = '';
            
            var chat = document.getElementById('advisorChat');
            chat.innerHTML += `<div style="text-align:right; margin:5px 0; color:#6a1b9a; font-size:12px; padding:5px; background:#f3e5f5; border-radius:8px; display:inline-block; margin-left:auto;">${text}</div><div style="clear:both;"></div>`;
            
            var loadingId = 'loading-' + Date.now();
            chat.insertAdjacentHTML('beforeend', `<div id="${loadingId}" class="ai-loading">🎨 正在设计 UI...</div>`);
            chat.scrollTop = chat.scrollHeight;

            await window.runBeautifyGeneration(text, loadingId);
            return;
        }

        // C. 其他模式放行
        if (_originalSend) _originalSend();
    };

    console.log("✅ V71.0：美化模式已暴力重置 (独立运行版)");
    if(window.auth && window.auth.toast) window.auth.toast('🎨 美化模式已修复');

})();

/* ================= 🛡️ V72.0 补丁：安全交互模式 (数据分离版) ================= */
(function() {
    console.log("🚀 执行 V72.0：启动安全交互协议，正在接管点击事件...");

    // 1. 建立数据保险箱
    window.beautifyCache = {}; // 存储结构: { id: { code, regex, name, desc } }

    // 2. 覆盖生成逻辑：生成不带代码的“安全按钮”
    window.runBeautifyGeneration = async function(text, loadingId) {
        var chat = document.getElementById('advisorChat');
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        var desc = document.getElementById('cardDesc').value || "通用角色";

        // 简单的 Prompt
        var prompt = `
        你是一个前端UI设计师。
        用户需求：${text}
        角色设定：${desc.substring(0, 200)}...
        请设计 3 个 HTML/CSS 方案。
        必须返回纯 JSON 数组，包含 code, regex, name, desc。
        JSON 内部双引号必须转义。
        `;

        try {
            var res = await fetch(`${config.apiUrl}/chat/completions`, {
                method: 'POST', headers: {'Content-Type':'application/json','Authorization':`Bearer ${config.apiKey}`},
                body: JSON.stringify({model: config.model, messages:[{role:"user", content:prompt}]})
            });
            var json = await res.json();
            var content = json.choices[0].message.content;
            // 强力解析
            var data = JSON.parse(content.replace(/```json/g,'').replace(/```/g,'').trim());
            
            var loadEl = document.getElementById(loadingId);
            if(loadEl) loadEl.remove();

            chat.innerHTML += `<div class="advisor-bubble">✨ 设计完成！(V72 安全模式)：</div>`;

            data.forEach((item, idx) => {
                // 🔥 核心改变：生成唯一 ID，存入保险箱
                var uniqueId = "ui_" + Date.now() + "_" + idx;
                window.beautifyCache[uniqueId] = item;

                var previewId = `preview_${uniqueId}`;

                // 按钮不再包含代码，只包含 data-id
                chat.innerHTML += `
                    <div class="advisor-bubble" style="border-left:4px solid #00bcd4; padding:10px;">
                        <b>🎨 方案 ${idx+1}: ${item.name}</b>
                        <div style="font-size:11px; color:#666; margin-bottom:5px;">${item.desc}</div>
                        
                        <div style="background:#eee; padding:10px; border-radius:5px; margin:5px 0; min-height:60px; overflow:hidden;"
                             onclick="window.enlargePreviewCache('${uniqueId}')" title="点击放大">
                            <div id="${previewId}" style="pointer-events: none; transform: scale(0.8); transform-origin: top left; width: 125%;"></div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:5px;">
                            <div style="display:flex; gap:5px;">
                                <button class="safe-btn-apply advisor-action-btn" data-id="${uniqueId}" style="flex:1; background:#e0f7fa; color:#006064;">
                                    ✅ 应用 UI
                                </button>
                                <button class="safe-btn-refine advisor-action-btn" data-id="${uniqueId}" style="flex:1; background:#fff; border:1px solid #999; color:#555;">
                                    🔧 提意见
                                </button>
                            </div>
                            <button class="safe-btn-lore advisor-action-btn" data-id="${uniqueId}" style="background:#fff3e0; color:#e65100; border:1px solid #ffe0b2; font-size:11px;">
                                🌍 生成配套世界书
                            </button>
                        </div>
                    </div>
                `;
                
                // 渲染预览
                setTimeout(() => {
                    var container = document.getElementById(previewId);
                    if(container) {
                        if (!container.shadowRoot) container.attachShadow({mode: 'open'});
                        container.shadowRoot.innerHTML = item.code;
                    }
                }, 100);
            });
            chat.scrollTop = chat.scrollHeight;

        } catch(e) {
            console.error(e);
            var loadEl = document.getElementById(loadingId);
            if(loadEl) loadEl.remove();
            chat.innerHTML += `<div class="advisor-bubble">❌ 生成失败: ${e.message}</div>`;
        }
    };

    // 3. 🛠️ 预览放大工具 (从缓存读取)
    window.enlargePreviewCache = function(id) {
        var data = window.beautifyCache[id];
        if (data) {
            var win = window.open("", "_blank");
            win.document.write(data.code);
        }
    };

    // 4. 🔥 核心：全局事件委托 (Event Delegation)
    // 我们不再依赖 onclick，而是直接监听 body 的点击
    // 只要点击的元素带有特定的 class，就触发逻辑
    document.body.addEventListener('click', function(e) {
        var target = e.target;
        
        // 如果点的是按钮内部的文字，就往上找按钮
        if (target.tagName !== 'BUTTON') {
            target = target.closest('button');
        }
        if (!target) return;

        // 检查是否有我们的 ID
        var id = target.getAttribute('data-id');
        if (!id) return;

        // 从保险箱取数据
        var data = window.beautifyCache[id];
        if (!data) {
            console.warn("数据已过期或丢失");
            return;
        }

        // --- 分流处理 ---

        // A. 点击了【应用 UI】
        if (target.classList.contains('safe-btn-apply')) {
            console.log("⚡ V72: 触发应用 UI");
            e.preventDefault();
            e.stopPropagation(); // 阻止其他拦截器

            try {
                if(typeof switchCardTab === 'function') switchCardTab('regex');
                var uiPanel = document.getElementById('uiFrontendMode');
                if(uiPanel) uiPanel.style.display = 'block';

                document.getElementById('frontReplace').value = data.code;
                document.getElementById('frontPattern').value = data.regex;
                
                // 填测试词
                var rawKey = data.regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '').replace(/\[|\]/g, '');
                document.getElementById('regexTestInput').value = rawKey;

                if(typeof runRegexTest === 'function') runRegexTest();

                // 变色锁定
                target.innerHTML = "✅ 已应用";
                target.style.background = "#d4edda";
                target.disabled = true;
                
                if(window.auth && window.auth.toast) window.auth.toast('✅ UI已应用');
            } catch(err) { alert("应用出错: " + err.message); }
        }

        // B. 点击了【提意见】
        if (target.classList.contains('safe-btn-refine')) {
            console.log("⚡ V72: 触发提意见");
            e.preventDefault();
            
            // 存入全局缓存供 AI 知道改什么
            if (!window.lastGeneratedData) window.lastGeneratedData = {};
            window.lastGeneratedData.frontend = data;
            
            if (!window.advisorState) window.advisorState = {};
            window.advisorState.pendingRefine = 'frontend';

            var input = document.getElementById('advisorInput');
            input.value = "";
            input.placeholder = `🔧 对【${data.name}】哪里不满意？`;
            input.focus();
            input.style.border = "2px solid #e91e63";
            
            var chat = document.getElementById('advisorChat');
            chat.innerHTML += `<div class="advisor-bubble" style="background:#ffebee; color:#c62828;">👂 请输入修改意见...</div>`;
            chat.scrollTop = chat.scrollHeight;
        }

        // C. 点击了【生成配套世界书】
        if (target.classList.contains('safe-btn-lore')) {
            console.log("⚡ V72: 触发配套生成");
            e.preventDefault();
            
            target.innerHTML = "⏳ 解析中...";
            target.disabled = true;

            // 独立发起请求，防止 fetchAI 被污染
            (async function() {
                try {
                    var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
                    var charName = document.getElementById('cardName').value || "Char";
                    var prompt = `分析UI代码，生成System Note。\n角色：${charName}\n代码：${data.code.substring(0,300)}...\n正则：${data.regex}\n返回JSON:{title, keys, content}`;
                    
                    var res = await fetch(`${config.apiUrl}/chat/completions`, {
                        method: 'POST', headers: {'Content-Type':'application/json','Authorization':`Bearer ${config.apiKey}`},
                        body: JSON.stringify({model: config.model, messages:[{role:"user", content:prompt}]})
                    });
                    var json = await res.json();
                    var aiData = JSON.parse(json.choices[0].message.content.replace(/```json/g,'').replace(/```/g,'').trim());
                    if(Array.isArray(aiData)) aiData = aiData[0];

                    if(typeof switchCardTab === 'function') switchCardTab('world');
                    if(!window.currentWorldInfo) window.currentWorldInfo = { entries: [] };
                    
                    window.currentWorldInfo.entries.push({
                        id: Date.now(), comment: "UI-"+(aiData.title||"特效"), keys:aiData.keys||["ui"], content:aiData.content,
                        position:1, enabled:true, constant:true, insertion_position:1
                    });
                    
                    if (typeof renderWorldList === 'function') renderWorldList();
                    
                    target.innerHTML = "✅ 已生成";
                    target.style.background = "#d4edda";
                    if(window.auth && window.auth.toast) window.auth.toast('✅ 配套指令已生成');
                } catch(err) {
                    console.error(err);
                    target.innerHTML = "❌ 失败";
                    target.disabled = false;
                }
            })();
        }

    }, true); // Use capture phase to catch event early

    console.log("✅ V72.0：安全交互模式已启动。现在点击美化按钮应该稳如泰山。");
    if(window.auth && window.auth.toast) window.auth.toast('🛡️ 交互系统已重构');

})();


/* ================= 👥 V42.1 补丁：多人模式重置与缓存清理 ================= */
(function() {
    console.log("🚀 执行 V42.1：添加多人模式重置功能...");

    // 1. 🗑️ 核心：清空多人项目数据
    window.resetMultiProject = function() {
        if (!confirm("⚠️ 确定要清空多人模式的当前名单吗？\n\n这将删除：\n1. 当前的张三、李四等名字\n2. 已经生成的角色设定缓存\n\n(不会删除已导出的文件)")) return;

        // 清除内存
        window.advisorState.multiChars = [];
        window.projectCharData = {};
        
        // 🔥 清除硬盘缓存 (Local Storage)
        localStorage.removeItem('my_multi_project_v1');
        
        // 提示并重新初始化
        if(window.auth && window.auth.toast) window.auth.toast('🧹 多人项目已清空！');
        
        // 重新运行初始化逻辑 (这次会因为没数据而弹窗问你)
        window.appendMultiChars(true);
    };

    // 2. 🔥 覆盖：渲染多人菜单 (增加重置按钮)
    window.renderMultiCharMenu = function() {
        var chat = document.getElementById('advisorChat');
        var names = window.advisorState.multiChars || [];
        var currentName = document.getElementById('cardName').value.trim();

        // 如果名单为空，自动引导去添加
        if (names.length === 0) {
            window.appendMultiChars(true);
            return;
        }

        // 生成按钮列表
        var btnsHtml = names.map(name => {
            var hasData = window.projectCharData && window.projectCharData[name];
            var isCurrent = (name === currentName);
            
            var btnStyle = "background:#e3f2fd; color:#1565c0;"; 
            var btnText = `⚡ 生成【${name}】设定`;
            var action = `generateCharSettings('${name}')`;

            if (hasData) {
                if (isCurrent) {
                    btnStyle = "background:#4caf50; color:white; border:1px solid #388e3c;";
                    btnText = `🟢 编辑中：${name}`;
                    action = "";
                } else {
                    btnStyle = "background:#fff; border:1px solid #1565c0; color:#1565c0;";
                    btnText = `👤 切换至：${name}`;
                    action = `switchCharPanel('${name}')`;
                }
            }
            return `<button class="advisor-action-btn" style="${btnStyle}" onclick="${action}">${btnText}</button>`;
        }).join('');
        
        // 渲染面板 (底部增加了红色重置按钮)
        chat.innerHTML = `
            <div class="advisor-bubble" style="background:#f5f5f5; border-left:4px solid #673ab7;">
                <b>👥 多人角色管理台</b><br>
                <div style="font-size:11px; color:#666; margin-bottom:5px;">
                    当前名单：${names.join(', ')}
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    ${btnsHtml}
                </div>
                
                <hr style="border:0; border-top:1px dashed #ccc; margin:10px 0;">
                
                <div style="display:flex; gap:5px;">
                    <button class="advisor-action-btn" style="flex:1; background:#fff; color:#d32f2f; border:1px solid #d32f2f;" onclick="window.resetMultiProject()">
                        🗑️ 清空重置
                    </button>
                    <button class="advisor-action-btn" style="flex:1; background:#e0f2f1; color:#00695c;" onclick="window.appendMultiChars(false)">
                        ➕ 增加一人
                    </button>
                </div>
            </div>
        `;
        chat.scrollTop = chat.scrollHeight;
    };

    console.log("✅ V42.1：已修复幽灵数据问题");

})();

/* ================= 🧬 V73.0 补丁：详细设定 -> 世界书 (1:1 镜像克隆版) ================= */
(function() {
    console.log("🚀 执行 V73.0：已启用【镜像克隆】模式，设定将原样存入世界书...");

    // 覆盖：确认设定并生成世界书
    window.confirmDescAndGenLore = function(arg) {
        // 1. 获取数据
        // 兼容按钮点击(event) 或 多人模式传参(name string)
        var name = (typeof arg === 'string') ? arg : document.getElementById('cardName').value.trim();
        var desc = document.getElementById('cardDesc').value; // 不 trim，保留格式

        if (!name) name = "未命名角色";

        // 2. 校验
        if (!desc || desc.length < 5) {
            alert("⚠️ 详细设定是空的！请先生成或填写内容。");
            return;
        }

        // 3. 视觉反馈 (让输入框闪一下绿光)
        var descBox = document.getElementById('cardDesc');
        if(descBox) {
            var oldBg = descBox.style.backgroundColor;
            descBox.style.transition = "background 0.3s";
            descBox.style.backgroundColor = "#d4edda"; 
            setTimeout(() => descBox.style.backgroundColor = oldBg, 500);
        }

        // 4. 确认流程
        if (confirm(`✅ 设定已确认！\n\n是否将这段设定【原封不动】地存入世界书？\n(1:1 克隆，保留所有 XML 格式和细节)`)) {
            
            // --- A. 跳转到世界书页 ---
            if(typeof switchCardTab === 'function') switchCardTab('world');

            // --- B. 构造条目 (无需 AI，直接构建) ---
            var newEntry = {
                id: Date.now(),
                // 备注：名字 - 核心设定
                comment: `${name} - 核心设定 (镜像)`,
                // 触发词：名字, 我, 你 (确保必定触发)
                keys: [name, "你", "我", "user", "System"], 
                // 🔥 内容：直接等于详细设定！
                content: desc, 
                // 属性：放在最前，常驻生效
                position: 0, // 0 = Before Char (最优先)
                enabled: true,
                constant: true, // 设为常驻，让设定永远生效
                insertion_position: 0 // 插入位置：顶层
            };

            // --- C. 注入数据 ---
            if (!window.currentWorldInfo) window.currentWorldInfo = { entries: [] };
            window.currentWorldInfo.entries.push(newEntry);

            // --- D. 刷新列表并选中 ---
            if (typeof renderWorldList === 'function') renderWorldList();
            if (typeof selectEntry === 'function') selectEntry(window.currentWorldInfo.entries.length - 1);

            // --- E. 提示成功 ---
            if(window.auth && window.auth.toast) window.auth.toast('🧬 设定已 100% 克隆至世界书！');
            
            // 如果是多人模式，顺便保存一下进度
            if (typeof saveCurrentCharToCache === 'function') saveCurrentCharToCache();
            if (typeof renderMultiCharMenu === 'function') renderMultiCharMenu();
        }
    };

    console.log("✅ V73.0：设定确认逻辑已改为【直接复制】");

})();

/* ================= 🧬 V74.0 补丁：多人模式 -> 世界书 (1:1 直连克隆版) ================= */
(function() {
    console.log("🚀 执行 V74.0：多人模式确认按钮已升级为【直接克隆】...");

    // 覆盖：多人模式专属的确认函数
    window.confirmCharAndGenLore = function(name) {
        // 1. 先保存到多人花名册 (缓存)
        // 这样切换别人时，这个人的数据不会丢
        if (typeof saveCurrentCharToCache === 'function') saveCurrentCharToCache();

        // 2. 获取当前的设定内容
        var desc = document.getElementById('cardDesc').value;
        
        if (!desc || desc.length < 10) {
            alert("⚠️ 设定太短了，没法生成世界书！");
            return;
        }

        // 3. 🔥 核心：直接构建世界书条目 (不调 AI)
        var newEntry = {
            id: Date.now(),
            // 备注：角色名 - 设定
            comment: `${name} - 核心设定 (多人镜像)`,
            // 触发词：角色名, 我, 你
            keys: [name, "你", "我", "user"],
            // 内容：直接复制详细设定！
            content: desc,
            // 属性：高优先级，常驻
            position: 1, 
            enabled: true,
            constant: true, 
            insertion_position: 1
        };

        // 4. 注入世界书
        if (!window.currentWorldInfo) window.currentWorldInfo = { entries: [] };
        
        // 检查是否已经存在同名条目，避免重复添加
        var existIdx = window.currentWorldInfo.entries.findIndex(e => e.comment === `${name} - 核心设定 (多人镜像)`);
        if (existIdx !== -1) {
            // 如果有了，就更新它
            window.currentWorldInfo.entries[existIdx] = newEntry;
        } else {
            // 如果没有，就加新的
            window.currentWorldInfo.entries.push(newEntry);
        }

        // 5. 刷新界面
        if (typeof renderWorldList === 'function') renderWorldList();
        if (typeof renderMultiCharMenu === 'function') renderMultiCharMenu(); // 刷新菜单状态(变绿)

        // 6. 提示与跳转
        if(window.auth && window.auth.toast) window.auth.toast(`✅ 【${name}】设定已保存至世界书！`);
        
        var chat = document.getElementById('advisorChat');
        if (chat) {
            chat.innerHTML += `<div class="advisor-bubble">🎉 【${name}】已归档！设定已1:1克隆进世界书。<br>请点击菜单继续下一个角色。</div>`;
            chat.scrollTop = chat.scrollHeight;
        }
        
        // 自动跳到世界书页让你看一眼
        // if(typeof switchCardTab === 'function') switchCardTab('world'); 
    };

    console.log("✅ V74.0：多人模式确认按钮已修复");

})();

/* ================= 🧬 V75.0 补丁：文风 & 世界观 -> 世界书 (1:1 直连版) ================= */
(function() {
    console.log("🚀 执行 V75.0：已启用全模式【镜像克隆】，拒绝 AI 中间商...");

    // 1. 工具：按钮变绿锁定
    function lockButton(btn) {
        if (btn) {
            btn.innerHTML = "✅ 已归档 (1:1克隆)";
            btn.style.background = "#d4edda";
            btn.style.color = "#155724";
            btn.style.borderColor = "#c3e6cb";
            btn.disabled = true;
        }
    }

    // ================= 🌏 2. 世界观模式：直连写入 =================
    window.applyWorldView = function(encodedContent, btn) {
        // 如果是从事件触发，尝试获取按钮
        if (!btn && event) btn = event.target;

        try {
            var content = decodeURIComponent(encodedContent);
            
            // A. 跳转页面
            if(typeof switchCardTab === 'function') switchCardTab('world');
            
            // B. 直接构建条目 (不调 AI)
            var newEntry = {
                id: Date.now(),
                // 自动提取标题或使用默认
                comment: "🌏 核心世界观 (镜像)",
                // 触发词：world, setting, background
                keys: ["world", "setting", "background", "世界观"], 
                // 🔥 核心：直接使用原文！
                content: content, 
                // 属性：放在最前，常驻生效
                position: 0, 
                enabled: true,
                constant: true, 
                insertion_position: 0 
            };

            // C. 注入
            if (!window.currentWorldInfo) window.currentWorldInfo = { entries: [] };
            window.currentWorldInfo.entries.push(newEntry);

            // D. 刷新
            if (typeof renderWorldList === 'function') renderWorldList();
            if (typeof selectEntry === 'function') selectEntry(window.currentWorldInfo.entries.length - 1);

            // E. 反馈
            lockButton(btn);
            if(window.auth && window.auth.toast) window.auth.toast('🌏 世界观已 100% 原样存入！');

        } catch (e) {
            console.error(e);
            alert("应用失败: " + e.message);
        }
    };

    // ================= ✒️ 3. 文风模式：直连写入 =================
    window.addStyleToWorld = function(encObj, btn) {
        if (!btn && event) btn = event.target;

        try {
            var item = JSON.parse(decodeURIComponent(encObj));
            
            // A. 跳转
            if(typeof switchCardTab === 'function') switchCardTab('world');
            
            // B. 直接构建条目 (Style Bible)
            var newEntry = {
                id: Date.now(),
                comment: "✒️ 文风 - " + (item.title || "Style"),
                // 触发词
                keys: ["style", "文风", "system", "writing_style"], 
                // 🔥 核心：直接使用原文！
                content: item.content || item.prompt, 
                // 属性：常驻
                position: 1, 
                enabled: true,
                constant: true, 
                insertion_position: 1
            };
            
            // C. 注入
            if (!window.currentWorldInfo) window.currentWorldInfo = { entries: [] };
            window.currentWorldInfo.entries.push(newEntry);
            
            // D. 刷新
            if (typeof renderWorldList === 'function') renderWorldList();
            if (typeof selectEntry === 'function') selectEntry(window.currentWorldInfo.entries.length - 1);
            
            // E. 反馈
            lockButton(btn);
            if(window.auth && window.auth.toast) window.auth.toast('✒️ 文风设定已 100% 原样存入！');
            
        } catch(e) {
            console.error(e);
            alert("注入失败: " + e.message);
        }
    };

    console.log("✅ V75.0：所有生成模式均已升级为【直接写入】");

})();

/* ================= 🛠️ V78.0 补丁：世界书“让它改”常驻 (焊死版) ================= */
(function() {
    console.log("🚀 执行 V78.0：正在把世界书的修改框焊死...");

    // 1. 定义注入函数
    function injectWorldRefineBox() {
        // 找到世界书的内容输入框
        var contentBox = document.getElementById('wiContent');
        if (!contentBox) return; // 如果界面还没加载出来，先不管

        // 检查修改框是否已经存在
        var refineBox = document.getElementById('refineArea_world');

        // 如果不存在，现场造一个
        if (!refineBox) {
            console.log("🔨 为世界书打造常驻修改框...");
            refineBox = document.createElement('div');
            refineBox.id = 'refineArea_world';
            
            // 样式：浅灰色背景，虚线边框，紧贴上方
            refineBox.style.cssText = "display:block; margin-top:5px; margin-bottom:10px; background:#f5f5f5; padding:8px; border-radius:5px; border:1px dashed #bbb;";
            
            // 内部 HTML
            refineBox.innerHTML = `
                <div style="display:flex; gap:5px; align-items:center;">
                    <span style="font-size:12px; color:#e67e22; font-weight:bold;">🔧 润色/扩写:</span>
                    
                    <input type="text" id="refineInput_world" class="visual-input" 
                           placeholder="输入意见 (如: 扩写细节、改为古风...)" 
                           style="flex:1; padding:5px; font-size:12px;">
                    
                    <button class="small-btn" onclick="window.triggerWorldRefine()" 
                            style="background:#f39c12; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                        🔄 让它改
                    </button>
                </div>
            `;

            // 插入到 contentBox 的后面
            contentBox.parentNode.insertBefore(refineBox, contentBox.nextSibling);
        }

        // 🔥 强制显示 (防止被其他逻辑隐藏)
        refineBox.style.display = 'block';
    }

    // 2. 定义专属触发函数 (自动读取当前内容)
    window.triggerWorldRefine = function() {
        var currentContent = document.getElementById('wiContent').value;
        if (!currentContent) {
            alert("⚠️ 还没内容呢，先写点东西或者生成一条吧！");
            return;
        }

        // 🔥 关键步骤：欺骗系统，假装这是刚生成的
        // 这样 refineResult 就能读到它，并让 AI 基于它进行修改
        if (!window.lastGeneratedData) window.lastGeneratedData = {};
        
        // 构造符合结构的数据
        window.lastGeneratedData.world = {
            content: currentContent,
            comment: document.getElementById('wiComment').value,
            keys: document.getElementById('wiKeys').value.split(',')
        };

        // 调用通用的修改逻辑
        if (typeof window.refineResult === 'function') {
            window.refineResult('world');
        } else {
            alert("❌ 核心函数 refineResult 丢失，请检查之前的补丁！");
        }
    };

    // 3. 启动巡逻队 (每秒检查一次，确保它一直在)
    setInterval(injectWorldRefineBox, 1000);
    
    // 立即执行一次
    setTimeout(injectWorldRefineBox, 500);

    console.log("✅ V78.0：世界书修改框已常驻");

})();

/* ================= 🎨 V79.0 补丁：批量渲染引擎 (修复预览重复) ================= */
(function() {
    console.log("🚀 执行 V79.0：正在启动批量渲染引擎，杜绝影分身...");

    // 1. 建立数据保险箱 (防止数据丢失)
    window.beautifyCache = {}; 

    // 2. 覆盖生成逻辑 (核心修复)
    window.runBeautifyGeneration = async function(text, loadingId) {
        var chat = document.getElementById('advisorChat');
        var config = window.aiConfig || JSON.parse(localStorage.getItem('my_ai_config'));
        var desc = document.getElementById('cardDesc').value || "通用角色";

        var prompt = `
        你是一个前端UI设计师。
        用户需求：${text}
        角色设定：${desc.substring(0, 200)}...
        请设计 3 个 HTML/CSS 方案。
        必须返回纯 JSON 数组，包含 code, regex, name, desc。
        JSON 内部双引号必须转义。
        `;

        try {
            var res = await fetch(`${config.apiUrl}/chat/completions`, {
                method: 'POST', headers: {'Content-Type':'application/json','Authorization':`Bearer ${config.apiKey}`},
                body: JSON.stringify({model: config.model, messages:[{role:"user", content:prompt}]})
            });
            var json = await res.json();
            var content = json.choices[0].message.content;
            var data = JSON.parse(content.replace(/```json/g,'').replace(/```/g,'').trim());
            
            // 移除 Loading
            var loadEl = document.getElementById(loadingId);
            if(loadEl) loadEl.remove();

            chat.innerHTML += `<div class="advisor-bubble">✨ 设计完成！(V79 批量渲染版)：</div>`;

            // --- 🔥 核心修复开始：一次性构建 HTML ---
            var batchHTML = ""; // 这是一个大桶，先把水接满
            
            data.forEach((item, idx) => {
                var uniqueId = "ui_" + Date.now() + "_" + idx;
                window.beautifyCache[uniqueId] = item; // 存入保险箱
                var previewId = `preview_${uniqueId}`;

                batchHTML += `
                    <div class="advisor-bubble" style="border-left:4px solid #9c27b0; padding:10px;">
                        <b>🎨 方案 ${idx+1}: ${item.name}</b>
                        <div style="font-size:11px; color:#666; margin-bottom:5px;">${item.desc}</div>
                        
                        <div style="background:#eee; padding:10px; border-radius:5px; margin:5px 0; min-height:60px; overflow:hidden;"
                             onclick="window.enlargePreviewCache('${uniqueId}')" title="点击放大">
                            <div id="${previewId}" style="pointer-events: none; transform: scale(0.8); transform-origin: top left; width: 125%;"></div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:5px;">
                            <div style="display:flex; gap:5px;">
                                <button class="safe-btn-apply advisor-action-btn" data-id="${uniqueId}" style="flex:1; background:#e1bee7; color:#4a148c;">
                                    ✅ 应用 UI
                                </button>
                                <button class="safe-btn-refine advisor-action-btn" data-id="${uniqueId}" style="flex:1; background:#fff; border:1px solid #999; color:#555;">
                                    🔧 提意见
                                </button>
                            </div>
                            <button class="safe-btn-lore advisor-action-btn" data-id="${uniqueId}" style="background:#fff3e0; color:#e65100; border:1px solid #ffe0b2; font-size:11px;">
                                🌍 生成配套世界书
                            </button>
                        </div>
                    </div>
                `;
            });

            // 🔥 关键一步：使用 insertAdjacentHTML 而不是 innerHTML +=
            // 这样绝对不会破坏之前已经存在的元素，也不会导致重绘
            chat.insertAdjacentHTML('beforeend', batchHTML);
            chat.scrollTop = chat.scrollHeight;

            // --- 🔥 延迟注入预览 (等 HTML 稳定了再注入) ---
            setTimeout(() => {
                data.forEach((item, idx) => {
                    // 重新计算 ID 找到刚才生成的那个框
                    // 注意：这里的算法必须和上面生成 ID 的算法完全一致
                    // 我们遍历 cache 里的最新 3 个数据可能更稳，但这里简单处理：
                    // 因为是同步执行的，Date.now() 是一样的，我们需要闭包里的 uniqueId
                    
                    // 这里我们无法直接获取上面的 uniqueId，所以我们需要重新遍历一次 DOM 或者使用 data-id
                    // 最稳妥的方法：在上面循环里存一个 task 列表
                });
            }, 50);
            
            // 修正后的注入逻辑：
            // 我们直接在页面上找刚才生成的空预览框
            var allPreviews = chat.querySelectorAll('div[id^="preview_ui_"]');
            // 只处理最后 3 个 (也就是刚刚生成的)
            var startIdx = Math.max(0, allPreviews.length - data.length);
            
            for(let i = startIdx; i < allPreviews.length; i++) {
                let container = allPreviews[i];
                let id = container.id.replace('preview_', ''); // 拿到 uniqueId
                let item = window.beautifyCache[id]; // 从保险箱取数据
                
                if(container && item) {
                    // 注入 Shadow DOM (隔离样式，互不干扰)
                    if (!container.shadowRoot) container.attachShadow({mode: 'open'});
                    container.shadowRoot.innerHTML = item.code;
                }
            }
            // --- 核心修复结束 ---

        } catch(e) {
            console.error(e);
            if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
            chat.innerHTML += `<div class="advisor-bubble">❌ 生成失败: ${e.message}</div>`;
        }
    };

    // 3. 🛡️ 全局点击监听 (保留 V72 的安全点击逻辑)
    if (!window._hasBoundSafeClick) {
        document.body.addEventListener('click', function(e) {
            var target = e.target;
            if (target.tagName !== 'BUTTON') target = target.closest('button');
            if (!target) return;

            var id = target.getAttribute('data-id');
            if (!id) return;
            var data = window.beautifyCache[id];
            if (!data) return;

            // 应用逻辑
            if (target.classList.contains('safe-btn-apply')) {
                e.preventDefault(); e.stopPropagation();
                try {
                    if(typeof switchCardTab === 'function') switchCardTab('regex');
                    var ui = document.getElementById('uiFrontendMode');
                    if(ui) ui.style.display = 'block';

                    document.getElementById('frontReplace').value = data.code;
                    document.getElementById('frontPattern').value = data.regex;
                    
                    var rawKey = data.regex.replace(/^\//, '').replace(/\/g[im]*$/, '').replace(/\\/g, '').replace(/\[|\]/g, '');
                    document.getElementById('regexTestInput').value = rawKey;

                    if(typeof runRegexTest === 'function') runRegexTest();

                    target.innerHTML = "✅ 已应用";
                    target.style.background = "#d4edda";
                    target.disabled = true;
                    if(window.auth && window.auth.toast) window.auth.toast('✅ UI已应用');
                } catch(err) { alert(err.message); }
            }
            // ... (提意见和配套生成的逻辑保留 V72，此处省略以节省空间，因为 V72 代码还在生效) ...
            
        }, true);
        window._hasBoundSafeClick = true;
    }

    console.log("✅ V79.0：批量渲染补丁已应用，预览框不再打架。");

})();


/* ================= 💾 V49.0 补丁：切换至 IndexedDB 海量存储引擎 ================= */
(function() {
    console.log("🚀 执行 V49.0：正在迁移至海量数据库 (IndexedDB)...");

    const DB_NAME = "RoyalCreatorDB";
    const DB_VERSION = 1;
    const STORE_SAVES = "archives"; // 存档表
    const STORE_AUTO = "autosave";  // 自动备份表

    // ================= 1. 数据库底层工具 =================
    const dbSystem = {
        open: function() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = function(e) {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_SAVES)) {
                        db.createObjectStore(STORE_SAVES, { keyPath: "id" });
                    }
                    if (!db.objectStoreNames.contains(STORE_AUTO)) {
                        db.createObjectStore(STORE_AUTO, { keyPath: "key" });
                    }
                };
                req.onsuccess = (e) => resolve(e.target.result);
                req.onerror = (e) => reject(e);
            });
        },
        put: async function(storeName, data) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, "readwrite");
                const store = tx.objectStore(storeName);
                const req = store.put(data);
                req.onsuccess = () => resolve(true);
                req.onerror = (e) => reject(e);
            });
        },
        getAll: async function(storeName) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, "readonly");
                const store = tx.objectStore(storeName);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = (e) => reject(e);
            });
        },
        get: async function(storeName, key) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, "readonly");
                const store = tx.objectStore(storeName);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = (e) => reject(e);
            });
        },
        delete: async function(storeName, key) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, "readwrite");
                const store = tx.objectStore(storeName);
                const req = store.delete(key);
                req.onsuccess = () => resolve(true);
                req.onerror = (e) => reject(e);
            });
        }
    };

    // ================= 2. 数据采集器 (复用 V44 逻辑) =================
    function collectBigData() {
        var getVal = (id) => { var el = document.getElementById(id); return el ? el.value : ""; };
        return {
            inputs: {
                cardName: getVal('cardName'), cardDesc: getVal('cardDesc'),
                cardFirstMes: getVal('cardFirstMes'), cardMesExample: getVal('cardMesExample'),
                cardScenario: getVal('cardScenario'), cardNote: getVal('cardNote'),
                statEditor: getVal('statEditor'), 
                aiCodePrompt: getVal('aiCodePrompt'), aiWorldPrompt: getVal('aiWorldPrompt'),
                frontReplace: getVal('frontReplace'), frontPattern: getVal('frontPattern')
            },
            globals: {
                worldInfo: window.currentWorldInfo || { entries: [] },
                regexScripts: window.currentCardRegexes || [],
                wizardData: window.wizardData || {},
                selectedTags: window.currentSelectedTags || { identity:[], personality:[], trope:[] },
                statModules: window.statModules || [],
                projectCharData: window.projectCharData || {},
                advisorState: window.advisorState || { mode: 'menu', multiChars: [] },
                styleGuide: window.frontendStyleGuide || "",
                advisorChat: document.getElementById('advisorChat') ? document.getElementById('advisorChat').innerHTML : ""
            }
        };
    }

    // ================= 3. 覆盖：自动保存 (改为存入 IndexedDB) =================
    // 停止旧的定时器
    if (window.saveTimer) clearInterval(window.saveTimer);
    
    // 新的自动保存 (每 5 秒一次，不卡顿)
    window.saveToBlackBox = async function() {
        try {
            var data = collectBigData();
            // 如果是空数据就不存
            if (!data.inputs.cardName && !data.globals.worldInfo.entries.length) return;
            
            await dbSystem.put(STORE_AUTO, { key: "latest_autosave", data: data, time: Date.now() });
            // console.log("✅ 数据库自动备份完成");
        } catch (e) {
            console.error("自动备份出错:", e);
        }
    };
    setInterval(window.saveToBlackBox, 5000);

    // 覆盖恢复函数
    window.restoreFromBlackBox = async function() {
        try {
            var record = await dbSystem.get(STORE_AUTO, "latest_autosave");
            if (record && record.data) {
                console.log("📦 从数据库恢复现场...");
                restoreTotalSnapshot({ data: record.data.globals, inputs: record.data.inputs });
            }
        } catch (e) { console.error("恢复失败:", e); }
    };
    // 启动时尝试恢复
    setTimeout(window.restoreFromBlackBox, 1000);


    // ================= 4. 覆盖：手动存档 (Create Save) =================
    window.createNewSave = async function() {
        var name = document.getElementById('cardName').value.trim() || "未命名工程";
        var btn = document.querySelector('button[onclick*="createNewSave"]');
        if(btn) btn.innerHTML = "💾 正在写入数据库...";

        try {
            var fullData = collectBigData();
            var saveItem = {
                id: Date.now(), // 唯一键
                title: name,
                timestamp: new Date().toLocaleString(),
                data: fullData.globals,
                inputs: fullData.inputs
            };

            await dbSystem.put(STORE_SAVES, saveItem);
            
            if(window.auth && window.auth.toast) window.auth.toast('✅ 存入海量数据库成功！');
            renderSaveList(); // 刷新列表

        } catch (e) {
            alert("保存失败: " + e.message);
        } finally {
            if(btn) btn.innerHTML = "➕ 新建存档 (当前进度)";
        }
    };

    // ================= 5. 覆盖：读取存档列表 (Render List) =================
    window.renderSaveList = async function() {
        var list = document.getElementById('saveSlotList');
        if (!list) return;
        list.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">⏳ 正在读取数据库...</div>';

        try {
            var saves = await dbSystem.getAll(STORE_SAVES);
            // 按时间倒序
            saves.sort((a, b) => b.id - a.id);

            list.innerHTML = "";
            if (saves.length === 0) {
                list.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">暂无存档</div>';
                return;
            }

            saves.forEach((save) => {
                var div = document.createElement('div');
                div.style.cssText = "background:#fff; border:1px solid #ddd; margin-bottom:10px; padding:10px; border-radius:8px; cursor:pointer; position:relative; transition:0.2s;";
                div.onmouseover = function() { this.style.borderColor = '#6c5ce7'; };
                div.onmouseout = function() { this.style.borderColor = '#ddd'; };
                
                // 计算数据大小 (估算)
                var size = JSON.stringify(save).length;
                var sizeStr = size > 1024*1024 ? (size/1024/1024).toFixed(2)+"MB" : (size/1024).toFixed(0)+"KB";

                div.innerHTML = `
                    <div style="font-weight:bold; color:#333;">${save.title}</div>
                    <div style="font-size:10px; color:#999;">📅 ${save.timestamp} | 📦 ${sizeStr}</div>
                    <button onclick="event.stopPropagation(); deleteSave(${save.id})" style="position:absolute; right:10px; top:10px; border:none; background:none; color:#e74c3c; cursor:pointer; font-size:14px; padding:5px;">🗑️</button>
                `;
                
                // 绑定点击读取 (传入 ID)
                div.onclick = function() { loadSaveDB(save.id); };
                list.appendChild(div);
            });

        } catch (e) {
            list.innerHTML = '<div style="text-align:center;color:red;">数据库读取错误</div>';
        }
    };

    // ================= 6. 覆盖：读取单个存档 (Load) =================
    window.loadSaveDB = async function(id) {
        if (!confirm('⚠️ 确定读取吗？当前未保存的进度将被覆盖。')) return;
        
        try {
            var save = await dbSystem.get(STORE_SAVES, id);
            if (save) {
                // 复用 V44 的恢复逻辑 (如果存在)
                if (typeof restoreTotalSnapshot === 'function') {
                    restoreTotalSnapshot(save);
                } else {
                    alert("恢复函数丢失，请重新加载页面");
                }
                document.getElementById('saveManagerModal').style.display = 'none';
            }
        } catch (e) {
            alert("读取失败: " + e.message);
        }
    };
    // 兼容旧调用
    window.loadSave = function(idx) { console.log("旧版读取已禁用，请使用新版列表点击"); };

    // ================= 7. 覆盖：删除存档 (Delete) =================
    window.deleteSave = async function(id) {
        if(!confirm('确定永久删除这个存档吗？')) return;
        try {
            await dbSystem.delete(STORE_SAVES, id);
            renderSaveList();
        } catch(e) {
            alert("删除失败: " + e.message);
        }
    };

    // ================= 8. 覆盖：完结清空 =================
    window.finishAndClear = async function() {
        if(!confirm('🚨 确定要清空工作台吗？\n(这不会删除数据库里的存档，只会清空当前界面)')) return;
        
        // 1. 清空自动保存
        try { await dbSystem.delete(STORE_AUTO, "latest_autosave"); } catch(e){}

        // 2. 清空界面 (复用旧逻辑)
        var inputs = document.querySelectorAll('#cardCreatorModal input[type="text"], #cardCreatorModal textarea');
        inputs.forEach(i => i.value = '');
        
        window.currentWorldInfo = { entries: [] };
        window.currentCardRegexes = [];
        window.statModules = [];
        window.projectCharData = {};
        window.advisorState = { mode: 'menu', multiChars: [] };
        window.frontendStyleGuide = "";
        
        var chatBox = document.getElementById('advisorChat');
        if(chatBox) chatBox.innerHTML = "";

        // 刷新 UI
        if(typeof renderWorldList === 'function') renderWorldList();
        if(typeof renderRegexList === 'function') renderRegexList();
        if(typeof renderStatModuleList === 'function') renderStatModuleList();
        if(typeof showAdvisorMenu === 'function') showAdvisorMenu();

        if(window.auth && window.auth.toast) window.auth.toast('🧹 工作台已重置 (数据库存档安全)');
    };

    console.log("✅ V49.0：海量存储引擎已就绪，告别内存不足！");
    if(window.auth && window.auth.toast) window.auth.toast('💾 数据库已升级：容量无上限');

})();

/* ================= 🚑 V51.0 补丁：核心恢复逻辑补全 ================= */
(function() {
    console.log("🚀 执行 V51.0：正在修复恢复函数丢失问题...");

    // 1. 🔥 重新定义核心恢复函数 (无论之前有没有，强制重写)
    window.restoreTotalSnapshot = function(snapshot) {
        if (!snapshot) return;

        console.log("📦 正在执行数据恢复...");
        
        // 兼容 V44 (data/inputs) 和 V49 (data.globals/data.inputs) 的结构差异
        var d = snapshot.data || snapshot.globals; // 全局变量
        var i = snapshot.inputs; // 输入框内容

        // 如果结构不对，尝试直接读取 (容错)
        if (!d && snapshot.worldInfo) d = snapshot; 

        if (!d || !i) {
            console.warn("⚠️ 存档结构可能不完整，尝试尽力恢复...");
        }

        // --- A. 恢复输入框 ---
        function setVal(id, val) { 
            var el = document.getElementById(id); 
            if (el) el.value = val || ""; 
        }
        if (i) {
            for (var key in i) setVal(key, i[key]);
        }

        // --- B. 恢复全局变量 ---
        if (d) {
            window.currentWorldInfo = d.worldInfo || { entries: [] };
            window.currentCardRegexes = d.regexScripts || [];
            
            window.wizardData = d.wizardData || window.wizardData;
            window.currentSelectedTags = d.selectedTags || { identity:[], personality:[], trope:[] };
            
            window.statModules = d.statModules || [];
            window.projectCharData = d.projectCharData || {};
            
            window.advisorState = d.advisorState || { mode: 'menu', multiChars: [] };
            window.advisorMode = window.advisorState.mode;
            
            window.frontendStyleGuide = d.styleGuide || "";

            // 恢复聊天记录
            var chatBox = document.getElementById('advisorChat');
            if (chatBox && d.advisorChat) chatBox.innerHTML = d.advisorChat;
        }

        // --- C. 强制刷新所有 UI (让数据可见) ---
        
        // 1. 刷新标签
        if (typeof renderWizardTags === 'function') renderWizardTags();
        
        // 2. 刷新世界书
        if (typeof renderWorldList === 'function') renderWorldList();
        
        // 3. 刷新正则
        if (typeof renderRegexList === 'function') renderRegexList();
        
        // 4. 刷新属性模块
        if (typeof renderStatModuleList === 'function') {
            renderStatModuleList();
            // 尝试选中第一个模块
            if (window.statModules.length > 0 && typeof loadStatModule === 'function') {
                loadStatModule(0);
            }
        }
        
        // 5. 刷新多人模式菜单
        if (window.advisorState.mode === 'multi' && typeof renderMultiCharMenu === 'function') {
            renderMultiCharMenu();
        }
        
        // 6. 刷新美化文件状态
        var statusEl = document.getElementById('native_upload_status');
        if (statusEl && window.frontendStyleGuide) {
            statusEl.innerHTML = `✅ <b>已恢复美化文件</b> (大小: ${Math.ceil(window.frontendStyleGuide.length/1024)}KB)`;
            status.style.color = "#00b894";
        }

        // 7. 刷新预览
        if (typeof updatePreviewUI === 'function') updatePreviewUI();

        console.log("✅ 数据恢复完成");
        if(window.auth && window.auth.toast) window.auth.toast('📂 数据已成功加载');
    };

    // 2. 再次绑定 IndexedDB 的读取逻辑 (防止 V49 的绑定失效)
    if (window.dbSystem) {
        window.loadSaveDB = async function(id) {
            if (!confirm('⚠️ 确定读取吗？当前未保存的进度将被覆盖。')) return;
            try {
                var save = await dbSystem.get("archives", id);
                if (save) {
                    // V49 存的数据结构是 { id, title, data: globals, inputs: inputs }
                    // 所以这里传进去的对象要有 data 和 inputs
                    window.restoreTotalSnapshot({ data: save.data, inputs: save.inputs });
                    document.getElementById('saveManagerModal').style.display = 'none';
                }
            } catch (e) {
                alert("读取失败: " + e.message);
            }
        };
    }

    // 3. 立即尝试执行一次自动恢复 (如果之前报错导致中断)
    if (typeof restoreFromBlackBox === 'function') {
        setTimeout(restoreFromBlackBox, 500);
    }

    console.log("✅ V51.0：恢复系统已修复");

})();



// ================= 👑 写卡器代码结束 =================
