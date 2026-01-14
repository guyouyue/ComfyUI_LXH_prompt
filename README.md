## 项目介绍(update_date:2025-08-28)
提示词工具

## 项目结构
```python
ROOT
├── alembic/
│   ├── versions/
```

## 项目运行

```进入工作目录
cd js 
```


### 开发环境
```base
npm run dev
```

### 获取数据库更新
```python
python main.py migrate -m "更新内容提示" 
```

### 执行数据库更新
```python
python main.py upgrade
```

### 回退到指定版本
```python
python main.py downgrade 回滚的版本号
```

### 单进程启动程序(需要配置对应的env环境配置)
```python
python main.py runserver -h 0.0.0.0 -p 8000
```

### 构建docker镜像并直接运行镜像成服务
```python
docker build -t llm_ai_robot_image .
# docker run -d --name llm_ai_robot -e WORKERS=4 -p 8000:8000 -v /data/logs/llm_ai_logs:/app/logs --user "1000:1000" --restart=unless-stopped llm_ai_robot_image
# docker run -d --name llm_ai_robot --network code_my-network -e WORKERS=4 -e PORT=8000 -p 8000:8000 -v /data/logs/llm_ai_logs:/app/logs --restart=unless-stopped llm_ai_robot_image
docker run -d --name llm_ai_robot -e WORKERS=4 -e PORT=8000 -p 8000:8000 -v /data/logs/llm_ai_logs:/app/logs --restart=unless-stopped llm_ai_robot_image
```

### 实时日志查询
```python
docker logs -f --since 0s llm_ai_robot
```

### 含关键字的日志查询并实时跟踪
```python
docker logs -f llm_ai_robot | grep "关键词"
```

### 含关键字的日志查询
```python
docker logs llm_ai_robot 2>&1 | grep "关键词"
```

### 带时间过滤(最近x小时)和关键字的日志查询
```python
docker logs --since "2h" llm_ai_robot | grep "关键词"
```

### 查看特定时间段内的日志（需要知道容器启动时间）
```python
docker logs --since "2025-08-28T14:00:00" --until "2025-08-28T16:00:00" llm_ai_robot | grep "关键词"
```

## 技术文档
