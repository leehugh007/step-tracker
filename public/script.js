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
          text.textContent = ': ' + (message.text || '').replace(/[\n\r]+/g, ' ');
          
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
  // 檢查是否在挑戰或玩笑
  if (userMessage.includes('挑戰') || userMessage.includes('玩笑')) {
    return '慧蘭，你這是在跟我挑戰嗎？挑戰我教練的耐心？哈哈！開玩笑啦，我知道你一定也是想達成健康目標才會有這樣的動力！';
  }

  // 檢查是否提到肚子餓
  if (userMessage.includes('肚子') && (userMessage.includes('餓') || userMessage.includes('吃'))) {
    return '慧蘭，你這是在找藉口嗎！不要用肚子餓當作吃冰淇淋的藉口，要控制住自己的食慾才能保持健康啊！要不然等你餓到...';
  }

  // 關鍵詞匹配
  const keywords = {
    '垃圾食品': '哼！又在吃垃圾食品？雖然偶爾放縱可以理解，但要記得均衡飲食才是王道。下次帶你去吃些健康的，別老是吃這些。',
    '不想動': '又在找藉口偷懶了？適度運動對身體和心理健康都很重要，你應該比誰都清楚。要我陪你走走嗎？反正我剛好也想運動了。',
    '好累': '累？累個頭啊！這點挑戰就想放棄了嗎？要循序漸進，別一開始就給自己太大壓力，慢慢來比較快。需要的話...我可以幫你規劃一個適合的訓練計劃。',
    '吃': '哼！又在吃什麼了？就你最會吃！記得要均衡營養，不是說吃得多就好。要不要試試我推薦的健康餐？味道還不錯。',
    '步': '就這樣而已？還想成為運動達人？不過...能持之以恆地走也是不錯的開始。下次一起走吧！我會盯著你的進度。',
    '沒動力': '沒動力？這麼快就想放棄了嗎？真是讓人失望！設定一個合理的目標，然後一步一步朝著它前進。我會在旁邊看著你的，別讓我失望啊！',
    '坐': '哼！一坐下來就想吃東西？這樣怎麼行！與其坐著發呆，不如起來動一動。要不要跟我一起去運動？剛好我也想出去走走。'
  };

  // 根據關鍵詞匹配回覆
  for (const [keyword, response] of Object.entries(keywords)) {
    if (userMessage.includes(keyword)) {
      return response;
    }
  }

  // 預設回覆
  const defaultResponses = [
    '哼，又來打擾我了嗎？既然來了，就好好聽我說：保持規律的運動和健康的飲食才是王道。我會關注你的進度，別想偷懶！',
    '什麼事啊？這麼沒幹勁的樣子可不行！記得保持良好的生活習慣，這是最基本的。需要指導的話...哼，我勉強可以教你一下。',
    '真是個麻煩的傢伙...不過既然你這麼認真，我也不能不管你。加油吧！我會一直看著你的成長。'
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const nameSelect = document.getElementById('nameSelect');
  const text = messageInput.value.trim();
  const name = nameSelect.value;
  const today = new Date().toISOString().slice(0, 10);
  const db = window.firebaseDatabase;

  if (text && name) {
    const message = {
      name: name,
      text: text,
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
            text: generateXiuZongResponse(text),
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