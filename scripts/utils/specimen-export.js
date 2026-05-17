window.SpecimenExport = {
    exportIdeaToJpg: async function(idea) {
        const theme = document.documentElement.dataset.theme || 'day';
        const climate = document.documentElement.dataset.climate || 'moss';

        const w = 1080;
        const baseH = 1350;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = baseH;
        let ctx = canvas.getContext('2d');
        if (!ctx) return;

        const gradients = {
            day: {
                humid: ['#b6f2e5', '#88d7c8'],
                'white-noise': ['#f0f4ff', '#cfd8e8'],
                defocus: ['#c7d7e6', '#94a8bc'],
                moss: ['#a6e9cf', '#7fd2b6']
            },
            night: {
                humid: ['#243a45', '#16242d'],
                'white-noise': ['#202833', '#141a22'],
                defocus: ['#222c36', '#151b23'],
                moss: ['#173450', '#0e1d2d']
            }
        };

        const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

        const pad = 84;
        const cardX = pad;
        const cardY = 140;
        const cardW = w - pad * 2;
        const baseCardH = baseH - 260;
        const radius = 56;
        const innerPad = 70;
        const lineHeight = 58;
        const reserveBottom = 150;
        const footerGap = 54;
        const maxCanvasH = 4200;

        const bodyFont = `700 38px ${fontFamily}`;

        function buildWrappedLines(text, maxWidth, maxLineCount) {
            const raw = String(text || '');
            const paragraphs = raw.split('\n');
            const lines = [];
            let clipped = false;

            const pushLine = (s) => {
                const trimmed = s.trimEnd();
                if (!trimmed) return;
                lines.push(trimmed);
            };

            const pushClipped = () => {
                const ellipsis = '…';
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (!lines[i]) continue;
                    let base = lines[i];
                    while (base.length && ctx.measureText(base + ellipsis).width > maxWidth) {
                        base = base.slice(0, -1);
                    }
                    lines[i] = base + ellipsis;
                    break;
                }
            };

            const addToken = (token, lineRef) => {
                const nextLine = lineRef.value + token;
                if (ctx.measureText(nextLine).width <= maxWidth || !lineRef.value) {
                    lineRef.value = nextLine;
                    return;
                }
                pushLine(lineRef.value);
                lineRef.value = token.trimStart();
            };

            const addLongTokenByChar = (token, lineRef) => {
                const chars = Array.from(token);
                chars.forEach((ch) => {
                    addToken(ch, lineRef);
                });
            };

            for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
                const p = paragraphs[pIndex];
                if (!p) {
                    if (pIndex !== paragraphs.length - 1 && lines.length < maxLineCount) lines.push('');
                    continue;
                }

                const tokens = /\s/.test(p) ? p.split(/(\s+)/).filter(Boolean) : Array.from(p);
                const lineRef = { value: '' };

                for (const t of tokens) {
                    if (!t) continue;
                    if (lines.length >= maxLineCount) {
                        clipped = true;
                        break;
                    }

                    if (ctx.measureText(t).width > maxWidth) {
                        addLongTokenByChar(t, lineRef);
                        continue;
                    }
                    addToken(t, lineRef);
                }

                if (lines.length < maxLineCount) pushLine(lineRef.value);
                if (pIndex !== paragraphs.length - 1) {
                    if (lines.length < maxLineCount) lines.push('');
                    else clipped = true;
                }
            }

            if (lines.length > maxLineCount) {
                clipped = true;
                lines.length = maxLineCount;
            }

            if (clipped) {
                pushClipped();
            }

            return lines;
        }

        function calcTextHeight(lines) {
            const paragraphGap = Math.round(lineHeight * 0.7);
            return lines.reduce((sum, l) => sum + (l === '' ? paragraphGap : lineHeight), 0);
        }

        function measureLayout() {
            ctx.font = bodyFont;

            const ideaText = idea && idea.text ? idea.text : '';
            const timeStr = idea && idea.time ? `记录时间：${idea.time}` : '';
            const timeBlock = timeStr ? 70 : 0;

            const textStartY = cardY + innerPad + 70 + 54 + 12;
            const maxWidth = cardW - innerPad * 2;

            const baseLines = buildWrappedLines(ideaText, maxWidth, 220);
            const baseTextH = calcTextHeight(baseLines);
            const desiredCardH = Math.max(baseCardH, (textStartY - cardY) + baseTextH + timeBlock + reserveBottom);
            const desiredH = cardY + desiredCardH + 120;

            if (desiredH <= maxCanvasH) {
                return {
                    h: desiredH,
                    cardH: desiredCardH,
                    lines: baseLines,
                    timeStr
                };
            }

            const cardHCap = maxCanvasH - cardY - 120;
            const maxTextH = cardHCap - (textStartY - cardY) - timeBlock - reserveBottom;
            const maxLines = Math.max(1, Math.floor(maxTextH / lineHeight));
            const clippedLines = buildWrappedLines(ideaText, maxWidth, maxLines);
            return {
                h: maxCanvasH,
                cardH: cardHCap,
                lines: clippedLines,
                timeStr
            };
        }

        function drawLines(lines, x, y, maxWidth) {
            const paragraphGap = Math.round(lineHeight * 0.7);
            let yy = y;
            for (const l of lines) {
                if (l === '') {
                    yy += paragraphGap;
                    continue;
                }

                let rendered = l;
                if (ctx.measureText(rendered).width > maxWidth) {
                    const ellipsis = '…';
                    while (rendered.length && ctx.measureText(rendered + ellipsis).width > maxWidth) {
                        rendered = rendered.slice(0, -1);
                    }
                    rendered = rendered + ellipsis;
                }

                ctx.fillText(rendered, x, yy);
                yy += lineHeight;
            }
            return yy;
        }

        const layout = measureLayout();
        const h = layout.h;
        if (layout.h !== canvas.height) {
            canvas.height = layout.h;
            ctx = canvas.getContext('2d');
            if (!ctx) return;
        }

        const fallback = gradients[theme] ? gradients[theme].moss : gradients.day.moss;
        const palette = (gradients[theme] && gradients[theme][climate]) ? gradients[theme][climate] : fallback;
        const bg = ctx.createLinearGradient(0, 0, w, h);
        bg.addColorStop(0, palette[0]);
        bg.addColorStop(1, palette[1]);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalAlpha = theme === 'night' ? 0.06 : 0.07;
        const dotCount = Math.round(11000 * (h / baseH));
        for (let i = 0; i < dotCount; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = Math.random() * 1.6 + 0.2;
            ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        function roundRectPath(x, y, width, height, radius) {
            const r = Math.min(radius, width / 2, height / 2);
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + width - r, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + r);
            ctx.lineTo(x + width, y + height - r);
            ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
            ctx.lineTo(x + r, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        const cardH = layout.cardH;

        ctx.save();
        ctx.shadowColor = theme === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 42;
        ctx.shadowOffsetY = 16;
        roundRectPath(cardX, cardY, cardW, cardH, radius);
        ctx.fillStyle = theme === 'night' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.22)';
        ctx.fill();
        ctx.restore();

        ctx.save();
        roundRectPath(cardX, cardY, cardW, cardH, radius);
        ctx.strokeStyle = theme === 'night' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = theme === 'night' ? 0.12 : 0.18;
        const glow = ctx.createRadialGradient(w * 0.22, cardY + cardH * 0.14, 10, w * 0.22, cardY + cardH * 0.14, cardW);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.restore();

        const ink = theme === 'night' ? 'rgba(236, 244, 240, 0.94)' : 'rgba(14, 38, 30, 0.92)';
        const subInk = theme === 'night' ? 'rgba(236, 244, 240, 0.68)' : 'rgba(14, 38, 30, 0.58)';

        let cursorY = cardY + innerPad;

        ctx.fillStyle = ink;
        ctx.font = `800 52px ${fontFamily}`;
        ctx.fillText('🍄', cardX + innerPad, cursorY);
        ctx.font = `900 44px ${fontFamily}`;
        ctx.fillText('灵感卡片', cardX + innerPad + 70, cursorY);
        cursorY += 70;

        ctx.fillStyle = subInk;
        ctx.font = `700 26px ${fontFamily}`;
        const dateStr = new Date().toLocaleString('zh-CN', { hour12: false });
        const tag = theme === 'night' ? '夜游模式' : '白昼模式';
        const climateTagMap = {
            humid: '潮湿季',
            'white-noise': '白噪原野',
            defocus: '失焦森林',
            moss: '林间空地'
        };
        const climateTag = climateTagMap[climate] || '林间空地';
        ctx.fillText(`${dateStr} · ${tag} · ${climateTag}`, cardX + innerPad, cursorY);
        cursorY += 54;

        ctx.fillStyle = ink;
        ctx.font = bodyFont;
        cursorY = drawLines(layout.lines, cardX + innerPad, cursorY + 12, cardW - innerPad * 2);

        ctx.fillStyle = subInk;
        ctx.font = `700 26px ${fontFamily}`;
        if (layout.timeStr) {
            const footerY = cardY + cardH - footerGap;
            const timeY = Math.min(cursorY + 26, footerY - 88);
            ctx.fillText(layout.timeStr, cardX + innerPad, timeY);
        }

        ctx.fillStyle = subInk;
        ctx.font = `700 24px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText('来自《请勿食用此蘑菇！》森林记录', w / 2, cardY + cardH - 54);
        ctx.textAlign = 'start';

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if (!blob) return;

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const fileName = `forest_specimen_${Date.now()}.jpg`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    },
    exportIdeaToPng: async function(idea) {
        return window.SpecimenExport.exportIdeaToJpg(idea);
    }
};
