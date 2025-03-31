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
    const messagesRef = db.ref(`messages/${today}`);
    
    messagesRef.on("value", (snapshot) => {
      const data = snapshot.val() || {};
      const messages = Object.values(data);
      
      // Group message segments by messageId
      const messageGroups = {};
      messages.forEach(msg => {
        if (msg.messageId) {
          if (!messageGroups[msg.messageId]) {
            messageGroups[msg.messageId] = [];
          }
          messageGroups[msg.messageId][msg.segmentIndex] = msg;
        } else {
          // Handle non-segmented messages
          messageGroups[Date.now() + '_' + Math.random()] = [msg];
        }
      });

      // Merge segments and sort messages
      const mergedMessages = Object.values(messageGroups).map(segments => {
        if (segments.length === 1) return segments[0];
        
        // Merge segments
        const baseMsg = {...segments[0]};
        baseMsg.text = segments
          .sort((a, b) => a.segmentIndex - b.segmentIndex)
          .map(s => s.text)
          .join('');
        return baseMsg;
      });

      // Sort by timestamp
      const sortedMessages = mergedMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      // Clear and rebuild messages display
      const messagesDiv = document.getElementById('messages');
      messagesDiv.innerHTML = '';
      
      sortedMessages.forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.innerHTML = `
          <div class="message-header">
            <span class="name">${msg.name}</span>
            <span class="time">${formatTime(msg.timestamp)}</span>
          </div>
          <div class="message-content">${msg.text}</div>
        `;
        messagesDiv.appendChild(messageElement);
      });
      
      // Scroll to bottom
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
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

function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const nameSelect = document.getElementById('nameSelect');
  const text = messageInput.value.trim();
  const name = nameSelect.value;
  const today = new Date().toISOString().slice(0, 10);
  const db = window.firebaseDatabase;

  if (text && name) {
    const baseTimestamp = Date.now();
    
    // 如果是休總發的消息，自動回覆
    if (name === '休總') {
      // 先發送用戶的消息
      storeMessage(name, text, baseTimestamp).then(() => {
        // 延遲一下再發送休總的回覆
        setTimeout(() => {
          const responseText = generateXiuZongResponse(text);
          storeMessage('休總', responseText, Date.now()).then(() => {
            console.log('Response stored successfully');
          }).catch(error => {
            console.error('Error storing response:', error);
          });
        }, 1000);
      }).catch(error => {
        console.error('Error storing message:', error);
      });
    } else {
      // 如果不是休總的消息
      storeMessage(name, text, baseTimestamp).then(() => {
        console.log('User message stored successfully');
      }).catch(error => {
        console.error('Error storing message:', error);
      });
    }

    messageInput.value = '';
  }
}

function storeMessage(name, text, timestamp) {
  const today = new Date().toISOString().slice(0, 10);
  const db = window.firebaseDatabase;
  
  // 直接存储完整消息，不进行分段
  const messageData = {
    name,
    text,
    timestamp
  };
  
  // 使用 set 而不是 push 来确保数据完整性
  return db.ref(`messages/${today}`).push().set(messageData)
    .then(() => {
      console.log('Message stored successfully:', messageData);
    })
    .catch(error => {
      console.error('Error storing message:', error);
      throw error;
    });
}

function generateXiuZongResponse(userMessage) {
  // 根據用戶輸入生成完整的回應
  let response = '';
  
  // 冰淇淋相關
  if (userMessage.includes('冰') || userMessage.includes('冰淇淋')) {
    response = '別胡思亂想！要吃冰就得吃得健康！可以選擇低糖、低卡的冰品，或者自己製作水果冰棒，少吃一點但滿足口腹之慾。';
  }
  // 垃圾食品相關
  else if (userMessage.includes('垃圾') || userMessage.includes('零食') || userMessage.includes('餅乾')) {
    response = '唉，你又在吃這些沒營養的東西！不如試試無調味堅果、水果乾，或者自製能量棒。健康零食也可以很美味！';
  }
  // 運動相關
  else if (userMessage.includes('不想動') || userMessage.includes('懶得動')) {
    response = '哼！就知道你又在找藉口！來吧，我陪你一起運動，從簡單的開始。堅持運動的人最有魅力！';
  }
  // 疲勞相關
  else if (userMessage.includes('好累') || userMessage.includes('沒力')) {
    response = '累就要適當休息，但不能因此放棄！讓我幫你調整訓練計畫，找到最適合你的節奏。';
  }
  // 飲食相關
  else if (userMessage.includes('吃') || userMessage.includes('餓')) {
    response = '飲食要均衡，不是想吃什麼就吃什麼！我可以推薦幾家健康餐廳，或者教你做健康料理。';
  }
  // 預設回應
  else {
    const defaultResponses = [
      '哼！既然來找我了，就要聽我的建議！保持健康的生活方式需要堅持，我會監督你的！',
      '看來你對健康生活越來越重視了！雖然我說話直接，但都是為你好。繼續加油！',
      '需要我幫你調整計畫嗎？在追求健康的路上，我會一直督促你！'
    ];
    response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }
  
  return response;
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", init)
  : init();