import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ConfirmDialog, type ConfirmOptions } from "@/components/admin/confirm-dialog";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { NeedsClarification, StatusBadge } from "@/components/admin/primitives";
import { createInitialDb } from "@/lib/mock/initial-db";

interface Row { id: string; name: string; amount: number }
const rows: Row[] = Array.from({ length: 23 }, (_, i) => ({ id: `r${i}`, name: `Item ${String.fromCharCode(65 + (i % 26))}`, amount: (i * 37) % 100 }));
const columns: Column<Row>[] = [
  { key: "name", header: "Name", sortValue: (r) => r.name, cell: (r) => r.name },
  { key: "amount", header: "Amount", sortValue: (r) => r.amount, cell: (r) => r.amount, align: "right" },
];

describe("DataTable", () => {
  it("paginates, sorts with aria-sort and returns to page 1 when the reset key changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DataTable caption="Things" rows={rows} columns={columns} getRowId={(r) => r.id} />);
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 1–10 of 23");
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 11–20 of 23");

    await user.click(screen.getByRole("button", { name: /^Amount/ }));
    expect(screen.getByRole("columnheader", { name: /Amount/ })).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 1–10"); // sorting resets the page
    const amounts = within(screen.getByRole("table")).getAllByRole("row").slice(1).map((r) => Number(within(r).getAllByRole("cell")[1]!.textContent));
    expect(amounts).toEqual([...amounts].sort((a, b) => a - b));

    await user.click(screen.getByRole("button", { name: "Next page" }));
    rerender(<DataTable caption="Things" rows={rows.slice(0, 15)} columns={columns} getRowId={(r) => r.id} resetKey="filtered" />);
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 1–10 of 15");
  });

  it("shows a no-results state", () => {
    render(<DataTable caption="Things" rows={[]} columns={columns} getRowId={(r) => r.id} />);
    expect(screen.getByText("No records match")).toBeInTheDocument();
  });
});

describe("Field", () => {
  it("connects label, hint and error to the control", () => {
    render(<Field label="Code" hint="4–20 characters" error="Code is required." required><input /></Field>);
    const input = screen.getByLabelText(/Code/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("4–20 characters Code is required.");
  });
});

describe("status and clarification labels", () => {
  it("labels mock states as mock and pairs colour with text", () => {
    render(<><StatusBadge domain="refund" value="processed_demo" /><StatusBadge domain="document" value="reviewed_mock" /><NeedsClarification compact /></>);
    expect(screen.getByText("Processed (demo)")).toBeInTheDocument();
    expect(screen.getByText("Reviewed (mock)")).toBeInTheDocument();
    expect(screen.getByText("Needs clarification")).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  const base = (onConfirm: ConfirmOptions["onConfirm"]): ConfirmOptions => ({ title: "Reject seller?", description: "Desc", confirmLabel: "Reject", reason: { label: "Rejection reason" }, onConfirm });

  it("requires a reason and keeps the dialog open with the error when the action fails", async () => {
    const user = userEvent.setup();
    const done: string[] = [];
    render(<ConfirmDialog options={base(() => ({ ok: false, error: "Cannot reject an active seller." }))} onClose={() => {}} onDone={(m) => done.push(m)} />);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByText("Rejection reason is required.")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Rejection reason/), "Illegible document");
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Cannot reject an active seller.");
    expect(done).toEqual([]);
  });

  it("passes the reason and reports success", async () => {
    const user = userEvent.setup();
    const received: string[] = [];
    let closed = false;
    render(<ConfirmDialog options={base((reason) => { received.push(reason); return { ok: true, db: createInitialDb(), message: "Rejected (demo)." }; })} onClose={() => { closed = true; }} onDone={(m) => received.push(m)} />);
    await user.type(screen.getByLabelText(/Rejection reason/), "  Duplicate application  ");
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(received).toEqual(["Duplicate application", "Rejected (demo)."]);
    expect(closed).toBe(true);
  });
});
