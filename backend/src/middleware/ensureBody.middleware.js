// Express 5: agar request ke saath body hi nahi hai (jaise `PUT /orders/:id/cancel`
// ya admin ka review "Reject" button, jo bina body ke jaate hain) to `req.body` UNDEFINED
// hota hai, `{}` nahi. Tab `const { reason } = req.body` jaise handler 500 se crash kar jaate hain.
// Ye middleware har request ko kam se kam khaali object deta hai, taaki wo poori class ek jagah fix rahe.
// express.json() / urlencoded() ke BAAD aur routes ke PEHLE lagta hai (multer apni body khud set karta hai).
export const ensureBody = (req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
};
