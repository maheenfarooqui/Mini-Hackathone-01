import test from "node:test";
import assert from "node:assert/strict";
import authRoute from "../src/routes/auth.route.js";
import { getAllowedOrigins } from "../src/utils/corsOrigins.js";

function route(path) {
  return authRoute.stack.find((layer) => layer.route?.path === path)?.route;
}

test("login and registration routes apply rate limiting before their handlers", () => {
  for (const path of ["/login", "/register"]) {
    const handlers = route(path)?.stack || [];
    assert.equal(handlers.length, 2);
    assert.notEqual(handlers[0].handle, handlers[1].handle);
  }
  assert.equal(route("/logout").stack.length, 1);
});

test("CORS origins use configured frontend URLs and add localhost only outside production", () => {
  const production = getAllowedOrigins(
    "https://frontend.example, https://admin.example ",
    "production",
  );
  assert.deepEqual([...production], [
    "https://frontend.example",
    "https://admin.example",
  ]);
  assert.equal(production.has("http://localhost:5173"), false);

  const development = getAllowedOrigins("", "development");
  assert.equal(development.has("http://localhost:5173"), true);
  assert.equal(development.has("http://localhost:3000"), true);
});
