async (page) => {
  const report = {};
  
  // Clear any existing state just in case
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  await page.goto('https://ecommerce-platform-ashen-nine.vercel.app/');
  await page.waitForLoadState('networkidle');
  
  // Find a product link and click it
  const productLink = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href^="/products/"]'));
    return links.length > 0 ? links[0].href : null;
  });
  
  if (!productLink) {
    return { error: 'No product links found on homepage' };
  }

  await page.goto(productLink);
  await page.waitForTimeout(2000);
  
  // Add to cart
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addBtn = btns.find(b => b.innerText.toLowerCase().includes('add to cart'));
    if (addBtn) addBtn.click();
  });
  await page.waitForTimeout(1000);
  
  // Reload
  await page.reload();
  await page.waitForTimeout(2000);
  
  // Check cart size (assuming there's an indicator in header)
  const cartPersisted = await page.evaluate(() => {
    // Look for a number inside a cart icon or badge, or just check localStorage
    const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
    return cartItems.length > 0;
  });
  
  report['Guest cart persists'] = cartPersisted ? 'PASS' : 'FAIL';
  
  return report;
}
