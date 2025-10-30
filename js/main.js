// js/main.js
import { app } from "../../scripts/app.js";
import { createApp } from "vue";
import ModalComponent from "./src/App.vue";

// 开发模式检测
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 版本检测和自动刷新（仅开发模式）
let currentVersion = null;
if (isDev) {
  checkVersion();
  // 每3秒检查一次版本
  setInterval(checkVersion, 3000);
}

async function checkVersion() {
  try {
    const response = await fetch('/extensions/ComfyUI_LXH_prompt/version.json?t=' + Date.now());
    if (response.ok) {
      const version = await response.json();
      if (currentVersion === null) {
        currentVersion = version.timestamp;
      } else if (currentVersion !== version.timestamp) {
        // 显示提示
        const shouldReload = confirm('🔄 检测到代码更新！\n\n点击"确定"刷新页面加载最新版本\n点击"取消"继续使用当前版本');
        if (shouldReload) {
          location.reload();
        } else {
          currentVersion = version.timestamp; // 更新版本号，避免重复提示
        }
      }
    }
  } catch (error) {
    // 忽略错误，可能是版本文件不存在
  }
}

// 加载 CSS 文件（带版本号防止缓存）
function loadCSS() {
  const timestamp = isDev ? `?t=${Date.now()}` : '';
  const cssPath = `/extensions/ComfyUI_LXH_prompt/style.css${timestamp}`;

  // 移除旧的 CSS
  const existingLinks = document.querySelectorAll('link[href*="ComfyUI_LXH_prompt"]');
  existingLinks.forEach(link => link.remove());

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssPath;
  document.head.appendChild(link);
}

// 立即加载 CSS
loadCSS();

// 扩展 ComfyUI
app.registerExtension({
  name: "Comfy.LXH.Prompt",

  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "lxh_prompt") {
      const original_onNodeCreated = nodeType.prototype.onNodeCreated;

      nodeType.prototype.onNodeCreated = function () {
        const result = original_onNodeCreated?.apply(this, arguments);

        const textWidget = this.widgets?.find((w) => w.name === "text");

        if (textWidget) {
          const original_mouse = textWidget.mouse;

          textWidget.mouse = function (event, pos, node) {
            if (event.type === "dblclick") {
              try {
                showModal(textWidget.value, (newValue) => {
                  if (newValue !== null) {
                    textWidget.value = newValue;
                    app.graph.setDirtyCanvas(true, true);
                  }
                });
                return true;
              } catch (error) {
                console.error("[LXH Prompt] ❌ 错误:", error);
              }
            }

            return original_mouse ? original_mouse.apply(this, arguments) : undefined;
          };

          // 备用方案：直接监听输入框
          const inputElement = textWidget.inputEl;
          if (inputElement) {
            inputElement.addEventListener('dblclick', (e) => {
              e.stopPropagation();
              showModal(textWidget.value, (newValue) => {
                if (newValue !== null) {
                  textWidget.value = newValue;
                  app.graph.setDirtyCanvas(true, true);
                }
              });
            });
          }
        }

        return result;
      };
    }
  },
});

// 显示弹窗
function showModal(initialText, callback) {
  try {
    // 清理旧容器
    let container = document.getElementById("lxh-modal-container");
    if (container) {
      container.remove();
    }

    // 创建新容器
    container = document.createElement("div");
    container.id = "lxh-modal-container";
    document.body.appendChild(container);

    const vueApp = createApp(ModalComponent, {
      initialText: initialText || '',
      onClose: (newValue) => {
        callback(newValue);

        setTimeout(() => {
          try {
            vueApp.unmount();
            if (container && container.parentNode) {
              container.remove();
            }
          } catch (error) {
            console.error("[LXH Prompt] 清理错误:", error);
          }
        }, 100);
      },
    });

    vueApp.mount(container);

  } catch (error) {
    console.error("[LXH Prompt] ❌ 打开编辑器失败:", error);
  }
}
