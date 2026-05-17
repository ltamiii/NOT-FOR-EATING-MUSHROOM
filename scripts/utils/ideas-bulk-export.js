window.IdeasBulkExport = (() => {
    function toUtf8Bytes(str) {
        return new TextEncoder().encode(String(str || ''));
    }

    function escapeXml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function crc32(buf) {
        const table = (() => {
            const t = new Uint32Array(256);
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let k = 0; k < 8; k++) {
                    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
                }
                t[i] = c >>> 0;
            }
            return t;
        })();

        let crc = 0xffffffff;
        for (let i = 0; i < buf.length; i++) {
            crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
        }
        return (crc ^ 0xffffffff) >>> 0;
    }

    function writeU16(view, offset, val) {
        view.setUint16(offset, val & 0xffff, true);
    }

    function writeU32(view, offset, val) {
        view.setUint32(offset, val >>> 0, true);
    }

    function concatParts(parts) {
        const total = parts.reduce((sum, p) => sum + p.length, 0);
        const out = new Uint8Array(total);
        let off = 0;
        parts.forEach((p) => {
            out.set(p, off);
            off += p.length;
        });
        return out;
    }

    function zipStore(entries) {
        const fileParts = [];
        const centralParts = [];
        let offset = 0;

        entries.forEach((entry) => {
            const nameBytes = toUtf8Bytes(entry.name);
            const dataBytes = entry.data instanceof Uint8Array ? entry.data : toUtf8Bytes(entry.data);
            const crc = crc32(dataBytes);

            const local = new Uint8Array(30 + nameBytes.length);
            const lv = new DataView(local.buffer);
            writeU32(lv, 0, 0x04034b50);
            writeU16(lv, 4, 20);
            writeU16(lv, 6, 0);
            writeU16(lv, 8, 0);
            writeU16(lv, 10, 0);
            writeU16(lv, 12, 0);
            writeU32(lv, 14, crc);
            writeU32(lv, 18, dataBytes.length);
            writeU32(lv, 22, dataBytes.length);
            writeU16(lv, 26, nameBytes.length);
            writeU16(lv, 28, 0);
            local.set(nameBytes, 30);

            fileParts.push(local, dataBytes);

            const central = new Uint8Array(46 + nameBytes.length);
            const cv = new DataView(central.buffer);
            writeU32(cv, 0, 0x02014b50);
            writeU16(cv, 4, 20);
            writeU16(cv, 6, 20);
            writeU16(cv, 8, 0);
            writeU16(cv, 10, 0);
            writeU16(cv, 12, 0);
            writeU16(cv, 14, 0);
            writeU32(cv, 16, crc);
            writeU32(cv, 20, dataBytes.length);
            writeU32(cv, 24, dataBytes.length);
            writeU16(cv, 28, nameBytes.length);
            writeU16(cv, 30, 0);
            writeU16(cv, 32, 0);
            writeU16(cv, 34, 0);
            writeU16(cv, 36, 0);
            writeU32(cv, 38, 0);
            writeU32(cv, 42, offset);
            central.set(nameBytes, 46);
            centralParts.push(central);

            offset += local.length + dataBytes.length;
        });

        const centralStart = offset;
        const centralDir = concatParts(centralParts);
        offset += centralDir.length;

        const end = new Uint8Array(22);
        const ev = new DataView(end.buffer);
        writeU32(ev, 0, 0x06054b50);
        writeU16(ev, 4, 0);
        writeU16(ev, 6, 0);
        writeU16(ev, 8, entries.length);
        writeU16(ev, 10, entries.length);
        writeU32(ev, 12, centralDir.length);
        writeU32(ev, 16, centralStart);
        writeU16(ev, 20, 0);

        return concatParts([...fileParts, centralDir, end]);
    }

    function buildDocxDocumentXml(lines) {
        const body = (lines || []).map((line) => {
            const text = String(line || '');
            if (!text) return '<w:p/>';
            return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
        }).join('');

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
            `<w:body>${body}</w:body>` +
            `</w:document>`;
    }

    function downloadBlob(blob, fileName) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }

    function exportLinesToDocx(lines, fileName) {
        const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
            `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
            `<Default Extension="xml" ContentType="application/xml"/>` +
            `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
            `</Types>`;

        const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
            `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
            `</Relationships>`;

        const docXml = buildDocxDocumentXml(lines);

        const zipBytes = zipStore([
            { name: '[Content_Types].xml', data: toUtf8Bytes(contentTypes) },
            { name: '_rels/.rels', data: toUtf8Bytes(rels) },
            { name: 'word/document.xml', data: toUtf8Bytes(docXml) }
        ]);

        const blob = new Blob([zipBytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        downloadBlob(blob, fileName);
    }

    function exportLinesToPdf(lines, title) {
        const w = window.open('', '_blank');
        if (!w) return;
        const safeTitle = String(title || '灵感导出').replace(/[<>]/g, '');
        const content = (lines || []).join('\n');
        const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${safeTitle}</title>` +
            `<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;padding:24px;line-height:1.6;color:#0e261e;}h1{font-size:18px;margin:0 0 14px 0;}pre{white-space:pre-wrap;word-break:break-word;font-size:14px;margin:0;}</style>` +
            `</head><body><h1>${safeTitle}</h1><pre>${escapeXml(content)}</pre></body></html>`;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => {
            w.print();
        }, 250);
    }

    return {
        exportLinesToDocx,
        exportLinesToPdf
    };
})();

