import puppeteer from 'puppeteer';

export async function generatePDF(html: string, filename: string, landscape: boolean = true) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    const pageSize = landscape
      ? { width: 1122, height: 794 }
      : { width: 794, height: 1122 };

    // Match the browser viewport to A4 so templates use the full page width.
    await page.setViewport({ width: pageSize.width, height: pageSize.height, deviceScaleFactor: 1 });
    await page.setContent(html, {
      waitUntil: ['load', 'domcontentloaded'],
      timeout: 60000,
    });

    // Wait for Arabic fonts before printing.
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMediaType('print');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape,
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
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
