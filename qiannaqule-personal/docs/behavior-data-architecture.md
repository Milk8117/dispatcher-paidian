# 米界AI — 个人行为数据收集架构 v1.0

## 设计原则
1. **数据纯本地**：所有数据仅存 localStorage，禁止任何云端上传、外部API发送
2. **被动采集优先**：通过AI语音/文字输入自然采集，降低用户操作成本
3. **结构化存储**：统一JSON结构，便于后续LLM分析
4. **跨模块关联**：时间戳统一，支持多维度交叉分析

---

## 数据全景图

### 已采集（已有模块）
| 维度 | localStorage Key | 内容 |
|------|------------------|------|
| 财务概览 | `wealth_ct_*` | 收入/支出/资产/负债/保险（快照） |
| 日常收支 | `mijieai_daily_tx` | 每笔交易（金额/分类/时间/备注） |
| 日程任务 | `mijieai_schedule` | 任务/计划/deadline/状态 |
| 健康档案 | `mijieai_health_profile` | 慢病/症状/过敏/体质 |
| 饮食偏好 | `mijieai_recipe_collection` | 收藏/自定义菜谱 |

### 待建设（本次新增）
| 维度 | localStorage Key | 采集内容 |
|------|------------------|----------|
| 每日行为日志 | `mijieai_behavior_log` | 饮食/运动/睡眠/学习/情绪/消费 每日多维记录 |
| 个人偏好画像 | `mijieai_preferences` | 口味/品牌/风格/习惯偏好 |
| 家庭教育 | `mijieai_family_edu` | 孩子信息/学习进度/教育投入 |
| 情绪日志 | `mijieai_mood_log` | 情绪状态+触发事件+关联消费 |

---

## 数据结构设计

### 1. 每日行为日志 `mijieai_behavior_log`
```json
[
  {
    "date": "2026-07-31",
    "meals": [
      { "type": "早餐", "time": "08:30", "items": "燕麦+牛奶+鸡蛋", "where": "家" }
    ],
    "exercise": [
      { "type": "跑步", "duration": 30, "intensity": "中", "distance": 5 }
    ],
    "sleep": { "bedtime": "23:30", "waketime": "07:00", "quality": 4, "notes": "" },
    "learning": [
      { "topic": "Python数据分析", "duration": 60, "type": "在线课程" }
    ],
    "mood": [
      { "time": "14:00", "score": 3, "trigger": "项目进展不顺", "related_spending": 0 }
    ],
    "water": 6,
    "screen_time": 180,
    "notes": ""
  }
]
```

### 2. 个人偏好画像 `mijieai_preferences`
```json
{
  "taste": { "flavor": ["清淡","微辣"], "dislike": ["香菜","内脏"], "allergies": [] },
  "brands": { "clothing": "优衣库", "phone": "华为", "car": "" },
  "routine": { "wake_time": "07:00", "sleep_time": "23:00", "commute": "地铁" },
  "shopping_style": { "impulse_tendency": 3, "price_sensitivity": 4, "research_before_buy": true },
  "content": { "reading_genres": ["科技","商业"], "video_genres": ["纪录片"], "music_genres": ["轻音乐"] },
  "updated_at": "2026-07-31T15:00:00Z"
}
```

### 3. 家庭教育 `mijieai_family_edu`
```json
{
  "children": [
    {
      "name": "",
      "birth_year": 2018,
      "grade": "小学二年级",
      "subjects": [
        { "name": "数学", "level": "良好", "weekly_hours": 5, "notes": "计算粗心" }
      ],
      "extracurricular": [
        { "name": "钢琴", "frequency": "每周2次", "cost_monthly": 800 }
      ],
      "education_spend_monthly": 3000,
      "notes": ""
    }
  ],
  "updated_at": "2026-07-31T15:00:00Z"
}
```

### 4. 情绪日志 `mijieai_mood_log`
```json
[
  {
    "id": "m1abc",
    "timestamp": "2026-07-31T14:30:00+08:00",
    "score": 3,
    "label": "焦虑",
    "trigger": "项目截止日临近",
    "physical": ["失眠","食欲下降"],
    "coping": "散步30分钟",
    "related_spending": [
      { "tx_id": "txxxx", "amount": 58, "category": "entertain", "note": "冲动买了个游戏" }
    ]
  }
]
```

---

## AI自然语言采集映射

通过底部AI输入框，以下模式自动识别并写入对应数据：

| 用户说的话 | 解析结果 | 写入 |
|-----------|---------|------|
| "午餐吃了牛肉面25" | 饮食+消费 | behavior_log.meals + daily_tx |
| "跑了5公里" | 运动 | behavior_log.exercise |
| "昨晚11点睡的7点起" | 睡眠 | behavior_log.sleep |
| "学了2小时Python" | 学习 | behavior_log.learning |
| "今天心情不好" / "心情很差" | 情绪 | mood_log |
| "又冲动消费了100" | 情绪消费 | mood_log + daily_tx |
| "孩子数学考了90分" | 教育 | family_edu |
| "不喜欢吃香菜" | 偏好 | preferences.taste |
| "以后叫我老王" | 个人设定 | preferences |

---

## 隐私保障

- 所有数据100%存本地localStorage
- 不发送任何行为数据到外部服务器
- 导出/导入仅用于用户自行备份
- 源码开放可审计（GitHub Pages静态站点）
- Service Worker仅缓存静态资源，不上传数据
