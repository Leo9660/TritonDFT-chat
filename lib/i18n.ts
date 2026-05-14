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
