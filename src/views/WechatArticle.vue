<template>
  <div class="article-container">
    <!-- Header -->
    <div class="card-header">
      <h2>添加微信公众号文章</h2>
      <span class="badge">小程序内嵌/跳转</span>
    </div>

    <!-- Form -->
    <form @submit.prevent="submitForm" class="article-form">
      <!-- Title -->
      <div class="form-group">
        <label class="form-label">
          文章标题 <span class="required">*</span>
        </label>
        <input
            v-model="form.title"
            type="text"
            placeholder="请输入微信公众号文章标题"
            class="form-input"
            :class="{ 'input-error': errors.title }"
            @input="errors.title = ''"
        />
        <p v-if="errors.title" class="error-text">{{ errors.title }}</p>
      </div>
      <div class="form-group">
        <label class="form-label">
          文章描述 <span class="required">*</span>
        </label>
        <input
            v-model="form.description"
            type="text"
            placeholder="请输入微信公众号文章描述"
            class="form-input"
            :class="{ 'input-error': errors.description }"
            @input="errors.description = ''"
        />
        <p v-if="errors.description" class="error-text">{{ errors.description }}</p>
      </div>
      <!-- URL -->
      <div class="form-group">
        <label class="form-label">
          微信文章 URL <span class="required">*</span>
        </label>
        <div class="input-wrapper">
          <span class="input-icon">🔗</span>
          <input
              v-model="form.url"
              type="url"
              placeholder="https://mp.weixin.qq.com/s/..."
              class="form-input with-icon"
              :class="{ 'input-error': errors.url }"
              @input="errors.url = ''"
          />
        </div>
        <p v-if="errors.url" class="error-text">{{ errors.url }}</p>
        <p v-else class="help-text">仅支持以 https://mp.weixin.qq.com/ 开头的链接</p>
      </div>

      <!-- Thumbnail Upload -->
      <div class="form-group">
        <label class="form-label">
          文章封面/缩略图 <span class="required">*</span>
        </label>
        <div
            class="upload-box"
            :class="{ 'upload-error': errors.thumbUrl }"
            @click="triggerFileInput"
        >
          <img v-if="form.thumbUrl" :src="form.thumbUrl" class="preview-img" alt="封面预览" />
          <div v-else class="upload-placeholder">
            <span class="upload-icon">🖼️</span>
            <span class="upload-text">点击上传封面图片</span>
          </div>
          <input
              ref="fileInputRef"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              class="hidden-file-input"
              @change="handleFileChange"
          />
        </div>
        <p v-if="errors.thumbUrl" class="error-text">{{ errors.thumbUrl }}</p>
        <p v-else class="help-text">支持 JPG/PNG，不超过 5MB</p>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button type="submit" :disabled="submitting" class="btn btn-primary">
          {{ submitting ? '保存中...' : '保存并关联' }}
        </button>
        <button type="button" @click="resetForm" class="btn btn-secondary">
          重置
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import {addArticlePost} from '../api/index.js'

import { useToast } from '@/composables/useToast';
const { showToast } = useToast();

const fileInputRef = ref(null)
const submitting = ref(false)

const form = reactive({
  title: '',
  url: '',
  thumbUrl: '',
  description: ''
})

const errors = reactive({
  title: '',
  url: '',
  thumbUrl: '',
  description: ''
})

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  const isLt2M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    showToast('请上传 JPG/PNG/WEBP 格式的图片！','error')
    return
  }
  if (!isLt2M) {
    showToast('图片大小不能超过 5MB！','error')
    return
  }

  form.thumbUrl = URL.createObjectURL(file)
  errors.thumbUrl = ''
}

const validate = () => {
  let isValid = true
  errors.title = ''
  errors.url = ''
  errors.thumbUrl = ''

  if (!form.title.trim()) {
    errors.title = '请输入文章标题'
    isValid = false
  }

  if (!form.thumbUrl) {
    errors.thumbUrl = '请上传文章缩略图'
    isValid = false
  }

  return isValid
}

const submitForm = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    // 1. Create a FormData instance
    const formData = new FormData()
    formData.append('title', form.title)
    formData.append('url', form.url)
    formData.append('description', form.description || '')

    // 2. Append the actual File object from the <input type="file">
    const fileInput = fileInputRef.value?.files?.[0]
    if (fileInput) {
      formData.append('thumbPic', fileInput) // Must match upload.single('thumbPic') in Express
    }

    // 3. Send FormData to API
    const res = await addArticlePost(formData)
    showToast('保存成功！','success')
    resetForm() // Clear form on success
  } catch (err) {
    showToast(err.response?.data?.message || '保存失败，请稍后重试','error')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  form.title = ''
  form.url = ''
  form.thumbUrl = ''
  form.description = ''
  Object.keys(errors).forEach((key) => (errors[key] = ''))
  if (fileInputRef.value) fileInputRef.value.value = ''
}
</script>

<style scoped>
/* Reset & Container */
* {
  box-sizing: border-box;
}

.article-container {
  max-width: 720px;
  margin: 30px auto;
  padding: 24px;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #eaedf1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid #f0f2f5;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.badge {
  font-size: 12px;
  font-weight: 500;
  color: #2563eb;
  background-color: #eff6ff;
  padding: 4px 10px;
  border-radius: 20px;
}

/* Alert Box */
.alert-box {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background-color: #fffbe2;
  border: 1px solid #fde047;
  border-radius: 8px;
  margin-bottom: 24px;
}

.alert-icon {
  font-size: 18px;
  line-height: 1;
}

.alert-content p {
  margin: 0;
}

.alert-title {
  font-size: 14px;
  font-weight: 600;
  color: #854d0e;
  margin-bottom: 4px !important;
}

.alert-desc {
  font-size: 13px;
  color: #a16207;
  line-height: 1.4;
}

/* Form Styles */
.article-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.required {
  color: #ef4444;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-color: #fff;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 10px;
  font-size: 14px;
  pointer-events: none;
}

.form-input.with-icon {
  padding-left: 32px;
}

.input-error {
  border-color: #ef4444 !important;
}

.error-text {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #ef4444;
}

.help-text {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #9ca3af;
}

/* Upload Area */
.upload-box {
  width: 240px;
  height: 135px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  background-color: #f9fafb;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s, background-color 0.2s;
}

.upload-box:hover {
  border-color: #2563eb;
  background-color: #f3f4f6;
}

.upload-error {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.upload-icon {
  font-size: 24px;
}

.upload-text {
  font-size: 12px;
  color: #6b7280;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hidden-file-input {
  display: none;
}

/* Buttons */
.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 8px;
}

.btn {
  padding: 9px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #2563eb;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.btn-primary:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

/* Guide Box */
.guide-box {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #f0f2f5;
  background-color: #f9fafb;
  padding: 16px;
  border-radius: 8px;
}

.guide-title {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 700;
  color: #374151;
}

.guide-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #4b5563;
  line-height: 1.8;
}
</style>