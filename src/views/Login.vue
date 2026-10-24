<script setup lang="ts">
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeOutlined, SafetyOutlined, LoadingOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import type { LoginDTO } from '@/api/auth'

interface LoginForm extends LoginDTO {}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const pwdVisible = ref(false)
const showPwd = ref(false) // 密码可见性
const showPwdStrength = ref(false) // 密码强度
const form = reactive<LoginForm>({
  username: localStorage.getItem('wb-login-user') || '',
  password: ''
})

// 密码强度（仅视觉参考）
const pwdLevel = ref(0)
const checkPwd = () => {
  const p = form.password
  if (!p) { pwdLevel.value = 0; showPwdStrength.value = false; return }
  showPwdStrength.value = true
  let score = 0
  if (p.length >= 6) score++
  if (p.length >= 10) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  pwdLevel.value = Math.min(score, 4)
}

const onFinish = async () => {
  if (!form.username || !form.password) {
    message.warning('请填写完整的登录信息')
    return
  }
  loading.value = true
  try {
    await authStore.login(form)
    message.success('登录成功')
    localStorage.setItem('wb-login-user', form.username)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (err: any) {
    // 错误由 store 内部处理，这里仅做兜底
  } finally {
    loading.value = false
  }
}

// 回车直接登录
const onInputKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter') onFinish()
}

const hasRememberedUser = computed(() => !!localStorage.getItem('wb-login-user'))

// 测试账号一键填充。
// 口令刻意不写在源码里：从 .env.local 的 VITE_TEST_USER / VITE_TEST_PASSWORD 读取
// （该文件已被 .gitignore 忽略）。两者任一为空或非开发模式时，卡片整体不渲染，
// 所以生产构建不会把口令内联进 JS 产物。
const TEST_USERNAME = import.meta.env.VITE_TEST_USER as string | undefined
const TEST_PASSWORD = import.meta.env.VITE_TEST_PASSWORD as string | undefined
const showTestCard = computed(
  () => import.meta.env.DEV && !!TEST_USERNAME && !!TEST_PASSWORD
)

const fillTest = () => {
  form.username = TEST_USERNAME || ''
  form.password = TEST_PASSWORD || ''
  checkPwd()
}

// 浮动光斑动画
const blobs = ref([
  { x: 10, y: 20, size: 300, color: 'rgba(102,126,234,0.3)', dx: 0.3, dy: 0.2 },
  { x: 70, y: 60, size: 260, color: 'rgba(118,75,162,0.25)', dx: -0.2, dy: 0.3 },
  { x: 40, y: 80, size: 200, color: 'rgba(45,212,191,0.2)', dx: 0.25, dy: -0.15 }
])
let rafId = 0
const animateBlobs = () => {
  blobs.value.forEach(b => {
    b.x += b.dx
    b.y += b.dy
    if (b.x < 0 || b.x > 100) b.dx *= -1
    if (b.y < 0 || b.y > 100) b.dy *= -1
  })
  rafId = requestAnimationFrame(animateBlobs)
}
onMounted(() => { animateBlobs() })
onBeforeUnmount(() => { cancelAnimationFrame(rafId) })
</script>

