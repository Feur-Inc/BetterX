/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  isPrivateAddress,
  isTrustedRendererUrl,
  parseCloudServerUrl,
  parseExternalHttpUrl,
  parsePublicProxyUrl,
  validateCloudRequest,
  validateProxyMethod,
} from "./security.js";

describe("desktop IPC URL validation", () => {
  test("trusts only exact HTTPS X hosts", () => {
    expect(isTrustedRendererUrl("https://x.com/home")).toBe(true);
    expect(isTrustedRendererUrl("https://twitter.com/home")).toBe(true);
    expect(isTrustedRendererUrl("https://x.com.evil.example/")).toBe(false);
    expect(isTrustedRendererUrl("http://x.com/")).toBe(false);
  });

  test("requires HTTPS cloud origins except loopback", () => {
    expect(parseCloudServerUrl("https://cloud.example").origin).toBe("https://cloud.example");
    expect(parseCloudServerUrl("http://localhost:4000").origin).toBe("http://localhost:4000");
    expect(() => parseCloudServerUrl("http://cloud.example")).toThrow();
    expect(() => parseCloudServerUrl("https://cloud.example/path")).toThrow();
    expect(() => parseCloudServerUrl("https://user:pass@cloud.example")).toThrow();
  });

  test("allows only the cloud API surface used by the renderer", () => {
    expect(validateCloudRequest("/api/config", "POST")).toEqual({
      path: "/api/config",
      method: "POST",
    });
    expect(() => validateCloudRequest("/admin", "GET")).toThrow();
    expect(() => validateCloudRequest("/api/me", "POST")).toThrow();
    expect(validateCloudRequest("/auth/logout", "POST")).toEqual({
      path: "/auth/logout",
      method: "POST",
    });
    expect(() => validateCloudRequest("/auth/logout", "GET")).toThrow();
  });

  test("blocks non-HTTP external protocols", () => {
    expect(parseExternalHttpUrl("https://example.com").hostname).toBe("example.com");
    expect(() => parseExternalHttpUrl("file:///etc/passwd")).toThrow();
    expect(() => parseExternalHttpUrl("javascript:alert(1)")).toThrow();
  });

  test("keeps the generic plugin proxy on public HTTPS targets", () => {
    expect(parsePublicProxyUrl("https://api.example.com/data").hostname).toBe("api.example.com");
    expect(validateProxyMethod("patch")).toBe("PATCH");
    expect(() => parsePublicProxyUrl("http://api.example.com/data")).toThrow();
    expect(() => parsePublicProxyUrl("https://127.0.0.1/admin")).toThrow();
    expect(() => parsePublicProxyUrl("https://192.168.1.2/admin")).toThrow();
    expect(() => validateProxyMethod("TRACE")).toThrow();
  });

  test("recognizes private IPv4, IPv6, and IPv4-mapped addresses", () => {
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateAddress("::ffff:8.8.8.8")).toBe(false);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });
});
