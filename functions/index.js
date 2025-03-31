const { defineSecret } = require("firebase-functions/params");
const { onValueCreated } = require("firebase-functions/v2/database");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { OpenAI } = require("openai");

// 使用 Firebase Secret Manager 來安全存儲 API Key
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

initializeApp();
const db = getDatabase();

// ✅ Cloud Function：監聽留言
exports.replyToComment = onValueCreated(
  {
    ref: "/messages/{date}/{pushId}",
    region: "asia-southeast1",
    secrets: [OPENAI_API_KEY],
  },
  async (event) => {
    try {
      console.log("🔍 收到新消息，開始處理...");
      console.log("📝 消息內容：", JSON.stringify(event.data.val(), null, 2));

      const originalMessage = event.data.val();
      if (!originalMessage) {
        console.log("❌ 消息為空");
        return;
      }

      if (originalMessage.name === "休總") {
        console.log("⏭️ 跳過休總的消息");
        return;
      }

      // 參賽者名單
      const participants = [
        "一休", "佳欣", "漢娜", "Erika", "淑貞",
        "國寶", "枝滿", "小可愛", "品瑄", "Awear",
        "毓喬", "candy", "SC", "舜程", "依蓉",
        "聖佳", "心綺", "婉鈞", "育銘", "季良",
        "Huiming慧敏", "林美美", "Vivian", "沛蓁", "可歆",
        "Annie", "小玲", "黑仔", "慧蘭"
      ];

      const name = originalMessage.name || "參賽者";
      const isParticipant = participants.includes(name);
      const text = originalMessage.text;
      
      // 如果不是參賽者，使用預設回應
      if (!isParticipant && name !== "參賽者") {
        console.log("⚠️ 非參賽者發言");
        return;
      }

      console.log(`👤 用戶 ${name} 發送消息：${text}`);
      console.log(`🏃‍♀️ 是否為參賽者：${isParticipant}`);

      // 偵測週末 or 節日
      const now = new Date();
      const isWeekend = [0, 5, 6].includes(now.getDay());
      const todayKey = `${now.getMonth() + 1}-${now.getDate()}`;
      const holidays = {
        "1-1": "元旦",
        "2-14": "情人節",
        "2-28": "和平紀念日",
        "4-4": "兒童節",
        "4-5": "清明節",
        "5-1": "勞動節",
        "6-30": "端午節",
        "9-6": "中秋節",
        "10-10": "雙十節",
        "12-25": "聖誕節"
      };
      const holiday = holidays[todayKey];

      console.log(`📅 今天是${isWeekend ? '週末' : '平日'}${holiday ? `，${holiday}` : ''}`);

      let systemPrompt = `你是休總，一位「地獄教練」，外表冷酷、說話直接，但內心極度關愛學員。你的學員都是報名參加運動計畫的參賽者，主要是媽媽們，你用嚴格的態度督促她們突破自己。性格特點：

1. 說話風格：
   - 直接稱呼學員名字：「${name}！這就想放棄？你比這個強大多了」
   - 用激勵性的話語：「站起來，證明給孩子看什麼是永不放棄」
   - 使用命令句：「現在就去散步20分鐘」「立刻起身活動」

2. 教練特色：
   - 扮演嚴格教練角色，但每句話都在激發潛能
   - 針對困難提供解方：「沒時間？把運動融入生活」
   - 暗藏關懷：「我要的是一個健康的你，為了家人也為了自己」

3. 動機方式：
   - 以身作則：「其他參賽者都在努力，你也行」
   - 強調價值：「強健的體魄才能陪伴家人更久」
   - 設定目標：「先從最基本的做起，一步步變強」

4. 實用建議（根據不同情況給出）：
   - 基礎活動：
     * 「每看一集劇，起身走動5分鐘」
     * 「買菜順路多走一個路口」
     * 「爬樓梯取代電梯，每天增加100步」
   - 親子互動：
     * 「陪孩子玩耍時多活動」
     * 「推車或背小孩時注意姿勢」
     * 「全家一起去公園運動」
   - 生活調整：
     * 「提早一站下車，走路回家」
     * 「飯後散步15分鐘」
     * 「周末規劃戶外活動」

回應原則：
- 直呼參賽者名字，展現關注度
- 給出具體可行的行動方案
- 字數限制100字內，保持簡潔有力
- 暗示「我的嚴格是為了讓你更好」的理念
- 強調：持之以恆比短期爆發更重要`;

      if (holiday) {
        systemPrompt += `今天是 ${holiday}，用嚴厲中帶著節日氣氛的方式鼓勵，但依然保持強硬態度。`;
      } else if (isWeekend) {
        systemPrompt += "週末還想偷懶？這是讓身體更好的最佳時機，給我動起來。";
      }

      console.log("🤖 準備呼叫 OpenAI API");
      console.log("📋 系統提示：", systemPrompt);

      // ⚡ 在 runtime 才讀取 secret
      const openai = new OpenAI({
        apiKey: OPENAI_API_KEY.value(),
      });

      const chat = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${name} 留言：「${text}」` },
        ],
        temperature: 0.8,
        max_tokens: 200,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });

      const reply = chat.choices[0].message.content;
      console.log("💬 GPT 回應：", reply);

      // Store the response
      const date = event.params.date;
      const responseRef = db.ref(`messages/${date}`).push();
      
      console.log("💾 準備存儲回應");
      await responseRef.set({
        name: "休總",
        text: reply,
        timestamp: Date.now()
      });

      console.log("✅ 休總回應已存儲");
    } catch (error) {
      console.error("❌ 處理消息時出錯：", error);
      throw error;
    }
  }
);