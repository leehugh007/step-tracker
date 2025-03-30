console.log("✅ script.js 已成功載入！");

const encouragements = [
  "你是最棒的！🌟",
  "腳步不停，目標更近！🚶‍♀️🚶‍♂️",
  "太厲害了！再接再厲！🔥",
  "堅持就是勝利！💪",
  "每天一點點，終會看到成果！🌈",
  "做得好！再多一步也不怕！👏",
  "你已經超越昨天的自己了！✨",
  "讓我們邁開腳步吧！👟",
  "今日目標達成！🎯",
  "行動中的冠軍！🏆",
  "再多走一點，就是超越！🚀",
  "你正走在健康的道路上！🛤️",
  "每一步都值得鼓掌！👏",
  "燃燒你的卡路里🔥",
  "再前進一小步，就是大進步！🚶"
];

function init() {
  const nameSelect = document.getElementById("nameSelect");
  const dateInput = document.getElementById("dateInput");
  const stepInput = document.getElementById("stepInput");
  const submitBtn = document.getElementById("submitBtn");
  const messageDiv = document.getElementById("message");
  const database = window.firebaseDatabase;

  if (!submitBtn || !database) return;

  submitBtn.addEventListener("click", () => {
    const name = nameSelect.value;
    const date = dateInput.value;
    const steps = parseInt(stepInput.value, 10);

    if (!name || !date || isNaN(steps) || steps <= 0) {
      alert("請完整填寫參賽者、日期與步數！");
      return;
    }

    const month = date.slice(0, 7);
    const userRef = database.ref(`steps/${name}/${month}`);

    userRef.once("value").then(snapshot => {
      let data = snapshot.val() || { total: 0, records: [] };
      data.total += steps;
      data.records.push({ date, steps });

      return userRef.set(data);
    }).then(() => {
      showMessage(`${name} 今天加了 ${steps} 步！加油！`);
      confetti();
      updateLeaderboard();
    }).catch(err => {
      console.error("❌ 儲存失敗：", err);
      alert("儲存失敗，請稍後再試！");
    });
  });

  updateLeaderboard();
}

function showMessage(text) {
  const messageDiv = document.getElementById("message");
  const randomMsg = encouragements[Math.floor(Math.random() * encouragements.length)];
  messageDiv.textContent = `${text} ${randomMsg}`;
  messageDiv.style.display = "block";
  setTimeout(() => {
    messageDiv.style.display = "none";
  }, 5000);
}

function updateLeaderboard() {
  const database = window.firebaseDatabase;
  const table = document.getElementById("leaderboardTable");
  const chartCanvas = document.getElementById("chart");

  const month = new Date().toISOString().slice(0, 7);
  database.ref(`steps`).once("value").then(snapshot => {
    const data = snapshot.val() || {};
    let leaderboard = [];

    for (const name in data) {
      const userMonth = data[name][month];
      if (userMonth) {
        leaderboard.push({ name, total: userMonth.total });
      }
    }

    leaderboard.sort((a, b) => b.total - a.total);

    // 建表
    let html = `<thead><tr><th>名次</th><th>姓名</th><th>總步數</th></tr></thead><tbody>`;
    leaderboard.forEach((entry, i) => {
      html += `<tr><td>${i + 1}</td><td>${entry.name}</td><td>${entry.total}</td></tr>`;
    });
    html += "</tbody>";
    table.innerHTML = html;

    // 畫圖
    const labels = leaderboard.map(entry => entry.name);
    const totals = leaderboard.map(entry => entry.total);
    new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "總步數",
          data: totals,
          backgroundColor: "rgba(75, 192, 192, 0.6)"
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "參賽者總步數圖表" }
        }
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}