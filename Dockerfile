# ---- 构建阶段 ----
FROM node:20-alpine AS builder
WORKDIR /app

# 仓库只提交了 pnpm-lock.yaml（无 package-lock.json），因此统一使用 pnpm 安装，保证依赖版本可复现
COPY package.json package-lock.json* pnpm-lock.yaml* ./
# 锁定 pnpm 大版本（与 pnpm-lock.yaml 的 lockfileVersion 9.0 对应），避免 corepack 拉到不兼容版本
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ---- 运行阶段 ----
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
