class VideoTimeCalculator {
    constructor() {
        this.initElements();
        this.bindEvents();
        this.debounceTimer = null;
        this.maxLines = 1000;
        this.rateLimitDelay = 100;
        this.lastCalculateTime = 0;
        this.cleanRegex = /[^0-9:]/g;
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
        this.resultSection = document.getElementById('result');
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

        // ESC 关闭 + Tab 焦点圈定
        document.addEventListener('keydown', (e) => {
            if (this.helpModal.style.display !== 'block') return;
            if (e.key === 'Escape') {
                this.hideHelp();
                return;
            }
            if (e.key === 'Tab') {
                const focusables = this.helpModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
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
            if (this.parseTime(line.trim()) === null) {
                invalidLines.push(index + 1);
            }
        });

        if (invalidLines.length > 0) {
            const shown = invalidLines.slice(0, 3).join(', ');
            const suffix = invalidLines.length > 3 ? ' 等' + invalidLines.length + '行' : '';
            this.showError('第 ' + shown + ' 行格式无效' + suffix);
        } else {
            this.clearError();
        }
    }

    parseTime(timeStr) {
        // 解析 MM:SS 或 HH:MM:SS，返回秒数；无效返回 null
        if (typeof timeStr !== 'string' || !timeStr) return null;

        const cleaned = timeStr.replace(this.cleanRegex, '');
        if (!cleaned || cleaned.length > 20) return null;

        // MM:SS（分钟允许超过 59，例如 90:00）
        let match = cleaned.match(/^(\d{1,3}):(\d{2})$/);
        if (match) {
            const seconds = parseInt(match[2], 10);
            if (seconds >= 60) return null;
            const total = parseInt(match[1], 10) * 60 + seconds;
            return total > 0 && total <= 86400 ? total : null;
        }

        // HH:MM:SS（小时最多 24，分钟/秒需 < 60）
        match = cleaned.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
        if (match) {
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);
            if (minutes >= 60 || seconds >= 60) return null;
            const total = parseInt(match[1], 10) * 3600 + minutes * 60 + seconds;
            return total > 0 && total <= 86400 ? total : null;
        }

        return null;
    }

    calculate() {
        // 频率限制
        const now = Date.now();
        if (now - this.lastCalculateTime < this.rateLimitDelay) {
            return;
        }
        this.lastCalculateTime = now;

        const input = this.timeInput.value.trim();
        if (!input) {
            this.showError('请输入视频时长数据');
            return;
        }

        const lines = input.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            this.showError('未找到有效的时长数据');
            return;
        }

        // 限制处理行数
        if (lines.length > this.maxLines) {
            this.showError('输入行数过多，仅处理前 ' + this.maxLines + ' 行');
            lines.splice(this.maxLines);
        }

        const durations = [];
        let invalidCount = 0;

        for (const line of lines) {
            const seconds = this.parseTime(line.trim());
            if (seconds === null) {
                invalidCount++;
                continue;
            }
            durations.push(seconds);
        }

        if (durations.length === 0) {
            this.showError('未找到有效的时长数据');
            return;
        }

        if (invalidCount > 0) {
            this.showError('忽略了 ' + invalidCount + ' 行无效数据');
        } else {
            this.clearError();
        }

        this.displayResults(durations);
    }

    displayResults(durations) {
        const totalSeconds = durations.reduce((sum, duration) => sum + duration, 0);
        const count = durations.length;
        const avgSeconds = Math.floor(totalSeconds / count);
        const maxSeconds = durations.reduce((max, d) => d > max ? d : max, 0);

        this.totalDuration.textContent = this.formatTime(totalSeconds);
        this.speed15.textContent = this.formatTime(Math.ceil(totalSeconds / 1.5));
        this.speed20.textContent = this.formatTime(Math.ceil(totalSeconds / 2));
        this.videoCount.textContent = count;
        this.avgDuration.textContent = this.formatTime(avgSeconds, false);
        this.maxDuration.textContent = this.formatTime(maxSeconds, false);

        // 显示结果区域
        this.resultSection.style.display = 'block';

        // 滚动到结果
        this.resultSection.scrollIntoView({
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
            return pad(h) + ':' + pad(m) + ':' + pad(s);
        }
        return pad(m) + ':' + pad(s);
    }

    clearInput() {
        this.timeInput.value = '';
        this.clearError();
        this.resultSection.style.display = 'none';
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

            const copyText = '总时长: ' + result + ' (' + count + '个视频)';

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
        this.closeModal.focus();
    }

    hideHelp() {
        this.helpModal.style.display = 'none';
        this.helpBtn.focus();
    }

    showMessage(message, type = 'error') {
        // textContent 天然防 XSS，无需额外转义
        this.errorMsg.textContent = message;
        this.errorMsg.className = 'error-msg show' + (type === 'success' ? ' success' : '');
        if (type === 'success') {
            setTimeout(() => this.clearError(), 2000);
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
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
