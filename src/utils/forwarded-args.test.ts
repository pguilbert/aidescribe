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

  it("strips --type with next-arg value", () => {
    expect(getForwardedJjDescribeArgs(["--type", "plain"])).toEqual([]);
  });

  it("strips -t with next-arg value", () => {
    expect(getForwardedJjDescribeArgs(["-t", "plain"])).toEqual([]);
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

  it("strips --type=value (equals syntax)", () => {
    expect(getForwardedJjDescribeArgs(["--type=plain", "-r", "abc"])).toEqual([
      "-r",
      "abc",
    ]);
  });

  it("strips --verbose", () => {
    expect(getForwardedJjDescribeArgs(["--verbose", "-r", "abc"])).toEqual(["-r", "abc"]);
  });

  it("forwards everything after -- separator", () => {
    expect(
      getForwardedJjDescribeArgs(["--ai-provider", "openai", "--", "--verbose", "--type"]),
    ).toEqual(["--verbose", "--type"]);
  });
});
