// ==UserScript==
// @name         Bilibili 视频时长统计
// @namespace    http://tampermonkey.net/
// @version      2.2.0
// @description  自动统计 B 站视频合集的总时长、平均时长等信息
// @author       1chuci
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/list/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    class BilibiliTimeSum {
        constructor() {
            this.durations = [];
            this.lastKey = '';
            this.collapsed = false;
            this.dragging = false;
            this.offset = { x: 0, y: 0 };
            this.panel = null;
            this.debounceTimer = null;
            this.init();
            this.setupGlobalListeners();
        }

        init() {
            this.extractAndDisplay();
            const observer = new MutationObserver(() => this.scheduleExtract());
            observer.observe(document.body, { childList: true, subtree: true });
        }

        scheduleExtract() {
            if (this.debounceTimer) return;
            this.debounceTimer = setTimeout(() => {
                this.debounceTimer = null;
                this.extractAndDisplay();
            }, 300);
        }

        setupGlobalListeners() {
            document.addEventListener('mousemove', (e) => {
                if (!this.dragging || !this.panel) return;
                this.panel.style.left = (e.clientX - this.offset.x) + 'px';
                this.panel.style.top = (e.clientY - this.offset.y) + 'px';
                this.panel.style.right = 'auto';
            });

            document.addEventListener('mouseup', () => {
                if (this.dragging && this.panel) {
                    this.dragging = false;
                    this.panel.style.cursor = 'move';
                }
            });
        }

        extractDurations() {
            const selectors = [
                '.stat-item.duration',
                '.duration',
                '.multi-page-v1 .page-item .duration',
                '.list-box li .duration',
                '#multi_page .page-link .duration'
            ];

            const durations = [];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach(el => {
                        const seconds = this.parseTime(el.textContent.trim());
                        if (seconds > 0 && seconds <= 86400) {
                            durations.push(seconds);
                        }
                    });
                    if (durations.length > 0) break;
                }
            }

            return durations;
        }

        parseTime(timeStr) {
            const match = timeStr.match(/(\d{1,2}:)?\d{1,2}:\d{2}/);
            if (!match) return 0;

            const parts = match[0].split(':').map(n => parseInt(n, 10));
            if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
                return parts[0] * 60 + parts[1];
            }
            return 0;
        }

        formatTime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            const pad = n => n.toString().padStart(2, '0');
            return h > 0 ? pad(h) + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
        }

        extractAndDisplay() {
            const durations = this.extractDurations();
            const key = durations.join(',');
            if (durations.length === 0 || key === this.lastKey) return;

            this.lastKey = key;
            this.durations = durations;
            this.displayResults();
        }

        displayResults() {
            const total = this.durations.reduce((sum, d) => sum + d, 0);
            const count = this.durations.length;
            const avg = Math.floor(total / count);
            const max = this.durations.reduce((m, d) => d > m ? d : m, 0);

            if (!this.panel) {
                this.panel = document.createElement('div');
                this.panel.id = 'bilibili-timesum-panel';
                this.panel.style.cssText = [
                    'position: fixed',
                    'top: 80px',
                    'right: 20px',
                    'z-index: 9999',
                    'background: rgba(255,255,255,0.95)',
                    'border-radius: 8px',
                    'padding: 0',
                    'box-shadow: 0 2px 10px rgba(0,0,0,0.2)',
                    'font-family: -apple-system, sans-serif',
                    'font-size: 14px',
                    'min-width: 200px',
                    '-webkit-backdrop-filter: blur(10px)',
                    'backdrop-filter: blur(10px)',
                    'cursor: move',
                    'user-select: none'
                ].join(';');
                document.body.appendChild(this.panel);
            }

            const contentDisplay = this.collapsed ? 'none' : 'block';
            const toggleIcon = this.collapsed ? '▼' : '▲';

            this.panel.innerHTML =
                '<div id="panel-header" style="font-weight: bold; padding: 15px; color: #00a1d6; cursor: move; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;">' +
                '<span>⏱️ 视频时长统计</span>' +
                '<button id="toggle-btn" aria-label="收起/展开" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 0 5px;">' + toggleIcon + '</button>' +
                '</div>' +
                '<div id="panel-content" style="display: ' + contentDisplay + '; padding: 15px; line-height: 1.8;">' +
                '<div>📊 视频数量: <b>' + count + '</b></div>' +
                '<div>⏰ 总时长: <b style="color: #e74c3c;">' + this.formatTime(total) + '</b></div>' +
                '<div>📈 平均时长: <b>' + this.formatTime(avg) + '</b></div>' +
                '<div>🔝 最长视频: <b>' + this.formatTime(max) + '</b></div>' +
                '<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">' +
                '<div>🚀 1.5x: ' + this.formatTime(Math.ceil(total / 1.5)) + '</div>' +
                '<div>⚡ 2.0x: ' + this.formatTime(Math.ceil(total / 2)) + '</div>' +
                '</div>' +
                '</div>';

            this.attachEventListeners();
        }

        attachEventListeners() {
            const header = document.getElementById('panel-header');
            const toggleBtn = document.getElementById('toggle-btn');

            header.addEventListener('mousedown', (e) => {
                if (e.target.id === 'toggle-btn') return;
                this.dragging = true;
                const rect = this.panel.getBoundingClientRect();
                this.panel.style.left = rect.left + 'px';
                this.panel.style.top = rect.top + 'px';
                this.panel.style.right = 'auto';
                this.offset.x = e.clientX - rect.left;
                this.offset.y = e.clientY - rect.top;
                this.panel.style.cursor = 'grabbing';
            });

            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCollapse();
            });
        }

        toggleCollapse() {
            this.collapsed = !this.collapsed;
            const content = document.getElementById('panel-content');
            const toggleBtn = document.getElementById('toggle-btn');

            if (this.collapsed) {
                content.style.display = 'none';
                toggleBtn.textContent = '▼';
            } else {
                content.style.display = 'block';
                toggleBtn.textContent = '▲';
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new BilibiliTimeSum());
    } else {
        new BilibiliTimeSum();
    }
})();
