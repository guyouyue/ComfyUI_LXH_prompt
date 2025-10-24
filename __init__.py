# ComfyUI_LXH_prompt/__init__.py

# --- 节点类 ---
class LXHPrompt:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                # 为了在 JS 中更容易识别，我们给 widget 起一个名字
                "text": ("STRING", {"multiline": True, "placeholder": "双击打开 LXH 编辑弹窗", "widget": "lxh_prompt_widget"}),
            }
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "get_text"
    CATEGORY = "LXH"

    def get_text(self, text):
        return (text,)

# --- 节点映射 ---
NODE_CLASS_MAPPINGS = {
    "lxh_prompt": LXHPrompt,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "lxh_prompt": "LXH Prompt 输入框",
}

# 指定 Web 目录，ComfyUI 会加载这个目录下的 JS 文件
# 我们将所有前端相关的文件都放在 'js' 目录下
WEB_DIRECTORY = "./js/dist"

# --- 在节点类定义之后添加以下代码 ---

import json
import os
from aiohttp import web
import server

# 获取当前扩展目录
current_dir = os.path.dirname(os.path.realpath(__file__))

# 数据文件路径
data_file = os.path.join(current_dir, "data", "data.json")
data_user_file = os.path.join(current_dir, "data_user", "group.json")


@server.PromptServer.instance.routes.get("/lxh_prompt/getData")
async def get_lxh_data(request):
    """获取词库数据"""
    try:
        if not os.path.exists(data_file):
            # 如果文件不存在，返回默认数据或空数据
            default_data = {
                "categories": []
            }
            return web.json_response(default_data)

        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        return web.json_response(data)
    except Exception as e:
        print(f"[LXH Prompt] 加载数据文件失败: {e}")
        return web.json_response({"categories": []})


@server.PromptServer.instance.routes.get("/lxh_prompt/getUserData")
async def get_lxh_data_user(request):
    """获取用户数据（自定义组合）"""
    try:
        if not os.path.exists(data_user_file):
            # 如果文件不存在，返回空数据
            return web.json_response({"groups": []})

        with open(data_user_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        return web.json_response(data)
    except Exception as e:
        print(f"[LXH Prompt] 加载用户数据文件失败: {e}")
        return web.json_response({"groups": []})


@server.PromptServer.instance.routes.post("/lxh_prompt/saveUserData")
async def save_lxh_data_user(request):
    """保存用户数据"""
    try:
        data = await request.json()

        # 确保目录存在
        os.makedirs(os.path.dirname(data_user_file), exist_ok=True)

        with open(data_user_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return web.json_response({"status": "success"})
    except Exception as e:
        print(f"[LXH Prompt] 保存用户数据失败: {e}")
        return web.json_response({"status": "error", "message": str(e)})


@server.PromptServer.instance.routes.post("/lxh_prompt/saveUserTokens")
async def save_lxh_user_tokens(request):
    """保存用户自定义词元"""
    try:
        data = await request.json()
        user_tokens_file = os.path.join(current_dir, "data_user", "data.json")

        # 确保目录存在
        os.makedirs(os.path.dirname(user_tokens_file), exist_ok=True)

        with open(user_tokens_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return web.json_response({"status": "success"})
    except Exception as e:
        print(f"[LXH Prompt] 保存用户词元失败: {e}")
        return web.json_response({"status": "error", "message": str(e)})