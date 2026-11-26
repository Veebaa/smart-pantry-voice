import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PantryInventory } from "@/components/PantryInventory";

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));

describe("PantryInventory category headings", () => {
  it("maps pantry_staples to Pantry and retains the other headings", () => {
    render(
      <PantryInventory
        items={[
          { id: "1", name: "eggs", category: "pantry_staples", isLow: false },
          { id: "2", name: "milk", category: "fridge", isLow: false },
          { id: "3", name: "peas", category: "freezer", isLow: false },
          { id: "4", name: "rice", category: "cupboard", isLow: false },
        ]}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByText("Pantry")).toBeTruthy();
    expect(screen.getByText("Fridge")).toBeTruthy();
    expect(screen.getByText("Freezer")).toBeTruthy();
    expect(screen.getByText("Cupboard")).toBeTruthy();
  });
});
