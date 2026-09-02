import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isAlimtalkConfigured, sendAlimtalk } from "./alimtalk";

type FetchArgs = [string, RequestInit];
const argsOf = (call: unknown): FetchArgs => call as FetchArgs;

const ENV_KEYS = [
  "KAKAO_ALIMTALK_SENDER_KEY",
  "KAKAO_ALIMTALK_API_KEY",
  "KAKAO_ALIMTALK_API_URL",
] as const;

const saved: Record<string, string | undefined> = {};

function configure(partial = false) {
  process.env.KAKAO_ALIMTALK_SENDER_KEY = "sender-key";
  process.env.KAKAO_ALIMTALK_API_KEY = "api-key";
  if (!partial) process.env.KAKAO_ALIMTALK_API_URL = "https://gw.example/alimtalk";
}

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("isAlimtalkConfigured", () => {
  it("is false until every credential is present — a half-configured gateway must stay off", () => {
    expect(isAlimtalkConfigured()).toBe(false);
    configure(true); // sender key + api key, no URL
    expect(isAlimtalkConfigured()).toBe(false);
    configure();
    expect(isAlimtalkConfigured()).toBe(true);
  });
});

describe("sendAlimtalk", () => {
  it("does not call out at all when Kakao is not configured, but still reports who would have been reached", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendAlimtalk(
      "WELC_REMINDER",
      [{ phone: "01012345678" }, { phone: null }],
      "내일 수업 있습니다"
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ attempted: 1, sent: 0, configured: false });
  });

  it("skips recipients with no phone number instead of posting a null recipient", async () => {
    configure();
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendAlimtalk(
      "WELC_REMINDER",
      [{ phone: "01011112222" }, { phone: null }, { phone: "01033334444" }],
      "내일 수업 있습니다"
    );

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ attempted: 2, sent: 2, configured: true });
    const bodies = fetchSpy.mock.calls.map((c) =>
      JSON.parse(String(argsOf(c)[1].body))
    );
    expect(bodies.map((b) => b.recipientList[0].recipientNo)).toEqual([
      "01011112222",
      "01033334444",
    ]);
  });

  it("sends the credentials in the header and the template code in the body", async () => {
    configure();
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    await sendAlimtalk(
      "WELC_REMINDER",
      [{ phone: "01011112222", variables: { message: "hi" } }],
      "hi"
    );

    const [url, init] = argsOf(fetchSpy.mock.calls[0]);
    expect(url).toBe("https://gw.example/alimtalk");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["X-Secret-Key"]).toBe("api-key");
    const body = JSON.parse(String(init.body));
    expect(body.senderKey).toBe("sender-key");
    expect(body.templateCode).toBe("WELC_REMINDER");
    expect(body.recipientList[0].templateParameter).toEqual({ message: "hi" });
    expect(body.recipientList[0].content).toBe("hi");
  });

  it("counts only successful responses — a rejected recipient must not be reported as sent", async () => {
    configure();
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("nope", { status: 400 }));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendAlimtalk(
      "WELC_REMINDER",
      [{ phone: "01011112222" }, { phone: "01033334444" }],
      "hi"
    );
    expect(result).toEqual({ attempted: 2, sent: 1, configured: true });
  });

  it("never throws when the gateway is unreachable — the in-app reminder has already been created and must not be rolled back", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      })
    );

    await expect(
      sendAlimtalk("WELC_REMINDER", [{ phone: "01011112222" }], "hi")
    ).resolves.toEqual({ attempted: 1, sent: 0, configured: true });
  });

  it("handles an empty recipient list without calling the gateway", async () => {
    configure();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(sendAlimtalk("WELC_REMINDER", [], "hi")).resolves.toEqual({
      attempted: 0,
      sent: 0,
      configured: true,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
