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
    const today = new Date().toISOString().slice(0, 10);
    const db = window.firebaseDatabase;
    
    db.ref(`messages/${today}`).on("value", snapshot => {
      messageList.innerHTML = '';
      if (snapshot.exists()) {
        // 收集所有消息片段
        const messageSegments = {};
        snapshot.forEach(child => {
          const segment = child.val();
          // 如果消息有 messageId，说明是分段消息
          if (segment.messageId) {
            if (!messageSegments[segment.messageId]) {
              messageSegments[segment.messageId] = [];
            }
            messageSegments[segment.messageId].push(segment);
          } else {
            // 如果没有 messageId，说明是旧消息或单段消息
            messageSegments[child.key] = [{
              ...segment,
              messageId: child.key,
              segmentIndex: 0,
              totalSegments: 1
            }];
          }
        });
        
        // 合并和排序消息
        const messages = Object.values(messageSegments).map(segments => {
          // 按照片段索引排序
          segments.sort((a, b) => a.segmentIndex - b.segmentIndex);
          // 合并文本
          return {
            name: segments[0].name,
            text: segments.map(s => s.text).join(''),
            timestamp: segments[0].timestamp
          };
        });
        
        // 按时间戳排序
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        // 显示消息
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
          text.textContent = ': ' + message.text;
          
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
          storeMessage('休總', responseText, Date.now());
        }, 1000);
      });
    } else {
      // 如果不是休總的消息
      storeMessage(name, text, baseTimestamp);
    }

    messageInput.value = '';
  }
}

// 新增：處理消息存儲的函數
function storeMessage(name, text, timestamp) {
  const today = new Date().toISOString().slice(0, 10);
  const db = window.firebaseDatabase;
  const messageRef = db.ref(`messages/${today}`).push();
  const messageId = messageRef.key;

  // 如果消息長度超過100個字符，分段存儲
  if (text.length > 100) {
    const segments = [];
    const segmentCount = Math.ceil(text.length / 100);
    
    for (let i = 0; i < segmentCount; i++) {
      const start = i * 100;
      const end = Math.min((i + 1) * 100, text.length);
      const segmentText = text.slice(start, end);
      
      segments.push({
        name,
        text: segmentText,
        timestamp: timestamp + i,
        messageId,
        segmentIndex: i,
        totalSegments: segmentCount
      });
    }
    
    // 使用Promise.all確保所有段都存儲完成
    return Promise.all(segments.map(segment => 
      db.ref(`messages/${today}`).push().set(segment)
    ));
  } else {
    // 如果消息較短，直接存儲
    return messageRef.set({
      name,
      text,
      timestamp,
      messageId,
      segmentIndex: 0,
      totalSegments: 1
    });
  }
}

function generateXiuZongResponse(userMessage) {
  // 根據用戶輸入生成完整的回應
  let response = '';
  
  // 冰淇淋相關
  if (userMessage.includes('冰') || userMessage.includes('冰淇淋')) {
    response = '哼！又在想著吃冰淇淋了？雖然我理解你的渴望，但是要適可而止！如果真的很想吃，我建議你可以試試低脂優格冰淇淋，或者是自己做水果冰沙。這樣既能滿足你的慾望，又不會影響健康。記住，偶爾放縱可以，但要有節制！要不要我帶你去吃健康的甜點？我知道一家店的優格冰淇淋特別好吃，而且熱量比一般冰淇淋低很多。';
  }
  // 垃圾食品相關
  else if (userMessage.includes('垃圾') || userMessage.includes('零食') || userMessage.includes('餅乾')) {
    response = '唉，你又在吃這些垃圾食品了？我真的很擔心你的健康啊！雖然這些東西吃起來很爽，但是對身體一點好處都沒有。不如我教你一些健康的零食選擇？像是無調味堅果、水果乾，或者是自製能量棒。這些不僅美味，還能補充身體需要的營養。如果你真的想吃零食，至少要選擇一些較健康的替代品，而不是一直吃這些空熱量的食物。要不要我幫你規劃一個健康的飲食計畫？';
  }
  // 運動相關
  else if (userMessage.includes('不想動') || userMessage.includes('懶得動')) {
    response = '哼！就知道你又在找藉口不想運動了！作為你的健康教練，我怎麼能允許你這樣偷懶？我知道運動確實需要一些意志力，但是為了健康，這點付出算什麼？要不這樣，我陪你一起運動如何？我可以根據你的體能狀況，設計一套適合你的運動計劃。從簡單的開始，慢慢增加強度。記住，堅持運動的人最有魅力！而且，我會一直在旁邊監督你，確保你不會半途而廢。';
  }
  // 疲勞相關
  else if (userMessage.includes('好累') || userMessage.includes('沒力')) {
    response = '累？就這樣就想放棄了嗎？身為你的教練，我不能接受這種藉口！不過...我也理解每個人都會有疲憊的時候。讓我看看你最近的作息和運動狀況，也許是你的訓練強度需要調整。適當的休息確實很重要，但不能因為一時的疲勞就放棄堅持。要不要我幫你重新規劃一下訓練計畫？我們可以先從較輕的運動開始，慢慢找回狀態。記住，真正的強者不是不會累，而是累了也能堅持下去！';
  }
  // 飲食相關
  else if (userMessage.includes('吃') || userMessage.includes('餓')) {
    response = '又在想著吃啊？雖然我知道你很愛吃，但是要記得均衡營養才是王道！與其吃那些垃圾食品，不如讓我推薦幾家健康餐廳給你？那裡的食物不僅美味，還能確保你攝取足夠的營養。或者，我可以教你一些簡單的健康料理，這樣你在家也能做出美味又健康的餐點。記住，飲食習慣的改變需要時間，但只要堅持下去，你一定會看到不一樣的自己！要不要我陪你一起規劃一個健康的飲食計畫？';
  }
  // 預設回應
  else {
    const defaultResponses = [
      '哼！又來找我了嗎？雖然我很忙，不過看在你這麼認真的份上，我還是可以抽空指導你一下。記住，保持健康的生活方式不是一時的事，而是需要長期堅持。有什麼問題就直接問我，不要客氣！但是，可不要讓我發現你偷懶喔！',
      '怎麼又是你？不過既然你這麼有心想要改變，我也不能視而不見。來吧，讓我看看你最近的進步如何？需要我幫你調整計畫嗎？記住，在追求健康的道路上，我會一直在你身邊督促你！',
      '看來你對健康生活越來越重視了嘛！雖然我說話可能比較直接，但那都是為了你好。只要你願意努力，我一定會盡我所能幫助你達成目標。不過可別期待我會一直這麼溫柔喔！該嚴格的時候我可是不會手軟的！'
    ];
    response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }
  
  return response;
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", init)
  : init();