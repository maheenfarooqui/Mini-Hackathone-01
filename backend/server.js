// import dotenv from "dotenv";
// import app from "./src/app.js";
// import connectDb from "./src/db/db.js";

// dotenv.config();
// connectDb();

// const port = process.env.PORT || 3000;

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });




import dotenv from "dotenv";
import app from "./src/app.js";

dotenv.config();

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;