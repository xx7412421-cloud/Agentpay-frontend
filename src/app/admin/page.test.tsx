import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminPage from "./page";
import { ToastProvider } from "@/components/ToastProvider";

function renderAdminPage() {
  return render(
    <ToastProvider>
      <AdminPage />
    </ToastProvider>
  );
}

function jsonResponse(body: unknown, init: Partial<Response> = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

function noContentResponse() {
  return {
    ok: true,
    status: 204,
    json: async () => ({}),
  } as unknown as Response;
}

afterEach(() => jest.restoreAllMocks());

it("opens a confirmation dialog before pausing writes", async () => {
  globalThis.fetch = jest
    .fn()
    .mockResolvedValue(jsonResponse({ paused: false }));

  renderAdminPage();
  await screen.findByText("Live");
  const fetchMock = globalThis.fetch as jest.Mock;
  fetchMock.mockClear();

  fireEvent.click(screen.getByRole("button", { name: /pause all writes/i }));

  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("Pause all writes?")).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("cancels the pause dialog without posting", async () => {
  globalThis.fetch = jest
    .fn()
    .mockResolvedValue(jsonResponse({ paused: false }));

  renderAdminPage();
  await screen.findByText("Live");
  const fetchMock = globalThis.fetch as jest.Mock;
  fetchMock.mockClear();

  fireEvent.click(screen.getByRole("button", { name: /pause all writes/i }));
  fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("posts the pause endpoint, refreshes status, and shows success feedback", async () => {
  globalThis.fetch = jest
    .fn()
    .mockResolvedValueOnce(jsonResponse({ paused: false }))
    .mockResolvedValueOnce(noContentResponse())
    .mockResolvedValueOnce(jsonResponse({ paused: true }));

  renderAdminPage();
  await screen.findByText("Live");

  fireEvent.click(screen.getByRole("button", { name: /pause all writes/i }));
  fireEvent.click(
    screen.getAllByRole("button", { name: /pause all writes/i })[0]
  );

  await waitFor(() => {
    const calls = (globalThis.fetch as jest.Mock).mock.calls;
    expect(
      calls.some((c: string[]) => c[0].includes("/api/v1/admin/pause"))
    ).toBe(true);
  });

  expect(await screen.findByText("Paused")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Admin writes paused.");
});

it("disables the toggle while a pause request is in flight", async () => {
  let resolvePost!: (value: Response) => void;
  const postPromise = new Promise<Response>((resolve) => {
    resolvePost = resolve;
  });

  globalThis.fetch = jest
    .fn()
    .mockResolvedValueOnce(jsonResponse({ paused: false }))
    .mockReturnValueOnce(postPromise)
    .mockResolvedValueOnce(jsonResponse({ paused: true }));

  renderAdminPage();
  await screen.findByText("Live");

  fireEvent.click(screen.getByRole("button", { name: /pause all writes/i }));
  fireEvent.click(
    screen.getAllByRole("button", { name: /pause all writes/i })[0]
  );

  expect(screen.getByRole("button", { name: /pausing/i })).toBeDisabled();

  resolvePost(noContentResponse());
  expect(await screen.findByText("Paused")).toBeInTheDocument();
});

it("keeps the alert path and shows an error toast when unpause fails", async () => {
  globalThis.fetch = jest
    .fn()
    .mockResolvedValueOnce(jsonResponse({ paused: true }))
    .mockResolvedValueOnce(
      jsonResponse(
        { error: "admin_toggle_failed", message: "backend refused update" },
        { ok: false, status: 500 }
      )
    );

  renderAdminPage();
  await screen.findByText("Paused");

  fireEvent.click(screen.getByRole("button", { name: /resume writes/i }));
  fireEvent.click(screen.getAllByRole("button", { name: /resume writes/i })[0]);

  await waitFor(() => {
    const calls = (globalThis.fetch as jest.Mock).mock.calls;
    expect(
      calls.some((c: string[]) => c[0].includes("/api/v1/admin/unpause"))
    ).toBe(true);
  });

  const alerts = await screen.findAllByRole("alert");
  expect(alerts.map((alert) => alert.textContent).join(" ")).toContain(
    "backend refused update"
  );
});
