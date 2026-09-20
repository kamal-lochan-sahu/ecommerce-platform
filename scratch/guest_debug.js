async (page) => {
  const report = {};
  
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  await page.goto('https://ecommerce-platform-ashen-nine.vercel.app/');
  await page.waitForTimeout(1000);
  
  const productLink = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href^="/products/"]'));
    return links.length > 0 ? links[0].href : null;
  });

  await page.goto(productLink);
  await page.waitForTimeout(2000);
  
  const clicked = await page.evaluate(() => {
    // Find Add to Cart
    const elements = Array.from(document.querySelectorAll('*'));
    const addBtn = elements.find(el => el.innerText && el.innerText.trim().toLowerCase() === 'add to cart' && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'DIV'));
    if (addBtn) {
      addBtn.click();
      return true;
    }
    return false;
  });
  
  await page.waitForTimeout(2000);
  await page.reload();
  await page.waitForTimeout(2000);
  
  const lsKeys = await page.evaluate(() => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    return data;
  });
  
  // also check if "1" is visible in a cart badge
  const hasCartBadge = await page.evaluate(() => {
    return document.body.innerText.includes('Cart (1)') || document.body.innerText.match(/cart\s*1/i) !== null;
  });
  
  report['AddBtnClicked'] = clicked;
  report['LocalStorage'] = lsKeys;
  report['BadgeCheck'] = hasCartBadge;
  
  return report;
}
