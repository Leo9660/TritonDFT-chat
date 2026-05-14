"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appTitle: "TritonDFT",
      newChat: "New chat",
      noConversations: "No conversations yet",
      send: "Send",
      stop: "Stop",
      placeholder: "Ask TritonDFT to run a DFT calculation…",
      attachImage: "Attach image (coming soon)",
      thinking: "Thinking…",
      delete: "Delete",
      confirmDelete: "Delete this conversation?",
      settings: "Settings",
      backendUrl: "Backend URL",
      save: "Save",
      cancel: "Cancel",
      errorPrefix: "Error: ",
      copy: "Copy",
      copied: "Copied",
      emptyTitle: "DFT, in your browser.",
      emptySubtitle:
        "Describe what you want — a material, a property, a workflow. The agent picks parameters, runs Quantum ESPRESSO, and reports back.",
      emptyHint: "⌘/Ctrl + Enter to send · localStorage history",
      starterHint: "Try one of these — or write your own.",
      shuffle: "Shuffle",
      agentFailedHint: "The agent stopped early due to an error. External services (e.g. Materials Project API) can be transient — try again in a moment.",
      retry: "Retry",
    },
  },
  zh: {
    translation: {
      appTitle: "TritonDFT",
      newChat: "新建对话",
      noConversations: "暂无对话",
      send: "发送",
      stop: "停止",
      placeholder: "向 TritonDFT 描述你的 DFT 任务…",
      attachImage: "上传图片（即将上线）",
      thinking: "思考中…",
      delete: "删除",
      confirmDelete: "确认删除这个对话？",
      settings: "设置",
      backendUrl: "后端地址",
      save: "保存",
      cancel: "取消",
      errorPrefix: "错误：",
      copy: "复制",
      copied: "已复制",
      emptyTitle: "把 DFT 装进浏览器。",
      emptySubtitle:
        "描述你想要的 —— 材料、属性、工作流。Agent 自动选参数、跑 Quantum ESPRESSO、返回结果。",
      emptyHint: "⌘/Ctrl + Enter 发送 · 对话历史存浏览器",
      starterHint: "试一下这些 —— 或自己写一个。",
      shuffle: "换一批",
      agentFailedHint: "Agent 因报错提前结束。外部服务（如 Materials Project API）有时会临时抽风，稍后重试通常能成功。",
      retry: "重试",
    },
  },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export default i18n;
