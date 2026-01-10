class VideoTimeCalculator {
    constructor() {
        this.initElements();
        this.bindEvents();
        this.debounceTimer = null;
        this.maxInputLength = 50000;
        this.maxLines = 1000;
        this.rateLimitDelay = 100;
        this.lastCalculateTime = 0;
    }

    initElements() {
        this.timeInput = document.getElementById('timeInput');
        this.calculateBtn = document.getElementById('calculateBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.helpBtn = document.getElementById('helpBtn');
        this.copyCodeBtn = document.getElementById('copyCodeBtn');
        this.errorMsg = document.getElementById('errorMsg');
        this.totalDuration = document.getElementById('totalDuration');
        this.speed15 = document.getElementById('speed15');
        this.speed20 = document.getElementById('speed20');
        this.videoCount = document.getElementById('videoCount');
        this.avgDuration = document.getElementById('avgDuration');
        this.maxDuration = document.getElementById('maxDuration');
        this.helpModal = document.getElementById('helpModal');
        this.closeModal = document.querySelector('.close');
    }

    bindEvents() {
        this.calculateBtn.addEventListener('click', () => this.calculate());
        this.clearBtn.addEventListener('click', () => this.clearInput());
        this.copyBtn.addEventListener('click', () => this.copyResult());
        this.helpBtn.addEventListener('click', (e) => this.showHelp(e));
        this.copyCodeBtn.addEventListener('click', () => this.copyExtractCode());
        this.closeModal.addEventListener('click', () => this.hideHelp());
        
        // 键盘快捷键
        this.timeInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.calculate();
            }
        });

        // 防抖输入验证
        this.timeInput.addEventListener('input', () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.validateInput(), 300);
        });

        // 模态框外点击关闭
        window.addEventListener('click', (e) => {
            if (e.target === this.helpModal) this.hideHelp();
        });
    }

    validateInput() {
        const value = this.timeInput.value.trim();
        if (!value) {
            this.clearError();
            return;
        }

        const lines = value.split('\n').filter(line => line.trim());
        const invalidLines = [];
        
        lines.forEach((line, index) => {
            if (!this.isValidTimeFormat(line.trim())) {
                invalidLines.push(index + 1);
            }
        });

        if (invalidLines.length > 0) {
            this.showError(`第 ${invalidLines.slice(0, 3).join(', ')} 行格式无效${invalidLines.length > 3 ? ` 等${invalidLines.length}行` : ''}`);
        } else {
            this.clearError();
        }
    }

    isValidTimeFormat(timeStr) {
        // 安全性检查：防止过长输入
        if (timeStr.length > 20) return false;
        
        // 清理输入，只保留数字、冒号和基本符号
        const cleaned = timeStr.replace(/[^0-9:]/g, '');
        
        // 验证格式：MM:SS 或 HH:MM:SS
        const timeRegex = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;
        if (!timeRegex.test(cleaned)) return false;
        
        // 验证数值范围
        const parts = cleaned.split(':').map(num => parseInt(num, 10));
        if (parts.length === 2) {
            return parts[0] <= 59 && parts[1] <= 59;
        } else if (parts.length === 3) {
            return parts[0] <= 23 && parts[1] <= 59 && parts[2] <= 59;
        }
        
        return false;
    }

    sanitizeInput(input) {
        // 限制输入长度
        if (input.length > this.maxInputLength) {
            input = input.substring(0, this.maxInputLength);
            this.showError(`输入内容过长，已截取前 ${this.maxInputLength} 个字符`);
        }
        
        // 移除潜在的恶意字符
        return input.replace(/[<>\"'&]/g, '');
    }

    calculate() {
        // 频率限制
        const now = Date.now();
        if (now - this.lastCalculateTime < this.rateLimitDelay) {
            return;
        }
        this.lastCalculateTime = now;

        const rawInput = this.timeInput.value.trim();
        if (!rawInput) {
            this.showError('请输入视频时长数据');
            return;
        }

        // 安全性处理
        const input = this.sanitizeInput(rawInput);
        const lines = input.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            this.showError('未找到有效的时长数据');
            return;
        }

        // 限制处理行数
        if (lines.length > this.maxLines) {
            this.showError(`输入行数过多，仅处理前 ${this.maxLines} 行`);
            lines.splice(this.maxLines);
        }

        const durations = [];
        const invalidLines = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.length > 20) return;

            // 严格验证时间格式
            if (!this.isValidTimeFormat(trimmed)) {
                invalidLines.push(index + 1);
                return;
            }

            const cleaned = trimmed.replace(/[^0-9:]/g, '');
            const parts = cleaned.split(':').map(part => {
                const num = parseInt(part, 10);
                return isNaN(num) ? 0 : Math.max(0, Math.min(num, 3600)); // 限制最大值
            });
            
            let seconds = 0;
            if (parts.length === 3) {
                seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
                seconds = parts[0] * 60 + parts[1];
            }
            
            // 限制单个视频最大时长（24小时）
            if (seconds > 0 && seconds <= 86400) {
                durations.push(seconds);
            } else if (seconds > 86400) {
                invalidLines.push(index + 1);
            }
        });

        if (durations.length === 0) {
            this.showError('未找到有效的时长数据');
            return;
        }

        if (invalidLines.length > 0) {
            this.showError(`忽略了 ${invalidLines.length} 行无效数据`);
        } else {
            this.clearError();
        }

        this.displayResults(durations);
    }

    displayResults(durations) {
        const totalSeconds = durations.reduce((sum, duration) => sum + duration, 0);
        const count = durations.length;
        const avgSeconds = Math.floor(totalSeconds / count);
        const maxSeconds = Math.max(...durations);

        this.totalDuration.textContent = this.formatTime(totalSeconds);
        this.speed15.textContent = this.formatTime(Math.ceil(totalSeconds / 1.5));
        this.speed20.textContent = this.formatTime(Math.ceil(totalSeconds / 2));
        this.videoCount.textContent = count;
        this.avgDuration.textContent = this.formatTime(avgSeconds, false);
        this.maxDuration.textContent = this.formatTime(maxSeconds, false);

        // 显示结果区域
        document.getElementById('result').style.display = 'block';
        
        // 滚动到结果
        document.getElementById('result').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }

    formatTime(seconds, showHours = true) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        const pad = (num) => num.toString().padStart(2, '0');
        
        if (showHours || h > 0) {
            return `${pad(h)}:${pad(m)}:${pad(s)}`;
        }
        return `${pad(m)}:${pad(s)}`;
    }

    clearInput() {
        this.timeInput.value = '';
        this.clearError();
        document.getElementById('result').style.display = 'none';
        this.timeInput.focus();
    }

    async copyResult() {
        try {
            const result = this.totalDuration.textContent;
            const count = this.videoCount.textContent;
            
            // 验证数据完整性
            if (!result || !count || result === '00:00:00') {
                this.showError('没有可复制的结果');
                return;
            }
            
            const copyText = `总时长: ${result} (${count}个视频)`;
            
            // 检查剪贴板 API 可用性
            if (!navigator.clipboard) {
                this.fallbackCopy(copyText);
                return;
            }
            
            await navigator.clipboard.writeText(copyText);
            this.showSuccess('结果已复制到剪贴板');
        } catch (err) {
            this.showError('复制失败，请手动复制');
        }
    }

    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showSuccess('结果已复制到剪贴板');
        } catch (err) {
            this.showError('复制失败，请手动复制');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    async copyExtractCode() {
        const codeElement = document.getElementById('extractCode');
        const code = codeElement.textContent || codeElement.innerText;
        
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(code);
                this.showCodeCopySuccess();
            } else {
                this.fallbackCopy(code);
            }
        } catch (err) {
            console.log('Clipboard API failed, using fallback');
            this.fallbackCopy(code);
        }
    }

    showCodeCopySuccess() {
        const btn = this.copyCodeBtn;
        const originalText = btn.textContent;
        btn.textContent = '✅ 已复制';
        btn.style.background = '#27ae60';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }

    showHelp(e) {
        e.preventDefault();
        this.helpModal.style.display = 'block';
    }

    hideHelp() {
        this.helpModal.style.display = 'none';
    }

    showError(message) {
        // 防止 XSS：转义 HTML 字符
        const safeMessage = this.escapeHtml(message);
        this.errorMsg.textContent = safeMessage;
        this.errorMsg.className = 'error-msg show';
    }

    showSuccess(message) {
        const safeMessage = this.escapeHtml(message);
        this.errorMsg.textContent = safeMessage;
        this.errorMsg.className = 'error-msg show success';
        setTimeout(() => this.clearError(), 2000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearError() {
        this.errorMsg.textContent = '';
        this.errorMsg.className = 'error-msg';
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new VideoTimeCalculator();
});