<template>
  <div class="login-page">
    <!-- 动态光斑背景 -->
    <div class="bg-blobs">
      <div
        v-for="(b, i) in blobs"
        :key="i"
        class="blob"
        :style="{
          left: b.x + '%',
          top: b.y + '%',
          width: b.size + 'px',
          height: b.size + 'px',
          background: b.color
        }"
      ></div>
    </div>

    <!-- 左侧品牌展示区 -->
    <div class="brand-panel">
      <div class="brand-content">
        <div class="brand-logo">🛠️</div>
        <h1 class="brand-title">晓贵工作台</h1>
        <p class="brand-desc">个人全栈工作台 · 全链路效率工具</p>
        <div class="brand-features">
          <div class="feature-item">
            <span class="feature-icon">⚡</span>
            <span>任务 / 日程 / 番茄钟 一体化管理</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📊</span>
            <span>收支记账 / 习惯打卡 / 数据洞察</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🔗</span>
            <span>飞书多维表格 双向数据同步</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🎨</span>
            <span>代码仓库 / 素材库 / 知识库</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧登录表单区 -->
    <div class="form-panel">
      <div class="login-card">
        <!-- 顶部 Logo + 标题 -->
        <div class="login-brand">
          <div class="mini-logo">🛠️</div>
          <div class="login-header">
            <h2 class="login-title">欢迎回来</h2>
            <p class="login-subtitle">登录以继续你的工作流</p>
          </div>
        </div>

        <!-- 表单 -->
        <form class="login-form" @submit.prevent="onFinish" autocomplete="off">
          <!-- 用户名 -->
          <div class="form-field" :class="{ focused: false }">
            <div class="field-icon"><UserOutlined /></div>
            <input
              v-model="form.username"
              type="text"
              class="field-input"
              placeholder=" "
              autocomplete="username"
              @keydown="onInputKey"
            />
            <label class="field-label">{{ form.username ? '' : '用户名' }}</label>
          </div>

          <!-- 密码 -->
          <div class="form-field">
            <div class="field-icon"><LockOutlined /></div>
            <input
              v-model="form.password"
              :type="showPwd ? 'text' : 'password'"
              class="field-input"
              placeholder=" "
              autocomplete="current-password"
              @input="checkPwd"
              @keydown="onInputKey"
            />
            <label class="field-label">{{ form.password ? '' : '密码' }}</label>
            <button
              type="button"
              class="field-toggle"
              @click="showPwd = !showPwd"
            >
              <component :is="showPwd ? EyeOutlined : EyeInvisibleOutlined" />
            </button>
          </div>

          <!-- 密码强度条 -->
          <div v-if="showPwdStrength && form.password" class="pwd-strength">
            <div class="strength-bar">
              <div
                class="strength-fill"
                :style="{
                  width: pwdLevel * 25 + '%',
                  background: pwdLevel <= 1 ? '#ff4d4f' : pwdLevel <= 2 ? '#faad14' : pwdLevel <= 3 ? '#4096ff' : '#52c41a'
                }"
              ></div>
            </div>
            <span class="strength-label">
              {{ pwdLevel <= 1 ? '弱' : pwdLevel <= 2 ? '一般' : pwdLevel <= 3 ? '良好' : '强' }}
            </span>
          </div>

          <!-- 选项行 -->
          <div class="form-options">
            <label class="remember">
              <input type="checkbox" :checked="hasRememberedUser" />
              <span>记住我的账号</span>
            </label>
            <a class="forgot" @click.prevent="message.info('请联系管理员重置密码')">忘记密码？</a>
          </div>

          <!-- 登录按钮 -->
          <button
            type="submit"
            class="submit-btn"
            :disabled="loading || !form.username || !form.password"
          >
            <LoadingOutlined v-if="loading" spin class="btn-spinner" />
            <span>{{ loading ? '登录中...' : '登 录' }}</span>
          </button>
        </form>

        <!-- 测试账号（仅本地开发环境；口令来自 .env.local，不进源码） -->
        <template v-if="showTestCard">
          <div class="divider">
            <span>或快速体验</span>
          </div>

          <div class="demo-card" @click="fillTest">
            <div class="demo-left">
              <div class="demo-icon">
                <SafetyOutlined />
              </div>
              <div class="demo-info">
                <div class="demo-title">测试账号</div>
                <div class="demo-cred">
                  <span class="cred-key">用户名</span>
                  <span class="cred-val">{{ TEST_USERNAME }}</span>
                  <span class="cred-sep">·</span>
                  <span class="cred-key">密码</span>
                  <span class="cred-val">••••••••</span>
                </div>
              </div>
            </div>
            <div class="demo-action">
              一键填充 <span class="arrow">→</span>
            </div>
          </div>
        </template>
      </div>

      <div class="login-footer">
        © {{ new Date().getFullYear() }} 晓贵工作台 · Powered by Vue3 + Spring Boot
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
  background: #0f0f1e;
}

/* —— 动态光斑 —— */
.bg-blobs {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  transition: none;
}

/* —— 左侧品牌区 —— */
.brand-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  padding: 40px;
}
.brand-content {
  max-width: 440px;
  color: #fff;
}
.brand-logo {
  font-size: 56px;
  line-height: 1;
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 20px rgba(102,126,234,0.4));
}
.brand-title {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #fff 0%, #c3d0ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.brand-desc {
  font-size: 15px;
  color: rgba(255,255,255,0.6);
  margin: 0 0 36px 0;
}
.brand-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: rgba(255,255,255,0.8);
  padding: 12px 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}
