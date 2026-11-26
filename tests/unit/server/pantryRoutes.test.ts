import express from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import routes from "../../../server/routes.js";
import { createSession } from "../../../server/auth.js";
import { getDb, initializeDb } from "../../../server/db.js";
import { createCsrfToken } from "../../../server/security.js";
import { pantryItems, sessions, shoppingListItems, users } from "../../../shared/schema.js";

const configuredDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseIsLocal = (() => {
  if (!configuredDatabaseUrl) return false;
  try {
    const url = new URL(configuredDatabaseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      && url.pathname.replace(/^\//, "") === "sage_test";
  } catch {
    return false;
  }
})();

interface TestUser {
  id: string;
  authorization: string;
  csrfToken: string;
}

const app = express();
app.use(express.json());
app.use(routes);

const testUserIds: string[] = [];

async function createTestUser(): Promise<TestUser> {
  const [user] = await getDb().insert(users).values({
    email: `pantry-route-${crypto.randomUUID()}@example.test`,
    passwordHash: "test-only",
  }).returning();
  testUserIds.push(user.id);

  const session = await createSession(user.id);
  return {
    id: user.id,
    authorization: `Bearer ${session.token}`,
    csrfToken: createCsrfToken(session.id),
  };
}

function authenticated(user: TestUser) {
  const withAuth = (test: ReturnType<typeof request>) => test
    .set("Authorization", user.authorization)
    .set("X-CSRF-Token", user.csrfToken);
  return {
    get: (path: string) => withAuth(request(app).get(path)),
    post: (path: string) => withAuth(request(app).post(path)),
    patch: (path: string) => withAuth(request(app).patch(path)),
    delete: (path: string) => withAuth(request(app).delete(path)),
  };
}

async function addPantryItem(user: TestUser, name: string, currentQuantity = 5, lowStockThreshold = 4) {
  return authenticated(user)
    .post("/api/pantry-items")
    .send({ name, category: "cupboard", currentQuantity, lowStockThreshold });
}

async function getShoppingList(user: TestUser) {
  const response = await authenticated(user).get("/api/shopping-list");
  expect(response.status).toBe(200);
  return response.body as Array<{ id: string; name: string; checked: boolean }>;
}

describe.skipIf(!testDatabaseIsLocal)("pantry low-stock API and PostgreSQL persistence", () => {
  beforeAll(async () => {
    await initializeDb();
  });

  beforeEach(() => {
    testUserIds.length = 0;
  });

  afterEach(async () => {
    if (testUserIds.length === 0) return;
    await getDb().delete(shoppingListItems).where(inArray(shoppingListItems.userId, testUserIds));
    await getDb().delete(pantryItems).where(inArray(pantryItems.userId, testUserIds));
    await getDb().delete(sessions).where(inArray(sessions.userId, testUserIds));
    await getDb().delete(users).where(inArray(users.id, testUserIds));
  });

  it("persists one row at the inclusive boundary and reuses it below/through repeated updates", async () => {
    const user = await createTestUser();
    const created = await addPantryItem(user, "route-test-rice");

    expect(created.status).toBe(200);
    expect(created.body.isLow).toBe(false);
    expect((await getShoppingList(user)).filter(item => item.name === "route-test-rice")).toHaveLength(0);

    const equal = await authenticated(user).patch(`/api/pantry-items/${created.body.id}`).send({ currentQuantity: 4 });
    expect(equal.status).toBe(200);
    expect(equal.body.isLow).toBe(true);
    const firstList = await getShoppingList(user);
    const firstRow = firstList.find(item => item.name === "route-test-rice");
    expect(firstRow).toBeDefined();

    for (const quantity of [3, 2, 1, 3]) {
      const updated = await authenticated(user).patch(`/api/pantry-items/${created.body.id}`).send({ currentQuantity: quantity });
      expect(updated.status).toBe(200);
      expect(updated.body.isLow).toBe(true);
    }
    const belowList = await getShoppingList(user);
    expect(belowList.filter(item => item.name === "route-test-rice")).toHaveLength(1);
    expect(belowList.find(item => item.name === "route-test-rice")?.id).toBe(firstRow?.id);

    const above = await authenticated(user).patch(`/api/pantry-items/${created.body.id}`).send({ currentQuantity: 5 });
    expect(above.body.isLow).toBe(false);
    expect((await getShoppingList(user)).some(item => item.id === firstRow?.id)).toBe(true);
  });

  it("reopens a checked case-insensitive match instead of creating a duplicate", async () => {
    const user = await createTestUser();
    const pantry = await addPantryItem(user, "route-test-oats");
    const manual = await authenticated(user).post("/api/shopping-list").send({ name: "ROUTE-TEST-OATS" });
    expect(manual.status).toBe(200);
    const checked = await authenticated(user).patch(`/api/shopping-list/${manual.body.id}`).send({ checked: true });
    expect(checked.status).toBe(200);

    const firstLow = await authenticated(user).patch(`/api/pantry-items/${pantry.body.id}`).send({ currentQuantity: 4 });
    expect(firstLow.body.isLow).toBe(true);
    let matches = (await getShoppingList(user)).filter(item => item.name.toLowerCase() === "route-test-oats");
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe(manual.body.id);
    expect(matches[0].checked).toBe(false);

    await authenticated(user).patch(`/api/shopping-list/${manual.body.id}`).send({ checked: true });
    await authenticated(user).patch(`/api/pantry-items/${pantry.body.id}`).send({ currentQuantity: 5 });
    const lowAgain = await authenticated(user).patch(`/api/pantry-items/${pantry.body.id}`).send({ currentQuantity: 4 });
    expect(lowAgain.body.isLow).toBe(true);
    matches = (await getShoppingList(user)).filter(item => item.name.toLowerCase() === "route-test-oats");
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe(manual.body.id);
    expect(matches[0].checked).toBe(false);
  });

  it("does not modify another user's matching shopping-list row", async () => {
    const owner = await createTestUser();
    const otherUser = await createTestUser();
    const otherRow = await authenticated(otherUser).post("/api/shopping-list").send({ name: "route-test-flour" });
    expect(otherRow.status).toBe(200);
    await authenticated(otherUser).patch(`/api/shopping-list/${otherRow.body.id}`).send({ checked: true });

    const pantry = await addPantryItem(owner, "route-test-flour");
    const low = await authenticated(owner).patch(`/api/pantry-items/${pantry.body.id}`).send({ currentQuantity: 4 });
    expect(low.body.isLow).toBe(true);

    const ownerList = await getShoppingList(owner);
    const otherUserList = await getShoppingList(otherUser);
    expect(ownerList.filter(item => item.name === "route-test-flour")).toHaveLength(1);
    expect(otherUserList).toHaveLength(1);
    expect(otherUserList[0]).toMatchObject({ id: otherRow.body.id, checked: true });
  });

  it("serializes concurrent low-stock requests across database connections", async () => {
    const user = await createTestUser();
    const concurrentCreates = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        addPantryItem(user, index % 2 === 0 ? "route-test-beans" : "ROUTE-TEST-BEANS", 4, 4),
      ),
    );
    expect(concurrentCreates.every(response => response.status === 200 && response.body.isLow)).toBe(true);
    const rows = (await getShoppingList(user)).filter(item => item.name.toLowerCase() === "route-test-beans");
    expect(rows).toHaveLength(1);
  });
});
