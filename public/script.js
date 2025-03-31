console.log("✅ script.js 已成功載入！");
let myChart = null;

const encouragements = [
  "你是最棒的！🌟", "腳步不停，目標更近！🚶‍♀️", "太厲害了！再接再厲！🔥",
  "堅持就是勝利！💪", "每天一點點，終會看到成果！🌈", "再前進一小步，就是大進步！🚶"
];

function saveName(id) {
  const val = document.getElementById(id).value;
  localStorage.setItem("stepTracker_" + id, val);
}
function loadName(id) {
  const saved = localStorage.getItem("stepTracker_" + id);
  if (saved) document.getElementById(id).value = saved;
}

function getWeekRange(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toISO = d => d.toISOString().slice(0, 10);
  return { start: toISO(monday), end: toISO(sunday) };
}

function init() {
  const db = window.firebaseDatabase;
  const nameSelect = document.getElementById("nameSelect");
  const dateInput = document.getElementById("dateInput");
  const stepInput = document.getElementById("stepInput");
  const submitBtn = document.getElementById("submitBtn");
  const messageDiv = document.getElementById("message");
  const monthSelect = document.getElementById("monthSelect");
  const rankMode = document.getElementById("rankMode");

  const messageInput = document.getElementById("messageInput");
  const messageName = document.getElementById("messageName");
  const sendMessageBtn = document.getElementById("sendMessageBtn");
  const messageList = document.getElementById("messageList");

  const hugFrom = document.getElementById("hugFrom");
  const hugTo = document.getElementById("hugTo");
  const hugMessage = document.getElementById("hugMessage");
  const sendHugBtn = document.getElementById("sendHugBtn");
  const hugSentList = document.getElementById("hugSentList");
  const hugReceivedList = document.getElementById("hugReceivedList");

  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;

  ["nameSelect", "messageName", "hugFrom"].forEach(loadName);

  submitBtn.addEventListener("click", () => {
    const name = nameSelect.value;
    const date = dateInput.value;
    const steps = parseInt(stepInput.value, 10);
    if (!name || !date || isNaN(steps)) return alert("請完整填寫");
    saveName("nameSelect");

    const month = date.slice(0, 7);
    const ref = db.ref(`steps/${name}/${month}`);
    ref.once("value").then(snapshot => {
      const data = snapshot.val() || { total: 0, records: [] };
      data.total += steps;
      data.records.push({ date, steps });
      return ref.set(data);
    }).then(() => {
      const msg = encouragements[Math.floor(Math.random() * encouragements.length)];
      messageDiv.textContent = `🎉 簽到成功！${msg}`;
      messageDiv.style.display = "block";
      confetti();
      loadLeaderboard(rankMode.value);
    });
  });

  db.ref("steps").once("value").then(snapshot => {
    const months = new Set();
    snapshot.forEach(userSnap => {
      Object.keys(userSnap.val()).forEach(month => months.add(month));
    });
    const sortedMonths = Array.from(months).sort().reverse();
    sortedMonths.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });
    if (sortedMonths.length > 0) {
      monthSelect.value = sortedMonths[0];
      loadLeaderboard(rankMode.value);
    }
  });

  monthSelect.addEventListener("change", () => loadLeaderboard(rankMode.value));
  rankMode.addEventListener("change", () => loadLeaderboard(rankMode.value));

  sendMessageBtn.addEventListener("click", () => {
    const name = messageName.value;
    const text = messageInput.value.trim();
    if (!name || !text) return alert("請選擇名字並輸入訊息");
    saveName("messageName");

    const msgRef = db.ref(`messages/${today}`).push();
    msgRef.set({ 
      name, 
      text, 
      timestamp: Date.now()
    }).then(() => {
      messageInput.value = "";
      loadMessages();
    });
  });

  function loadMessages() {
    const messageList = document.getElementById('messageList');
    messageList.innerHTML = '';
    
    db.ref(`messages/${today}`).on("value", snapshot => {
      messageList.innerHTML = '';
      if (snapshot.exists()) {
        const messages = [];
        snapshot.forEach(child => {
          const message = child.val();
          messages.push({
            ...message,
            key: child.key,
            timestamp: message.timestamp || message.time
          });
        });
        
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        messages.forEach(message => {
          const li = document.createElement('li');
          li.className = message.name === '休總' ? 'list-group-item xiuzong' : 'list-group-item';
          
          const messageContent = document.createElement('div');
          messageContent.className = 'message-content';
          
          const icon = document.createElement('span');
          icon.className = message.name === '休總' ? 'message-icon xiuzong-icon' : 'message-icon';
          icon.textContent = message.name === '休總' ? '🎩' : '👤';
          
          const name = document.createElement('strong');
          name.className = message.name === '休總' ? 'xiuzong-name' : '';
          name.textContent = message.name;
          
          const text = document.createElement('span');
          text.className = message.name === '休總' ? 'xiuzong-text' : '';
          text.textContent = ': ' + (message.text || '');
          
          messageContent.appendChild(icon);
          messageContent.appendChild(name);
          messageContent.appendChild(text);
          
          li.appendChild(messageContent);
          messageList.appendChild(li);
        });
        
        messageList.scrollTop = messageList.scrollHeight;
      }
    });
  }

  sendHugBtn.addEventListener("click", () => {
    const from = hugFrom.value;
    const to = hugTo.value;
    const text = hugMessage.value.trim();
    if (!from || !to || !text) return alert("請完整選擇與輸入");
    if (from === to) return alert("不能擁抱自己哦 😄");
    saveName("hugFrom");

    const countRef = db.ref(`hugCounts/${today}/${from}`);
    countRef.once("value").then(snap => {
      const count = snap.val() || 0;
      if (count >= 3) return alert("你今天已經送出 3 次擁抱囉！");
      db.ref(`hugs/${today}`).push({ from, to, message: text }).then(() => {
        countRef.set(count + 1);
        hugMessage.value = "";
        updateHugData();
        shootHearts();
      });
    });
  });

  function updateHugData() {
    const me = hugFrom.value;
    let sentTo = [];
    hugSentList.textContent = "尚未擁抱";
    hugReceivedList.innerHTML = "";

    db.ref(`hugs/${today}`).once("value").then(snapshot => {
      snapshot.forEach(child => {
        const { from, to, message } = child.val();
        if (from === me) sentTo.push(to);
        if (to === me) {
          const li = document.createElement("li");
          li.className = "list-group-item";
          li.textContent = `✔️ ${from}：${message}`;
          hugReceivedList.appendChild(li);
        }
      });
      if (sentTo.length > 0) hugSentList.textContent = sentTo.join("、");
    });
  }

  function loadLeaderboard(mode) {
    const selectedMonth = document.getElementById("monthSelect").value;
    const today = new Date().toISOString().slice(0, 10);
    const weekRange = getWeekRange(today);

    const ref = db.ref("steps");
    ref.once("value").then(snapshot => {
      const userSteps = [];

      snapshot.forEach(userSnap => {
        const name = userSnap.key;
        const months = userSnap.val();
        let total = 0;

        if (mode === "month" && months[selectedMonth]) {
          total = months[selectedMonth].total || 0;
        } else if (mode === "week") {
          for (const month in months) {
            const records = months[month].records || [];
            records.forEach(r => {
              if (r.date >= weekRange.start && r.date <= weekRange.end) {
                total += r.steps || 0;
              }
            });
          }
        }

        if (total > 0) userSteps.push({ name, total });
      });

      userSteps.sort((a, b) => b.total - a.total);

      const table = document.getElementById("leaderboardTable");
      table.innerHTML = "<tr><th>名次</th><th>姓名</th><th>總步數</th><th>評語</th></tr>";
      userSteps.forEach((user, index) => {
        const comment = index === 0 ? "別再走了，留點給人追 🥇"
                      : index === 1 ? "你走太多了，坐下來休息 🥈"
                      : index === 2 ? "多走一點你就追上了 🥉"
                      : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${index + 1}</td><td>${user.name}</td><td>${user.total}</td><td>${comment}</td>`;
        table.appendChild(tr);
      });

      if (myChart) myChart.destroy();
      const ctx = document.getElementById("chart").getContext("2d");
      myChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: userSteps.map(u => u.name),
          datasets: [{
            label: "累積步數",
            data: userSteps.map(u => u.total),
            backgroundColor: "#4CAF50"
          }]
        }
      });
    });
  }

  loadMessages();
  updateHugData();
}

function shootHearts() {
  const container = document.getElementById("heartContainer");
  const emojis = ["💖", "💗", "💘", "💞", "💕"];
  for (let i = 0; i < 15; i++) {
    const span = document.createElement("span");
    span.className = "heart";
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.style.left = `${Math.random() * 200 - 100}px`;
    span.style.setProperty('--x', `${Math.random() * 100 - 50}px`);
    span.style.setProperty('--y', `${Math.random() * 100 - 50}px`);
    container.appendChild(span);

    setTimeout(() => {
      container.removeChild(span);
    }, 1200);
  }
}

function generateXiuZongResponse(userMessage) {
  // 關鍵詞匹配
  const keywords = {
    '垃圾食品': [
      '哼！又在吃垃圾食品？',
      '要記得均衡飲食，適量就好。',
      '下次帶你去吃健康的！'
    ],
    '不想動': [
      '又在找藉口偷懶？',
      '適度運動對身體很重要！',
      '要我陪你走走嗎？'
    ],
    '好累': [
      '這樣就累了？',
      '循序漸進，別太勉強。',
      '需要我幫你規劃嗎？'
    ],
    '吃': [
      '又在吃什麼了？',
      '記得要均衡營養！',
      '要不要試試健康餐？'
    ],
    '步': [
      '才走這麼一點？',
      '繼續保持，慢慢來！',
      '下次一起走吧！'
    ],
    '沒動力': [
      '這就想放棄了？',
      '設定目標，一步一步來！',
      '我會盯著你的！'
    ]
  };

  // 預設回覆
  const defaultResponses = [
    [
      '哼，又來了...',
      '保持規律很重要！',
      '我會關注你的！'
    ],
    [
      '什麼事啊？',
      '記得保持好習慣！',
      '需要指導找我！'
    ],
    [
      '真是麻煩...',
      '堅持就會有收穫！',
      '加油，看好你！'
    ]
  ];

  // 根據關鍵詞匹配回覆
  let response = null;
  for (const [keyword, replies] of Object.entries(keywords)) {
    if (userMessage.includes(keyword)) {
      response = replies;
      break;
    }
  }

  // 如果沒有匹配到關鍵詞，隨機選擇一個預設回覆
  if (!response) {
    response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }

  // 確保每條消息不會太長
  return response.map(text => text.slice(0, 100)).join(' ');
}

function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const nameSelect = document.getElementById('nameSelect');
  const text = messageInput.value.trim();
  const name = nameSelect.value;

  if (text && name) {
    // 限制消息長度
    const limitedText = text.slice(0, 100);
    const message = {
      name: name,
      text: limitedText,
      timestamp: Date.now()
    };

    // 如果是休總發的消息，自動回覆
    if (name === '休總') {
      // 先發送用戶的消息
      db.ref(`messages/${today}`).push(message).then(() => {
        // 延遲一下再發送休總的回覆
        setTimeout(() => {
          const response = {
            name: '休總',
            text: generateXiuZongResponse(limitedText),
            timestamp: Date.now()
          };
          db.ref(`messages/${today}`).push(response);
        }, 1000);
      });
    } else {
      db.ref(`messages/${today}`).push(message);
    }

    messageInput.value = '';
  }
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", init)
  : init();