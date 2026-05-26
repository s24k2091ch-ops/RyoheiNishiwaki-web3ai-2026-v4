document.addEventListener('DOMContentLoaded', () => {
    // -------------------------
    // 交通機関の運行状況モック
    // -------------------------
    const transitForm = document.getElementById('transit-form');
    const transitInput = document.getElementById('transit-input');
    const transitResult = document.getElementById('transit-result');

    transitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const lineName = transitInput.value.trim();
        if (!lineName) return;

        // ローディング表示
        transitResult.innerHTML = `
            <div style="text-align:center; padding: 1rem;">
                <p style="color:var(--text-sub);">運行情報を取得中...</p>
            </div>
        `;
        transitResult.classList.remove('hidden');

        try {
            // RTI Gikenの無料API（実際の遅延情報）を直接呼び出し
            const response = await fetch('https://tetsudo.rti-giken.jp/free/delay.json');
            if (!response.ok) throw new Error('API fetch failed');
            
            const delays = await response.json();
            
            // 入力された路線名が遅延リストに含まれているかチェック（部分一致）
            const isDelayed = delays.some(train => train.name.includes(lineName));
            
            let statusBadge, statusText, statusDesc;
            
            if (isDelayed) {
                statusBadge = 'status-delay';
                statusText = '遅延';
                statusDesc = 'APIの情報によると、現在この路線に遅れが発生しています。';
            } else {
                statusBadge = 'status-normal';
                statusText = '平常運転';
                statusDesc = '現在、遅れなどの情報はありません。（※APIに登録がない路線の場合も平常運転と表示されます）';
            }

            transitResult.innerHTML = `
                <span class="status-badge ${statusBadge}">${statusText}</span>
                <h3 style="margin-top:0.5rem; margin-bottom:0.25rem;">${lineName}</h3>
                <p style="font-size:0.9rem; color:var(--text-sub);">${statusDesc}</p>
            `;
            
            // 再生アニメーションのためにクラスをリセット
            transitResult.style.animation = 'none';
            transitResult.offsetHeight; // trigger reflow
            transitResult.style.animation = null;
            
        } catch (error) {
            // APIサーバーが不安定な場合や、ローカルファイル(file://)特有のセキュリティ制限でブロックされた場合のフォールバック
            console.warn("API request failed, falling back to mock data:", error);
            
            const mockStatuses = [
                { status: 'normal', text: '平常運転', desc: '現在、遅れなどの情報はありません。（※現在API通信が制限されているため、ダミーデータを表示しています）', class: 'status-normal' },
                { status: 'delay', text: '遅延', desc: '一部の列車に遅れが出ています。（※現在API通信が制限されているため、ダミーデータを表示しています）', class: 'status-delay' }
            ];
            const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];

            transitResult.innerHTML = `
                <span class="status-badge ${randomStatus.class}">${randomStatus.text}</span>
                <h3 style="margin-top:0.5rem; margin-bottom:0.25rem;">${lineName}</h3>
                <p style="font-size:0.9rem; color:var(--text-sub);">${randomStatus.desc}</p>
            `;
            
            transitResult.style.animation = 'none';
            transitResult.offsetHeight;
            transitResult.style.animation = null;
        }
    });

    // -------------------------
    // 課題・提出物 締め切り管理
    // -------------------------
    const taskForm = document.getElementById('task-form');
    const taskNameInput = document.getElementById('task-name');
    const taskDeadlineInput = document.getElementById('task-deadline');
    const taskList = document.getElementById('task-list');

    let tasks = JSON.parse(localStorage.getItem('vpc_tasks')) || [];

    const saveTasks = () => {
        localStorage.setItem('vpc_tasks', JSON.stringify(tasks));
    };

    const renderTasks = () => {
        taskList.innerHTML = '';
        
        if (tasks.length === 0) {
            taskList.innerHTML = '<p style="color:var(--text-sub); text-align:center; font-size:0.9rem;">課題はまだありません</p>';
            return;
        }

        // 締め切りが近い順にソート
        tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        tasks.forEach(task => {
            const taskDate = new Date(task.deadline);
            taskDate.setHours(0, 0, 0, 0);
            
            const diffTime = taskDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let dateText = '';
            let isUrgent = false;

            if (diffDays < 0) {
                dateText = '期限切れ';
                isUrgent = true;
            } else if (diffDays === 0) {
                dateText = '今日まで！';
                isUrgent = true;
            } else if (diffDays <= 3) {
                dateText = `あと ${diffDays} 日`;
                isUrgent = true;
            } else {
                dateText = `あと ${diffDays} 日`;
            }

            const formattedDate = taskDate.toLocaleDateString('ja-JP');

            const item = document.createElement('div');
            item.className = `task-item ${isUrgent ? 'urgent' : ''}`;
            
            item.innerHTML = `
                <div class="task-info">
                    <h3>${task.name}</h3>
                    <p>期限: ${formattedDate} <span style="font-weight:600; color:${isUrgent ? 'var(--danger)' : 'var(--accent)'};">(${dateText})</span></p>
                </div>
                <button class="task-delete" data-id="${task.id}">×</button>
            `;

            taskList.appendChild(item);
        });

        // 削除ボタンのイベント付与
        document.querySelectorAll('.task-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                tasks = tasks.filter(t => t.id !== id);
                saveTasks();
                renderTasks();
            });
        });
    };

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = taskNameInput.value.trim();
        const deadline = taskDeadlineInput.value;

        if (!name || !deadline) return;

        const newTask = {
            id: Date.now().toString(),
            name,
            deadline
        };

        tasks.push(newTask);
        saveTasks();
        renderTasks();

        taskNameInput.value = '';
        taskDeadlineInput.value = '';
    });

    // 初期描画
    renderTasks();
});
