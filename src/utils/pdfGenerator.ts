import puppeteer from 'puppeteer';

export async function generatePDF(html: string, filename: string, landscape: boolean = true) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
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
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    });

    console.log(`[PDF] Success: ${filename} (${pdfBuffer.length} bytes)`);

    return {
      buffer: pdfBuffer,
      filename: `${filename}.pdf`,
    };

  } catch (error: any) {
    console.error('[PDF] Error:', error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}