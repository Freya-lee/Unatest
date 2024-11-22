# 使用官方的 Node.js 镜像
FROM node:14

# 创建和设置应用目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装应用依赖
RUN npm install

# 复制应用代码
COPY . .

# 暴露应用端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]
