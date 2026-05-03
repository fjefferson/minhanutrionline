import app from "./app";
import { PORT } from "./config/env";

app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});
