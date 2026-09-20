async (page) => {
  await page.goto('https://ecommerce-platform-ashen-nine.vercel.app/');
  await page.waitForTimeout(1000);
  
  await page.evaluate(() => {
    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  
  await page.waitForTimeout(2000);
  
  const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.innerText));
  const inputs = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.name || i.id || i.placeholder || i.type));
  
  return { buttons, inputs };
}
