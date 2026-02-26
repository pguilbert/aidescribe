import { describe, expect, it } from "vitest";
import { getForwardedJjDescribeArgs } from "./forwarded-args.js";

describe("getForwardedJjDescribeArgs", () => {
  it("passes through unknown flags", () => {
    expect(getForwardedJjDescribeArgs(["-r", "abc", "--message", "foo"])).toEqual([
      "-r",
      "abc",
      "--message",
      "foo",
    ]);
  });

  it("strips --ai-provider with next-arg value", () => {
    expect(getForwardedJjDescribeArgs(["--ai-provider", "openai", "-r", "abc"])).toEqual([
      "-r",
      "abc",
    ]);
  });

  it("strips --ai-locale with next-arg value", () => {
    expect(getForwardedJjDescribeArgs(["--ai-locale", "fr"])).toEqual([]);
  });

  it("strips --ai-type with next-arg value", () => {
    expect(getForwardedJjDescribeArgs(["--ai-type", "plain"])).toEqual([]);
  });

  it("strips --ai-max-length with next-arg value", () => {
    expect(getForwardedJjDescribeArgs(["--ai-max-length", "100"])).toEqual([]);
  });

  it("strips --ai-max-diff-chars with next-arg value", () => {
    expect(getForwardedJjDescribeArgs(["--ai-max-diff-chars", "5000"])).toEqual([]);
  });

  it("strips --ai-provider=value (equals syntax)", () => {
    expect(getForwardedJjDescribeArgs(["--ai-provider=openai", "-r", "abc"])).toEqual([
      "-r",
      "abc",
    ]);
  });

  it("strips --verbose", () => {
    expect(getForwardedJjDescribeArgs(["--verbose", "-r", "abc"])).toEqual(["-r", "abc"]);
  });

  it("forwards everything after -- separator", () => {
    expect(
      getForwardedJjDescribeArgs(["--ai-provider", "openai", "--", "--verbose", "--ai-type"]),
    ).toEqual(["--verbose", "--ai-type"]);
  });
});