.feature-item:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.15);
  transform: translateX(4px);
}
.feature-icon {
  font-size: 20px;
}

/* —— 右侧表单区 —— */
.form-panel {
  width: 520px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  padding: 40px;
}
.login-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 36px 32px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.35);
}

/* 品牌头部 */
.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.mini-logo {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: #fff;
  box-shadow: 0 4px 16px rgba(102,126,234,0.4);
}
.login-header { flex: 1; }
.login-title {
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 2px 0;
}
.login-subtitle {
  font-size: 13px;
  color: #86909c;
  margin: 0;
}

/* 浮动标签输入框 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-field {
  position: relative;
  height: 48px;
  display: flex;
  align-items: center;
  border: 1.5px solid #e5e6eb;
  border-radius: 10px;
  background: #f7f8fa;
  transition: all 0.2s;
  padding: 0 12px 0 42px;
}
.form-field:focus-within {
  border-color: #667eea;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
}
.field-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #86909c;
  font-size: 16px;
  pointer-events: none;
}
.field-input {
  flex: 1;
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #1d2129;
}
.field-input::placeholder { opacity: 0; }
.field-label {
  position: absolute;
  left: 42px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: #86909c;
  pointer-events: none;
  transition: all 0.18s ease;
  background: transparent;
  padding: 0 4px;
}
.field-input:not(:placeholder-shown) ~ .field-label,
.field-input:focus ~ .field-label {
  top: 0;
  left: 38px;
  transform: translateY(-50%) scale(0.78);
  color: #667eea;
  background: #fff;
}
.form-field:focus-within .field-label {
  color: #667eea;
}
.field-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: #86909c;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.15s;
}
.field-toggle:hover { color: #667eea; }

/* 密码强度 */
.pwd-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: -8px;
  font-size: 12px;
  color: #86909c;
}
.strength-bar {
  flex: 1;
  height: 3px;
  background: #e5e6eb;
  border-radius: 2px;
  overflow: hidden;
}
.strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: all 0.25s;
}
.strength-label { white-space: nowrap; }

/* 选项行 */
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -4px;
  font-size: 13px;
}
.remember {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4e5969;
  cursor: pointer;
  user-select: none;
}
.remember input[type="checkbox"] {
  accent-color: #667eea;
  width: 14px;
  height: 14px;
  cursor: pointer;
}
.forgot {
  color: #667eea;
  cursor: pointer;
  transition: color 0.15s;
}
.forgot:hover { color: #5a67d8; }

/* 登录按钮 */
.submit-btn {
  height: 48px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(102,126,234,0.4);
}
.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}
.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-spinner { font-size: 14px; }

/* 分割线 */
.divider {
  display: flex;
  align-items: center;
  margin: 24px 0 16px;
  font-size: 12px;
  color: #c9cdd4;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e6eb;
}
.divider span {
  padding: 0 16px;
  white-space: nowrap;
}

/* 测试账号卡片（类名沿用 demo-*，仅作样式钩子） */
.demo-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f8faff 0%, #f0efff 100%);
  border: 1px solid #e8e9f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s;
}
.demo-card:hover {
  border-color: #c3c8ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(102,126,234,0.12);
}
.demo-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.demo-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  color: #fff;
  font-size: 16px;
}
.demo-info { display: flex; flex-direction: column; gap: 2px; }
.demo-title {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 2px;
}
.demo-cred {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #1d2129;
  font-family: 'Consolas', 'Monaco', monospace;
}
.cred-key { color: #86909c; font-size: 11px; }
.cred-val { font-weight: 500; }
.cred-sep { color: #c9cdd4; }
.demo-action {
  font-size: 13px;
  color: #667eea;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 2px;
}
.demo-action .arrow {
  transition: transform 0.2s;
}
.demo-card:hover .demo-action .arrow {
  transform: translateX(3px);
}

.login-footer {
  margin-top: 24px;
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  text-align: center;
}

/* —— 响应式 —— */
@media (max-width: 768px) {
  .login-page { flex-direction: column; }
  .brand-panel { display: none; }
  .form-panel { width: 100%; padding: 20px; }
  .login-card { padding: 28px 22px; }
}
</style>
