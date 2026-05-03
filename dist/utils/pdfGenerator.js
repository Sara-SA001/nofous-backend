"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePDF = generatePDF;
const puppeteer_1 = __importDefault(require("puppeteer"));
async function generatePDF(html, filename, landscape = true) {
    let browser = null;
    try {
        browser = await puppeteer_1.default.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        const page = await browser.newPage();
        // إعدادات مهمة للعربية
        await page.setViewport({ width: 1200, height: 800 });
        await page.setContent(html, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
            timeout: 60000
        });
        // انتظار إضافي للخطوط العربية
        await page.evaluate(() => document.fonts.ready);
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: landscape,
            printBackground: true,
            margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
        });
        console.log(`[PDF] Success: ${filename} (${pdfBuffer.length} bytes)`);
        return {
            buffer: pdfBuffer,
            filename: `${filename}.pdf`,
        };
    }
    catch (error) {
        console.error('[PDF] Error:', error);
        throw error;
    }
    finally {
        if (browser)
            await browser.close();
    }
}
