// User ka search text seedha RegExp mein daalna do cheezein tod deta hai:
//  1) "(" ya "[" jaisa text invalid regex banakar 500 deta hai
//  2) ".*" jaisa text poori collection scan karwa sakta hai
// Isliye special characters ko escape karke hi $regex mein dete hain.
export const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
