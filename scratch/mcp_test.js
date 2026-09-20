async (page) => {
  await page.goto('https://ecommerce-platform-ashen-nine.vercel.app/');
  return await page.title();
}
