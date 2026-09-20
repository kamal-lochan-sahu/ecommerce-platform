async (page) => {
  const report = {};
  await page.goto('https://ecommerce-platform-ashen-nine.vercel.app/');
  await page.waitForTimeout(1000);
  
  let productsReq = null;
  page.on('response', (res) => {
    if (res.url().includes('/api/products?category=')) {
      productsReq = res;
    }
  });

  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const catLink = links.find(l => l.innerText.toLowerCase().includes('electronics'));
    if (catLink) catLink.click();
  });
  
  await page.waitForTimeout(3000);
  
  if (productsReq) {
    report.requestUrl = productsReq.url();
    report.status = productsReq.status();
    try {
      const body = await productsReq.json();
      report.bodyLength = body.products ? body.products.length : (Array.isArray(body) ? body.length : 'Not array');
      report.result = report.status === 200 && report.bodyLength > 0 ? 'PASS' : 'FAIL';
    } catch(e) {
      report.result = 'FAIL: ' + e.message;
    }
  } else {
    report.result = 'FAIL: No /api/products request found';
  }
  
  return report;
}
