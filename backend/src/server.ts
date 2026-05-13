import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`Zakovot API http://localhost:${env.PORT} da ishga tushdi`);
});
