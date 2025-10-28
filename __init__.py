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
DATA_DIR = os.path.join(current_dir, "data")
DATA_USER_DIR = os.path.join(current_dir, "data_user")

data_file = os.path.join(DATA_DIR, "data.json")
data_user_file = os.path.join(DATA_USER_DIR, "group.json")
user_tokens_file = os.path.join(DATA_USER_DIR, "data.json")

# 确保数据目录存在
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(DATA_USER_DIR, exist_ok=True)


@server.PromptServer.instance.routes.get("/lxh_prompt/getData")
async def get_lxh_data(request):
    """获取系统词库数据"""
    try:
        print(f"📝 [LXH] 读取系统词库: {data_file}")

        if not os.path.exists(data_file):
            print(f"⚠️ [LXH] 系统词库文件不存在，返回空数据")
            return web.json_response({"categories": []})

        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"✅ [LXH] 系统词库加载成功，分类数: {len(data.get('categories', []))}")
        return web.json_response(data)

    except Exception as e:
        print(f"❌ [LXH] 加载系统词库失败: {e}")
        return web.json_response({"categories": []}, status=500)


@server.PromptServer.instance.routes.get("/lxh_prompt/getUserTokens")
async def get_lxh_user_tokens(request):
    """获取用户词库数据"""
    try:
        print(f"📝 [LXH] 读取用户词库: {user_tokens_file}")

        if not os.path.exists(user_tokens_file):
            print(f"⚠️ [LXH] 用户词库文件不存在，返回空数据")
            return web.json_response({"categories": []})

        with open(user_tokens_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        categories_count = len(data.get('categories', []))
        print(f"✅ [LXH] 用户词库加载成功，分类数: {categories_count}")
        return web.json_response(data)

    except Exception as e:
        print(f"❌ [LXH] 加载用户词库失败: {e}")
        return web.json_response({"categories": []}, status=500)


@server.PromptServer.instance.routes.get("/lxh_prompt/getUserData")
async def get_lxh_data_user(request):
    """获取用户词组数据"""
    try:
        print(f"📝 [LXH] 读取用户词组: {data_user_file}")

        if not os.path.exists(data_user_file):
            print(f"⚠️ [LXH] 用户词组文件不存在，返回空数据")
            return web.json_response({"groups": []})

        with open(data_user_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        groups_count = len(data.get('groups', []))
        print(f"✅ [LXH] 用户词组加载成功，数量: {groups_count}")
        return web.json_response(data)

    except Exception as e:
        print(f"❌ [LXH] 加载用户词组失败: {e}")
        return web.json_response({"groups": []}, status=500)


@server.PromptServer.instance.routes.post("/lxh_prompt/saveUserData")
async def save_lxh_data_user(request):
    """保存用户词组数据"""
    try:
        data = await request.json()

        print(f"💾 [LXH] 保存用户词组到: {data_user_file}")
        print(f"💾 [LXH] 词组数量: {len(data.get('groups', []))}")

        # 确保目录存在
        os.makedirs(os.path.dirname(data_user_file), exist_ok=True)

        # 保存到文件
        with open(data_user_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"✅ [LXH] 用户词组保存成功")
        return web.json_response({
            "status": "success",
            "message": "用户词组保存成功",
            "timestamp": int(os.path.getmtime(data_user_file) * 1000)
        })

    except Exception as e:
        print(f"❌ [LXH] 保存用户词组失败: {e}")
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


@server.PromptServer.instance.routes.post("/lxh_prompt/saveUserTokens")
async def save_lxh_user_tokens(request):
    """保存用户词库数据"""
    try:
        data = await request.json()

        print(f"💾 [LXH] 保存用户词库到: {user_tokens_file}")

        categories = data.get('categories', [])
        categories_count = len(categories)

        # 统计词元总数
        tokens_count = sum(
            len(token)
            for cat in categories
            for sub in cat.get('subcategories', [])
            for token in sub.get('tokens', [])
        )

        print(f"💾 [LXH] 分类数: {categories_count}, 词元总数: {tokens_count}")

        # 确保目录存在
        os.makedirs(os.path.dirname(user_tokens_file), exist_ok=True)

        # 保存到文件
        with open(user_tokens_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"✅ [LXH] 用户词库保存成功")
        return web.json_response({
            "status": "success",
            "message": "用户词库保存成功",
            "timestamp": int(os.path.getmtime(user_tokens_file) * 1000),
            "stats": {
                "categories": categories_count,
                "tokens": tokens_count
            }
        })

    except Exception as e:
        print(f"❌ [LXH] 保存用户词库失败: {e}")
        import traceback
        traceback.print_exc()
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


print("🚀 [LXH Prompt] 扩展已加载")
print(f"📁 [LXH] 数据目录: {DATA_DIR}")
print(f"📁 [LXH] 用户数据目录: {DATA_USER_DIR}")