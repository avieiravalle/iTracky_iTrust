import { createApp } from "./server";

const PORT = 3000;

createApp().then(app => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
